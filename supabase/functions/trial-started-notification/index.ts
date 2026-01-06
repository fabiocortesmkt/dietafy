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

async function logEmail(
  supabase: any,
  userId: string | null,
  emailTo: string,
  emailType: string,
  subject: string,
  status: 'sent' | 'failed',
  providerResponse: any,
  errorMessage: string | null
) {
  try {
    await supabase.from('email_logs').insert({
      user_id: userId,
      email_to: emailTo,
      email_type: emailType,
      subject: subject,
      status: status,
      provider_response: providerResponse,
      error_message: errorMessage,
      function_name: 'trial-started-notification'
    });
  } catch (logError) {
    console.error('Failed to log email:', logError);
  }
}

async function sendEmail(to: string, name: string) {
  const firstName = name?.split(' ')[0] || 'você';
  
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
            <td style="background: linear-gradient(135deg, #10b981, #059669); padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                Seu teste grátis começou!
              </h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">
                3 dias para experimentar o Dietafy Premium
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Olá, <strong>${firstName}</strong>! 👋
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Ótima notícia! Seu teste grátis de <strong>3 dias</strong> do Dietafy Premium está ativo. 
                <strong>Nenhuma cobrança foi feita ainda</strong> – você só será cobrado após o período de teste.
              </p>
              
              <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-radius: 12px; padding: 25px; margin: 25px 0;">
                <h3 style="color: #166534; margin: 0 0 15px; font-size: 18px;">✨ O que você pode fazer agora:</h3>
                <ul style="color: #166534; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Conversar ilimitadamente com a Vita, sua nutricionista IA</li>
                  <li>Receber planos alimentares personalizados</li>
                  <li>Acompanhar seu progresso com análises detalhadas</li>
                  <li>Registrar refeições por foto ou texto</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://dietafy.app/dashboard" 
                   style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(16,185,129,0.4);">
                  Acessar minha conta →
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0; text-align: center;">
                Se tiver qualquer dúvida, é só responder este email!
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
      from: 'Dietafy <noreply@dietafy.site>',
      to: [to],
      subject: '🎉 Seu teste grátis de 3 dias começou!',
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return await response.json();
}

async function sendWhatsApp(phone: string, name: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
    console.log('Twilio credentials not configured, skipping WhatsApp');
    return null;
  }

  const firstName = name?.split(' ')[0] || 'você';
  const message = `🎉 *Olá, ${firstName}!*

Seu teste grátis de 3 dias do Dietafy Premium está ativo!

✅ Nenhuma cobrança foi feita ainda
✅ Acesso total a todos os recursos Premium
✅ Vita, sua nutricionista IA, está pronta para te ajudar

Acesse agora: https://dietafy.app/dashboard

Qualquer dúvida, é só responder aqui! 💚`;

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

    const { user_id, email, name, phone, whatsapp_opt_in } = await req.json();

    console.log(`📧 Day 0 notification for user ${user_id}`);

    // Check if already sent
    const { data: existing } = await supabase
      .from('trial_notifications')
      .select('id')
      .eq('user_id', user_id)
      .eq('notification_type', 'day_0_trial_started')
      .single();

    if (existing) {
      console.log('Day 0 notification already sent, skipping');
      return new Response(JSON.stringify({ message: 'Already sent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: { email?: any; whatsapp?: any } = {};

    // Send email
    const emailSubject = '🎉 Seu teste grátis de 3 dias começou!';
    if (email) {
      try {
        results.email = await sendEmail(email, name);
        await supabase.from('trial_notifications').insert({
          user_id,
          notification_type: 'day_0_trial_started',
          channel: 'email',
        });
        await logEmail(supabase, user_id, email, 'trial_started', emailSubject, 'sent', results.email, null);
        console.log('✅ Day 0 email sent');
      } catch (err: any) {
        console.error('❌ Email error:', err);
        await logEmail(supabase, user_id, email, 'trial_started', emailSubject, 'failed', null, err.message);
      }
    }

    // Send WhatsApp if opted in
    if (whatsapp_opt_in && phone) {
      try {
        results.whatsapp = await sendWhatsApp(phone, name);
        await supabase.from('trial_notifications').insert({
          user_id,
          notification_type: 'day_0_trial_started',
          channel: 'whatsapp',
        });
        console.log('✅ Day 0 WhatsApp sent');
      } catch (err) {
        console.error('❌ WhatsApp error:', err);
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in trial-started-notification:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
