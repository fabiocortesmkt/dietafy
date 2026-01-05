import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface ChatRequestBody {
  session_id?: string;
  message: string;
  image_url?: string | null;
  voice_enabled?: boolean;
  debug?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase env vars");
      return new Response(JSON.stringify({ error: "Internal configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("authorization");
    const jwt = authHeader?.replace("Bearer ", "") ?? "";

    const { message, image_url, session_id, voice_enabled, debug }: ChatRequestBody = await req.json();
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Mensagem inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isVoiceEnabled = !!voice_enabled;
    const isDebug = !!debug;

    // Se não tiver JWT, usar service role para buscar sessão pelo request body
    const supabaseClient = createSupabaseClient(supabaseUrl, serviceRoleKey, jwt);

    let userId: string | null = null;

    if (jwt) {
      const {
        data: { user },
        error: userError,
      } = await supabaseClient.auth.getUser();

      if (!userError && user) {
        userId = user.id;
      }
    }

    // Se ainda não temos userId, tentar buscar pela session_id
    if (!userId && session_id) {
      const { data: sessionData } = await supabaseClient
        .from("chat_sessions")
        .select("user_id")
        .eq("id", session_id)
        .maybeSingle();
      
      if (sessionData?.user_id) {
        userId = sessionData.user_id as string;
      }
    }

    if (!userId) {
      console.error("Could not determine user_id");
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // userId já está definido acima

    // 1) Manage / create session
    let activeSessionId: string | null = session_id ?? null;
    if (!activeSessionId) {
      const { data: newSession, error: sessionError } = await supabaseClient
        .from("chat_sessions")
        .insert({ user_id: userId, title: null })
        .select("id")
        .single();

      if (sessionError || !newSession) {
        console.error("Error creating chat session", sessionError);
        return new Response(JSON.stringify({ error: "Erro ao criar sessão" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      activeSessionId = newSession.id as string;
    } else {
      const { data: existing, error: existingError } = await supabaseClient
        .from("chat_sessions")
        .select("id")
        .eq("id", activeSessionId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingError || !existing) {
        return new Response(JSON.stringify({ error: "Sessão inválida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 2) Daily limit
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const { data: dailyRow, error: dailyError } = await supabaseClient
      .from("daily_message_count")
      .select("id, count")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();

    if (dailyError) {
      console.error("Error fetching daily_message_count", dailyError);
    }

    const FREE_LIMIT = 10;
    const currentCount = (dailyRow?.count as number | undefined) ?? 0;

    if (currentCount >= FREE_LIMIT) {
      return new Response(
        JSON.stringify({
          error: "message_limit_reached",
          limit: FREE_LIMIT,
          used_today: currentCount,
          remaining: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 3) Persist user message
    const { error: insertUserMsgError } = await supabaseClient.from("chat_messages").insert({
      session_id: activeSessionId,
      user_id: userId,
      sender: "user",
      message,
      image_url: image_url ?? null,
    });

    if (insertUserMsgError) {
      console.error("Error inserting user message", insertUserMsgError);
    }

    // 4) Build user context for system prompt
    const userContext = await buildUserContext(supabaseClient, userId);

    const systemPrompt = buildSystemPrompt(userContext, isVoiceEnabled);

    // 5) Fetch recent history
    const { data: historyMessages, error: historyError } = await supabaseClient
      .from("chat_messages")
      .select("sender, message")
      .eq("session_id", activeSessionId)
      .order("created_at", { ascending: true })
      .limit(40);

    if (historyError) {
      console.error("Error fetching chat history", historyError);
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...((historyMessages ?? []).map((m: { sender: string; message: string }) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.message,
      })) as { role: string; content: string }[]),
      {
        role: "user",
        content:
          image_url && typeof image_url === "string"
            ? `${message}\n\n[O usuário também enviou uma imagem dessa refeição em: ${image_url}]`
            : message,
      },
    ];

    // 6) Call Lovable AI
    const aiResponse = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        stream: false,
        max_tokens: isVoiceEnabled ? 260 : 500,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const text = await aiResponse.text();
      console.error("AI gateway error", aiResponse.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResponse.json();
    const vitaMessage: string =
      aiJson.choices?.[0]?.message?.content ??
      "Tive um problema para responder agora, mas você pode tentar novamente em alguns instantes.";

    // 7) Persist Vita message & update count
    const { error: insertVitaMsgError } = await supabaseClient.from("chat_messages").insert({
      session_id: activeSessionId,
      user_id: userId,
      sender: "vita",
      message: vitaMessage,
    });

    if (insertVitaMsgError) {
      console.error("Error inserting vita message", insertVitaMsgError);
    }

    const upsertPayload = {
      user_id: userId,
      date: today,
      count: currentCount + 1,
    };

    const { error: upsertError } = await supabaseClient
      .from("daily_message_count")
      .upsert(upsertPayload, { onConflict: "user_id, date" });

    if (upsertError) {
      console.error("Error updating daily_message_count", upsertError);
    }

    return new Response(
      JSON.stringify({
        session_id: activeSessionId,
        reply: vitaMessage,
        limits: {
          used_today: currentCount + 1,
          remaining: Math.max(FREE_LIMIT - (currentCount + 1), 0),
          limit: FREE_LIMIT,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("vita-chat function error", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function createSupabaseClient(supabaseUrl: string, serviceRoleKey: string, jwt: string) {
  return createClient(supabaseUrl, serviceRoleKey, {
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
  });
}

async function buildUserContext(supabaseClient: any, userId: string) {
  const context: any = {};

  const { data: profile } = await supabaseClient
    .from("user_profiles")
    .select(
      `full_name,
       date_of_birth,
       biological_sex,
       height_cm,
       weight_kg,
       target_weight_kg,
       goals,
       target_timeframe,
       dietary_restrictions,
       dietary_other,
       activity_level,
       training_preference,
       whatsapp_phone,
       whatsapp_opt_in`
    )
    .eq("user_id", userId)
    .maybeSingle();

  context.profile = profile ?? null;

  const { data: lastMeal } = await supabaseClient
    .from("meals")
    .select("description, datetime, calories, carbs, protein, fat")
    .eq("user_id", userId)
    .order("datetime", { ascending: false })
    .limit(1)
    .maybeSingle();

  context.lastMeal = lastMeal ?? null;

  const { data: lastWorkoutLog } = await supabaseClient
    .from("workout_logs")
    .select("date, workout_id")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastWorkoutLog?.workout_id) {
    const { data: workout } = await supabaseClient
      .from("workouts")
      .select("title, duration_min, goal")
      .eq("id", lastWorkoutLog.workout_id)
      .maybeSingle();
    context.lastWorkout = workout ? { ...workout, date: lastWorkoutLog.date } : null;
  } else {
    context.lastWorkout = null;
  }

  const { data: recentWorkouts } = await supabaseClient
    .from("workout_logs")
    .select("date")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(30);

  context.streak_days = calculateStreak((recentWorkouts ?? []) as { date: string }[]);

  const { data: lastWeightLog } = await supabaseClient
    .from("weight_logs")
    .select("date, weight_kg")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  context.lastWeightLog = lastWeightLog ?? null;

  const today = new Date().toISOString().slice(0, 10);

  const { data: todayWater } = await supabaseClient
    .from("water_intake")
    .select("ml_consumed")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  context.water_today_ml = todayWater?.ml_consumed ?? 0;

  const { data: lastSleep } = await supabaseClient
    .from("sleep_logs")
    .select("date, sleep_time, wake_time, quality_score")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  context.lastSleep = lastSleep ?? null;

  const { data: lastStress } = await supabaseClient
    .from("stress_logs")
    .select("datetime, level, emoji, notes")
    .eq("user_id", userId)
    .order("datetime", { ascending: false })
    .limit(1)
    .maybeSingle();

  context.lastStress = lastStress ?? null;

  context.health_score = 7;

  return context;
}

function calculateStreak(logs: { date: string }[]): number {
  if (!logs.length) return 0;

  const uniqueDates = Array.from(new Set(logs.map((l) => l.date))).sort((a, b) => (a < b ? 1 : -1));
  const today = new Date();
  let streak = 0;

  for (let i = 0; i < uniqueDates.length; i++) {
    const logDate = new Date(uniqueDates[i]);
    const diffDays = Math.floor((today.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === streak) {
      streak++;
    } else if (diffDays > streak) {
      break;
    }
  }

  return streak;
}

function buildSystemPrompt(context: any, voiceMode: boolean): string {
  const profile = context.profile;
  const lastMeal = context.lastMeal;
  const lastWorkout = context.lastWorkout;
  const streakDays = context.streak_days ?? 0;
  const healthScore = context.health_score ?? 7;

  const name = profile?.full_name ?? "Usuário";

  const age = profile?.date_of_birth
    ? (() => {
        const dob = new Date(profile.date_of_birth as string);
        const diff = Date.now() - dob.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
      })()
    : null;

  const goals = Array.isArray(profile?.goals) ? (profile.goals as string[]).join(", ") : "não informados";
  const restrictions = Array.isArray(profile?.dietary_restrictions)
    ? (profile.dietary_restrictions as string[]).join(", ")
    : "nenhuma registrada";

  const lastMealText = lastMeal
    ? `${lastMeal.description} em ${lastMeal.datetime}${
        lastMeal.calories ? ` (~${lastMeal.calories} kcal)` : ""
      }`
    : "não registrada";

  const lastWorkoutText = lastWorkout
    ? `${lastWorkout.title} em ${lastWorkout.date} (${lastWorkout.duration_min}min)`
    : "não registrado";

  const heightText = profile?.height_cm ? `${profile.height_cm} cm` : "não informada";
  const sexText = profile?.biological_sex ?? "não informado";

  const trainingPref = Array.isArray(profile?.training_preference)
    ? (profile.training_preference as string[]).join(", ")
    : "não informado";

  const dietaryOtherText = profile?.dietary_other ?? "nenhuma descrição adicional";

  const lastWeightLog = context.lastWeightLog as { date: string; weight_kg: number } | null | undefined;
  const lastWeightLogText = lastWeightLog
    ? `${lastWeightLog.weight_kg} kg em ${lastWeightLog.date}`
    : "não registrado recentemente";

  const waterTodayMl = typeof context.water_today_ml === "number" ? context.water_today_ml : 0;
  const waterTodayText = waterTodayMl > 0 ? `${waterTodayMl} ml hoje` : "não registrado hoje";

  const lastSleep = context.lastSleep as
    | { date: string; sleep_time: string; wake_time: string; quality_score: number }
    | null
    | undefined;
  const lastSleepText = lastSleep
    ? `sono com nota ${lastSleep.quality_score}/10 em ${lastSleep.date}`
    : "não registrado";

  const lastStress = context.lastStress as
    | { datetime: string; level: number; emoji?: string | null; notes?: string | null }
    | null
    | undefined;
  const lastStressText = lastStress
    ? `nível ${lastStress.level} em ${lastStress.datetime}${
        lastStress.emoji ? " " + lastStress.emoji : ""
      }${lastStress.notes ? ` - ${lastStress.notes}` : ""}`
    : "não registrado";

  const voiceBlock = voiceMode
    ? `
MODO VOZ ATIVO:
- O usuário está ouvindo as respostas em voz alta.
- Responda de forma CURTA e direta: normalmente 1–3 frases curtas, ou no máximo 3 bullets simples.
- Foque sempre no PRÓXIMO PASSO prático (o que fazer HOJE ou nos próximos 24–48h).
- Evite listas muito longas, explicações técnicas extensas ou textos acima de ~200–250 palavras.
- Quando o usuário pedir algo muito amplo (ex.: cardápio da semana, plano do mês), responda com uma versão RESUMIDA focada em 1 dia modelo ou em poucos passos práticos para hoje, e convide a pessoa a voltar para ajustar os próximos dias.
- Use todos os dados disponíveis (perfil, peso, altura, sono, água, estresse, refeições, treinos) para personalizar ao máximo, mas sem expor detalhes sensíveis de forma desnecessária.
- Priorize sempre uma recomendação prática imediata e um incentivo final rápido.`
    : `
MODO VOZ DESATIVADO:
- Você pode usar respostas um pouco mais detalhadas quando isso realmente trouxer mais clareza.
- Ainda assim, mantenha parágrafos objetivos e evite textos muito longos.
- Mesmo em pedidos amplos (semana/mês), traga primeiro um resumo focado em hoje ou nos próximos passos e só depois, se couber, complemente com mais detalhes.
- Use todos os dados disponíveis (perfil, peso, altura, sono, água, estresse, refeições, treinos) para personalizar ao máximo, mas sem expor detalhes sensíveis de forma desnecessária.`;

  return `Você é Vita, nutricionista virtual e assistente pessoal de saúde do app DietaFY, focado em alimentação, composição corporal, sono e bem-estar integral.

PERSONALIDADE:
- Amigável, motivacional e empático.
- Use linguagem simples e acessível.
- Atue como o "seu nutricionista pessoal" que traduz evidências em hábitos do dia a dia.
- Celebre pequenas vitórias e evite qualquer tom de culpa.
- Não julgue; ofereça sempre orientação prática e realista.
- Use emojis com moderação, apenas para reforçar o tom positivo.

DADOS DO USUÁRIO:
- Nome: ${name}
- Idade: ${age ?? "não informada"}
- Sexo biológico: ${sexText}
- Altura: ${heightText}
- Peso atual (perfil): ${profile?.weight_kg ?? "não informado"} kg
- Peso alvo: ${profile?.target_weight_kg ?? "não informado"} kg
- Última pesagem registrada: ${lastWeightLogText}
- Objetivos: ${goals}
- Horizonte da meta: ${profile?.target_timeframe ?? "não informado"}
- Restrições alimentares: ${restrictions}
- Detalhes adicionais de dieta: ${dietaryOtherText}
- Nível de atividade: ${profile?.activity_level ?? "não informado"}
- Preferências de treino: ${trainingPref}
- Água ingerida hoje: ${waterTodayText}
- Último registro de sono: ${lastSleepText}
- Último registro de estresse: ${lastStressText}
- Última refeição registrada: ${lastMealText}
- Último treino registrado: ${lastWorkoutText}
- Dias de sequência de hábitos positivos: ${streakDays}
- Score metabólico (0-10): ${healthScore}

DIRETRIZES GERAIS:
- Sempre considere TODOS os dados do usuário nas respostas.
- Dê respostas objetivas, evitando textos muito longos.
- Priorize SEMPRE o próximo passo prático (o que fazer hoje ou nos próximos dias), em vez de planos muito extensos.
- Sugira ações práticas e específicas (ex.: quantidade aproximada, horário sugerido, tipo de refeição/treino) adequadas ao peso, altura, rotina, sono recente, estresse e registros do app.
- Incentive o uso e a atualização dos registros do app (refeições, água, sono, treinos, estresse, peso).
- Quando possível, mencione o progresso e consistência, não apenas o resultado na balança.
- Não faça diagnósticos médicos nem prescreva medicamentos.
- Se o usuário relatar sintomas sérios (dor intensa, falta de ar, desmaios, perda de peso muito rápida etc.), oriente com clareza a procurar nutricionista e médico presenciais.

FOCO EM EMAGRECIMENTO / PERDA DE GORDURA:
- Quando o objetivo for perder gordura, dê foco a:
  - Organização das refeições ao longo do dia (café, almoço, lanche, jantar).
  - Controle de porções e escolhas mais proteicas e ricas em fibras.
  - Estratégias para reduzir beliscos e vontade de doce sem proibições radicais.
  - Consistência semanal, não perfeição diária.
- Adapte as sugestões ao contexto do usuário (trabalho, rotina corrida, treinos, sono, estresse).

FOCO EM SONO:
- Quando o usuário falar de cansaço ou sono ruim:
  - Explique, de forma simples, como o sono afeta fome, vontade de doce e recuperação de treino.
  - Sugira higiene do sono: horário mais fixo, reduzir telas/luz forte, ambiente escuro e tranquilo.
  - Dê ideias de rituais noturnos simples (chá, leitura leve, respiração).

FOCO EM ESTRESSE E ANSIEDADE:
- Se o usuário relatar estresse, ansiedade ou dias muito corridos:
  - Valide o sentimento antes de sugerir mudanças.
  - Sugira pequenas pausas ativas, caminhadas leves ou respiração guiada.
  - Adapte a alimentação para algo mais realista naquele dia (estratégia "melhor possível" em vez de tudo ou nada).
  - Se o contexto parecer muito grave, incentive buscar apoio profissional.

${voiceBlock}

EXEMPLOS DE RESPOSTAS:
- Se o usuário disser "tô com muita vontade de comer doce":
  > Valide o sentimento, sugira alternativas mais leves (frutas com proteína, iogurte proteico, chocolate 70% em pequena porção), proponha beber água antes e relembre que um episódio isolado não estraga todo o progresso.

- Se o usuário disser "quero emagrecer, o que faço na dieta?":
  > Explique em poucos passos: (1) organizar 3 refeições principais + 1–2 lanches; (2) priorizar proteína e vegetais em cada refeição; (3) ajustar carboidratos em torno dos treinos; (4) acompanhar semanalmente peso, medidas e como as roupas vestem.

- Se o usuário disser "tô muito cansado e estressado no trabalho":
  > Validar o contexto, sugerir refeições simples que evitem longos períodos em jejum, propor pausas curtas durante o dia e ajustar o treino para algo mais leve, reforçando que isso também faz parte de uma estratégia inteligente.

ESTILO:
- Responda em português do Brasil.
- Use parágrafos curtos (geralmente 2–4) e marcadores quando fizer sentido, evitando respostas muito longas.
- Em pedidos muito amplos (semana/mês/plano completo), traga primeiro um resumo focado em hoje ou nos próximos passos e só depois complemente, se necessário.
- Nunca exponha dados sensíveis além do necessário.
- Sempre finalize com um incentivo leve, mostrando que a jornada é de consistência, não perfeição.`;
}
