import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Md5 } from "https://deno.land/std@0.190.0/hash/md5.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MembershipPaymentRequest {
  amount: number; // in cents
  description: string;
  plan: 'premium';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) throw new Error("Authentication failed");

    const { amount, description, plan }: MembershipPaymentRequest = await req.json();

    const MERCHANT_ID = Deno.env.get("PAYFAST_MERCHANT_ID");
    const MERCHANT_KEY = Deno.env.get("PAYFAST_MERCHANT_KEY");
    const PASSPHRASE = Deno.env.get("PAYFAST_PASSPHRASE");
    if (!MERCHANT_ID || !MERCHANT_KEY || !PASSPHRASE) {
      throw new Error("PayFast credentials not configured");
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();
    if (profileError || !profile) throw new Error("Failed to get user profile");

    const paymentData: Record<string, unknown> = {
      merchant_id: MERCHANT_ID,
      merchant_key: MERCHANT_KEY,
      return_url: `${req.headers.get("origin")}/memberships?status=success`,
      cancel_url: `${req.headers.get("origin")}/memberships?status=cancelled`,
      notify_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payfast-webhook`,
      amount: (amount / 100).toFixed(2),
      item_name: description,
      item_description: `Membership upgrade to ${plan}`,
      name_first: profile.first_name || '',
      name_last: profile.last_name || '',
      email_address: profile.email,
      custom_str1: `membership_${user.id}_${Date.now()}`,
      custom_str2: user.id,
      custom_str3: 'membership_payment',
    };

    const generateSignature = (data: Record<string, unknown>, passphrase: string) => {
      const paramString = Object.keys(data)
        .filter((key) => data[key] !== '' && data[key] !== null && data[key] !== undefined)
        .sort()
        .map((key) => `${key}=${encodeURIComponent(String(data[key]))}`)
        .join('&');
      const stringToHash = passphrase ? `${paramString}&passphrase=${encodeURIComponent(passphrase)}` : paramString;
      const md5 = new Md5();
      md5.update(stringToHash);
      return md5.toString();
    };

    const signature = generateSignature(paymentData, PASSPHRASE);
    const finalPaymentData = { ...paymentData, signature } as Record<string, string>;

    const paymentUrl = `https://sandbox.payfast.co.za/eng/process?${Object.keys(finalPaymentData)
      .map((key) => `${key}=${encodeURIComponent(finalPaymentData[key])}`)
      .join('&')}`;

    // Ensure a membership row exists
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    await supabaseService.from('memberships').upsert({
      user_id: user.id,
      membership_type: 'basic',
      is_active: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    return new Response(JSON.stringify({ success: true, payment_url: paymentUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
