import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { User } from "@supabase/supabase-js";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AuthenticatedLayout } from "@/components/layouts/AuthenticatedLayout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  Dumbbell,
  Flame,
  Heart,
  HeartOff,
  Home,
  LineChart,
  Lock,
  MessageCircle,
  Timer,
  User as UserIcon,
  UtensilsCrossed,
} from "lucide-react";

interface Workout {
  id: string;
  title: string;
  category: string;
  environment: string;
  duration_min: number;
  difficulty: "iniciante" | "intermediario" | "avancado";
  goal: "perda_gordura" | "hipertrofia" | "forca" | "mobilidade";
  equipment_needed: string[] | null;
  calories_burned_est: number | null;
  tags: string[] | null;
  is_basic?: boolean;
  is_premium?: boolean;
}

const Workouts = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [planType, setPlanType] = useState<"free" | "premium" | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session) {
        setUser(null);
        navigate("/auth");
        return;
      }
      setUser(session.user);
    });

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (!mounted) return;
        if (!session) {
          navigate("/auth");
          return;
        }
        setUser(session.user);
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("plan_type")
          .eq("user_id", session.user.id)
          .maybeSingle();
        setPlanType((profile?.plan_type as "free" | "premium") ?? "free");
      })
      .finally(() => {
        if (mounted) setLoadingAuth(false);
      });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  if (loadingAuth || !user || !planType) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-10 w-40" />
      </div>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="flex-1 flex flex-col pb-16 md:pb-0">
        <WorkoutsHeader planType={planType} />
        <WorkoutsContent userId={user.id} planType={planType} />
      </div>
    </AuthenticatedLayout>
  );
};

const WorkoutsHeader = ({ planType }: { planType: "free" | "premium" }) => {
  return (
    <header className="w-full border-b px-4 pt-3 pb-3 md:px-8 md:pt-4 md:pb-4 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Biblioteca de treinos</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-xl">
          Encontre treinos prontos para casa ou academia, filtre por objetivo e dificuldade e deixe o Vita guiar sua rotina.
        </p>
      </div>
      <Card className="hidden sm:flex items-center gap-3 p-4 max-w-xs">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg">
          <Flame className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Plano atual</p>
          <p className="text-sm leading-snug">
            {planType === "premium"
              ? "Acesso total a todos os treinos."
              : "Apenas 3 treinos básicos liberados. Faça upgrade para liberar todos."}
          </p>
        </div>
      </Card>
    </header>
  );
};

const WorkoutsContent = ({ userId, planType }: { userId: string; planType: "free" | "premium" }) => {
  const navigate = useNavigate();

  const { data: workouts = [], isLoading } = useQuery<Workout[]>({
    queryKey: ["workouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .order("duration_min", { ascending: true });
      if (error) throw error;
      return data as Workout[];
    },
  });

  const { data: favoritesData = [] } = useQuery<string[]>({
    queryKey: ["workout-favorites", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_workout_favorites")
        .select("workout_id")
        .eq("user_id", userId);
      if (error) throw error;
      return (data || []).map((f) => f.workout_id as string);
    },
  });

  const [tab, setTab] = useState<string>("todos");
  const [durationFilter, setDurationFilter] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
  const [goalFilter, setGoalFilter] = useState<string | null>(null);

  const favorites = favoritesData;

  const filteredWorkouts = useMemo(() => {
    return workouts.filter((w) => {
      if (tab === "casa" && w.environment !== "casa") return false;
      if (tab === "academia" && w.environment !== "academia") return false;
      if (tab === "favoritos" && !favorites.includes(w.id)) return false;
      if (tab === "gratis" && !w.is_basic) return false;

      if (durationFilter) {
        if (durationFilter === "lt20" && w.duration_min >= 20) return false;
        if (durationFilter === "20-40" && (w.duration_min < 20 || w.duration_min > 40)) return false;
        if (durationFilter === "40-60" && (w.duration_min < 40 || w.duration_min > 60)) return false;
        if (durationFilter === "gt60" && w.duration_min <= 60) return false;
      }

      if (difficultyFilter && w.difficulty !== difficultyFilter) return false;
      if (goalFilter && w.goal !== goalFilter) return false;

      return true;
    });
  }, [workouts, tab, favorites, durationFilter, difficultyFilter, goalFilter]);

  return (
    <main className="flex-1 px-4 py-3 md:px-8 md:py-4 space-y-6 overflow-y-auto">
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <div className="flex flex-col gap-3">
          <TabsList className="w-full flex flex-wrap justify-start gap-1">
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="gratis">Grátis</TabsTrigger>
            <TabsTrigger value="casa">Casa</TabsTrigger>
            <TabsTrigger value="academia">Academia</TabsTrigger>
            <TabsTrigger value="favoritos">Favoritos</TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap gap-2 text-xs">
            <FilterChip
              label="<20min"
              active={durationFilter === "lt20"}
              onClick={() => setDurationFilter(durationFilter === "lt20" ? null : "lt20")}
            />
            <FilterChip
              label="20-40min"
              active={durationFilter === "20-40"}
              onClick={() => setDurationFilter(durationFilter === "20-40" ? null : "20-40")}
            />
            <FilterChip
              label="40-60min"
              active={durationFilter === "40-60"}
              onClick={() => setDurationFilter(durationFilter === "40-60" ? null : "40-60")}
            />
            <FilterChip
              label="60min+"
              active={durationFilter === "gt60"}
              onClick={() => setDurationFilter(durationFilter === "gt60" ? null : "gt60")}
            />

            <FilterChip
              label="Iniciante"
              active={difficultyFilter === "iniciante"}
              onClick={() => setDifficultyFilter(difficultyFilter === "iniciante" ? null : "iniciante")}
            />
            <FilterChip
              label="Intermediário"
              active={difficultyFilter === "intermediario"}
              onClick={() => setDifficultyFilter(difficultyFilter === "intermediario" ? null : "intermediario")}
            />
            <FilterChip
              label="Avançado"
              active={difficultyFilter === "avancado"}
              onClick={() => setDifficultyFilter(difficultyFilter === "avancado" ? null : "avancado")}
            />

            <FilterChip
              label="Perda de gordura"
              active={goalFilter === "perda_gordura"}
              onClick={() => setGoalFilter(goalFilter === "perda_gordura" ? null : "perda_gordura")}
            />
            <FilterChip
              label="Hipertrofia"
              active={goalFilter === "hipertrofia"}
              onClick={() => setGoalFilter(goalFilter === "hipertrofia" ? null : "hipertrofia")}
            />
            <FilterChip
              label="Força"
              active={goalFilter === "forca"}
              onClick={() => setGoalFilter(goalFilter === "forca" ? null : "forca")}
            />
            <FilterChip
              label="Mobilidade"
              active={goalFilter === "mobilidade"}
              onClick={() => setGoalFilter(goalFilter === "mobilidade" ? null : "mobilidade")}
            />
          </div>

          {planType === "free" && (
            <Card className="border-primary/40 bg-primary/5 mt-1">
              <CardContent className="py-4 flex flex-col gap-3">
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">Diferença entre plano Free e Premium</p>
                  <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
                    <li>Free: acesso a alguns treinos básicos, principalmente em casa.</li>
                    <li>Premium: acesso a todos os treinos, blocos semanais completos e variações por nível.</li>
                    <li>Favoritar treinos completos e rotinas guiadas pela Vita são exclusivos do Premium.</li>
                  </ul>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => navigate("/upgrade")}>
                    Fazer upgrade agora
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setTab("gratis")}>
                    Ver treinos liberados (Free)
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : (
            <WorkoutGrid workouts={filteredWorkouts} favorites={favorites} userId={userId} planType={planType} />
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
};

const FilterChip = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
        (active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground hover:bg-muted")
      }
    >
      {label}
    </button>
  );
};

const WorkoutGrid = ({
  workouts,
  favorites,
  userId,
  planType,
}: {
  workouts: Workout[];
  favorites: string[];
  userId: string;
  planType: "free" | "premium";
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const toggleFavorite = async (workoutId: string) => {
    const isFav = favorites.includes(workoutId);

    if (isFav) {
      const { error } = await supabase
        .from("user_workout_favorites")
        .delete()
        .eq("user_id", userId)
        .eq("workout_id", workoutId);
      if (error) {
        console.error("Erro ao remover favorito", error);
        toast({
          title: "Erro ao atualizar favorito",
          description: "Tente novamente mais tarde.",
          variant: "destructive",
        });
      }
    } else {
      if (planType === "free") {
        toast({
          title: "Treino Premium",
          description: "Favoritar treinos completos é exclusivo do plano Premium.",
        });
        return;
      }
      const { error } = await supabase.from("user_workout_favorites").insert({
        user_id: userId,
        workout_id: workoutId,
      });
      if (error) {
        console.error("Erro ao adicionar favorito", error);
        toast({
          title: "Erro ao atualizar favorito",
          description: "Tente novamente mais tarde.",
          variant: "destructive",
        });
      }
    }
  };

  if (!workouts.length) {
    return (
      <Card className="p-6 flex flex-col items-center justify-center text-center gap-2">
        <p className="text-sm font-medium">Nenhum treino encontrado com os filtros atuais.</p>
        <p className="text-xs text-muted-foreground">Ajuste os filtros ou veja todos os treinos.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {planType === "free" && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="space-y-1 text-sm">
              <p className="font-medium">Desbloqueie todos os treinos Premium</p>
              <p className="text-xs text-muted-foreground max-w-xl">
                Acesse blocos semanais completos, variações de exercícios (fácil / padrão / avançado) e treinos
                avançados que a Vita usa para montar sua rotina ideal.
              </p>
            </div>
            <Button size="sm" className="text-xs" onClick={() => navigate("/upgrade")}>
              Fazer upgrade para Premium
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workouts.map((workout) => {
          const isFav = favorites.includes(workout.id);
          const categoryLabel = buildCategoryLabel(workout);
          const subtitle = buildSubtitle(workout);
          const isPremium = Boolean(workout.is_premium) || !workout.is_basic;
          const isLockedForFreeUser = planType === "free" && isPremium;

          const handleStartClick = () => {
            if (isLockedForFreeUser) {
              toast({
                title: "Treino Premium",
                description:
                  "Este treino faz parte do plano Premium. Faça upgrade para liberar todos os treinos e blocos semanais.",
              });
              navigate("/upgrade");
              return;
            }
            navigate(`/workouts/${workout.id}`);
          };

          return (
            <Card
              key={workout.id}
              className={
                "flex flex-col justify-between relative overflow-hidden" +
                (planType === "free" && workout.is_basic ? " border-primary/60" : "")
              }
            >
              {isLockedForFreeUser && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] pointer-events-none" />
              )}
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3 relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {categoryLabel}
                    </Badge>
                    {workout.is_basic && (
                      <Badge
                        className={
                          "text-[10px] font-semibold " +
                          (planType === "free"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground")
                        }
                      >
                        Gratuito
                      </Badge>
                    )}
                    {isLockedForFreeUser && (
                      <Badge variant="outline" className="flex items-center gap-1 text-[10px]">
                        <Lock className="h-3 w-3" /> Premium
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base leading-snug">{workout.title}</CardTitle>
                  <CardDescription className="text-xs leading-snug">{subtitle}</CardDescription>
                </div>
                <button
                  type="button"
                  onClick={() => toggleFavorite(workout.id)}
                  className="rounded-full p-2 border bg-background hover:bg-muted transition-colors relative z-10"
                  aria-label={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                >
                  {isFav ? (
                    <Heart className="h-4 w-4 text-primary fill-primary" />
                  ) : (
                    <HeartOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CardHeader>
              <CardContent className="pt-0 pb-4 flex items-end justify-between gap-4 relative z-10">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline" className="flex items-center gap-1 text-[11px]">
                    <Timer className="h-3 w-3" />
                    {workout.duration_min}min
                  </Badge>
                  {typeof workout.calories_burned_est === "number" && (
                    <Badge variant="outline" className="flex items-center gap-1 text-[11px]">
                      <Flame className="h-3 w-3 text-primary" />
                      ≈ {workout.calories_burned_est} kcal
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  className="text-xs"
                  variant={isLockedForFreeUser ? "outline" : "default"}
                  onClick={handleStartClick}
                >
                  {isLockedForFreeUser ? (
                    <span className="inline-flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Desbloquear
                    </span>
                  ) : (
                    "Iniciar treino"
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

function buildCategoryLabel(workout: Workout): string {
  if (workout.category === "mobilidade") {
    return "Mobilidade / recuperação";
  }

  const env = workout.environment === "casa" ? "Casa" : "Academia";
  if (workout.goal === "perda_gordura") return `HIIT ${env}`;
  if (workout.goal === "hipertrofia") return `${env} hipertrofia`;
  if (workout.goal === "forca") return `${env} força`;
  return `${env} mobilidade`;
}

function buildSubtitle(workout: Workout): string {
  const pieces: string[] = [];

  if (workout.goal === "perda_gordura") pieces.push("Foco em perda de gordura");
  if (workout.goal === "hipertrofia") pieces.push("Foco em ganho de massa");
  if (workout.goal === "forca") pieces.push("Foco em força");
  if (workout.goal === "mobilidade") pieces.push("Foco em mobilidade e recuperação");

  const diffMap: Record<string, string> = {
    iniciante: "Nível iniciante",
    intermediario: "Nível intermediário",
    avancado: "Nível avançado",
  };

  pieces.push(diffMap[workout.difficulty]);

  if (workout.equipment_needed && workout.equipment_needed.length) {
    pieces.push(`Equipamentos: ${workout.equipment_needed.join(", ")}`);
  } else if (workout.environment === "casa") {
    pieces.push("Sem equipamento");
  }

  return pieces.join(" • ");
}

export default Workouts;
