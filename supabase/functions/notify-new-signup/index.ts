import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NewSignupPayload = await req.json();
    
    console.log("New signup detected:", payload);

    const userEmail = payload.record.email;
    const userName = payload.record.raw_user_meta_data?.full_name || "Não informado";
    const userId = payload.record.id;
    const createdAt = new Date(payload.record.created_at).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });

    // Send email notification to admin
    const emailResponse = await resend.emails.send({
      from: "DietaFY Notificações <onboarding@resend.dev>",
      to: ["fabiocortesmkt@gmail.com"],
      subject: `🎉 Novo cadastro no DietaFY!`,
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

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Notification email sent" }),
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
