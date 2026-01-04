export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          message: string
          sender: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          message: string
          sender: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string
          sender?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          id: string
          started_at: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          started_at?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          started_at?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_limits: {
        Row: {
          ai_messages_sent: number
          created_at: string
          date: string
          id: string
          meals_logged: number
          photo_analyses: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_messages_sent?: number
          created_at?: string
          date: string
          id?: string
          meals_logged?: number
          photo_analyses?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_messages_sent?: number
          created_at?: string
          date?: string
          id?: string
          meals_logged?: number
          photo_analyses?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_message_count: {
        Row: {
          count: number
          created_at: string
          date: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          date: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          date?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meals: {
        Row: {
          ai_analysis: Json | null
          calories: number | null
          carbs: number | null
          created_at: string
          datetime: string
          description: string
          fat: number | null
          id: string
          photo_url: string | null
          protein: number | null
          type: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          calories?: number | null
          carbs?: number | null
          created_at?: string
          datetime: string
          description: string
          fat?: number | null
          id?: string
          photo_url?: string | null
          protein?: number | null
          type: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          calories?: number | null
          carbs?: number | null
          created_at?: string
          datetime?: string
          description?: string
          fat?: number | null
          id?: string
          photo_url?: string | null
          protein?: number | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      sleep_logs: {
        Row: {
          created_at: string
          date: string
          id: string
          quality_score: number
          sleep_time: string
          tags: string[] | null
          user_id: string
          wake_time: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          quality_score: number
          sleep_time: string
          tags?: string[] | null
          user_id: string
          wake_time: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          quality_score?: number
          sleep_time?: string
          tags?: string[] | null
          user_id?: string
          wake_time?: string
        }
        Relationships: []
      }
      stress_logs: {
        Row: {
          created_at: string
          datetime: string
          emoji: string | null
          id: string
          level: number
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          datetime: string
          emoji?: string | null
          id?: string
          level: number
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          datetime?: string
          emoji?: string | null
          id?: string
          level?: number
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      upgrade_intents: {
        Row: {
          cpf: string
          created_at: string
          email: string
          full_name: string
          id: string
          notes: string | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          processed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          cpf: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          notes?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          processed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          cpf?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          notes?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          processed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          activity_level: string
          avatar_url: string | null
          biological_sex: string
          created_at: string
          date_of_birth: string
          dietary_other: string | null
          dietary_restrictions: string[]
          full_name: string
          goals: string[]
          height_cm: number
          id: string
          notify_water: boolean
          notify_workout: boolean
          onboarding_completed: boolean
          plan_expires_at: string | null
          plan_started_at: string | null
          plan_type: Database["public"]["Enums"]["plan_type"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          target_timeframe: string | null
          target_weight_kg: number | null
          training_preference: string[]
          updated_at: string
          user_id: string
          weight_kg: number
          whatsapp_active: boolean
          whatsapp_last_message_at: string | null
          whatsapp_onboarding_payload: Json | null
          whatsapp_onboarding_state: string | null
          whatsapp_opt_in: boolean
          whatsapp_phone: string | null
        }
        Insert: {
          activity_level: string
          avatar_url?: string | null
          biological_sex: string
          created_at?: string
          date_of_birth: string
          dietary_other?: string | null
          dietary_restrictions: string[]
          full_name: string
          goals: string[]
          height_cm: number
          id?: string
          notify_water?: boolean
          notify_workout?: boolean
          onboarding_completed?: boolean
          plan_expires_at?: string | null
          plan_started_at?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          target_timeframe?: string | null
          target_weight_kg?: number | null
          training_preference: string[]
          updated_at?: string
          user_id: string
          weight_kg: number
          whatsapp_active?: boolean
          whatsapp_last_message_at?: string | null
          whatsapp_onboarding_payload?: Json | null
          whatsapp_onboarding_state?: string | null
          whatsapp_opt_in?: boolean
          whatsapp_phone?: string | null
        }
        Update: {
          activity_level?: string
          avatar_url?: string | null
          biological_sex?: string
          created_at?: string
          date_of_birth?: string
          dietary_other?: string | null
          dietary_restrictions?: string[]
          full_name?: string
          goals?: string[]
          height_cm?: number
          id?: string
          notify_water?: boolean
          notify_workout?: boolean
          onboarding_completed?: boolean
          plan_expires_at?: string | null
          plan_started_at?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          target_timeframe?: string | null
          target_weight_kg?: number | null
          training_preference?: string[]
          updated_at?: string
          user_id?: string
          weight_kg?: number
          whatsapp_active?: boolean
          whatsapp_last_message_at?: string | null
          whatsapp_onboarding_payload?: Json | null
          whatsapp_onboarding_state?: string | null
          whatsapp_opt_in?: boolean
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_workout_favorites: {
        Row: {
          created_at: string
          id: string
          user_id: string
          workout_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          workout_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_workout_favorites_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      water_intake: {
        Row: {
          created_at: string
          date: string
          id: string
          ml_consumed: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          ml_consumed?: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          ml_consumed?: number
          user_id?: string
        }
        Relationships: []
      }
      weight_logs: {
        Row: {
          created_at: string
          date: string
          fasting: boolean
          id: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          date: string
          fasting?: boolean
          id?: string
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          date?: string
          fasting?: boolean
          id?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          delivered_at: string | null
          direction: string
          id: string
          media_url: string | null
          message_text: string | null
          timestamp: string
          user_id: string
        }
        Insert: {
          delivered_at?: string | null
          direction: string
          id?: string
          media_url?: string | null
          message_text?: string | null
          timestamp?: string
          user_id: string
        }
        Update: {
          delivered_at?: string | null
          direction?: string
          id?: string
          media_url?: string | null
          message_text?: string | null
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          created_at: string
          exercise_name: string
          gif_url: string | null
          id: string
          instructions: string | null
          order_index: number
          reps: string | null
          rest_seconds: number | null
          sets: number | null
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercise_name: string
          gif_url?: string | null
          id?: string
          instructions?: string | null
          order_index: number
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          workout_id: string
        }
        Update: {
          created_at?: string
          exercise_name?: string
          gif_url?: string | null
          id?: string
          instructions?: string | null
          order_index?: number
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          completed: boolean
          created_at: string
          date: string
          id: string
          intensity: number | null
          notes: Json | null
          user_id: string
          workout_id: string | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          date: string
          id?: string
          intensity?: number | null
          notes?: Json | null
          user_id: string
          workout_id?: string | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          date?: string
          id?: string
          intensity?: number | null
          notes?: Json | null
          user_id?: string
          workout_id?: string | null
        }
        Relationships: []
      }
      workouts: {
        Row: {
          calories_burned_est: number | null
          category: string
          created_at: string
          difficulty: Database["public"]["Enums"]["workout_difficulty"]
          duration_min: number
          environment: string
          equipment_needed: string[] | null
          goal: Database["public"]["Enums"]["workout_goal"]
          id: string
          is_basic: boolean
          is_premium: boolean
          tags: string[] | null
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          calories_burned_est?: number | null
          category: string
          created_at?: string
          difficulty: Database["public"]["Enums"]["workout_difficulty"]
          duration_min: number
          environment: string
          equipment_needed?: string[] | null
          goal: Database["public"]["Enums"]["workout_goal"]
          id?: string
          is_basic?: boolean
          is_premium?: boolean
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          calories_burned_est?: number | null
          category?: string
          created_at?: string
          difficulty?: Database["public"]["Enums"]["workout_difficulty"]
          duration_min?: number
          environment?: string
          equipment_needed?: string[] | null
          goal?: Database["public"]["Enums"]["workout_goal"]
          id?: string
          is_basic?: boolean
          is_premium?: boolean
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      plan_type: "free" | "premium"
      workout_difficulty: "iniciante" | "intermediario" | "avancado"
      workout_goal: "perda_gordura" | "hipertrofia" | "forca" | "mobilidade"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      plan_type: ["free", "premium"],
      workout_difficulty: ["iniciante", "intermediario", "avancado"],
      workout_goal: ["perda_gordura", "hipertrofia", "forca", "mobilidade"],
    },
  },
} as const
