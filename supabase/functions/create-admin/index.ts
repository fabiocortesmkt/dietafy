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
    // Usar service role para criar usuário admin
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verificar se usuário já existe (busca por email)
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      console.error("Erro ao listar usuários ao buscar admin:", listError);
    }

    const user = listData?.users.find((u) => u.email?.toLowerCase() === "admin@dev.local");

    let finalUserId: string;

    if (user) {
      console.log("Usuário admin já existe, reaproveitando:", user.id);
      finalUserId = user.id;
    } else {
      // Criar usuário admin caso ainda não exista
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: "admin@dev.local",
        password: "admin@dev.local",
        email_confirm: true,
        user_metadata: {
          full_name: "Master Admin",
        },
      });

      if (authError || !authData.user) {
        console.error("Erro ao criar usuário admin:", authError);
        return new Response(
          JSON.stringify({ error: authError?.message ?? "Não foi possível criar o admin" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.log("Usuário admin criado:", authData.user.id);
      finalUserId = authData.user.id;
    }

    // Garantir perfil do usuário como premium e onboarding completo
    const { error: profileError } = await supabase.from("user_profiles").upsert(
      {
        user_id: finalUserId,
        full_name: "Master Admin",
        date_of_birth: "1990-01-01",
        height_cm: 170,
        weight_kg: 70,
        biological_sex: "masculino",
        goals: ["administração"],
        activity_level: "sedentario",
        training_preference: [],
        dietary_restrictions: [],
        onboarding_completed: true,
        plan_type: "premium",
      },
      {
        onConflict: "user_id",
      },
    );

    if (profileError) {
      console.error("Erro ao criar/atualizar perfil:", profileError);
    }

    // Garantir role de admin
    const { error: roleError } = await supabase.from("user_roles").upsert(
      {
        user_id: finalUserId,
        role: "admin",
      },
      {
        onConflict: "user_id,role",
      },
    );

    if (roleError) {
      console.error("Erro ao atribuir role de admin:", roleError);
      return new Response(
        JSON.stringify({ error: "Erro ao atribuir permissões de admin" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Role de admin garantida com sucesso");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Conta admin criada/atualizada com sucesso",
        userId: finalUserId,
        credentials: {
          email: "admin@dev.local",
          password: "admin@dev.local",
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Erro inesperado:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
