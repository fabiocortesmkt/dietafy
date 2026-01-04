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
    console.log("Auth header presente:", !!authHeader);
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Token inválido ou ausente");
      return new Response(
        JSON.stringify({ error: "Token de autorização inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    console.log("Token extraído, verificando usuário...");

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
    
    console.log("Resultado getUser - usuário:", callerUser?.email, "erro:", userError?.message);
    
    if (userError || !callerUser) {
      console.log("Falha na autenticação:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado", details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Usuário autenticado:", callerUser.email);

    // Verificar se é admin@dev.local ou tem role admin
    const isDevAdmin = callerUser.email?.toLowerCase() === "admin@dev.local";
    console.log("É admin@dev.local:", isDevAdmin);
    
    if (!isDevAdmin) {
      // Usar service role para verificar roles (evita problemas de RLS)
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", callerUser.id)
        .eq("role", "admin")
        .maybeSingle();

      console.log("Verificação de role admin:", roleData, "erro:", roleError?.message);

      if (!roleData) {
        return new Response(
          JSON.stringify({ error: "Acesso negado. Apenas admins podem usar esta função." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Service role para operações admin
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

    const body = await req.json();
    const { action } = body;

    // Função auxiliar para registrar log de auditoria
    const logAuditAction = async (
      actionName: string,
      targetUserId?: string,
      targetEmail?: string,
      details?: Record<string, unknown>
    ) => {
      try {
        await supabaseAdmin.from("admin_audit_logs").insert({
          admin_user_id: callerUser.id,
          admin_email: callerUser.email || "unknown",
          action: actionName,
          target_user_id: targetUserId || null,
          target_email: targetEmail || null,
          details: details || null,
        });
      } catch (err) {
        console.error("Erro ao registrar log de auditoria:", err);
      }
    };

    switch (action) {
      case "list": {
        const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page: body.page || 1,
          perPage: body.perPage || 50,
        });

        if (listError) {
          throw listError;
        }

        // Buscar perfis e roles
        const userIds = usersData.users.map((u) => u.id);
        
      const { data: profiles } = await supabaseAdmin
        .from("user_profiles")
        .select("user_id, full_name, plan_type, created_at, onboarding_completed, whatsapp_phone")
        .in("user_id", userIds);

        const { data: roles } = await supabaseAdmin
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds);

        const enrichedUsers = usersData.users.map((user) => {
          const profile = profiles?.find((p) => p.user_id === user.id);
          const userRoles = roles?.filter((r) => r.user_id === user.id).map((r) => r.role) || [];
          
          return {
            id: user.id,
            email: user.email,
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at,
            email_confirmed_at: user.email_confirmed_at,
            full_name: profile?.full_name || user.user_metadata?.full_name || "Sem nome",
            plan_type: profile?.plan_type || "free",
            onboarding_completed: profile?.onboarding_completed || false,
            roles: userRoles,
            whatsapp_phone: profile?.whatsapp_phone || null,
          };
        });

        return new Response(
          JSON.stringify({ users: enrichedUsers, total: usersData.users.length }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "create": {
        const { email, password, full_name, plan_type, role } = body;

        if (!email || !password) {
          return new Response(
            JSON.stringify({ error: "Email e senha são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: full_name || email },
        });

        if (createError) {
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Criar perfil básico
        if (authData.user) {
          await supabaseAdmin.from("user_profiles").upsert({
            user_id: authData.user.id,
            full_name: full_name || email,
            date_of_birth: "1990-01-01",
            height_cm: 170,
            weight_kg: 70,
            biological_sex: "masculino",
            goals: [],
            activity_level: "moderado",
            training_preference: [],
            dietary_restrictions: [],
            onboarding_completed: false,
            plan_type: plan_type || "free",
          }, { onConflict: "user_id" });

          // Adicionar role se especificado
          if (role && role !== "user") {
            await supabaseAdmin.from("user_roles").upsert({
              user_id: authData.user.id,
              role: role,
            }, { onConflict: "user_id,role" });
          }

          // Log de auditoria
          await logAuditAction("create", authData.user.id, email, {
            full_name,
            plan_type: plan_type || "free",
            role: role || "user",
          });
        }

        return new Response(
          JSON.stringify({ success: true, user: authData.user }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete": {
        const { userId, targetEmail } = body;

        if (!userId) {
          return new Response(
            JSON.stringify({ error: "userId é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Não permitir deletar o próprio admin
        if (userId === callerUser.id) {
          return new Response(
            JSON.stringify({ error: "Você não pode deletar sua própria conta" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
          return new Response(
            JSON.stringify({ error: deleteError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Log de auditoria
        await logAuditAction("delete", userId, targetEmail);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_email": {
        const { userId, newEmail, targetEmail } = body;

        if (!userId || !newEmail) {
          return new Response(
            JSON.stringify({ error: "userId e newEmail são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          email: newEmail,
          email_confirm: true,
        });

        if (updateError) {
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Log de auditoria
        await logAuditAction("update_email", userId, targetEmail, { new_email: newEmail });

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_password": {
        const { userId, newPassword, targetEmail } = body;

        if (!userId || !newPassword) {
          return new Response(
            JSON.stringify({ error: "userId e newPassword são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: newPassword,
        });

        if (updateError) {
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Log de auditoria
        await logAuditAction("update_password", userId, targetEmail);

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reset_password": {
        const { userId, targetEmail } = body;

        if (!userId) {
          return new Response(
            JSON.stringify({ error: "userId é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Gerar senha temporária
        const tempPassword = `Temp${Math.random().toString(36).slice(2, 10)}!`;

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: tempPassword,
        });

        if (updateError) {
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Log de auditoria
        await logAuditAction("reset_password", userId, targetEmail);

        return new Response(
          JSON.stringify({ success: true, tempPassword }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_plan": {
        const { userId, planType, targetEmail } = body;

        if (!userId || !planType) {
          return new Response(
            JSON.stringify({ error: "userId e planType são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: updateError } = await supabaseAdmin
          .from("user_profiles")
          .update({ 
            plan_type: planType,
            plan_started_at: planType === "premium" ? new Date().toISOString() : null,
            plan_expires_at: null,
          })
          .eq("user_id", userId);

        if (updateError) {
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Log de auditoria
        await logAuditAction("update_plan", userId, targetEmail, { new_plan: planType });

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_role": {
        const { userId, role, remove, targetEmail } = body;

        if (!userId || !role) {
          return new Response(
            JSON.stringify({ error: "userId e role são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (remove) {
          const { error: deleteError } = await supabaseAdmin
            .from("user_roles")
            .delete()
            .eq("user_id", userId)
            .eq("role", role);

          if (deleteError) {
            return new Response(
              JSON.stringify({ error: deleteError.message }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          const { error: insertError } = await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });

          if (insertError) {
            return new Response(
              JSON.stringify({ error: insertError.message }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // Log de auditoria
        await logAuditAction("update_role", userId, targetEmail, { role, remove: !!remove });

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Ação não reconhecida" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: unknown) {
    console.error("Erro na função admin-users:", error);
    const message = error instanceof Error ? error.message : "Erro interno do servidor";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
