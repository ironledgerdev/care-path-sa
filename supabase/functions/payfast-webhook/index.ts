import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("PayFast webhook called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const paymentData: Record<string, string> = {};
    
    // Convert FormData to object
    for (const [key, value] of formData.entries()) {
      paymentData[key] = value.toString();
    }

    console.log("PayFast webhook data:", paymentData);

    // Verify the payment status
    const paymentStatus = paymentData.payment_status;
    const customStr1 = paymentData.custom_str1; // booking_id or membership identifier
    const customStr2 = paymentData.custom_str2; // user_id
    const customStr3 = paymentData.custom_str3; // payment type

    // Create Supabase service client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (paymentStatus === 'COMPLETE') {
      console.log("Payment completed successfully");

      if (customStr3 === 'booking_payment') {
        // Handle booking payment
        const { error: bookingError } = await supabase
          .from('bookings')
          .update({
            payment_status: 'paid',
            status: 'confirmed'
          })
          .eq('id', customStr1);

        if (bookingError) {
          console.error("Failed to update booking:", bookingError);
          throw bookingError;
        }

        // Send booking confirmation email
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'booking_confirmed',
            data: {
              booking_id: customStr1,
              user_id: customStr2
            }
          }
        });

        console.log("Booking payment processed successfully");

      } else if (customStr3 === 'membership_payment') {
        // Handle membership payment
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 3); // 3 months (quarterly)

        const { error: membershipError } = await supabase
          .from('memberships')
          .update({
            membership_type: 'premium',
            is_active: true,
            current_period_start: startDate.toISOString(),
            current_period_end: endDate.toISOString(),
            free_bookings_remaining: 3, // Reset free bookings
            updated_at: new Date().toISOString()
          })
          .eq('user_id', customStr2);

        if (membershipError) {
          console.error("Failed to update membership:", membershipError);
          throw membershipError;
        }

        // Send membership confirmation email
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'membership_upgraded',
            data: {
              user_id: customStr2
            }
          }
        });

        console.log("Membership payment processed successfully");
      }

    } else if (paymentStatus === 'CANCELLED' || paymentStatus === 'FAILED') {
      console.log("Payment cancelled or failed");

      if (customStr3 === 'booking_payment') {
        // Update booking status to cancelled
        const { error: bookingError } = await supabase
          .from('bookings')
          .update({
            payment_status: 'failed',
            status: 'cancelled'
          })
          .eq('id', customStr1);

        if (bookingError) {
          console.error("Failed to update booking:", bookingError);
        }
      }
    }

    return new Response("OK", {
      status: 200,
      headers: corsHeaders
    });

  } catch (error: any) {
    console.error("PayFast webhook error:", error.message);
    
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});