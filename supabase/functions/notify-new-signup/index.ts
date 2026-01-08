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
          <html lang="pt-BR">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bem-vindo ao DietaFY</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            
            <!-- Container Principal -->
            <div style="max-width: 640px; margin: 0 auto; background-color: #1e293b;">
              
              <!-- Header Premium com Badge -->
              <div style="background: linear-gradient(145deg, #059669 0%, #047857 50%, #065f46 100%); padding: 50px 40px; text-align: center; position: relative;">
                <!-- Logo/Ícone -->
                <div style="margin-bottom: 20px;">
                  <span style="font-size: 60px;">🍉</span>
                </div>
                
                <!-- Badge Membro Oficial -->
                <div style="display: inline-block; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); padding: 8px 20px; border-radius: 50px; margin-bottom: 20px;">
                  <span style="color: #fcd34d; font-size: 14px; font-weight: 600; letter-spacing: 1px;">⭐ MEMBRO OFICIAL</span>
                </div>
                
                <h1 style="color: white; font-size: 36px; margin: 0 0 15px 0; font-weight: 800; line-height: 1.2;">
                  Bem-vindo(a) ao DietaFY!
                </h1>
                <p style="color: rgba(255,255,255,0.9); font-size: 20px; margin: 0; font-weight: 400;">
                  Olá, <strong>${userName}</strong>! Sua transformação começa agora.
                </p>
              </div>
              
              <!-- Mensagem de Boas-Vindas -->
              <div style="padding: 45px 40px 35px 40px; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);">
                <div style="background: linear-gradient(145deg, #1e3a5f 0%, #1e293b 100%); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 20px; padding: 35px; margin-bottom: 30px;">
                  <p style="color: #e2e8f0; font-size: 17px; line-height: 1.8; margin: 0 0 20px 0;">
                    Você acaba de dar o passo mais importante da sua jornada de transformação! 🎯
                  </p>
                  <p style="color: #cbd5e1; font-size: 16px; line-height: 1.8; margin: 0;">
                    A <span style="color: #10b981; font-weight: 700;">Vita</span>, nossa nutricionista com inteligência artificial, está pronta para te acompanhar <strong style="color: #fcd34d;">24 horas por dia, 7 dias por semana</strong>. Ela vai analisar suas refeições, responder suas dúvidas e te guiar rumo aos seus objetivos!
                  </p>
                </div>
              </div>
              
              <!-- Card: O que você já pode fazer -->
              <div style="padding: 0 40px 35px 40px; background-color: #0f172a;">
                <div style="background: linear-gradient(145deg, #064e3b 0%, #065f46 100%); border-radius: 20px; padding: 35px; border: 1px solid rgba(16, 185, 129, 0.4);">
                  <div style="display: flex; align-items: center; margin-bottom: 25px;">
                    <span style="font-size: 28px; margin-right: 12px;">✅</span>
                    <h2 style="color: #ecfdf5; font-size: 22px; margin: 0; font-weight: 700;">O que você já pode fazer:</h2>
                  </div>
                  
                  <table style="width: 100%;">
                    <tr>
                      <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <span style="color: #34d399; font-size: 18px; margin-right: 10px;">📸</span>
                        <span style="color: #d1fae5; font-size: 15px;">Registrar até <strong>5 refeições por dia</strong> com análise da Vita</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <span style="color: #34d399; font-size: 18px; margin-right: 10px;">💬</span>
                        <span style="color: #d1fae5; font-size: 15px;">Enviar até <strong>10 mensagens diárias</strong> para a Vita</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <span style="color: #34d399; font-size: 18px; margin-right: 10px;">🏋️</span>
                        <span style="color: #d1fae5; font-size: 15px;">Acessar <strong>3 treinos básicos</strong> para começar</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0;">
                        <span style="color: #34d399; font-size: 18px; margin-right: 10px;">📊</span>
                        <span style="color: #d1fae5; font-size: 15px;">Acompanhar seu <strong>progresso</strong> de peso e hidratação</span>
                      </td>
                    </tr>
                  </table>
                </div>
              </div>
              
              <!-- Card Premium (Destaque Principal) -->
              <div style="padding: 0 40px 40px 40px; background-color: #0f172a;">
                <div style="background: linear-gradient(145deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%); border-radius: 24px; padding: 40px; text-align: center; box-shadow: 0 20px 60px rgba(251, 191, 36, 0.3);">
                  
                  <!-- Coroa Premium -->
                  <div style="margin-bottom: 15px;">
                    <span style="font-size: 50px;">👑</span>
                  </div>
                  
                  <h2 style="color: #1f2937; font-size: 28px; margin: 0 0 25px 0; font-weight: 800;">
                    Desbloqueie Todo o Potencial
                  </h2>
                  
                  <div style="background: rgba(255,255,255,0.95); border-radius: 16px; padding: 25px; margin-bottom: 30px; text-align: left;">
                    <table style="width: 100%;">
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #059669; font-weight: 700;">✨</span>
                          <span style="color: #374151; font-size: 15px; margin-left: 8px;">Refeições e mensagens <strong>ILIMITADAS</strong></span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #059669; font-weight: 700;">🏆</span>
                          <span style="color: #374151; font-size: 15px; margin-left: 8px;">Biblioteca completa com <strong>todos os treinos</strong></span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #059669; font-weight: 700;">📅</span>
                          <span style="color: #374151; font-size: 15px; margin-left: 8px;">Blocos de treino de <strong>4 a 8 semanas</strong></span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #059669; font-weight: 700;">📱</span>
                          <span style="color: #374151; font-size: 15px; margin-left: 8px;">WhatsApp <strong>24/7</strong> com a Vita</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #059669; font-weight: 700;">📈</span>
                          <span style="color: #374151; font-size: 15px; margin-left: 8px;">Análises <strong>avançadas</strong> e relatórios</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #059669; font-weight: 700;">🎯</span>
                          <span style="color: #374151; font-size: 15px; margin-left: 8px;">Planos <strong>personalizados</strong> + suporte VIP</span>
                        </td>
                      </tr>
                    </table>
                  </div>
                  
                  <!-- Preço -->
                  <div style="margin-bottom: 25px;">
                    <p style="color: #1f2937; font-size: 16px; margin: 0 0 5px 0; text-decoration: line-through; opacity: 0.7;">De R$ 59,90/mês</p>
                    <p style="color: #1f2937; font-size: 42px; font-weight: 800; margin: 0;">R$ 29,90<span style="font-size: 18px; font-weight: 600;">/mês</span></p>
                    <p style="color: #374151; font-size: 14px; margin: 8px 0 0 0;">ou R$ 197/ano <span style="background: #059669; color: white; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 700;">ECONOMIA DE R$ 161</span></p>
                  </div>
                  
                  <!-- CTA Premium -->
                  <a href="https://pay.kiwify.com.br/4DKAQbY" style="display: inline-block; background: linear-gradient(145deg, #059669 0%, #047857 100%); color: white; padding: 18px 50px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 18px; box-shadow: 0 8px 30px rgba(5, 150, 105, 0.4); transition: all 0.3s;">
                    Quero ser Premium! 🚀
                  </a>
                </div>
              </div>
              
              <!-- Seção: Primeiros Passos -->
              <div style="padding: 0 40px 40px 40px; background-color: #0f172a;">
                <div style="background: #1e293b; border-radius: 20px; padding: 35px; border: 1px solid rgba(255,255,255,0.1);">
                  <h3 style="color: #f1f5f9; font-size: 20px; margin: 0 0 25px 0; font-weight: 700;">
                    🎯 Seus Próximos Passos
                  </h3>
                  
                  <!-- Timeline -->
                  <table style="width: 100%;">
                    <tr>
                      <td style="width: 50px; vertical-align: top; padding-bottom: 20px;">
                        <div style="width: 36px; height: 36px; background: linear-gradient(145deg, #10b981, #059669); border-radius: 50%; text-align: center; line-height: 36px; color: white; font-weight: 700;">1</div>
                      </td>
                      <td style="padding-bottom: 20px; padding-left: 15px;">
                        <p style="color: #e2e8f0; font-size: 15px; margin: 0; line-height: 1.6;">
                          <strong>Complete seu perfil</strong><br>
                          <span style="color: #94a3b8;">Assim a Vita pode personalizar suas recomendações</span>
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="width: 50px; vertical-align: top; padding-bottom: 20px;">
                        <div style="width: 36px; height: 36px; background: linear-gradient(145deg, #10b981, #059669); border-radius: 50%; text-align: center; line-height: 36px; color: white; font-weight: 700;">2</div>
                      </td>
                      <td style="padding-bottom: 20px; padding-left: 15px;">
                        <p style="color: #e2e8f0; font-size: 15px; margin: 0; line-height: 1.6;">
                          <strong>Registre sua primeira refeição</strong><br>
                          <span style="color: #94a3b8;">Tire uma foto e veja a mágica acontecer</span>
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="width: 50px; vertical-align: top;">
                        <div style="width: 36px; height: 36px; background: linear-gradient(145deg, #10b981, #059669); border-radius: 50%; text-align: center; line-height: 36px; color: white; font-weight: 700;">3</div>
                      </td>
                      <td style="padding-left: 15px;">
                        <p style="color: #e2e8f0; font-size: 15px; margin: 0; line-height: 1.6;">
                          <strong>Converse com a Vita</strong><br>
                          <span style="color: #94a3b8;">Ela está pronta para responder qualquer dúvida</span>
                        </p>
                      </td>
                    </tr>
                  </table>
                </div>
              </div>
              
              <!-- Depoimento / Social Proof -->
              <div style="padding: 0 40px 40px 40px; background-color: #0f172a;">
                <div style="background: linear-gradient(145deg, #1e3a5f, #1e293b); border-radius: 20px; padding: 30px; border-left: 4px solid #10b981;">
                  <p style="color: #e2e8f0; font-size: 16px; line-height: 1.7; margin: 0 0 15px 0; font-style: italic;">
                    "A Vita mudou completamente minha relação com a comida. Em 3 meses, perdi 8kg e ganhei muito mais energia!"
                  </p>
                  <p style="color: #10b981; font-size: 14px; margin: 0; font-weight: 600;">
                    — Maria S., usuária Premium
                  </p>
                </div>
              </div>
              
              <!-- CTA Principal -->
              <div style="padding: 0 40px 50px 40px; background-color: #0f172a; text-align: center;">
                <a href="https://dietafy.site/dashboard" style="display: inline-block; background: linear-gradient(145deg, #10b981 0%, #059669 100%); color: white; padding: 18px 45px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 17px; box-shadow: 0 8px 25px rgba(16, 185, 129, 0.35);">
                  Acessar Minha Conta →
                </a>
                <p style="color: #64748b; font-size: 14px; margin: 20px 0 0 0;">
                  Ou fale diretamente com a Vita no app 💬
                </p>
              </div>
              
              <!-- Footer Premium -->
              <div style="background: linear-gradient(180deg, #0f172a 0%, #020617 100%); padding: 40px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1);">
                <!-- Logo Footer -->
                <p style="font-size: 28px; margin: 0 0 15px 0;">🍉</p>
                <p style="color: #94a3b8; font-size: 16px; margin: 0 0 20px 0; font-weight: 600;">DietaFY</p>
                
                <!-- Links Sociais -->
                <div style="margin-bottom: 25px;">
                  <a href="https://instagram.com/dietafy" style="display: inline-block; color: #64748b; text-decoration: none; margin: 0 15px; font-size: 14px;">Instagram</a>
                  <span style="color: #334155;">•</span>
                  <a href="https://wa.me/5511999999999" style="display: inline-block; color: #64748b; text-decoration: none; margin: 0 15px; font-size: 14px;">WhatsApp</a>
                </div>
                
                <p style="color: #475569; font-size: 13px; margin: 0 0 10px 0;">
                  Precisa de ajuda? Responda este e-mail ou fale com a Vita.
                </p>
                
                <p style="color: #334155; font-size: 12px; margin: 0;">
                  © 2026 DietaFY. Todos os direitos reservados.<br>
                  Você recebeu este e-mail porque se cadastrou no DietaFY.<br><br>
                  <a href="https://dietafy.site/privacidade" style="color: #475569; text-decoration: underline;">Política de Privacidade</a>
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
