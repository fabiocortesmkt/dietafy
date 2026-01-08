import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
      function_name: 'follow-up-email'
    });
  } catch (logError) {
    console.error('Failed to log email:', logError);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get users who signed up exactly 3 days ago and are still on free plan
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const startOfDay = new Date(threeDaysAgo);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(threeDaysAgo);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`Looking for users who signed up between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`);

    // Get free users from user_profiles who signed up 3 days ago
    const { data: freeUsers, error: profilesError } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, full_name, created_at, plan_type")
      .eq("plan_type", "free")
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString());

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    console.log(`Found ${freeUsers?.length || 0} free users from 3 days ago`);

    if (!freeUsers || freeUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No users to follow up", emailsSent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get emails from auth.users
    const userIds = freeUsers.map(u => u.user_id);
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error("Error fetching auth users:", authError);
      throw authError;
    }

    const emailsSent: string[] = [];

    for (const profile of freeUsers) {
      const authUser = authUsers.users.find(u => u.id === profile.user_id);
      if (!authUser?.email) {
        console.log(`No email found for user ${profile.user_id}`);
        continue;
      }

      const userName = profile.full_name || "Usuário";
      const userEmail = authUser.email;

      console.log(`Sending follow-up email to ${userEmail}`);
      const emailSubject = `${userName}, como estão seus primeiros dias no DietaFY? 🍉`;

      try {
        const emailResponse = await resend.emails.send({
          from: "DietaFY <noreply@dietafy.site>",
          to: [userEmail],
          subject: emailSubject,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="color: white; font-size: 28px; margin: 0 0 10px 0; font-weight: 700;">Olá, ${userName}! 👋</h1>
                  <p style="color: rgba(255,255,255,0.95); font-size: 18px; margin: 0;">Já se passaram 3 dias desde que você entrou para o DietaFY</p>
                </div>
                
                <!-- Conteúdo principal -->
                <div style="padding: 30px;">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Queria saber como estão seus primeiros dias! A <strong style="color: #10b981;">Vita</strong> está aqui para te ajudar em cada passo da sua jornada. 🚀
                  </p>
                  
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Percebemos que você ainda está no plano gratuito. Sabia que no <strong>Premium</strong> você pode:
                  </p>
                </div>
                
                <!-- Benefícios que está perdendo -->
                <div style="background-color: #fef3c7; padding: 25px 30px; margin: 0 20px; border-radius: 12px; border-left: 4px solid #f59e0b;">
                  <h3 style="color: #92400e; font-size: 18px; margin: 0 0 15px 0;">⚡ O que você está perdendo:</h3>
                  <ul style="color: #78350f; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                    <li>Mensagens <strong>ilimitadas</strong> com a Vita (sem o limite de 10/dia)</li>
                    <li>Análise de <strong>todas as refeições</strong> que quiser</li>
                    <li><strong>Treinos premium</strong> organizados em blocos de 4-8 semanas</li>
                    <li><strong>WhatsApp 24/7</strong> com a Vita sempre que precisar</li>
                  </ul>
                </div>
                
                <!-- Depoimento/Social proof -->
                <div style="padding: 30px;">
                  <div style="background-color: #f0fdf4; padding: 20px; border-radius: 12px; border-left: 4px solid #10b981;">
                    <p style="color: #374151; font-size: 15px; font-style: italic; margin: 0 0 10px 0;">
                      "Eu estava igual a você, usando o gratuito. Depois que fiz o upgrade, consegui perder 8kg em 2 meses! A Vita no WhatsApp é sensacional."
                    </p>
                    <p style="color: #6b7280; font-size: 14px; margin: 0;">— Maria S., usuária Premium</p>
                  </div>
                </div>
                
                <!-- Oferta especial -->
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; margin: 0 20px 25px 20px; border-radius: 16px; text-align: center;">
                  <h2 style="color: white; font-size: 22px; margin: 0 0 15px 0;">🎁 Oferta especial para você!</h2>
                  <p style="color: rgba(255,255,255,0.95); font-size: 16px; margin: 0 0 20px 0;">
                    Como você está começando sua jornada, queremos te ajudar a ir mais longe.
                  </p>
                  <p style="color: white; font-size: 32px; font-weight: 700; margin: 0 0 5px 0;">R$ 29,90/mês</p>
                  <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 0 0 20px 0;">Menos de R$ 1 por dia para transformar sua vida!</p>
                  
                  <a href="https://pay.kiwify.com.br/4DKAQbY" style="display: inline-block; background: white; color: #059669; padding: 16px 45px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 18px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                    Quero resultados reais! 🚀
                  </a>
                </div>
                
                <!-- Alternativa -->
                <div style="padding: 0 30px 30px 30px; text-align: center;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">
                    Quer continuar no plano gratuito? Sem problemas! 
                    <a href="https://dietafy.site/dashboard" style="color: #10b981; text-decoration: underline;">Acesse seu dashboard</a>
                    e aproveite ao máximo.
                  </p>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                    Tem dúvidas? Responda este e-mail ou fale com a Vita no app!
                  </p>
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    © 2025 DietaFY. Todos os direitos reservados.<br>
                    <a href="#" style="color: #9ca3af;">Cancelar inscrição</a>
                  </p>
                </div>
                
              </div>
            </body>
            </html>
          `,
        });

        console.log(`Follow-up email sent to ${userEmail}:`, emailResponse);
        await logEmail(supabaseAdmin, profile.user_id, userEmail, 'follow_up_day_3', emailSubject, 'sent', emailResponse, null);
        emailsSent.push(userEmail);
      } catch (emailError: any) {
        console.error(`Failed to send follow-up email to ${userEmail}:`, emailError);
        await logEmail(supabaseAdmin, profile.user_id, userEmail, 'follow_up_day_3', emailSubject, 'failed', null, emailError.message);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Follow-up emails sent to ${emailsSent.length} users`,
        emailsSent 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in follow-up-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
