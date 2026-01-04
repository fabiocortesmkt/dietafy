import { supabase } from "@/integrations/supabase/client";

export type FeatureKey =
  | "log_meal"
  | "ai_message"
  | "photo_analysis"
  | "whatsapp"
  | "advanced_workouts"
  | "custom_plans";

export interface DailyLimits {
  meals_logged: number;
  ai_messages_sent: number;
  photo_analyses: number;
}

interface CanAccessResult {
  allowed: boolean;
  reason:
    | "premium"
    | "ok"
    | "limit_reached"
    | "premium_only"
    | "profile_missing"
    | "unknown_feature";
  limits?: DailyLimits;
  plan_type?: "free" | "premium";
}

export async function getUserPlan(userId: string): Promise<"free" | "premium" | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("plan_type")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar plano do usuário", error);
    return null;
  }

  return (data?.plan_type as "free" | "premium") ?? "free";
}

export async function getDailyLimits(userId: string, date: string): Promise<DailyLimits> {
  const { data, error } = await supabase
    .from("daily_limits")
    .select("meals_logged, ai_messages_sent, photo_analyses")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (error && (error as any).code !== "PGRST116") {
    console.error("Erro ao buscar limites diários", error);
  }

  return {
    meals_logged: data?.meals_logged ?? 0,
    ai_messages_sent: data?.ai_messages_sent ?? 0,
    photo_analyses: data?.photo_analyses ?? 0,
  };
}

export async function incrementDailyLimit(
  userId: string,
  date: string,
  field: keyof DailyLimits,
): Promise<void> {
  const current = await getDailyLimits(userId, date);
  const next: DailyLimits = {
    meals_logged: current.meals_logged,
    ai_messages_sent: current.ai_messages_sent,
    photo_analyses: current.photo_analyses,
  };
  next[field] = (next[field] ?? 0) + 1;

  const { error } = await supabase.from("daily_limits").upsert(
    {
      user_id: userId,
      date,
      meals_logged: next.meals_logged,
      ai_messages_sent: next.ai_messages_sent,
      photo_analyses: next.photo_analyses,
    } as any,
    {
      onConflict: "user_id,date",
      ignoreDuplicates: false,
    },
  );

  if (error) {
    console.error("Erro ao incrementar limite diário", error);
  }
}

export async function canUserAccessFeature(userId: string, feature: FeatureKey): Promise<CanAccessResult> {
  const today = new Date().toISOString().split("T")[0];
  const [plan, limits] = await Promise.all([getUserPlan(userId), getDailyLimits(userId, today)]);

  if (!plan) {
    return { allowed: false, reason: "profile_missing" };
  }

  if (plan === "premium") {
    return { allowed: true, reason: "premium", limits, plan_type: plan };
  }

  switch (feature) {
    case "log_meal": {
      const allowed = limits.meals_logged < 5;
      return {
        allowed,
        reason: allowed ? "ok" : "limit_reached",
        limits,
        plan_type: plan,
      };
    }
    case "ai_message": {
      const allowed = limits.ai_messages_sent < 10;
      return {
        allowed,
        reason: allowed ? "ok" : "limit_reached",
        limits,
        plan_type: plan,
      };
    }
    case "photo_analysis": {
      const allowed = limits.photo_analyses < 3;
      return {
        allowed,
        reason: allowed ? "ok" : "limit_reached",
        limits,
        plan_type: plan,
      };
    }
    case "whatsapp":
    case "advanced_workouts":
    case "custom_plans":
      return { allowed: false, reason: "premium_only", limits, plan_type: plan };
    default:
      return { allowed: true, reason: "unknown_feature", limits, plan_type: plan };
  }
}
