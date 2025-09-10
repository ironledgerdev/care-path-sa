import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE');

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Supabase service role not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });

    // Fetch pending doctors
    const pendingResp = await supabaseAdmin
      .from('pending_doctors')
      .select('*')
      .order('created_at', { ascending: false });

    // Fetch profiles for pending (to enrich)
    let pending = pendingResp.data || [];
    const userIds = pending.map((d: any) => d.user_id).filter(Boolean);
    let profilesData = [];
    if (userIds.length) {
      const profilesResp = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);
      profilesData = profilesResp.data || [];
      pending = pending.map((doc: any) => ({
        ...doc,
        profiles: profilesData.find((p: any) => p.id === doc.user_id) || { first_name: '', last_name: '', email: '' }
      }));
    }

    // Memberships (with profile relation if exists)
    const membershipsResp = await supabaseAdmin
      .from('memberships')
      .select(`*, profiles!memberships_user_id_fkey (first_name, last_name, email, role)`)
      .order('created_at', { ascending: false })
      .limit(50);

    const memberships = membershipsResp.data || [];

    // Stats: counts and revenue
    const [doctorsResult, pendingResult, bookingsResult, usersResult, premiumResult] = await Promise.all([
      supabaseAdmin.from('doctors').select('id', { count: 'exact' }),
      supabaseAdmin.from('pending_doctors').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabaseAdmin.from('bookings').select('total_amount', { count: 'exact' }),
      supabaseAdmin.from('profiles').select('id', { count: 'exact' }),
      supabaseAdmin.from('memberships').select('id', { count: 'exact' }).eq('membership_type', 'premium').eq('is_active', true)
    ]);

    const totalRevenue = (bookingsResult.data || []).reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0);

    const stats = {
      totalDoctors: doctorsResult.count || 0,
      pendingApplications: pendingResult.count || 0,
      totalBookings: bookingsResult.count || 0,
      totalRevenue: totalRevenue / 100,
      totalUsers: usersResult.count || 0,
      premiumMembers: premiumResult.count || 0
    };

    return new Response(JSON.stringify({ success: true, pending, memberships, stats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('admin-data function error', error);
    return new Response(JSON.stringify({ error: (error && error.message) || String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
