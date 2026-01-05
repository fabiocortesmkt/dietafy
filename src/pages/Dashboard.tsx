import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  Home,
  UtensilsCrossed,
  Dumbbell,
  LineChart,
  User as UserIcon,
  ArrowUpRight,
  Camera,
  PlayCircle,
  SmilePlus,
  MessageCircle,
  Flame,
  Activity,
  Droplet,
  BedDouble,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  Heart,
  Scale,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { NavLink } from "@/components/NavLink";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AuthenticatedLayout } from "@/components/layouts/AuthenticatedLayout";
import { cn } from "@/lib/utils";
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ReferenceLine,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

// Minimal shape for user profile data we actually use here
interface UserProfile {
  full_name: string;
  weight_kg: number | null;
  target_weight_kg: number | null;
  goals: string[] | null;
  plan_type: "free" | "premium";
  height_cm: number | null;
}

const greetingForNow = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
};

type MainGoal =
  | "perder_gordura"
  | "hipertrofia"
  | "ganhar_massa"
  | "performance"
  | "controlar_glicose"
  | "reduzir_estresse";

const buildVitaMotivationMessage = (goals: string[] | null | undefined, firstName: string): string => {
  const name = firstName || "atleta";
  const goalsArray = goals || [];

  if (goalsArray.includes("perder_gordura")) {
    return `Hoje eu quero te ajudar a queimar gordura sem radicalizar demais, ${name}. Vamos focar em constância nas refeições e movimento.`;
  }

  if (goalsArray.includes("hipertrofia") || goalsArray.includes("ganhar_massa")) {
    return `Seu foco é ganhar massa, ${name}. Vamos garantir proteína suficiente e treinos consistentes para o corpo responder.`;
  }

  if (goalsArray.includes("performance")) {
    return `Meta de performance em jogo, ${name}. Hoje é dia de alinhar treino, sono e alimentação pra você render mais.`;
  }

  if (goalsArray.includes("controlar_glicose")) {
    return `Vou ficar de olho na sua glicose hoje, ${name}. Refeições equilibradas e movimento leve já fazem diferença.`;
  }

  if (goalsArray.includes("reduzir_estresse")) {
    return `Hoje quero te ajudar a tirar o corpo do modo alerta, ${name}. Pequenos rituais de sono, respiração e alimentação vão somar.`;
  }

  return `Hoje eu quero ser seu aliado para deixar a alimentação e o treino mais leves de seguir, ${name}. Vamos passo a passo.`;
};

const buildWaterMessage = (waterMl: number | null): string => {
  if (waterMl === null || waterMl === 0) {
    return "Água: ainda não vi registro hoje. Que tal pegar um copo agora?";
  }
  if (waterMl < 1000) {
    return `Água: você já registrou ${waterMl} ml hoje. Bora chegar em pelo menos 2.000 ml?`;
  }
  if (waterMl < 2000) {
    return `Água: ${waterMl} ml registrados. Estamos chegando lá, mantém esse ritmo.`;
  }
  return `Água: ${waterMl} ml hoje. Ótimo para manter energia e controlar o apetite.`;
};

const buildSleepMessage = (sleepHours: number | null, sleepQuality: number | null): string => {
  if (sleepHours == null && sleepQuality == null) {
    return "Sono: ainda não tenho registro recente. Quando registrar, eu uso isso para ajustar suas recomendações.";
  }

  const hoursText = sleepHours != null ? `${sleepHours}h` : "horas não informadas";
  const qualityText = sleepQuality != null ? `${sleepQuality}/10` : "qualidade não registrada";

  return `Sono: última noite com ${hoursText} e qualidade ${qualityText}. Vamos tentar proteger essa rotina de sono.`;
};

const buildWorkoutMessage = (workoutDone: boolean, workoutTitle: string | null): string => {
  if (!workoutDone) {
    return "Treino: ainda não vi treino concluído hoje. Se for um dia de descanso, tudo bem; se não, escolhe um treino rápido pra começar.";
  }

  if (workoutTitle) {
    return `Treino: você marcou "${workoutTitle}" como concluído hoje. Excelente para aproximar seus resultados do objetivo.`;
  }

  return "Treino: vi um treino concluído hoje. Boa! Mesmo sem detalhes, isso já soma muito para o seu progresso.";
};

interface DayEvent {
  hour: number;
  minute: number;
  title: string;
  description: string;
  type: "meal" | "workout";
}

const dailySchedule: DayEvent[] = [
  {
    hour: 10,
    minute: 0,
    title: "Lanche da manhã",
    description: "Sugestão da Vita para manter a glicose estável.",
    type: "meal",
  },
  {
    hour: 12,
    minute: 30,
    title: "Almoço",
    description: "Opções ricas em proteína e fibras para sustentar a tarde.",
    type: "meal",
  },
  {
    hour: 17,
    minute: 0,
    title: "Treino",
    description: "Peito e tríceps - 45 minutos, foco em força e técnica.",
    type: "workout",
  },
  {
    hour: 19,
    minute: 30,
    title: "Jantar",
    description: "Refeição leve para otimizar o sono e a recuperação.",
    type: "meal",
  },
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut" as const,
    },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
};

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [weightLogs, setWeightLogs] = useState<{ date: string; weight_kg: number }[]>([]);
  const [sleepLogs, setSleepLogs] = useState<{ date: string; quality_score: number }[]>([]);
  const [stressLogs, setStressLogs] = useState<{ datetime: string; level: number }[]>([]);
  const [dailyCarbs, setDailyCarbs] = useState<{ date: string; carbs: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingWeightLogs, setLoadingWeightLogs] = useState(false);
  const [todaySummary, setTodaySummary] = useState<{
    waterMl: number | null;
    sleepHours: number | null;
    sleepQuality: number | null;
    workoutDone: boolean;
    workoutTitle: string | null;
  } | null>(null);
  const [loadingTodaySummary, setLoadingTodaySummary] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const loadProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("full_name, weight_kg, target_weight_kg, goals, plan_type, height_cm")
        .eq("user_id", userId)
        .maybeSingle();

      if (!mounted) return;
      if (error) {
        console.error("Erro ao buscar perfil do usuário:", error);
        return;
      }
      setProfile(data as UserProfile);
    };

    const loadWeightLogs = async (userId: string) => {
      setLoadingWeightLogs(true);
      const { data, error } = await supabase
        .from("weight_logs")
        .select("date, weight_kg")
        .eq("user_id", userId)
        .order("date", { ascending: true });

      if (!mounted) return;
      if (error) {
        console.error("Erro ao buscar registros de peso:", error);
        setLoadingWeightLogs(false);
        return;
      }
      setWeightLogs((data || []) as { date: string; weight_kg: number }[]);
      setLoadingWeightLogs(false);
    };

    const loadSleepLogs = async (userId: string) => {
      const { data, error } = await supabase
        .from("sleep_logs")
        .select("date, quality_score")
        .eq("user_id", userId)
        .order("date", { ascending: true });

      if (!mounted) return;
      if (error) {
        console.error("Erro ao buscar registros de sono:", error);
        return;
      }
      setSleepLogs((data || []) as { date: string; quality_score: number }[]);
    };

    const loadStressLogs = async (userId: string) => {
      const { data, error } = await supabase
        .from("stress_logs")
        .select("datetime, level")
        .eq("user_id", userId)
        .order("datetime", { ascending: true });

      if (!mounted) return;
      if (error) {
        console.error("Erro ao buscar registros de estresse:", error);
        return;
      }
      setStressLogs((data || []) as { datetime: string; level: number }[]);
    };

    const loadDailyCarbs = async (userId: string) => {
      const { data, error } = await supabase
        .from("meals")
        .select("datetime, carbs")
        .eq("user_id", userId)
        .order("datetime", { ascending: true });

      if (!mounted) return;
      if (error) {
        console.error("Erro ao buscar refeições para glicose proxy:", error);
        return;
      }

      const perDay = new Map<string, number>();
      (data || []).forEach((meal: { datetime: string; carbs: number | null }) => {
        const d = new Date(meal.datetime);
        const key = d.toISOString().slice(0, 10);
        const prev = perDay.get(key) ?? 0;
        perDay.set(key, prev + Number(meal.carbs ?? 0));
      });

      const result = Array.from(perDay.entries())
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, carbs]) => ({ date, carbs }));

      setDailyCarbs(result);
    };

    const loadTodaySummary = async (userId: string) => {
      setLoadingTodaySummary(true);
      const today = new Date().toISOString().slice(0, 10);

      try {
        const { data: water, error: waterError } = await supabase
          .from("water_intake")
          .select("ml_consumed")
          .eq("user_id", userId)
          .eq("date", today)
          .maybeSingle();

        if (waterError) {
          console.error("Erro ao buscar água do dia:", waterError);
        }

        const { data: sleep, error: sleepError } = await supabase
          .from("sleep_logs")
          .select("sleep_time, wake_time, quality_score, date")
          .eq("user_id", userId)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sleepError) {
          console.error("Erro ao buscar sono recente:", sleepError);
        }

        let sleepHours: number | null = null;
        let sleepQuality: number | null = null;

        if (sleep?.sleep_time && sleep?.wake_time) {
          const start = new Date(sleep.sleep_time);
          const end = new Date(sleep.wake_time);
          const diffMs = end.getTime() - start.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          if (!Number.isNaN(diffHours) && diffHours > 0) {
            sleepHours = Number(diffHours.toFixed(1));
          }
        }

        if (typeof sleep?.quality_score === "number") {
          sleepQuality = Number(sleep.quality_score);
        }

        const { data: todayWorkout, error: workoutError } = await supabase
          .from("workout_logs")
          .select("date, workout_id, completed")
          .eq("user_id", userId)
          .eq("date", today)
          .eq("completed", true)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (workoutError) {
          console.error("Erro ao buscar treino do dia:", workoutError);
        }

        let workoutDone = false;
        let workoutTitle: string | null = null;

        if (todayWorkout?.workout_id) {
          workoutDone = true;
          const { data: workout, error: workoutInfoError } = await supabase
            .from("workouts")
            .select("title")
            .eq("id", todayWorkout.workout_id)
            .maybeSingle();

          if (workoutInfoError) {
            console.error("Erro ao buscar detalhes do treino do dia:", workoutInfoError);
          }

          workoutTitle = workout?.title ?? null;
        }

        setTodaySummary({
          waterMl: (water as any)?.ml_consumed ?? null,
          sleepHours,
          sleepQuality,
          workoutDone,
          workoutTitle,
        });
      } catch (error) {
        console.error("Erro ao montar resumo do dia:", error);
      } finally {
        setLoadingTodaySummary(false);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        setProfile(null);
        setWeightLogs([]);
        setSleepLogs([]);
        setStressLogs([]);
        setDailyCarbs([]);
        setTodaySummary(null);
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadProfile(session.user.id);
      loadWeightLogs(session.user.id);
      loadSleepLogs(session.user.id);
      loadStressLogs(session.user.id);
      loadDailyCarbs(session.user.id);
      loadTodaySummary(session.user.id);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        if (!session) {
          navigate("/auth");
          return;
        }
        setUser(session.user);
        loadProfile(session.user.id);
        loadWeightLogs(session.user.id);
        loadSleepLogs(session.user.id);
        loadStressLogs(session.user.id);
        loadDailyCarbs(session.user.id);
        loadTodaySummary(session.user.id);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const firstName = useMemo(() => {
    if (!profile?.full_name) return "";
    return profile.full_name.split(" ")[0];
  }, [profile?.full_name]);

  const greetingName = useMemo(() => {
    if (firstName) return firstName;
    if (profile && !firstName) return "";
    return "";
  }, [firstName, profile]);

  const vitaMotivationMessage = useMemo(() => {
    return buildVitaMotivationMessage(profile?.goals ?? [], greetingName);
  }, [profile?.goals, greetingName]);

  const todayLabel = useMemo(
    () => format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR }),
    [],
  );

  const vitaDaySummaryMessages = useMemo(() => {
    if (!todaySummary) return null;

    return {
      water: buildWaterMessage(todaySummary.waterMl),
      sleep: buildSleepMessage(todaySummary.sleepHours, todaySummary.sleepQuality),
      workout: buildWorkoutMessage(todaySummary.workoutDone, todaySummary.workoutTitle),
    };
  }, [todaySummary]);

  const weightHistory7d = useMemo(() => {
    if (!weightLogs.length) return [];
    const last7 = weightLogs.slice(-7);
    return last7.map((entry, idx) => ({
      day: `D${idx + 1}`,
      weight: Number(entry.weight_kg),
    }));
  }, [weightLogs]);

  const weightSeries30d = useMemo(() => {
    if (!weightLogs.length) return [];
    const last30 = weightLogs.slice(-30);
    return last30.map((entry) => ({
      day: format(new Date(entry.date), "dd/MM", { locale: ptBR }),
      value: Number(entry.weight_kg),
    }));
  }, [weightLogs]);

  const genericSeries30d = useMemo(
    () =>
      Array.from({ length: 30 }).map((_, idx) => ({
        day: idx + 1,
        value: 40 + Math.sin(idx / 5) * 10 + (idx % 3),
      })),
    [],
  );

  const bodyFatSeries30d = useMemo(() => {
    if (!sleepLogs.length) return [];

    const baseFat = (profile as any)?.biological_sex === "female" ? 28 : 20;

    const weightByDate = new Map<string, number>();
    weightLogs.forEach((w) => {
      weightByDate.set(w.date, Number(w.weight_kg));
    });

    const last30 = sleepLogs.slice(-30);

    let prevWeight: number | null = null;
    return last30.map((entry) => {
      const dateLabel = format(new Date(entry.date), "dd/MM", { locale: ptBR });
      const sleepScore = Number(entry.quality_score);

      const weight = weightByDate.get(entry.date) ?? prevWeight;
      let deltaWeight = 0;
      if (prevWeight !== null && weight !== null) {
        deltaWeight = (weight ?? prevWeight) - prevWeight;
      }
      if (weight != null) prevWeight = weight;

      const sleepImpact = (sleepScore - 6) * -0.15;
      const weightImpact = deltaWeight * 0.4;

      let fat = baseFat + sleepImpact + weightImpact;
      fat = Math.max(10, Math.min(45, fat));

      return {
        day: dateLabel,
        value: Number(fat.toFixed(1)),
      };
    });
  }, [sleepLogs, weightLogs, profile]);

  const glucoseSeries30d = useMemo(() => {
    if (!sleepLogs.length && !stressLogs.length && !dailyCarbs.length) return [];

    const carbsByDate = new Map<string, number>();
    dailyCarbs.forEach((c) => carbsByDate.set(c.date, c.carbs));

    const sleepByDate = new Map<string, number>();
    sleepLogs.forEach((s) => sleepByDate.set(s.date, s.quality_score));

    const stressByDate = new Map<string, { total: number; count: number }>();
    stressLogs.forEach((s) => {
      const d = new Date(s.datetime).toISOString().slice(0, 10);
      const agg = stressByDate.get(d) ?? { total: 0, count: 0 };
      agg.total += Number(s.level);
      agg.count += 1;
      stressByDate.set(d, agg);
    });

    const dates = Array.from(
      new Set([
        ...sleepLogs.map((s) => s.date),
        ...dailyCarbs.map((c) => c.date),
        ...Array.from(stressByDate.keys()),
      ]),
    ).sort();

    const last30 = dates.slice(-30);

    return last30.map((date) => {
      const carbs = carbsByDate.get(date) ?? 0;
      const sleep = sleepByDate.get(date) ?? 6;
      const stressAgg = stressByDate.get(date);
      const stress = stressAgg && stressAgg.count ? stressAgg.total / stressAgg.count : 3;

      let glucose = 95 + carbs * 0.03 + (stress - 3) * 2 - (sleep - 6) * 1.5;
      glucose = Math.max(70, Math.min(160, glucose));

      return {
        day: format(new Date(date), "dd/MM", { locale: ptBR }),
        value: Number(glucose.toFixed(0)),
      };
    });
  }, [sleepLogs, stressLogs, dailyCarbs]);

  const stressSeries30d = useMemo(() => {
    if (!stressLogs.length) return [];

    const perDay = new Map<string, { total: number; count: number }>();
    stressLogs.forEach((s) => {
      const d = new Date(s.datetime).toISOString().slice(0, 10);
      const agg = perDay.get(d) ?? { total: 0, count: 0 };
      agg.total += Number(s.level);
      agg.count += 1;
      perDay.set(d, agg);
    });

    const dates = Array.from(perDay.keys()).sort();
    const last30 = dates.slice(-30);

    const values = last30.map((date) => {
      const { total, count } = perDay.get(date)!;
      return { date, avg: total / count };
    });

    return values.map((entry, index) => {
      const windowStart = Math.max(0, index - 1);
      const windowEnd = Math.min(values.length - 1, index + 1);
      let sum = 0;
      let count = 0;
      for (let i = windowStart; i <= windowEnd; i++) {
        sum += values[i].avg;
        count++;
      }
      const smoothed = sum / count;

      return {
        day: format(new Date(entry.date), "dd/MM", { locale: ptBR }),
        value: Number(smoothed.toFixed(1)),
      };
    });
  }, [stressLogs]);

  const streakDays = 3; // placeholder até conectarmos com logs reais

  const checklistItems = [
    { label: "Café da manhã registrado", icon: UtensilsCrossed },
    { label: "2L de água", icon: Droplet },
    { label: "Treino completado", icon: Dumbbell },
    { label: "7h+ de sono", icon: BedDouble },
  ];

  const [checklistState, setChecklistState] = useState<boolean[]>(
    new Array(checklistItems.length).fill(false),
  );

  const [upcomingEvents, setUpcomingEvents] = useState<
    { timeLabel: string; title: string; description: string; isNext: boolean; type: "meal" | "workout" }[]
  >([]);
  const [isShowingTomorrowSchedule, setIsShowingTomorrowSchedule] = useState(false);

  useEffect(() => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const dinnerMinutes = 19 * 60 + 30;

    const baseMapped = dailySchedule.map((event) => {
      const minutes = event.hour * 60 + event.minute;
      const isFutureToday = minutes >= nowMinutes;
      return { ...event, minutes, isFutureToday };
    });

    let effectiveEvents = baseMapped.filter((event) => event.isFutureToday);
    let showingTomorrow = false;

    if (effectiveEvents.length === 0 && nowMinutes >= dinnerMinutes) {
      effectiveEvents = baseMapped;
      showingTomorrow = true;
    }

    const nextEvent = effectiveEvents[0] || null;

    const formatted = effectiveEvents.map((event) => {
      const timeStr = `${String(event.hour).padStart(2, "0")}:${String(event.minute).padStart(2, "0")}`;

      return {
        timeLabel: timeStr,
        title: event.title,
        description: event.description,
        isNext: nextEvent ? event.minutes === nextEvent.minutes : false,
        type: event.type,
      };
    });

    setUpcomingEvents(formatted);
    setIsShowingTomorrowSchedule(showingTomorrow);
  }, []);

  const checklistCompleted = checklistState.filter(Boolean).length;
  const checklistProgress = (checklistCompleted / checklistItems.length) * 100;

  const metabolicScore = useMemo(() => {
    let score = 7;
    if (profile?.goals?.includes("perder_gordura")) score += 1;
    if (streakDays >= 7) score += 1;
    return Math.max(0, Math.min(10, score));
  }, [profile?.goals, streakDays]);

  const metabolicLabel = useMemo(() => {
    if (metabolicScore >= 8) return "Excelente";
    if (metabolicScore >= 6) return "Bom";
    if (metabolicScore >= 4) return "Regular";
    return "Precisa atenção";
  }, [metabolicScore]);

  const bmiInfo = useMemo(() => {
    if (!profile?.weight_kg || !profile.height_cm) return null;

    const heightM = Number(profile.height_cm) / 100;
    if (!heightM || heightM <= 0) return null;

    const bmi = Number(profile.weight_kg) / (heightM * heightM);

    let category: "abaixo" | "normal" | "sobrepeso" | "obesidade" = "normal";
    if (bmi < 18.5) category = "abaixo";
    else if (bmi < 25) category = "normal";
    else if (bmi < 30) category = "sobrepeso";
    else category = "obesidade";

    return { bmi, category };
  }, [profile?.weight_kg, profile?.height_cm]);

  if (!user && loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/20 animate-pulse" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <AuthenticatedLayout>
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Premium Header with Gradient */}
        <motion.header 
          variants={headerVariants}
          initial="hidden"
          animate="visible"
          className="w-full workout-header-gradient border-b border-border/50 px-4 py-4 md:px-8 md:py-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="space-y-1">
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-muted-foreground capitalize"
              >
                {todayLabel}
              </motion.p>
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight"
              >
                {greetingForNow()}
                {greetingName ? <span className="text-gradient">, {greetingName}</span> : ""}!
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-muted-foreground max-w-md"
              >
                Vamos ajustar hoje para o seu metabolismo trabalhar a seu favor.
              </motion.p>
            </div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col items-start lg:items-end gap-3"
            >
              {profile && (
                <Badge 
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold",
                    profile.plan_type === "premium" 
                      ? "badge-premium-shimmer" 
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {profile.plan_type === "premium" ? (
                    <>
                      <Sparkles className="h-3 w-3 mr-1" />
                      PREMIUM
                    </>
                  ) : (
                    "PLANO FREE"
                  )}
                </Badge>
              )}
              
              {/* Vita Message Card - Desktop */}
              <Card className="hidden lg:flex glass-premium-vita max-w-sm">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-primary">
                      Mensagem da Vita
                    </p>
                    <p className="text-sm leading-relaxed">{vitaMotivationMessage}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Vita Message Card - Mobile */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:hidden mt-4"
          >
            <Card className="glass-premium-vita">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-primary">
                    Mensagem da Vita
                  </p>
                  <p className="text-sm leading-relaxed">{vitaMotivationMessage}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.header>

        <main className="flex-1 px-4 py-4 md:px-8 md:py-6 space-y-6 overflow-y-auto pb-24 md:pb-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Upgrade Banner for Free Users */}
            {profile?.plan_type === "free" && (
              <motion.section variants={itemVariants} aria-label="Banner de upgrade">
                <Card className="workout-card workout-card-premium border-primary/30 overflow-hidden">
                  <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 relative z-10">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl category-icon-bg flex items-center justify-center">
                        <Zap className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold flex items-center gap-2">
                          🎯 Desbloqueie todo potencial do DietaFY
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Faça upgrade para Premium e tenha a Vita liberada, WhatsApp ativo e treinos completos.
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => navigate("/pricing")}
                      className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                    >
                      Saiba mais
                      <ArrowUpRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.section>
            )}

            {/* Vita Day Summary */}
            {loadingTodaySummary && !vitaDaySummaryMessages && (
              <motion.section variants={itemVariants} aria-label="Resumo do dia pelo Vita">
                <Card className="glass-card">
                  <CardContent className="py-4 px-4">
                    <Skeleton className="h-4 w-40 mb-3" />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Skeleton className="h-16 rounded-lg" />
                      <Skeleton className="h-16 rounded-lg" />
                      <Skeleton className="h-16 rounded-lg" />
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            )}

            {vitaDaySummaryMessages && (
              <motion.section variants={itemVariants} aria-label="Resumo do dia pelo Vita">
                <Card className="workout-card overflow-hidden">
                  <CardContent className="py-4 px-4 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full category-icon-bg flex items-center justify-center">
                        <MessageCircle className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">
                          Recado da Vita
                        </span>
                        <p className="text-sm font-medium">
                          Olhei seu dia até agora e aqui vai um resumo rápido:
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <SummaryPill 
                        icon={Droplet} 
                        text={vitaDaySummaryMessages.water} 
                        color="blue"
                      />
                      <SummaryPill 
                        icon={BedDouble} 
                        text={vitaDaySummaryMessages.sleep} 
                        color="purple"
                      />
                      <SummaryPill 
                        icon={Dumbbell} 
                        text={vitaDaySummaryMessages.workout} 
                        color="green"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            )}

            {/* Metrics Grid */}
            <motion.section variants={itemVariants} aria-label="Métricas principais">
              <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                {/* Weight Card */}
                <MetricCard
                  title="Peso atual"
                  subtitle="Últimos 7 dias"
                  icon={Scale}
                  value={profile?.weight_kg ? `${profile.weight_kg.toFixed(1)} kg` : "--"}
                  trend={weightLogs.length >= 2 ? (
                    (() => {
                      const first = Number(weightLogs[0].weight_kg);
                      const last = Number(weightLogs[weightLogs.length - 1].weight_kg);
                      const delta = last - first;
                      const isLoss = delta < 0;
                      const goalIsLoss = (profile?.goals || []).includes("perder_gordura");
                      return {
                        value: `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg`,
                        positive: goalIsLoss ? isLoss : !isLoss,
                      };
                    })()
                  ) : undefined}
                  extra={bmiInfo && (
                    <div className="flex items-center gap-2 text-xs mt-2">
                      <Badge variant="secondary" className="text-xs">
                        IMC {bmiInfo.bmi.toFixed(1)}
                      </Badge>
                      <span className="text-muted-foreground">
                        {bmiInfo.category === "abaixo" && "Abaixo do peso"}
                        {bmiInfo.category === "normal" && "Peso adequado"}
                        {bmiInfo.category === "sobrepeso" && "Sobrepeso"}
                        {bmiInfo.category === "obesidade" && "Obesidade"}
                      </span>
                    </div>
                  )}
                >
                  <ChartWeightMini data={weightHistory7d} />
                </MetricCard>

                {/* Metabolic Score Card */}
                <MetricCard
                  title="Saúde metabólica"
                  subtitle="Score estimado"
                  icon={Activity}
                  value={metabolicScore.toFixed(1)}
                  valueLabel={metabolicLabel}
                  extra={
                    <p className="text-xs text-muted-foreground mt-1">
                      Calculado a partir do seu perfil e rotina.
                    </p>
                  }
                >
                  <div className="w-full h-16 flex items-center justify-center">
                    <MetabolicGauge score={metabolicScore} />
                  </div>
                </MetricCard>

                {/* Streak Card */}
                <MetricCard
                  title="Sequência"
                  subtitle="Dias consecutivos"
                  icon={Flame}
                  iconClassName="text-orange-500"
                  value={String(streakDays)}
                  valueLabel="dias"
                  extra={
                    <p className="text-xs text-muted-foreground mt-1">
                      Continue para marcos em 7, 14 e 30 dias.
                    </p>
                  }
                >
                  <div className="flex gap-1 mt-2">
                    {[...Array(7)].map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-2 flex-1 rounded-full transition-all",
                          i < streakDays 
                            ? "bg-gradient-to-r from-orange-400 to-orange-500" 
                            : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                </MetricCard>

                {/* Daily Goals Card */}
                <MetricCard
                  title="Meta do dia"
                  subtitle="Checklist rápido"
                  icon={Target}
                  value={`${checklistCompleted}/${checklistItems.length}`}
                  valueLabel="completas"
                >
                  <div className="space-y-2 mt-2">
                    {checklistItems.map((item, idx) => (
                      <label 
                        key={item.label} 
                        className="flex items-center gap-2 text-xs cursor-pointer group"
                      >
                        <Checkbox
                          checked={checklistState[idx]}
                          onCheckedChange={(checked) => {
                            setChecklistState((prev) => {
                              const next = [...prev];
                              next[idx] = Boolean(checked);
                              return next;
                            });
                          }}
                          className="h-4 w-4"
                        />
                        <item.icon className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className={cn(
                          "transition-all",
                          checklistState[idx] && "line-through text-muted-foreground"
                        )}>
                          {item.label}
                        </span>
                      </label>
                    ))}
                    <div className="mt-2">
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${checklistProgress}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  </div>
                </MetricCard>
              </div>
            </motion.section>

            {/* Main Chart */}
            <motion.section variants={itemVariants} aria-label="Gráfico principal">
              <Card className="workout-card overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">Seu corpo ao longo do tempo</CardTitle>
                      <CardDescription>Acompanhe sua evolução nos últimos 30 dias</CardDescription>
                    </div>
                    <div className="h-10 w-10 rounded-xl category-icon-bg flex items-center justify-center">
                      <LineChart className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="peso" className="w-full">
                    <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
                      <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-4 h-auto gap-1 p-1 bg-muted/50">
                        <TabsTrigger value="peso" className="text-xs whitespace-nowrap px-3 py-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                          <Scale className="h-3 w-3 mr-1.5 hidden sm:inline" />
                          Peso
                        </TabsTrigger>
                        <TabsTrigger value="gordura" className="text-xs whitespace-nowrap px-3 py-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                          Gordura %
                        </TabsTrigger>
                        <TabsTrigger value="glicose" className="text-xs whitespace-nowrap px-3 py-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                          Glicose
                        </TabsTrigger>
                        <TabsTrigger value="estresse" className="text-xs whitespace-nowrap px-3 py-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                          Estresse
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="peso" className="mt-4">
                      <ChartLineWithTarget
                        title="Peso (kg)"
                        data={weightSeries30d}
                        target={profile?.target_weight_kg ?? undefined}
                      />
                    </TabsContent>
                    <TabsContent value="gordura" className="mt-4">
                      <ChartLineWithTarget title="Gordura corporal (%)" data={bodyFatSeries30d} />
                    </TabsContent>
                    <TabsContent value="glicose" className="mt-4">
                      <ChartLineWithTarget title="Glicose (índice)" data={glucoseSeries30d} />
                    </TabsContent>
                    <TabsContent value="estresse" className="mt-4">
                      <ChartLineWithTarget title="Estresse (média diária)" data={stressSeries30d} />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </motion.section>

            {/* Quick Actions */}
            <motion.section variants={itemVariants} aria-label="Ações rápidas">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold tracking-tight">Ações rápidas</h2>
              </div>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <QuickActionButton 
                  icon={Droplet} 
                  label="Registrar água" 
                  onClick={() => navigate("/track?tab=agua")} 
                  color="blue"
                />
                <QuickActionButton 
                  icon={Camera} 
                  label="Registrar refeição" 
                  onClick={() => navigate("/track?tab=refeicao")} 
                  color="green"
                />
                <QuickActionButton 
                  icon={BedDouble} 
                  label="Registrar sono" 
                  onClick={() => navigate("/track?tab=sono")} 
                  color="purple"
                />
                <QuickActionButton 
                  icon={SmilePlus} 
                  label="Registrar humor" 
                  onClick={() => navigate("/track?tab=estresse")} 
                  color="orange"
                />
              </div>
            </motion.section>

            {/* Vita Insights */}
            <motion.section variants={itemVariants} aria-label="Insights da Vita">
              <Card className="workout-card workout-card-premium border-primary/20 overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <div className="h-8 w-8 rounded-lg category-icon-bg flex items-center justify-center">
                          <Sparkles className="h-4 w-4 text-primary" />
                        </div>
                        Insights da Vita
                      </CardTitle>
                      <CardDescription>
                        Análises personalizadas baseadas nos seus dados.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                    <p className="text-sm leading-relaxed">
                      💡 <span className="font-medium">Exemplo de insight:</span> "Notei que você treina melhor às 7h. Seus níveis de energia ficam até 30% maiores quando você treina nesse horário!".
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.section>

            {/* Schedule Timeline */}
            <motion.section variants={itemVariants} aria-label="Próximas refeições e treinos" className="pb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold tracking-tight">
                  {isShowingTomorrowSchedule
                    ? "Agenda de amanhã"
                    : "Próximos eventos"}
                </h2>
              </div>
              <Card className="workout-card overflow-hidden">
                <CardContent className="pt-6">
                  {upcomingEvents.length ? (
                    <div className="relative">
                      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/50 via-primary/20 to-transparent" />
                      <ul className="space-y-4">
                        {upcomingEvents.map((event, idx) => (
                          <TimelineItem
                            key={event.timeLabel + event.title}
                            time={event.timeLabel}
                            title={event.title}
                            description={event.description}
                            isNext={event.isNext}
                            type={event.type}
                            index={idx}
                          />
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="h-12 w-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
                        <Target className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Nenhuma refeição ou treino pendente hoje.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Revise sua rotina nas abas Dieta e Treinos.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.section>
          </motion.div>
        </main>
      </div>
    </AuthenticatedLayout>
  );
};

// Premium Summary Pill Component
interface SummaryPillProps {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  color: "blue" | "purple" | "green";
}

const SummaryPill = ({ icon: Icon, text, color }: SummaryPillProps) => {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  };

  return (
    <div className={cn(
      "flex items-start gap-2 p-3 rounded-xl border",
      colorClasses[color]
    )}>
      <div className={cn(
        "h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0",
        color === "blue" && "bg-blue-500/20",
        color === "purple" && "bg-purple-500/20",
        color === "green" && "bg-emerald-500/20",
      )}>
        <Icon className="h-3 w-3" />
      </div>
      <p className="text-xs leading-relaxed">{text}</p>
    </div>
  );
};

// Premium Metric Card Component
interface MetricCardProps {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  value: string;
  valueLabel?: string;
  trend?: { value: string; positive: boolean };
  extra?: React.ReactNode;
  children?: React.ReactNode;
}

const MetricCard = ({ 
  title, 
  subtitle, 
  icon: Icon, 
  iconClassName,
  value, 
  valueLabel,
  trend, 
  extra, 
  children 
}: MetricCardProps) => (
  <motion.div
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
    className="workout-card rounded-xl p-3 sm:p-4 min-h-[160px] sm:min-h-[180px]"
  >
    <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
      <div className="min-w-0 flex-1">
        <h3 className="text-xs sm:text-sm font-semibold truncate">{title}</h3>
        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
      <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg category-icon-bg flex items-center justify-center shrink-0">
        <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary", iconClassName)} />
      </div>
    </div>
    <div className="flex flex-wrap items-baseline gap-1 sm:gap-2">
      <span className="text-xl sm:text-2xl font-bold tracking-tight">{value}</span>
      {valueLabel && (
        <span className="text-xs sm:text-sm text-muted-foreground">{valueLabel}</span>
      )}
      {trend && (
        <span className={cn(
          "text-[10px] sm:text-xs font-medium flex items-center gap-0.5",
          trend.positive ? "text-emerald-500" : "text-orange-500"
        )}>
          {trend.positive ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
          {trend.value}
        </span>
      )}
    </div>
    {extra && <div className="mt-1 sm:mt-2">{extra}</div>}
    {children}
  </motion.div>
);

interface MetricLineProps {
  data: { day: string | number; value: number }[];
  target?: number;
  title?: string;
}

const ChartLineWithTarget = ({ data, target, title }: MetricLineProps) => {
  if (!data.length) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center text-center px-4 bg-muted/20 rounded-xl border border-dashed border-border">
        <div className="h-12 w-12 rounded-full bg-muted mb-3 flex items-center justify-center">
          <LineChart className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          {title ? (
            <>
              Comece registrando seus dados relacionados a{" "}
              <span className="font-medium text-foreground">{title.toLowerCase()}</span>
            </>
          ) : (
            "Comece registrando seus dados"
          )}
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-3"
          onClick={() => window.location.href = "/track"}
        >
          Ir para Registro diário
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-64 rounded-xl bg-muted/20 p-3 border border-border/50">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis 
            dataKey="day" 
            stroke="hsl(var(--muted-foreground))" 
            tickLine={false} 
            axisLine={false}
            fontSize={11}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))" 
            tickLine={false} 
            axisLine={false}
            fontSize={11}
          />
          <ReTooltip
            contentStyle={{
              fontSize: "0.75rem",
              borderRadius: 12,
              border: "1px solid hsl(var(--border))",
              backgroundColor: "hsl(var(--card))",
              boxShadow: "0 10px 40px -10px hsl(var(--foreground) / 0.1)",
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorValue)"
          />
          {typeof target === "number" && (
            <ReferenceLine
              y={target}
              stroke="hsl(var(--primary))"
              strokeDasharray="4 4"
              label={{ value: "Meta", position: "right", fill: "hsl(var(--primary))", fontSize: 10 }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};


interface WeightMiniProps {
  data: { day: string; weight: number }[];
}

const ChartWeightMini = ({ data }: WeightMiniProps) => {
  if (!data.length) {
    return (
      <div className="w-full h-16 flex items-center justify-center">
        <p className="text-xs text-muted-foreground">Sem dados</p>
      </div>
    );
  }

  return (
    <div className="w-full h-16 mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area 
            type="monotone" 
            dataKey="weight" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2} 
            fillOpacity={1}
            fill="url(#colorWeight)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

interface MetabolicGaugeProps {
  score: number;
}

const MetabolicGauge = ({ score }: MetabolicGaugeProps) => {
  const percentage = (score / 10) * 100;
  
  return (
    <div className="relative w-20 h-20">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="40"
          cy="40"
          r="32"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
        />
        <circle
          cx="40"
          cy="40"
          r="32"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${percentage * 2.01} 201`}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold">{score.toFixed(0)}</span>
      </div>
    </div>
  );
};

interface QuickActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  color: "blue" | "green" | "purple" | "orange";
}

const QuickActionButton = ({ icon: Icon, label, onClick, color }: QuickActionButtonProps) => {
  const colorClasses = {
    blue: "hover:border-blue-500/50 hover:bg-blue-500/5 group-hover:text-blue-500",
    green: "hover:border-emerald-500/50 hover:bg-emerald-500/5 group-hover:text-emerald-500",
    purple: "hover:border-purple-500/50 hover:bg-purple-500/5 group-hover:text-purple-500",
    orange: "hover:border-orange-500/50 hover:bg-orange-500/5 group-hover:text-orange-500",
  };

  const iconColors = {
    blue: "text-blue-500",
    green: "text-emerald-500",
    purple: "text-purple-500",
    orange: "text-orange-500",
  };

  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      type="button"
      className={cn(
        "group h-24 flex flex-col items-start justify-between p-4 text-left rounded-xl border border-border bg-card transition-all duration-200",
        colorClasses[color]
      )}
      onClick={onClick}
    >
      <div className={cn(
        "h-9 w-9 rounded-lg flex items-center justify-center transition-colors",
        color === "blue" && "bg-blue-500/10",
        color === "green" && "bg-emerald-500/10",
        color === "purple" && "bg-purple-500/10",
        color === "orange" && "bg-orange-500/10",
      )}>
        <Icon className={cn("h-5 w-5", iconColors[color])} />
      </div>
      <span className="text-sm font-medium leading-tight">{label}</span>
    </motion.button>
  );
};

interface TimelineItemProps {
  time: string;
  title: string;
  description: string;
  isNext?: boolean;
  type: "meal" | "workout";
  index: number;
}

const TimelineItem = ({ time, title, description, isNext, type, index }: TimelineItemProps) => (
  <motion.li 
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.1 }}
    className="relative pl-8"
  >
    <div className={cn(
      "absolute left-0 top-1 h-6 w-6 rounded-full flex items-center justify-center",
      isNext 
        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" 
        : "bg-muted text-muted-foreground"
    )}>
      {type === "meal" ? (
        <UtensilsCrossed className="h-3 w-3" />
      ) : (
        <Dumbbell className="h-3 w-3" />
      )}
    </div>
    <div className={cn(
      "flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3",
      isNext && "text-primary"
    )}>
      <span className={cn(
        "text-sm font-semibold tabular-nums",
        isNext ? "text-primary" : "text-foreground"
      )}>
        {time}
      </span>
      <div>
        <p className={cn(
          "text-sm font-medium",
          isNext ? "text-primary" : "text-foreground"
        )}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {isNext && (
        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0 ml-auto">
          Próximo
        </Badge>
      )}
    </div>
  </motion.li>
);


export default Dashboard;
