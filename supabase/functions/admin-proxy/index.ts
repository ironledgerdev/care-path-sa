import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Access-Control-Allow-Credentials": "true",
  "Vary": "Origin"
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const body = await req.json();
    const token = body?.token;
    const action = body?.action;

    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'Missing admin token' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    // service role client
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // validate token
    const { data: tokenRow, error: tokenError } = await serviceSupabase
      .from('admin_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !tokenRow) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
    }

    if (tokenRow.revoked) {
      return new Response(JSON.stringify({ success: false, error: 'Token revoked' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
    }

    if (tokenRow.expires_at && new Date(tokenRow.expires_at) <= new Date()) {
      return new Response(JSON.stringify({ success: false, error: 'Token expired' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
    }

    // handle actions
    if (action === 'fetch_pending_doctors') {
      const { data, error } = await serviceSupabase
        .from('pending_doctors')
        .select('*, profiles:profiles(*)')
        .order('created_at', { ascending: false });
      if (error) return new Response(JSON.stringify({ success: false, error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
      return new Response(JSON.stringify({ success: true, data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    if (action === 'fetch_stats') {
      try {
        const [doctorsResult, pendingResult, bookingsResult, usersResult, premiumResult] = await Promise.all([
          serviceSupabase.from('doctors').select('id', { count: 'exact' }),
          serviceSupabase.from('pending_doctors').select('id', { count: 'exact' }).eq('status', 'pending'),
          serviceSupabase.from('bookings').select('total_amount', { count: 'exact' }),
          serviceSupabase.from('profiles').select('id', { count: 'exact' }),
          serviceSupabase.from('memberships').select('id', { count: 'exact' }).eq('membership_type', 'premium').eq('is_active', true)
        ]);

        const totalRevenue = bookingsResult.data?.reduce((sum: number, booking: any) => sum + (booking.total_amount || 0), 0) || 0;

        return new Response(JSON.stringify({ success: true, stats: {
          totalDoctors: doctorsResult.count || 0,
          pendingApplications: pendingResult.count || 0,
          totalBookings: bookingsResult.count || 0,
          totalRevenue: totalRevenue / 100,
          totalUsers: usersResult.count || 0,
          premiumMembers: premiumResult.count || 0
        }}), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      } catch (e: any) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
      }
    }

    if (action === 'approve_doctor') {
      const doctorId = body?.doctorId;
      if (!doctorId) return new Response(JSON.stringify({ success: false, error: 'Missing doctorId' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });

      // Update pending_doctors status
      const { error: updateError } = await serviceSupabase
        .from('pending_doctors')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', doctorId);

      if (updateError) return new Response(JSON.stringify({ success: false, error: updateError.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });

      return new Response(JSON.stringify({ success: true, message: 'Doctor approved' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });

  } catch (error: any) {
    console.error('Unexpected error in admin-proxy:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
