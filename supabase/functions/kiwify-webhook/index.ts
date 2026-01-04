import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KiwifyWebhookPayload {
  order_id: string;
  order_status: string;
  customer_email: string;
  customer_name?: string;
  product_name?: string;
  webhook_token?: string;
  // Adicione outros campos conforme o payload do Kiwify
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: KiwifyWebhookPayload = await req.json();
    console.log("Kiwify webhook received:", payload);

    // Validar token do webhook
    const expectedToken = Deno.env.get("KIWIFY_WEBHOOK_SECRET");
    if (!expectedToken) {
      console.error("KIWIFY_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar token no payload ou header
    const receivedToken = payload.webhook_token || req.headers.get("x-webhook-token");
    if (receivedToken !== expectedToken) {
      console.error("Invalid webhook token");
      return new Response(
        JSON.stringify({ error: "Invalid webhook token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se é uma compra confirmada/paga
    if (payload.order_status !== "paid" && payload.order_status !== "completed") {
      console.log(`Order status is ${payload.order_status}, skipping`);
      return new Response(
        JSON.stringify({ message: "Order not paid yet" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Inicializar Supabase Admin Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar usuário pelo e-mail do cliente
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("Error fetching users:", authError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = authData.users.find(u => u.email === payload.customer_email);
    
    if (!user) {
      console.error(`User not found for email: ${payload.customer_email}`);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Atualizar perfil do usuário para premium
    const now = new Date().toISOString();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1); // Premium válido por 1 mês

    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        plan_type: "premium",
        plan_started_at: now,
        plan_expires_at: expiresAt.toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error updating user profile:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update user profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${user.email} upgraded to premium`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User upgraded to premium",
        user_id: user.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("kiwify-webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
