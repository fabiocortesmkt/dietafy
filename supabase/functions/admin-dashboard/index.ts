import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extrair token do header Authorization
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Token de autorização inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Criar cliente com o token do usuário para verificar autenticação
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { 
        global: { 
          headers: { Authorization: `Bearer ${token}` } 
        } 
      }
    );

    const { data: { user: callerUser }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se é admin@dev.local ou tem role admin
    const isDevAdmin = callerUser.email?.toLowerCase() === "admin@dev.local";
    
    if (!isDevAdmin) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", callerUser.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        return new Response(
          JSON.stringify({ error: "Acesso negado. Apenas admins podem usar esta função." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Service role para operações admin (bypassa RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Calcular datas
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Buscar todas as estatísticas usando service role (bypassa RLS)
    const [
      totalUsersResult,
      premiumUsersResult,
      freeUsersResult,
      newUsers7DaysResult,
      newUsers30DaysResult,
      totalMealsResult,
      totalWorkoutsResult,
      totalMessagesResult,
      growthDataResult,
      recentUsersResult
    ] = await Promise.all([
      // Total de usuários
      supabaseAdmin.from("user_profiles").select("*", { count: "exact", head: true }),
      // Usuários premium
      supabaseAdmin.from("user_profiles").select("*", { count: "exact", head: true }).eq("plan_type", "premium"),
      // Usuários free
      supabaseAdmin.from("user_profiles").select("*", { count: "exact", head: true }).eq("plan_type", "free"),
      // Novos últimos 7 dias
      supabaseAdmin.from("user_profiles").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo.toISOString()),
      // Novos últimos 30 dias
      supabaseAdmin.from("user_profiles").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo.toISOString()),
      // Total refeições
      supabaseAdmin.from("meals").select("*", { count: "exact", head: true }),
      // Total treinos
      supabaseAdmin.from("workout_logs").select("*", { count: "exact", head: true }),
      // Total mensagens
      supabaseAdmin.from("chat_messages").select("*", { count: "exact", head: true }),
      // Dados de crescimento
      supabaseAdmin.from("user_profiles").select("created_at").gte("created_at", thirtyDaysAgo.toISOString()).order("created_at"),
      // Usuários recentes
      supabaseAdmin.from("user_profiles").select("id, user_id, full_name, plan_type, created_at, onboarding_completed").order("created_at", { ascending: false }).limit(10)
    ]);

    // Processar dados de crescimento
    const growthMap = new Map<string, number>();
    growthDataResult.data?.forEach((profile: { created_at: string }) => {
      const date = new Date(profile.created_at).toLocaleDateString("pt-BR");
      growthMap.set(date, (growthMap.get(date) || 0) + 1);
    });

    const growthData = Array.from(growthMap.entries()).map(([date, users]) => ({
      date,
      users,
    }));

    const totalUsers = totalUsersResult.count || 0;
    const totalMeals = totalMealsResult.count || 0;
    const totalWorkouts = totalWorkoutsResult.count || 0;

    const stats = {
      totalUsers,
      premiumUsers: premiumUsersResult.count || 0,
      freeUsers: freeUsersResult.count || 0,
      newUsersLast7Days: newUsers7DaysResult.count || 0,
      newUsersLast30Days: newUsers30DaysResult.count || 0,
      totalMeals,
      totalWorkouts,
      totalMessages: totalMessagesResult.count || 0,
      avgMealsPerUser: totalUsers ? Math.round(totalMeals / totalUsers) : 0,
      avgWorkoutsPerUser: totalUsers ? Math.round(totalWorkouts / totalUsers) : 0,
    };

    return new Response(
      JSON.stringify({
        stats,
        growthData,
        recentUsers: recentUsersResult.data || [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Erro na função admin-dashboard:", error);
    const message = error instanceof Error ? error.message : "Erro interno do servidor";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
