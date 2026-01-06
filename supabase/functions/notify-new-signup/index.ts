import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

console.log("notify-new-signup: Function loaded");
console.log("notify-new-signup: RESEND_API_KEY configured:", !!RESEND_API_KEY);

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NewSignupPayload {
  type: string;
  table: string;
  record: {
    id: string;
    email: string;
    created_at: string;
    raw_user_meta_data?: {
      full_name?: string;
    };
  };
}

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
      function_name: 'notify-new-signup'
    });
  } catch (logError) {
    console.error('Failed to log email:', logError);
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-new-signup: Request received, method:", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verificar se RESEND_API_KEY está configurado
  if (!resend) {
    console.error("notify-new-signup: RESEND_API_KEY is not configured!");
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const rawBody = await req.text();
    console.log("notify-new-signup: Raw request body:", rawBody);
    
    const payload: NewSignupPayload = JSON.parse(rawBody);
    
    console.log("notify-new-signup: Parsed payload:", JSON.stringify(payload, null, 2));

    const userEmail = payload.record.email;
    const userName = payload.record.raw_user_meta_data?.full_name || "Usuário";
    const userId = payload.record.id;
    const createdAt = new Date(payload.record.created_at).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });

    // 1. Send email notification to admin
    const adminSubject = `🎉 Novo cadastro no DietaFY!`;
    try {
      const adminEmailResponse = await resend.emails.send({
        from: "DietaFY <noreply@dietafy.site>",
        to: ["fabiocortesmkt@gmail.com"],
        subject: adminSubject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
            <h1 style="color: #10b981; margin-bottom: 20px;">🎉 Novo usuário cadastrado!</h1>
            
            <div style="background: white; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
              <h2 style="color: #333; font-size: 18px; margin-bottom: 15px;">Detalhes do novo usuário:</h2>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0; color: #666; font-weight: bold;">Nome:</td>
                  <td style="padding: 10px 0; color: #333;">${userName}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0; color: #666; font-weight: bold;">E-mail:</td>
                  <td style="padding: 10px 0; color: #333;">${userEmail}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0; color: #666; font-weight: bold;">ID do usuário:</td>
                  <td style="padding: 10px 0; color: #333; font-size: 12px; font-family: monospace;">${userId}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #666; font-weight: bold;">Data/Hora:</td>
                  <td style="padding: 10px 0; color: #333;">${createdAt}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              Este e-mail foi gerado automaticamente pelo sistema DietaFY.
            </p>
          </div>
        `,
      });

      console.log("Admin notification email sent:", adminEmailResponse);
      await logEmail(supabase, userId, "fabiocortesmkt@gmail.com", "admin_new_signup", adminSubject, "sent", adminEmailResponse, null);
    } catch (adminError: any) {
      console.error("Failed to send admin email:", adminError);
      await logEmail(supabase, userId, "fabiocortesmkt@gmail.com", "admin_new_signup", adminSubject, "failed", null, adminError.message);
    }

    // 2. Send welcome email to new user
    const welcomeSubject = `🍉 Bem-vindo(a) ao DietaFY, ${userName}! Sua jornada começa agora`;
    try {
      const welcomeEmailResponse = await resend.emails.send({
        from: "DietaFY <noreply@dietafy.site>",
        to: [userEmail],
        subject: welcomeSubject,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              
              <!-- Header com gradiente verde -->
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                <h1 style="color: white; font-size: 32px; margin: 0 0 10px 0; font-weight: 700;">🍉 Bem-vindo(a) ao DietaFY!</h1>
                <p style="color: rgba(255,255,255,0.95); font-size: 18px; margin: 0;">Olá, ${userName}! Sua jornada de transformação começa agora.</p>
              </div>
              
              <!-- Introdução -->
              <div style="padding: 30px;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Você acaba de dar o primeiro passo para transformar sua saúde e alcançar seus objetivos! 💪
                </p>
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  A <strong style="color: #10b981;">Vita</strong>, nossa assistente de IA especializada em nutrição e fitness, está pronta para te acompanhar 24 horas por dia, 7 dias por semana. Ela vai te ajudar com dicas personalizadas, análise das suas refeições e muito mais!
                </p>
              </div>
              
              <!-- O que você já pode fazer (Free) -->
              <div style="background-color: #f0fdf4; padding: 25px 30px; margin: 0 20px; border-radius: 12px; border-left: 4px solid #10b981;">
                <h2 style="color: #065f46; font-size: 20px; margin: 0 0 15px 0;">✅ O que você já pode fazer:</h2>
                <ul style="color: #374151; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>Registrar até <strong>5 refeições por dia</strong> com análise da Vita</li>
                  <li>Enviar até <strong>10 mensagens diárias</strong> para a Vita</li>
                  <li>Acessar <strong>3 treinos básicos</strong> para começar</li>
                  <li>Acompanhar seu <strong>progresso</strong> de peso e água</li>
                </ul>
              </div>
              
              <!-- Benefícios Premium (destaque principal) -->
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; margin: 25px 20px; border-radius: 16px; text-align: center;">
                <h2 style="color: white; font-size: 24px; margin: 0 0 20px 0;">⭐ Desbloqueie todo o potencial com o Premium</h2>
                
                <div style="text-align: left; background: rgba(255,255,255,0.15); padding: 20px; border-radius: 12px; margin-bottom: 25px;">
                  <ul style="color: white; font-size: 15px; line-height: 2; margin: 0; padding-left: 20px; list-style: none;">
                    <li style="margin-bottom: 8px;">✨ <strong>Refeições e mensagens ILIMITADAS</strong> com a Vita</li>
                    <li style="margin-bottom: 8px;">🏋️ <strong>Biblioteca completa</strong> com todos os treinos premium</li>
                    <li style="margin-bottom: 8px;">📅 <strong>Blocos de treino organizados</strong> de 4 a 8 semanas</li>
                    <li style="margin-bottom: 8px;">📱 <strong>WhatsApp ativo 24/7</strong> com a Vita</li>
                    <li style="margin-bottom: 8px;">📊 <strong>Análises avançadas</strong> e relatórios completos</li>
                    <li style="margin-bottom: 8px;">🎯 <strong>Planos personalizados</strong> e suporte prioritário</li>
                  </ul>
                </div>
                
                <p style="color: white; font-size: 28px; font-weight: 700; margin: 0 0 5px 0;">Por apenas R$ 29,90/mês</p>
                <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 0 0 20px 0;">ou R$ 197/ano (economia de R$ 161!)</p>
                
                <a href="https://dietafy.com.br/auth?mode=signup" style="display: inline-block; background: white; color: #059669; padding: 16px 45px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 18px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                  Quero ser Premium! 🚀
                </a>
              </div>
              
              <!-- Próximos passos -->
              <div style="padding: 30px;">
                <h3 style="color: #1f2937; font-size: 18px; margin: 0 0 15px 0;">🎯 Seus próximos passos:</h3>
                <ol style="color: #374151; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>Complete seu <strong>perfil</strong> para receber dicas personalizadas</li>
                  <li>Registre sua <strong>primeira refeição</strong> e veja a mágica acontecer</li>
                  <li>Converse com a <strong>Vita</strong> e tire todas as suas dúvidas</li>
                </ol>
              </div>
              
              <!-- CTA secundário -->
              <div style="text-align: center; padding: 0 30px 30px 30px;">
                <a href="https://dietafy.com.br/dashboard" style="display: inline-block; background: #10b981; color: white; padding: 14px 35px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Acessar minha conta →
                </a>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                  Precisando de ajuda? Responda este e-mail ou fale com a Vita no app.
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  © 2025 DietaFY. Todos os direitos reservados.<br>
                  Você está recebendo este e-mail porque se cadastrou no DietaFY.
                </p>
              </div>
              
            </div>
          </body>
          </html>
        `,
      });

      console.log("Welcome email sent to user:", welcomeEmailResponse);
      await logEmail(supabase, userId, userEmail, "welcome", welcomeSubject, "sent", welcomeEmailResponse, null);
    } catch (welcomeError: any) {
      console.error("Failed to send welcome email:", welcomeError);
      await logEmail(supabase, userId, userEmail, "welcome", welcomeSubject, "failed", null, welcomeError.message);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification and welcome emails processed"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-new-signup function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
