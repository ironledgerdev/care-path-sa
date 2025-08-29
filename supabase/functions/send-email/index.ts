import React from 'npm:react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Import email templates
import { UserVerificationEmail } from './_templates/user-verification.tsx'
import { UserWelcomeEmail } from './_templates/user-welcome.tsx'
import { DoctorPendingEmail } from './_templates/doctor-pending.tsx'
import { DoctorApprovedEmail } from './_templates/doctor-approved.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Email function called with method:', req.method);

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('Email request body:', body);

      const { type, data } = body;

      let html = '';
      let subject = '';
      let to = '';

      // Create Supabase client for fetching additional data
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      switch (type) {
        case 'user_verification':
          html = await renderAsync(
            React.createElement(UserVerificationEmail, {
              supabase_url: data.supabase_url,
              token: data.token,
              token_hash: data.token_hash,
              redirect_to: data.redirect_to,
              email_action_type: data.email_action_type,
              user_email: data.user_email,
            })
          );
          subject = 'Verify your email - IronLedgerMedMap';
          to = data.user_email;
          break;

        case 'user_welcome':
          html = await renderAsync(
            React.createElement(UserWelcomeEmail, {
              user_name: data.user_name,
              user_email: data.user_email,
            })
          );
          subject = 'Welcome to IronLedgerMedMap! Your healthcare journey starts here';
          to = data.user_email;
          break;

        case 'doctor_pending':
          html = await renderAsync(
            React.createElement(DoctorPendingEmail, {
              doctor_name: data.doctor_name,
              practice_name: data.practice_name,
              speciality: data.speciality,
              license_number: data.license_number,
            })
          );
          subject = 'Your practice application is under review - IronLedgerMedMap';
          to = data.doctor_email;
          break;

        case 'doctor_approved':
          html = await renderAsync(
            React.createElement(DoctorApprovedEmail, {
              doctor_name: data.doctor_name,
              practice_name: data.practice_name,
              speciality: data.speciality,
            })
          );
          subject = '🎉 Congratulations! Your practice has been approved';
          to = data.doctor_email;
          break;

        default:
          throw new Error(`Unknown email type: ${type}`);
      }

      console.log('Sending email to:', to);

      const { error } = await resend.emails.send({
        from: 'IronLedgerMedMap <noreply@ironledgermedmap.co.za>',
        to: [to],
        subject,
        html,
      });

      if (error) {
        console.error('Resend error:', error);
        throw error;
      }

      console.log('Email sent successfully');

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );

    } catch (error: any) {
      console.error('Email sending error:', error);
      return new Response(
        JSON.stringify({
          error: {
            message: error.message,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
  }

  // Handle Supabase auth webhook (for verification emails)
  if (req.method === 'POST' && hookSecret) {
    try {
      const payload = await req.text();
      const headers = Object.fromEntries(req.headers);
      const wh = new Webhook(hookSecret);

      const {
        user,
        email_data: { token, token_hash, redirect_to, email_action_type },
      } = wh.verify(payload, headers) as {
        user: {
          email: string
        }
        email_data: {
          token: string
          token_hash: string
          redirect_to: string
          email_action_type: string
          site_url: string
        }
      };

      const html = await renderAsync(
        React.createElement(UserVerificationEmail, {
          supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
          token,
          token_hash,
          redirect_to,
          email_action_type,
          user_email: user.email,
        })
      );

      const { error } = await resend.emails.send({
        from: 'IronLedgerMedMap <noreply@ironledgermedmap.co.za>',
        to: [user.email],
        subject: 'Verify your email - IronLedgerMedMap',
        html,
      });

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error: any) {
      console.log('Webhook error:', error);
      return new Response(
        JSON.stringify({
          error: {
            http_code: error.code,
            message: error.message,
          },
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  }

  return new Response('Method not allowed', { 
    status: 405,
    headers: corsHeaders
  });
});