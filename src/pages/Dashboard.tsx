import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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

      // Versão mais estável: efeitos menores de sono e peso
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

      // Versão mais estável: coeficientes reduzidos
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

    // Suaviza com média móvel simples de 3 dias
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
    "Café da manhã registrado",
    "2L de água",
    "Treino completado",
    "7h+ de sono",
  ];

  const [checklistState, setChecklistState] = useState<boolean[]>(
    new Array(checklistItems.length).fill(false),
  );

  const [upcomingEvents, setUpcomingEvents] = useState<
    { timeLabel: string; title: string; description: string; isNext: boolean }[]
  >([]);
  const [isShowingTomorrowSchedule, setIsShowingTomorrowSchedule] = useState(false);

  useEffect(() => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const dinnerMinutes = 19 * 60 + 30; // 19h30

    const baseMapped = dailySchedule.map((event) => {
      const minutes = event.hour * 60 + event.minute;
      const isFutureToday = minutes >= nowMinutes;
      return { ...event, minutes, isFutureToday };
    });

    let effectiveEvents = baseMapped.filter((event) => event.isFutureToday);
    let showingTomorrow = false;

    // Depois do horário do jantar, mostrar a rotina do dia seguinte
    if (effectiveEvents.length === 0 && nowMinutes >= dinnerMinutes) {
      effectiveEvents = baseMapped; // usa toda a agenda do próximo dia
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
        <Skeleton className="h-10 w-40" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <AuthenticatedLayout>
      <div className="flex-1 flex flex-col">
        <header className="w-full border-b px-4 py-3 md:px-8 md:py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{todayLabel}</p>
            <h1 className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight">
              {greetingForNow()}
              {greetingName ? `, ${greetingName}!` : "!"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Vamos ajustar hoje para o seu metabolismo trabalhar a seu favor.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            {profile && (
              <span className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium text-muted-foreground">
                Plano {profile.plan_type === "premium" ? "PREMIUM ⭐" : "FREE"}
              </span>
            )}
            <Card className="hidden sm:flex items-center gap-3 p-4 animate-fade-in max-w-xs">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg">
                ✨
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Mensagem do Vita, seu nutricionista pessoal
                </p>
                <p className="text-sm leading-snug">{vitaMotivationMessage}</p>
              </div>
            </Card>
          </div>
        </header>

        <main className="flex-1 px-4 py-3 md:px-8 md:py-4 space-y-6 overflow-y-auto">
          {profile?.plan_type === "free" && (
            <section className="space-y-2" aria-label="Banner de upgrade">
              <Card className="border-dashed border-primary/40 bg-primary/5">
                <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 py-4">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      🎯 Desbloqueie todo potencial do DietaFY
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Faça upgrade para Premium e tenha a Vita liberada, WhatsApp ativo e treinos completos.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => navigate("/pricing")}>
                    Saiba mais
                  </Button>
                </CardContent>
              </Card>
            </section>
          )}

          {loadingTodaySummary && !vitaDaySummaryMessages && (
            <section aria-label="Resumo do dia pelo Vita" className="space-y-2">
              <Card className="bg-muted/60 border-dashed">
                <CardContent className="py-3 px-4">
                  <Skeleton className="h-4 w-40 mb-2" />
                  <Skeleton className="h-3 w-full mb-1" />
                  <Skeleton className="h-3 w-3/4" />
                </CardContent>
              </Card>
            </section>
          )}

          {vitaDaySummaryMessages && (
            <section aria-label="Resumo do dia pelo Vita" className="space-y-2 animate-fade-in">
              <Card className="bg-muted/60 border-dashed">
                <CardContent className="py-3 px-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-base">
                      <MessageCircle className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-muted-foreground">
                        Recado do Vita, seu nutricionista pessoal
                      </span>
                      <span className="text-sm text-foreground">
                        Olhei seu dia até agora e aqui vai um resumo rápido:
                      </span>
                    </div>
                  </div>

                  <div className="mt-1 grid gap-2 sm:grid-cols-3">
                    <div className="flex items-start gap-2 text-xs sm:text-sm">
                      <div className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <Droplet className="h-3 w-3" />
                      </div>
                      <p>{vitaDaySummaryMessages.water}</p>
                    </div>

                    <div className="flex items-start gap-2 text-xs sm:text-sm">
                      <div className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <BedDouble className="h-3 w-3" />
                      </div>
                      <p>{vitaDaySummaryMessages.sleep}</p>
                    </div>

                    <div className="flex items-start gap-2 text-xs sm:text-sm">
                      <div className="mt-0.5 h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <Dumbbell className="h-3 w-3" />
                      </div>
                      <p>{vitaDaySummaryMessages.workout}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Seção 2 - Cards de métricas */}
          <section aria-label="Métricas principais" className="space-y-3">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Card Peso Atual */}
              <Card className="animate-fade-in rounded-xl border border-border/80 bg-card/95 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-base font-semibold">Peso atual</CardTitle>
                    <CardDescription>Últimos 7 dias</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-semibold tracking-tight">
                        {profile?.weight_kg ? `${profile.weight_kg.toFixed(1)} kg` : "--"}
                      </span>
                      {weightLogs.length >= 2 ? (
                        <span
                          className={cn(
                            "text-sm font-medium",
                            (profile?.goals || []).includes("perder_gordura")
                              ? weightLogs[weightLogs.length - 1].weight_kg < weightLogs[0].weight_kg
                                ? "text-emerald-500"
                                : "text-muted-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {(() => {
                            const first = Number(weightLogs[0].weight_kg);
                            const last = Number(weightLogs[weightLogs.length - 1].weight_kg);
                            const delta = last - first;
                            const sign = delta > 0 ? "+" : "";
                            return `${sign}${delta.toFixed(1)} kg desde o início`;
                          })()}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">
                          Comece registrando seu peso na aba Registro diário
                        </span>
                      )}
                    </div>
                    {bmiInfo ? (
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-muted text-foreground font-medium">
                          IMC {bmiInfo.bmi.toFixed(1)}
                        </span>
                        <span className="text-muted-foreground">
                          {bmiInfo.category === "abaixo" && "Abaixo do peso"}
                          {bmiInfo.category === "normal" && "Peso adequado"}
                          {bmiInfo.category === "sobrepeso" && "Sobrepeso"}
                          {bmiInfo.category === "obesidade" && "Obesidade"}
                        </span>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Preencha peso e altura no seu perfil para ver seu IMC.
                      </p>
                    )}
                  </div>
                  <ChartWeightMini data={weightHistory7d} />
                </CardContent>
              </Card>

              {/* Card Score Metabólico */}
              <Card className="animate-fade-in rounded-xl border border-border/80 bg-card/95 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-base font-semibold">Saúde metabólica</CardTitle>
                    <CardDescription>Score estimado (0 - 10)</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                  <div className="w-32 h-32">
                    <MetabolicGauge score={metabolicScore} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-3xl font-semibold leading-none">{metabolicScore.toFixed(1)}</p>
                    <p className="text-sm font-medium text-muted-foreground">{metabolicLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      Calculado a partir do seu perfil, rotina e consistência diária.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Card Streak */}
              <Card className="animate-fade-in rounded-xl border border-border/80 bg-card/95 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-base font-semibold">Sequência de dias</CardTitle>
                    <CardDescription>Registro contínuo de hábitos</CardDescription>
                  </div>
                  <div className="text-2xl">
                    <Flame className="h-6 w-6 text-orange-500" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className={cn("flex items-baseline gap-2", streakDays >= 7 && "animate-pulse")}>
                    <span className="text-3xl font-semibold">{streakDays}</span>
                    <span className="text-sm text-muted-foreground">dias de disciplina</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Continue assim para desbloquear marcos em 7, 14 e 30 dias consecutivos.
                  </p>
                </CardContent>
              </Card>

              {/* Card Meta do dia */}
              <Card className="animate-fade-in rounded-xl border border-border/80 bg-card/95 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Meta do dia</CardTitle>
                  <CardDescription>Checklist rápido do seu hoje</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {checklistItems.map((label, idx) => (
                      <label key={label} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={checklistState[idx]}
                          onCheckedChange={(checked) => {
                            setChecklistState((prev) => {
                              const next = [...prev];
                              next[idx] = Boolean(checked);
                              return next;
                            });
                          }}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <Progress value={checklistProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {checklistCompleted} de {checklistItems.length} metas concluídas hoje.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Seção 3 - Gráfico principal */}
          <section aria-label="Gráfico principal" className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight">Seu corpo ao longo do tempo</h2>
            </div>
            <Card className="rounded-2xl border border-border/80 bg-card/95 shadow-sm">
              <CardContent className="pt-6">
                <Tabs defaultValue="peso" className="w-full">
                  <TabsList className="grid grid-cols-2 md:inline-flex w-full md:w-auto h-auto gap-1">
                    <TabsTrigger value="peso" className="text-xs sm:text-sm">Peso</TabsTrigger>
                    <TabsTrigger value="gordura" className="text-xs sm:text-sm">Gordura %</TabsTrigger>
                    <TabsTrigger value="glicose" className="text-xs sm:text-sm">Glicose</TabsTrigger>
                    <TabsTrigger value="estresse" className="text-xs sm:text-sm">Cortisol/Estresse</TabsTrigger>
                  </TabsList>
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
          </section>

          {/* Seção 4 - Quick actions */}
          <section aria-label="Ações rápidas" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Ações rápidas</h2>
            </div>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              <QuickActionButton icon={Droplet} label="Registrar água" onClick={() => navigate("/track?tab=agua")} />
              <QuickActionButton icon={Camera} label="Registrar refeição" onClick={() => navigate("/track?tab=refeicao")} />
              <QuickActionButton icon={BedDouble} label="Registrar sono" onClick={() => navigate("/track?tab=sono")} />
              <QuickActionButton icon={SmilePlus} label="Registrar humor" onClick={() => navigate("/track?tab=estresse")} />
            </div>
          </section>

          {/* Seção 5 - Vita Insights */}
          <section aria-label="Insights da Vita" className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Insights da Vita</h2>
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span>💡 Insights da Vita</span>
                  </CardTitle>
                  <CardDescription>
                    Assim que conectarmos seus registros diários, a Vita vai gerar análises personalizadas aqui.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed">
                  Exemplo de insight: "Notei que você treina melhor às 7h. Seus níveis de energia ficam até 30% maiores
                  quando você treina nesse horário!".
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Seção 6 - Próximas refeições/treino */}
          <section aria-label="Próximas refeições e treinos" className="space-y-3 pb-4">
            <h2 className="text-lg font-semibold tracking-tight">
              {isShowingTomorrowSchedule
                ? "Próximas refeições e treino de amanhã"
                : "Próximas refeições e treino"}
            </h2>
            <Card>
              <CardContent className="pt-6">
                <ul className="space-y-4">
                  {upcomingEvents.length ? (
                    upcomingEvents.map((event) => (
                      <TimelineItem
                        key={event.timeLabel + event.title}
                        time={event.timeLabel}
                        title={event.title}
                        description={event.description}
                        isNext={event.isNext}
                      />
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Nenhuma refeição ou treino pendente hoje. Revise sua rotina nas abas Dieta e Treinos.
                    </p>
                  )}
                </ul>
              </CardContent>
            </Card>
          </section>

        </main>
       </div>
     </AuthenticatedLayout>
   );
};

interface MetricLineProps {
  data: { day: string | number; value: number }[];
  target?: number;
  title?: string;
}

const ChartLineWithTarget = ({ data, target, title }: MetricLineProps) => {
  if (!data.length) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-xs text-muted-foreground text-center px-4">
        {title ? (
          <>
            Comece registrando seus dados relacionados a
            <span className="font-medium ml-1">{title.toLowerCase()}</span> na aba
            <span className="font-medium ml-1">Registro diário</span> para ver sua evolução aqui.
          </>
        ) : (
          <>
            Comece registrando seus dados na aba
            <span className="font-medium ml-1">Registro diário</span> para ver sua evolução aqui.
          </>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-64 rounded-xl border border-border/70 bg-muted/40 px-3 py-2 shadow-inner">
      <ReLineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" tickLine={false} />
        <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} />
        <ReTooltip
          contentStyle={{
            fontSize: "0.75rem",
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            backgroundColor: "hsl(var(--card))",
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
          strokeLinecap="round"
        />
        {typeof target === "number" && (
          <ReferenceLine
            y={target}
            stroke="hsl(var(--primary))"
            strokeDasharray="4 4"
            label={{ value: "Meta", position: "right", fill: "hsl(var(--primary))", fontSize: 10 }}
          />
        )}
      </ReLineChart>
    </div>
  );
};


interface WeightMiniProps {
  data: { day: string; weight: number }[];
}

const ChartWeightMini = ({ data }: WeightMiniProps) => {
  return (
    <div className="w-full h-24">
      <ReLineChart data={data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
        <XAxis dataKey="day" hide />
        <YAxis hide />
        <ReTooltip contentStyle={{ fontSize: "0.7rem" }} />
        <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
      </ReLineChart>
    </div>
  );
};

interface MetabolicGaugeProps {
  score: number;
}

const MetabolicGauge = ({ score }: MetabolicGaugeProps) => {
  const chartData = [{ name: "score", value: score }];

  const color = score >= 8 ? "hsl(var(--emerald-500))" : score >= 6 ? "hsl(var(--primary))" : score >= 4 ? "#facc15" : "#ef4444";

  return (
    <RadialBarChart
      cx="50%"
      cy="60%"
      innerRadius="70%"
      outerRadius="100%"
      barSize={8}
      data={chartData}
      startAngle={180}
      endAngle={0}
    >
      <PolarAngleAxis type="number" domain={[0, 10]} tick={false} />
      <RadialBar dataKey="value" cornerRadius={999} fill={color} background />
    </RadialBarChart>
  );
};

interface QuickActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}

const QuickActionButton = ({ icon: Icon, label, onClick }: QuickActionButtonProps) => (
  <Button
    type="button"
    variant="outline"
    className="h-24 flex flex-col items-start justify-between px-4 py-3 text-left hover-scale"
    onClick={onClick}
  >
    <Icon className="h-5 w-5 text-primary" />
    <span className="text-sm font-medium leading-tight">{label}</span>
  </Button>
);

interface TimelineItemProps {
  time: string;
  title: string;
  description: string;
  isNext?: boolean;
}

const TimelineItem = ({ time, title, description, isNext }: TimelineItemProps) => (
  <li className={cn("relative pl-6", isNext && "border-l-2 border-primary/80 ml-[-1px]")}>
    <span
      className={cn(
        "absolute left-0 top-1 h-2 w-2 rounded-full",
        isNext ? "bg-primary shadow-[0_0_0_4px_rgba(59,130,246,0.25)]" : "bg-primary/60",
      )}
    />
    <div className="flex items-baseline gap-2">
      <span
        className={cn(
          "text-xs font-medium text-muted-foreground w-16",
          isNext && "text-primary font-semibold",
        )}
      >
        {time}
      </span>
      <div>
        <p className={cn("text-sm font-medium", isNext && "text-primary")}>{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  </li>
);


export default Dashboard;
