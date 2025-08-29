import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SeedRequest {
  email: string;
  password: string;
  role: 'patient' | 'doctor' | 'admin';
  first_name: string;
  last_name: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SeedRequest = await req.json();
    const { email, password, role, first_name, last_name } = body;

    if (!email || !password || !role) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Try to create the user (service role bypasses domain allowlist)
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name, role },
    });

    let userId = created?.user?.id ?? null;

    if (createErr) {
      // If already exists, we won't reset password for safety; signal exists
      if (createErr.message?.toLowerCase().includes('already registered')) {
        return new Response(JSON.stringify({ success: true, status: 'exists' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      // Some providers may return generic invalid email; bubble up
      throw createErr;
    }

    if (!userId) {
      throw new Error('Failed to create user');
    }

    // Upsert profile
    await supabase.from('profiles').upsert({
      id: userId,
      email,
      first_name,
      last_name,
      role,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    // If doctor, create doctor record and default weekly schedule
    if (role === 'doctor') {
      const { data: doctorRow } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', userId)
        .single();

      let doctorId = doctorRow?.id;
      if (!doctorId) {
        const { data: inserted, error: insertErr } = await supabase
          .from('doctors')
          .insert({
            user_id: userId,
            practice_name: 'Demo Medical Practice',
            speciality: 'General Practitioner',
            qualification: 'MBChB, University of Cape Town',
            license_number: 'MP123456',
            years_experience: 10,
            consultation_fee: 45000,
            address: '123 Demo Street',
            city: 'Cape Town',
            province: 'Western Cape',
            postal_code: '8001',
            bio: 'Experienced general practitioner dedicated to providing quality healthcare.',
            rating: 4.8,
            total_bookings: 150,
            is_available: true,
          })
          .select('id')
          .single();
        if (insertErr) throw insertErr;
        doctorId = inserted?.id;
      }

      if (doctorId) {
        const days = [1, 2, 3, 4, 5];
        const scheduleRows = days.map((d) => ({
          doctor_id: doctorId,
          day_of_week: d,
          start_time: '09:00',
          end_time: '17:00',
          is_available: true,
        }));
        // Insert schedules; ignore if duplicates cause conflict
        await supabase.from('doctor_schedules').insert(scheduleRows).select('*');
      }
    }

    return new Response(JSON.stringify({ success: true, user_id: userId, status: 'created' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err: any) {
    console.error('seed-demo-user error:', err?.message || err);
    return new Response(JSON.stringify({ success: false, error: err?.message || 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
