import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // Provide a lightweight health response. Do NOT return secrets.
    const payload = {
      ok: true,
      path: url.pathname,
      method: req.method,
      headers: {
        origin: req.headers.get('origin') || null,
        host: req.headers.get('host') || null,
      },
      time: new Date().toISOString(),
      env: {
        // Only indicate presence/absence of important env vars — do not echo values
        HAS_SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
        HAS_SUPABASE_ANON_KEY: !!Deno.env.get('SUPABASE_ANON_KEY'),
        HAS_SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
        HAS_PAYFAST_CREDS: !!(Deno.env.get('PAYFAST_MERCHANT_ID') && Deno.env.get('PAYFAST_MERCHANT_KEY') && Deno.env.get('PAYFAST_PASSPHRASE')),
      }
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('debug-endpoint error', err);
    return new Response(JSON.stringify({ ok: false, error: (err && err.message) || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
