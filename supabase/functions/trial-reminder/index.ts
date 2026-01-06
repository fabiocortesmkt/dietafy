import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_WHATSAPP_NUMBER = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

async function sendReminderEmail(to: string, name: string, stripeCustomerId: string) {
  const firstName = name?.split(' ')[0] || 'você';
  const cancelUrl = stripeCustomerId 
    ? `https://billing.stripe.com/p/login/test_xxx` // Will be replaced with actual portal link
    : 'https://dietafy.app/profile';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">⏰</div>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                Seu teste grátis termina amanhã
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Olá, <strong>${firstName}</strong>! 👋
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Seu período de teste grátis do Dietafy Premium termina <strong>amanhã</strong>.
              </p>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="color: #92400e; margin: 0 0 10px; font-size: 16px;">📋 O que vai acontecer:</h3>
                <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.6;">
                  Após o término do teste, sua assinatura será ativada automaticamente e você continuará tendo acesso a todos os recursos Premium.
                </p>
              </div>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                Se você não quiser continuar, pode cancelar a qualquer momento com apenas 1 clique. Sem complicações.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://dietafy.app/dashboard" 
                   style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-weight: 600; font-size: 16px; margin: 5px; box-shadow: 0 4px 14px rgba(16,185,129,0.4);">
                  Continuar usando →
                </a>
              </div>
              
              <div style="text-align: center; margin: 20px 0;">
                <a href="${cancelUrl}" 
                   style="display: inline-block; color: #6b7280; text-decoration: underline; font-size: 14px;">
                  Não quero continuar, cancelar assinatura
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0; text-align: center;">
                Qualquer dúvida, é só responder este email!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © 2024 Dietafy. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Dietafy <noreply@dietafy.app>',
      to: [to],
      subject: '⏰ Lembrete: seu teste grátis termina amanhã',
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return await response.json();
}

async function sendReminderWhatsApp(phone: string, name: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
    console.log('Twilio credentials not configured, skipping WhatsApp');
    return null;
  }

  const firstName = name?.split(' ')[0] || 'você';
  const message = `⏰ *Olá, ${firstName}!*

Seu teste grátis do Dietafy termina *amanhã*.

Após o término, sua assinatura Premium será ativada automaticamente.

Se não quiser continuar, pode cancelar em 1 clique no app: https://dietafy.app/profile

Qualquer dúvida, estamos aqui! 💚`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      From: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
      To: `whatsapp:${phone}`,
      Body: message,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send WhatsApp: ${error}`);
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('🔔 Running Day 2 trial reminder check...');

    // Get tomorrow's date range
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0)).toISOString();
    const tomorrowEnd = new Date(tomorrow.setHours(23, 59, 59, 999)).toISOString();

    // Find users whose trial ends tomorrow
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('user_id, name, phone, whatsapp_opt_in, stripe_customer_id')
      .eq('plan_type', 'premium')
      .gte('plan_expires_at', tomorrowStart)
      .lte('plan_expires_at', tomorrowEnd);

    if (usersError) {
      throw usersError;
    }

    console.log(`Found ${users?.length || 0} users with trial ending tomorrow`);

    const results: any[] = [];

    for (const user of users || []) {
      // Check if already notified
      const { data: existing } = await supabase
        .from('trial_notifications')
        .select('id')
        .eq('user_id', user.user_id)
        .eq('notification_type', 'day_2_reminder')
        .single();

      if (existing) {
        console.log(`User ${user.user_id} already notified, skipping`);
        continue;
      }

      // Get user email from auth
      const { data: authData } = await supabase.auth.admin.getUserById(user.user_id);
      const email = authData?.user?.email;

      if (!email) {
        console.log(`No email for user ${user.user_id}, skipping`);
        continue;
      }

      const userResult: any = { user_id: user.user_id };

      // Send email
      try {
        await sendReminderEmail(email, user.name, user.stripe_customer_id);
        await supabase.from('trial_notifications').insert({
          user_id: user.user_id,
          notification_type: 'day_2_reminder',
          channel: 'email',
        });
        userResult.email = 'sent';
        console.log(`✅ Day 2 email sent to ${email}`);
      } catch (err) {
        console.error(`❌ Email error for ${user.user_id}:`, err);
        userResult.email = 'error';
      }

      // Send WhatsApp if opted in
      if (user.whatsapp_opt_in && user.phone) {
        try {
          await sendReminderWhatsApp(user.phone, user.name);
          await supabase.from('trial_notifications').insert({
            user_id: user.user_id,
            notification_type: 'day_2_reminder',
            channel: 'whatsapp',
          });
          userResult.whatsapp = 'sent';
          console.log(`✅ Day 2 WhatsApp sent to ${user.phone}`);
        } catch (err) {
          console.error(`❌ WhatsApp error for ${user.user_id}:`, err);
          userResult.whatsapp = 'error';
        }
      }

      results.push(userResult);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: results.length,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in trial-reminder:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
