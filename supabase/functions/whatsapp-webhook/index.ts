import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-twilio-signature",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase configuration in whatsapp-webhook function");
}

function createSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

async function validateTwilioSignature(req: Request, rawBody: string): Promise<boolean> {
  try {
    if (!TWILIO_AUTH_TOKEN) return false;

    const signature = req.headers.get("x-twilio-signature");
    if (!signature) return false;

    const url = new URL(req.url);
    const fullUrl = `${url.origin}${url.pathname}`;

    const params = new URLSearchParams(rawBody);
    const sortedKeys = Array.from(params.keys()).sort();
    let data = fullUrl;
    for (const key of sortedKeys) {
      data += key + params.get(key);
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(TWILIO_AUTH_TOKEN),
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"],
    );
    const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
    const computed = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

    // Twilio signature is base64, simple comparison here
    return computed === signature;
  } catch (err) {
    console.error("Error validating Twilio signature", err);
    return false;
  }
}

function normalizeWhatsAppNumber(from: string | null): string | null {
  if (!from) return null;
  return from.replace(/^whatsapp:/, "");
}

async function sendWhatsAppMessage(to: string, body: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
    console.error("Twilio env vars are not configured");
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
    console.error("Error sending WhatsApp message via Twilio", res.status, text);
  }
}

async function handleCommand(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  phone: string,
  body: string,
): Promise<string> {
  const text = body.trim();
  const [command, ...args] = text.split(/\s+/);

  switch (command.toLowerCase()) {
    case "/inicio": {
      return "Olá! 👋 Eu sou o Vita, seu assistente do DietaFY no WhatsApp. Posso registrar seu peso, água, refeições por foto e sugerir treinos. Use /menu para ver opções.";
    }

    case "/menu": {
      return [
        "Aqui vão alguns comandos que você pode usar:",
        "/inicio – mensagem de boas-vindas",
        "/peso 78.5 – registra seu peso em kg",
        "/agua 500 – adiciona 500ml de água",
        "/treino – ver sugestões de treino de hoje",
        "/relatorio – resumo simples da sua semana",
      ].join("\n");
    }

    case "/peso": {
      if (!args.length) return "Use assim: /peso 78.5";
      const raw = args[0].replace(",", ".");
      const value = Number(raw);
      if (!isFinite(value) || value <= 0) return "Não entendi o peso. Tente algo como /peso 78.5";

      const today = new Date();
      const date = today.toISOString().slice(0, 10);

      const { error } = await supabase
        .from("weight_logs")
        .insert({ user_id: userId, date, weight_kg: value, fasting: false });

      if (error) {
        console.error("Error inserting weight log", error);
        return "Tive um problema ao registrar seu peso. Tente novamente mais tarde.";
      }

      return `Anotei seu peso de ${value.toFixed(1)}kg hoje ✅`;
    }

    case "/agua": {
      if (!args.length) return "Use assim: /agua 500";
      const raw = args[0];
      const value = parseInt(raw, 10);
      if (!isFinite(value) || value <= 0) return "Não entendi a quantidade de água. Tente algo como /agua 500";

      const today = new Date();
      const date = today.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from("water_intake")
        .select("id, ml_consumed")
        .eq("user_id", userId)
        .eq("date", date)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error selecting water_intake", error);
      }

      if (data) {
        const { error: updateError } = await supabase
          .from("water_intake")
          .update({ ml_consumed: (data.ml_consumed ?? 0) + value })
          .eq("id", data.id);

        if (updateError) {
          console.error("Error updating water_intake", updateError);
          return "Tive um problema ao atualizar sua água. Tente novamente mais tarde.";
        }
      } else {
        const { error: insertError } = await supabase
          .from("water_intake")
          .insert({ user_id: userId, date, ml_consumed: value });

        if (insertError) {
          console.error("Error inserting water_intake", insertError);
          return "Tive um problema ao registrar sua água. Tente novamente mais tarde.";
        }
      }

      return `Adicionei mais ${value}ml na sua água de hoje 💧`;
    }

    case "/treino": {
      // Buscar últimos treinos feitos na semana
      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const { data: logs, error: logsError } = await supabase
        .from("workout_logs")
        .select("date")
        .eq("user_id", userId)
        .gte("date", sevenDaysAgo.toISOString().slice(0, 10));

      if (logsError) {
        console.error("Error fetching workout_logs", logsError);
      }

      const { data: workouts, error: workoutsError } = await supabase
        .from("workouts")
        .select("id, title, duration_min, difficulty")
        .limit(3);

      if (workoutsError || !workouts || workouts.length === 0) {
        return "Não encontrei treinos para sugerir agora, tente novamente mais tarde.";
      }

      const lines = ["Sugestões para hoje:"]; 
      workouts.forEach((w, idx) => {
        lines.push(`${idx + 1}) ${w.title} – ${w.duration_min}min (${w.difficulty})`);
      });
      lines.push("Abra o app DietaFY para ver o treino completo 💪");
      return lines.join("\n");
    }

    case "/relatorio": {
      const today = new Date();
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fromDate = sevenDaysAgo.toISOString().slice(0, 10);

      const [workoutsRes, waterRes, mealsRes] = await Promise.all([
        supabase
          .from("workout_logs")
          .select("id")
          .eq("user_id", userId)
          .gte("date", fromDate),
        supabase
          .from("water_intake")
          .select("ml_consumed")
          .eq("user_id", userId)
          .gte("date", fromDate),
        supabase
          .from("meals")
          .select("id")
          .eq("user_id", userId)
          .gte("datetime", fromDate),
      ]);

      const workoutsCount = workoutsRes.data?.length ?? 0;
      const waterDays = waterRes.data ?? [];
      const mealsCount = mealsRes.data?.length ?? 0;
      const avgWater =
        waterDays.length > 0
          ? Math.round(
              waterDays.reduce((sum, d) => sum + (d.ml_consumed ?? 0), 0) /
                waterDays.length,
            )
          : 0;

      return [
        "Seu resumo simples da última semana:",
        `• Treinos concluídos: ${workoutsCount}`,
        `• Média de água/dia: ${avgWater} ml`,
        `• Refeições registradas: ${mealsCount}`,
        "Continue me mandando fotos e atualizando peso/água que eu ajusto suas recomendações 💚",
      ].join("\n");
    }

    default:
      return "Comando não reconhecido. Use /menu para ver as opções disponíveis.";
  }
}

async function callVitaAI(message: string, userContext: string, history: { role: string; content: string }[]) {
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY is not configured");
    return "Estou com um problema temporário na IA. Tente de novo daqui a pouco.";
  }

  const systemPrompt =
    "Você é o Vita, assistente de saúde do app DietaFY, respondendo via WhatsApp em português do Brasil. " +
    "Seja direto, empático e prático. Use respostas curtas, listas com bullets quando ajudar e nunca peça para o usuário abrir o chat do app se não for necessário. " +
    "Contexto do usuário (resuma mentalmente, não repita literalmente):\n" +
    userContext;

  const body = {
    model: "google/gemini-2.5-flash",
    stream: false,
    messages: [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ],
  };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Error calling Lovable AI for WhatsApp", res.status, text);
    if (res.status === 429) {
      return "Recebi muitas perguntas em pouco tempo. Me chama de novo em alguns minutos, por favor 🙏";
    }
    if (res.status === 402) {
      return "No momento não consigo responder com IA por uma limitação de uso. Tente novamente mais tarde.";
    }
    return "Tive um problema ao falar com a IA agora. Tente novamente mais tarde.";
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  return "Pronto!";
}

async function handleFoodPhoto(
  supabase: ReturnType<typeof createSupabaseClient>,
  userId: string,
  phone: string,
  mediaUrl: string,
): Promise<string> {
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY is not configured for food photo analysis");
    return "No momento não consigo analisar fotos. Tente novamente mais tarde.";
  }

  // Enviar a URL pública do Twilio diretamente para a IA analisar
  const systemPrompt =
    "Você é o Vita, nutricionista do DietaFY. Analise a refeição na imagem e responda em JSON com os campos: " +
    "prato (string), calorias (number, estimativa), proteina_g (number), carbo_g (number), gordura_g (number), comentario (string curta em PT-BR).";

  const body = {
    model: "google/gemini-2.5-flash",
    stream: false,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: "Analise esta refeição da forma mais útil possível para o usuário." },
          { type: "image_url", image_url: { url: mediaUrl } },
        ],
      },
    ],
  } as any;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Error calling Lovable AI for food photo", res.status, text);
    return "Tive um problema ao analisar a foto agora. Tente novamente mais tarde.";
  }

  const json = await res.json();
  const content: string | undefined = json.choices?.[0]?.message?.content;

  let prato = "Sua refeição";
  let calorias = 0;
  let proteina = 0;
  let carbo = 0;
  let gordura = 0;
  let comentario = "Boa escolha!";

  try {
    // Tentar extrair JSON de dentro do texto
    const match = content?.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      prato = parsed.prato ?? prato;
      calorias = parsed.calorias ?? calorias;
      proteina = parsed.proteina_g ?? proteina;
      carbo = parsed.carbo_g ?? carbo;
      gordura = parsed.gordura_g ?? gordura;
      comentario = parsed.comentario ?? comentario;

      const now = new Date().toISOString();

      const { error } = await supabase.from("meals").insert({
        user_id: userId,
        datetime: now,
        type: "whatsapp",
        description: prato,
        calories: calorias,
        protein: proteina,
        carbs: carbo,
        fat: gordura,
        photo_url: mediaUrl,
        ai_analysis: parsed,
      });

      if (error) {
        console.error("Error inserting meal from WhatsApp photo", error);
      }
    }
  } catch (err) {
    console.error("Error parsing AI response for food photo", err);
  }

  const lines = [
    "📸 Análise da sua refeição:",
    "",
    `🍽️ Prato: ${prato}`,
    calorias ? `🔥 Calorias: ~${Math.round(calorias)} kcal` : "",
    (proteina || carbo || gordura)
      ? `💪 Proteína: ${Math.round(proteina)}g | Carbo: ${Math.round(carbo)}g | Gordura: ${Math.round(gordura)}g`
      : "",
    "",
    `✅ ${comentario}`,
    "",
    "Registrei automaticamente no app!",
  ].filter(Boolean);

  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabase = createSupabaseClient();

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (err) {
    console.error("Error reading request body", err);
    return new Response("Bad Request", { status: 400, headers: corsHeaders });
  }

  const valid = await validateTwilioSignature(req, rawBody);
  if (!valid) {
    console.warn("Invalid Twilio signature");
    return new Response("Invalid signature", { status: 403, headers: corsHeaders });
  }

  const params = new URLSearchParams(rawBody);
  const fromRaw = params.get("From");
  const body = params.get("Body") ?? "";
  const numMedia = parseInt(params.get("NumMedia") ?? "0", 10);

  const from = normalizeWhatsAppNumber(fromRaw);
  if (!from) {
    console.warn("Missing From in Twilio payload");
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  // Tentar localizar perfil existente pelo telefone
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, user_id, full_name, whatsapp_opt_in, whatsapp_active, plan_type")
    .eq("whatsapp_phone", from)
    .maybeSingle();

  if (profileError) {
    console.error("Error fetching user profile by WhatsApp", profileError);
  }

  if (!profile) {
    // Usuário desconhecido: fluxo simples de convite para cadastro no app
    const welcome =
      "Olá! 👋 Ainda não te conheço no DietaFY. " +
      "Baixe o app, faça seu cadastro e cadastre este número de WhatsApp no seu perfil para ativar a integração.";

    await sendWhatsAppMessage(from, welcome);
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  const userId = profile.user_id;

  if (profile.plan_type !== "premium" || !profile.whatsapp_active) {
    await sendWhatsAppMessage(
      from,
      "O canal WhatsApp do DietaFY é exclusivo para assinantes Premium. Acesse o app para fazer upgrade.",
    );
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  // Rate limiting: máximo 30 mensagens inbound na última hora
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recentMessages, error: recentError } = await supabase
    .from("whatsapp_messages")
    .select("id")
    .eq("user_id", userId)
    .eq("direction", "inbound")
    .gte("timestamp", oneHourAgo);

  if (recentError) {
    console.error("Error fetching recent whatsapp_messages", recentError);
  }

  if ((recentMessages?.length ?? 0) > 30) {
    await sendWhatsAppMessage(
      from,
      "Você enviou muitas mensagens na última hora 😊 Vamos continuar depois um pouco para evitar sobrecarga.",
    );
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  // Registrar mensagem inbound
  const { error: insertInboundError } = await supabase.from("whatsapp_messages").insert({
    user_id: userId,
    direction: "inbound",
    message_text: body,
    media_url: numMedia > 0 ? params.get("MediaUrl0") : null,
  });
  if (insertInboundError) {
    console.error("Error inserting inbound whatsapp_message", insertInboundError);
  }

  // Atualizar last_message_at
  const { error: updateProfileError } = await supabase
    .from("user_profiles")
    .update({ whatsapp_last_message_at: new Date().toISOString(), whatsapp_active: true })
    .eq("id", profile.id);
  if (updateProfileError) {
    console.error("Error updating user profile last_message_at", updateProfileError);
  }

  // Se for foto de comida
  if (numMedia > 0) {
    const mediaUrl = params.get("MediaUrl0");
    if (mediaUrl) {
      const reply = await handleFoodPhoto(supabase, userId, from, mediaUrl);
      await sendWhatsAppMessage(from, reply);

      await supabase.from("whatsapp_messages").insert({
        user_id: userId,
        direction: "outbound",
        message_text: reply,
      });
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  const trimmed = body.trim();

  // Checar se é resposta simples de check-in de sono (1/2/3) – MVP: apenas trata como mensagem comum
  const isSimpleNumeric = /^(1|2|3)$/.test(trimmed);

  // Comandos especiais começam com /
  if (trimmed.startsWith("/")) {
    const reply = await handleCommand(supabase, userId, from, trimmed);
    await sendWhatsAppMessage(from, reply);

    await supabase.from("whatsapp_messages").insert({
      user_id: userId,
      direction: "outbound",
      message_text: reply,
    });

    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  // Caso não seja comando: mandar para IA Vita com contexto simples
  // Buscar últimas 5 mensagens de WhatsApp para contexto
  const { data: historyMessages, error: historyError } = await supabase
    .from("whatsapp_messages")
    .select("direction, message_text")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false })
    .limit(5);

  if (historyError) {
    console.error("Error fetching WhatsApp history", historyError);
  }

  const history = (historyMessages ?? [])
    .reverse()
    .filter((m) => m.message_text)
    .map((m) => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.message_text as string,
    }));

  // Contexto textual simples – podemos enriquecer depois
  const { data: userProfile, error: userProfileError } = await supabase
    .from("user_profiles")
    .select("full_name, goals, activity_level")
    .eq("id", profile.id)
    .maybeSingle();

  if (userProfileError) {
    console.error("Error fetching user profile for context", userProfileError);
  }

  const goals = (userProfile?.goals as string[] | null) ?? [];
  const context = [
    userProfile?.full_name ? `Nome: ${userProfile.full_name}` : null,
    goals.length ? `Objetivos: ${goals.join(", ")}` : null,
    userProfile?.activity_level ? `Nível de atividade: ${userProfile.activity_level}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const aiReply = await callVitaAI(trimmed || (isSimpleNumeric ? trimmed : ""), context, history);

  await sendWhatsAppMessage(from, aiReply);

  await supabase.from("whatsapp_messages").insert({
    user_id: userId,
    direction: "outbound",
    message_text: aiReply,
  });

  return new Response("OK", { status: 200, headers: corsHeaders });
});
