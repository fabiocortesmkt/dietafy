import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

function createSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

async function logWhatsAppMessage(
  supabase: SupabaseClient,
  userId: string,
  phone: string,
  status: "sent" | "failed",
  errorMessage?: string
) {
  const { error } = await supabase.from("email_logs").insert({
    user_id: userId,
    email_to: phone,
    email_type: "whatsapp_welcome",
    function_name: "whatsapp-welcome",
    subject: "Mensagem de Boas-vindas WhatsApp",
    status: status,
    error_message: errorMessage || null,
  });

  if (error) {
    console.error("Error logging WhatsApp message:", error);
  }
}

function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "");
  
  // If already has country code (55), use as is
  if (digits.startsWith("55") && digits.length >= 12) {
    return `+${digits}`;
  }
  
  // Otherwise, add Brazil country code
  return `+55${digits}`;
}

async function sendWhatsAppMessage(to: string, body: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
    console.error("Twilio env vars are not configured");
    return false;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const params = new URLSearchParams({
    From: TWILIO_WHATSAPP_NUMBER,
    To: `whatsapp:${to}`,
    Body: body,
  });

  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Error sending WhatsApp welcome message", res.status, text);
      return false;
    }

    console.log("WhatsApp welcome message sent successfully to", to);
    return true;
  } catch (err) {
    console.error("Exception sending WhatsApp welcome message", err);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  let payload: { phone: string; name: string; user_id: string };
  try {
    payload = await req.json();
  } catch (err) {
    console.error("Invalid JSON in whatsapp-welcome", err);
    return new Response("Bad Request", { status: 400, headers: corsHeaders });
  }

  const { phone, name, user_id } = payload;

  if (!phone || !user_id) {
    console.error("Missing phone or user_id in whatsapp-welcome");
    return new Response("Missing required fields", { status: 400, headers: corsHeaders });
  }

  console.log(`Processing welcome message for user ${user_id}, phone: ${phone}`);

  const formattedPhone = formatPhoneNumber(phone);
  const displayName = name || "amigo(a)";

  // Compose welcome message with premium benefits
  const welcomeMessage = `🍉 Olá, ${displayName}! Bem-vindo(a) ao *DietaFY*!

Eu sou a *Vita*, sua assistente de nutrição e fitness. Estou aqui para te ajudar 24h! 💚

📸 Me mande uma *foto da sua refeição* e eu analiso na hora
💧 Use */agua 500* para registrar água
⚖️ Use */peso 78.5* para registrar seu peso
🏋️ Use */treino* para sugestões de treino
📊 Use */relatorio* para ver seu resumo semanal

⭐ *BENEFÍCIOS PREMIUM*:
✅ Mensagens ilimitadas comigo
✅ Todos os treinos liberados
✅ Blocos de 4-8 semanas
✅ Análises avançadas de nutrição
✅ Suporte prioritário

👉 Faça upgrade agora: https://dietafy.com.br/auth?mode=signup

Vamos começar? Me manda sua primeira mensagem! 🚀`;

  const sent = await sendWhatsAppMessage(formattedPhone, welcomeMessage);
  const supabase = createSupabaseClient();

  if (sent) {
    // Log success to email_logs table for admin visibility
    await logWhatsAppMessage(supabase, user_id, formattedPhone, "sent");

    // Log the message to whatsapp_messages table
    const now = new Date().toISOString();

    const { error: logError } = await supabase.from("whatsapp_messages").insert({
      user_id: user_id,
      direction: "outbound",
      message_text: welcomeMessage,
      timestamp: now,
    });

    if (logError) {
      console.error("Error logging welcome whatsapp_message", logError);
    }

    // Update last message timestamp on user profile
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ 
        whatsapp_last_message_at: now,
        whatsapp_active: true 
      })
      .eq("user_id", user_id);

    if (updateError) {
      console.error("Error updating profile whatsapp_last_message_at", updateError);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Welcome message sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Log failure to email_logs table for admin visibility
  await logWhatsAppMessage(supabase, user_id, formattedPhone, "failed", "Twilio API failed to send message");

  return new Response(
    JSON.stringify({ success: false, message: "Failed to send welcome message" }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
