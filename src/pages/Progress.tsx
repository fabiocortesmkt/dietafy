import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { format, subDays, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AuthenticatedLayout } from "@/components/layouts/AuthenticatedLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Flame,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  Activity,
  Scale,
  Dumbbell,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  XCircle,
  BarChart3,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface UserProfileLite {
  full_name: string;
  weight_kg: number | null;
  target_weight_kg: number | null;
}

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

const ProgressPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [weightLogs, setWeightLogs] = useState<Array<{ date: string; weight_kg: number }>>([]);
  const [workoutLogs, setWorkoutLogs] = useState<Array<{ date: string; completed: boolean }>>([]);
  const [logDaysMap, setLogDaysMap] = useState<Record<string, boolean>>({});
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const loadProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("full_name, weight_kg, target_weight_kg")
        .eq("user_id", userId)
        .maybeSingle();

      if (!mounted) return;
      if (error) {
        console.error("Erro ao buscar perfil do usuário (progresso):", error);
        return;
      }
      setProfile(data as UserProfileLite);
    };

    const loadMetrics = async (userId: string) => {
      try {
        setLoadingMetrics(true);
        setMetricsError(null);

        const since = format(subDays(new Date(), 60), "yyyy-MM-dd");
        const sinceDateTime = subDays(new Date(), 60).toISOString();

        const [
          weightRes,
          workoutRes,
          mealsRes,
          waterRes,
          sleepRes,
          stressRes,
        ] = await Promise.all([
          supabase
            .from("weight_logs")
            .select("date, weight_kg")
            .eq("user_id", userId)
            .gte("date", since),
          supabase
            .from("workout_logs")
            .select("date, completed")
            .eq("user_id", userId)
            .gte("date", since),
          supabase
            .from("meals")
            .select("datetime")
            .eq("user_id", userId)
            .gte("datetime", sinceDateTime),
          supabase
            .from("water_intake")
            .select("date")
            .eq("user_id", userId)
            .gte("date", since),
          supabase
            .from("sleep_logs")
            .select("date")
            .eq("user_id", userId)
            .gte("date", since),
          supabase
            .from("stress_logs")
            .select("datetime")
            .eq("user_id", userId)
            .gte("datetime", sinceDateTime),
        ]);

        if (
          weightRes.error ||
          workoutRes.error ||
          mealsRes.error ||
          waterRes.error ||
          sleepRes.error ||
          stressRes.error
        ) {
          console.error("Erro ao carregar métricas de progresso:", {
            weightError: weightRes.error,
            workoutError: workoutRes.error,
            mealsError: mealsRes.error,
            waterError: waterRes.error,
            sleepError: sleepRes.error,
            stressError: stressRes.error,
          });
          setMetricsError(
            "Não foi possível carregar seus dados de progresso agora. Tente novamente mais tarde.",
          );
          return;
        }

        setWeightLogs(
          (weightRes.data || []).map((w: any) => ({
            date: w.date,
            weight_kg: Number(w.weight_kg),
          })),
        );

        setWorkoutLogs(
          (workoutRes.data || []).map((w: any) => ({
            date: w.date,
            completed: !!w.completed,
          })),
        );

        const dayFlags: Record<string, boolean> = {};
        const markDay = (d: Date) => {
          const key = format(d, "yyyy-MM-dd");
          dayFlags[key] = true;
        };

        (mealsRes.data || []).forEach((m: any) => markDay(new Date(m.datetime)));
        (waterRes.data || []).forEach((w: any) => markDay(new Date(w.date)));
        (sleepRes.data || []).forEach((s: any) => markDay(new Date(s.date)));
        (stressRes.data || []).forEach((s: any) => markDay(new Date(s.datetime)));
        (workoutRes.data || []).forEach((w: any) => markDay(new Date(w.date)));
        (weightRes.data || []).forEach((w: any) => markDay(new Date(w.date)));

        setLogDaysMap(dayFlags);
      } finally {
        setLoadingMetrics(false);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        setProfile(null);
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadProfile(session.user.id);
      loadMetrics(session.user.id);
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
        loadMetrics(session.user.id);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const today = useMemo(() => new Date(), []);

  const todayLabel = useMemo(
    () => format(today, "EEEE, d 'de' MMMM", { locale: ptBR }),
    [today],
  );

  const weightHistory30d = useMemo(() => {
    if (!weightLogs.length) return [];

    const byDate: Record<string, number> = {};
    weightLogs.forEach((w) => {
      byDate[w.date] = Number(w.weight_kg);
    });

    const data: { day: string; weight: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = subDays(today, 29 - i);
      const key = format(d, "yyyy-MM-dd");
      if (byDate[key] != null) {
        data.push({ day: format(d, "dd/MM"), weight: byDate[key] });
      }
    }

    return data;
  }, [weightLogs, today]);

  const startWeight = weightHistory30d[0]?.weight ?? null;
  const currentWeight = weightHistory30d[weightHistory30d.length - 1]?.weight ?? null;
  const targetWeight = profile?.target_weight_kg ?? null;

  const totalDelta = startWeight && currentWeight ? startWeight - currentWeight : 0;
  const isLosingWeight = totalDelta > 0;

  const targetProgress = useMemo(() => {
    if (!targetWeight || !currentWeight || !startWeight) return 0;
    const totalToLose = startWeight - targetWeight;
    if (totalToLose === 0) return 100;
    const alreadyLost = startWeight - currentWeight;
    const pct = (alreadyLost / totalToLose) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [startWeight, currentWeight, targetWeight]);

  const startThisWeek = useMemo(
    () => startOfWeek(today, { weekStartsOn: 1 }),
    [today],
  );
  const endThisWeek = useMemo(
    () => endOfWeek(today, { weekStartsOn: 1 }),
    [today],
  );
  const startLastWeek = useMemo(
    () => subDays(startThisWeek, 7),
    [startThisWeek],
  );
  const endLastWeek = useMemo(
    () => subDays(endThisWeek, 7),
    [endThisWeek],
  );

  const weeklyWeightComparison = useMemo(() => {
    if (!weightLogs.length) return null;

    const thisWeekWeights: number[] = [];
    const lastWeekWeights: number[] = [];

    weightLogs.forEach((w) => {
      const d = parseISO(w.date);
      if (isWithinInterval(d, { start: startThisWeek, end: endThisWeek })) {
        thisWeekWeights.push(Number(w.weight_kg));
      } else if (isWithinInterval(d, { start: startLastWeek, end: endLastWeek })) {
        lastWeekWeights.push(Number(w.weight_kg));
      }
    });

    const avg = (arr: number[]) =>
      arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    const avgThis = avg(thisWeekWeights);
    const avgLast = avg(lastWeekWeights);
    const diff =
      avgThis != null && avgLast != null ? avgThis - avgLast : null;

    return { avgThis, avgLast, diff };
  }, [weightLogs, startThisWeek, endThisWeek, startLastWeek, endLastWeek]);

  const weeklyWorkoutComparison = useMemo(() => {
    if (!workoutLogs.length)
      return { thisWeek: 0, lastWeek: 0 };

    let thisWeek = 0;
    let lastWeek = 0;

    workoutLogs.forEach((w) => {
      if (!w.completed) return;
      const d = parseISO(w.date);
      if (isWithinInterval(d, { start: startThisWeek, end: endThisWeek })) {
        thisWeek += 1;
      } else if (
        isWithinInterval(d, { start: startLastWeek, end: endLastWeek })
      ) {
        lastWeek += 1;
      }
    });

    return { thisWeek, lastWeek };
  }, [workoutLogs, startThisWeek, endThisWeek, startLastWeek, endLastWeek]);

  const consistencyMetrics = useMemo(() => {
    const daysLast14: { date: Date; key: string }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = subDays(today, i);
      const key = format(d, "yyyy-MM-dd");
      daysLast14.push({ date: d, key });
    }

    let daysWithLogs = 0;
    daysLast14.forEach(({ key }) => {
      if (logDaysMap[key]) daysWithLogs += 1;
    });

    let thisWeekDays = 0;
    let thisWeekWithLogs = 0;
    let lastWeekDays = 0;
    let lastWeekWithLogs = 0;

    daysLast14.forEach(({ date, key }) => {
      if (isWithinInterval(date, { start: startThisWeek, end: endThisWeek })) {
        thisWeekDays += 1;
        if (logDaysMap[key]) thisWeekWithLogs += 1;
      } else if (
        isWithinInterval(date, { start: startLastWeek, end: endLastWeek })
      ) {
        lastWeekDays += 1;
        if (logDaysMap[key]) lastWeekWithLogs += 1;
      }
    });

    const pct = (a: number, b: number) =>
      b ? Math.round((a / b) * 100) : 0;

    return {
      last14Days: {
        daysWithLogs,
        totalDays: 14,
        pct: pct(daysWithLogs, 14),
      },
      thisWeek: {
        daysWithLogs: thisWeekWithLogs,
        totalDays: thisWeekDays || 7,
        pct: pct(thisWeekWithLogs, thisWeekDays || 7),
      },
      lastWeek: {
        daysWithLogs: lastWeekWithLogs,
        totalDays: lastWeekDays || 7,
        pct: pct(lastWeekWithLogs, lastWeekDays || 7),
      },
    };
  }, [logDaysMap, today, startThisWeek, endThisWeek, startLastWeek, endLastWeek]);

  // Calendar dots for last 14 days
  const calendarDots = useMemo(() => {
    const dots = [];
    for (let i = 13; i >= 0; i--) {
      const d = subDays(today, i);
      const key = format(d, "yyyy-MM-dd");
      const hasLog = !!logDaysMap[key];
      dots.push({
        date: d,
        dayLabel: format(d, "EEE", { locale: ptBR }).charAt(0).toUpperCase(),
        dayNumber: format(d, "d"),
        hasLog,
        isToday: i === 0,
      });
    }
    return dots;
  }, [logDaysMap, today]);

  if (!user && loading) {
    return <LoadingOverlay message="Carregando seu progresso..." />;
  }

  if (!user) return null;

  return (
    <AuthenticatedLayout>
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Premium Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
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
                Seu <span className="text-gradient">progresso</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-muted-foreground max-w-md"
              >
                Acompanhe sua evolução e celebre cada pequena vitória.
              </motion.p>
            </div>

            {/* Vita Tip Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="hidden lg:block"
            >
              <Card className="glass-premium-vita max-w-sm">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Flame className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-primary">Dica da Vita</p>
                    <p className="text-sm leading-relaxed">
                      Pequenas oscilações são normais. Foque na tendência das últimas semanas.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Vita Tip - Mobile */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:hidden mt-4"
          >
            <Card className="glass-premium-vita">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Flame className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-primary">Dica da Vita</p>
                  <p className="text-sm leading-relaxed">
                    Foque na tendência, não no dia isolado.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.header>

        <main className="flex-1 px-4 py-4 md:px-8 md:py-6 space-y-6 overflow-y-auto pb-24 md:pb-8">
          {metricsError && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="py-3 text-sm text-destructive">
                {metricsError}
              </CardContent>
            </Card>
          )}

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Main Metrics Grid */}
            <motion.section variants={itemVariants} className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {/* Weight Card */}
              <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }}>
                <Card className="workout-card overflow-hidden h-full">
                  <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-xs sm:text-sm font-semibold truncate">Peso atual</CardTitle>
                        <CardDescription className="text-[10px] sm:text-xs">Últimos 30 dias</CardDescription>
                      </div>
                      <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg category-icon-bg flex items-center justify-center shrink-0">
                        <Scale className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 p-3 sm:p-6 pt-0 sm:pt-0">
                    <div className="flex flex-wrap items-baseline gap-1 sm:gap-2">
                      <span className="text-2xl sm:text-3xl font-bold">
                        {currentWeight ? `${currentWeight.toFixed(1)}` : "—"}
                      </span>
                      <span className="text-xs sm:text-sm text-muted-foreground">kg</span>
                      {totalDelta !== 0 && (
                        <Badge 
                          variant="secondary"
                          className={cn(
                            "text-xs gap-1",
                            isLosingWeight 
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                              : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                          )}
                        >
                          {isLosingWeight ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                          {isLosingWeight ? "-" : "+"}{Math.abs(totalDelta).toFixed(1)} kg
                        </Badge>
                      )}
                    </div>

                    {startWeight && targetWeight && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Rumo à meta</span>
                          <span className="font-semibold text-primary">{targetProgress.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${targetProgress}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>Início: {startWeight.toFixed(1)} kg</span>
                          <span>Meta: {targetWeight.toFixed(1)} kg</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Consistency Card */}
              <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }}>
                <Card className="workout-card overflow-hidden h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-semibold">Consistência</CardTitle>
                        <CardDescription className="text-xs">Últimas 2 semanas</CardDescription>
                      </div>
                      <div className="h-9 w-9 rounded-lg category-icon-bg flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">
                        {consistencyMetrics.last14Days.daysWithLogs}
                      </span>
                      <span className="text-sm text-muted-foreground">/14 dias</span>
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                        {consistencyMetrics.last14Days.pct}%
                      </Badge>
                    </div>

                    {/* Calendar Dots */}
                    <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                      {calendarDots.map((dot, i) => (
                        <div key={i} className="flex flex-col items-center gap-0.5">
                          <span className="text-[8px] sm:text-[9px] text-muted-foreground">{dot.dayLabel}</span>
                          <div className={cn(
                            "h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-medium transition-colors",
                            dot.hasLog 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted text-muted-foreground",
                            dot.isToday && "ring-2 ring-primary ring-offset-1 sm:ring-offset-2 ring-offset-background"
                          )}>
                            {dot.dayNumber}
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full group hover:border-primary/50"
                      onClick={() => navigate("/track")}
                    >
                      <Zap className="h-3 w-3 mr-1 group-hover:text-primary" />
                      Registrar hoje
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Workouts Card */}
              <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }}>
                <Card className="workout-card overflow-hidden h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-semibold">Treinos</CardTitle>
                        <CardDescription className="text-xs">Esta vs última semana</CardDescription>
                      </div>
                      <div className="h-9 w-9 rounded-lg category-icon-bg flex items-center justify-center">
                        <Dumbbell className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{weeklyWorkoutComparison.thisWeek}</span>
                      <span className="text-sm text-muted-foreground">treinos</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <ComparisonBadge 
                        label="Esta semana" 
                        value={weeklyWorkoutComparison.thisWeek} 
                        isCurrent 
                      />
                      <ComparisonBadge 
                        label="Semana passada" 
                        value={weeklyWorkoutComparison.lastWeek} 
                      />
                    </div>

                    {weeklyWorkoutComparison.thisWeek >= weeklyWorkoutComparison.lastWeek ? (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Mantendo ou superando a última semana!
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        Ainda dá tempo de treinar mais esta semana.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </motion.section>

            {/* Weight Chart */}
            <motion.section variants={itemVariants}>
              <Card className="workout-card overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Evolução do peso
                      </CardTitle>
                      <CardDescription>Últimos 30 dias de registro</CardDescription>
                    </div>
                    {weeklyWeightComparison?.diff != null && (
                      <Badge 
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          weeklyWeightComparison.diff < 0 
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                            : weeklyWeightComparison.diff > 0
                              ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                              : ""
                        )}
                      >
                        Média semanal: {weeklyWeightComparison.diff > 0 ? "+" : ""}{weeklyWeightComparison.diff.toFixed(1)} kg
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {weightHistory30d.length > 0 ? (
                    <div className="w-full h-64 rounded-xl bg-muted/20 p-3 border border-border/50">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={weightHistory30d} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
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
                            domain={['auto', 'auto']}
                          />
                          <ReTooltip
                            contentStyle={{
                              fontSize: "0.75rem",
                              borderRadius: 12,
                              border: "1px solid hsl(var(--border))",
                              backgroundColor: "hsl(var(--card))",
                              boxShadow: "0 10px 40px -10px hsl(var(--foreground) / 0.1)",
                            }}
                            formatter={(value: number) => [`${value.toFixed(1)} kg`, 'Peso']}
                          />
                          <Area
                            type="monotone"
                            dataKey="weight"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorWeight)"
                          />
                          {targetWeight && (
                            <ReferenceLine
                              y={targetWeight}
                              stroke="hsl(var(--primary))"
                              strokeDasharray="4 4"
                              label={{ value: "Meta", position: "right", fill: "hsl(var(--primary))", fontSize: 10 }}
                            />
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="w-full h-64 flex flex-col items-center justify-center text-center bg-muted/20 rounded-xl border border-dashed border-border">
                      <div className="h-12 w-12 rounded-full bg-muted mb-3 flex items-center justify-center">
                        <Scale className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Comece registrando seu peso para ver o gráfico
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate("/track?tab=peso")}
                      >
                        Registrar peso
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.section>

            {/* Insights Section */}
            <motion.section variants={itemVariants}>
              <Card className="workout-card workout-card-premium overflow-hidden border-primary/20">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl category-icon-bg flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Resumo da Vita</CardTitle>
                      <CardDescription>Indicadores gerais da sua jornada</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <InsightCard 
                      icon={TrendingDown}
                      title="Tendência de peso"
                      description={isLosingWeight ? "Queda estável nas últimas semanas" : "Mantendo peso consistente"}
                      positive={isLosingWeight}
                    />
                    <InsightCard 
                      icon={Target}
                      title="Calorias estimadas"
                      description="Ficando próxima da meta na maioria dos dias"
                      positive
                    />
                    <InsightCard 
                      icon={Calendar}
                      title="Fim de semana"
                      description="Mais flexível, mas dentro do ajustável"
                      neutral
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          </motion.div>
        </main>
      </div>
    </AuthenticatedLayout>
  );
};

// Comparison Badge Component
interface ComparisonBadgeProps {
  label: string;
  value: number;
  isCurrent?: boolean;
}

const ComparisonBadge = ({ label, value, isCurrent }: ComparisonBadgeProps) => (
  <div className={cn(
    "flex-1 rounded-lg p-2 text-center",
    isCurrent 
      ? "bg-primary/10 border border-primary/20" 
      : "bg-muted"
  )}>
    <p className={cn(
      "text-lg font-bold",
      isCurrent && "text-primary"
    )}>
      {value}
    </p>
    <p className="text-[10px] text-muted-foreground">{label}</p>
  </div>
);

// Insight Card Component
interface InsightCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  positive?: boolean;
  neutral?: boolean;
}

const InsightCard = ({ icon: Icon, title, description, positive, neutral }: InsightCardProps) => (
  <div className={cn(
    "rounded-xl p-3 border",
    positive && "bg-emerald-500/5 border-emerald-500/20",
    neutral && "bg-muted/50 border-border/50",
    !positive && !neutral && "bg-orange-500/5 border-orange-500/20"
  )}>
    <div className="flex items-start gap-2">
      <div className={cn(
        "h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0",
        positive && "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        neutral && "bg-muted text-muted-foreground",
        !positive && !neutral && "bg-orange-500/20 text-orange-600 dark:text-orange-400"
      )}>
        <Icon className="h-3 w-3" />
      </div>
      <div>
        <p className="text-xs font-semibold">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  </div>
);

export default ProgressPage;
