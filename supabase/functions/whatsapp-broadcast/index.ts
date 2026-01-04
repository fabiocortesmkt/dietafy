import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

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

async function sendWhatsAppMessage(to: string, body: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
    console.error("Twilio env vars are not configured in whatsapp-broadcast");
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const params = new URLSearchParams({
    From: TWILIO_WHATSAPP_NUMBER,
    To: `whatsapp:${to}`,
    Body: body,
  });

  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

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
    console.error("Error sending WhatsApp broadcast message", res.status, text);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabase = createSupabaseClient();

  let payload: { type?: string };
  try {
    payload = await req.json();
  } catch (err) {
    console.error("Invalid JSON in whatsapp-broadcast", err);
    return new Response("Bad Request", { status: 400, headers: corsHeaders });
  }

  const type = payload.type;
  if (!type) {
    return new Response("Missing type", { status: 400, headers: corsHeaders });
  }

  const { data: profiles, error } = await supabase
    .from("user_profiles")
    .select("id, user_id, full_name, whatsapp_phone, whatsapp_opt_in, whatsapp_active")
    .eq("whatsapp_opt_in", true)
    .eq("whatsapp_active", true)
    .not("whatsapp_phone", "is", null);

  if (error) {
    console.error("Error fetching profiles for broadcast", error);
    return new Response("Internal Error", { status: 500, headers: corsHeaders });
  }

  if (!profiles || profiles.length === 0) {
    return new Response("No recipients", { status: 200, headers: corsHeaders });
  }

  const now = new Date().toISOString();

  for (const profile of profiles) {
    const phone: string = profile.whatsapp_phone;
    const name: string | null = profile.full_name ?? null;

    let message: string;

    if (type === "morning_checkin") {
      message = `☀️ Bom dia, ${name ?? "tudo bem"}! Como você dormiu? [1] Muito bem 😴 [2] Normal 😊 [3] Mal 😓 Responda com o número!`;
    } else if (type === "lunch_reminder") {
      message = "Hora do almoço! 🍽️ O que vai comer? Me manda uma foto que eu analiso pra você.";
    } else if (type === "workout_reminder") {
      message = "Treinou hoje? 💪 Se quiser, te sugiro um treino rápido baseado nos seus objetivos.";
    } else if (type === "water_reminder") {
      message = "Bebeu 2L de água hoje? 💧 Se ainda não chegou lá, me manda /agua 300 para registrar um copo agora.";
    } else {
      console.warn("Unknown broadcast type", type);
      continue;
    }

    await sendWhatsAppMessage(phone, message);

    const { error: logError } = await supabase.from("whatsapp_messages").insert({
      user_id: profile.user_id,
      direction: "outbound",
      message_text: message,
      timestamp: now,
    });

    if (logError) {
      console.error("Error logging broadcast whatsapp_message", logError);
    }

    const { error: updateProfileError } = await supabase
      .from("user_profiles")
      .update({ whatsapp_last_message_at: now })
      .eq("id", profile.id);

    if (updateProfileError) {
      console.error("Error updating profile last_message_at in broadcast", updateProfileError);
    }
  }

  return new Response("OK", { status: 200, headers: corsHeaders });
});
