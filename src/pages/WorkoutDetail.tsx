import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  CheckCircle2,
  Flame,
  Pause,
  Play,
  Timer,
} from "lucide-react";

interface WorkoutDetailRecord {
  id: string;
  title: string;
  duration_min: number;
  goal: string;
  difficulty: string;
  calories_burned_est: number | null;
}

interface WorkoutExercise {
  id: string;
  order_index: number;
  exercise_name: string;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  instructions: string | null;
}

const WorkoutDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
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
      .then(({ data: { session } }) => {
        if (!mounted) return;
        if (!session) {
          navigate("/auth");
          return;
        }
        setUser(session.user);
      })
      .finally(() => {
        if (mounted) setLoadingAuth(false);
      });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  if (!id) {
    return null;
  }

  if (loadingAuth || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-10 w-40" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex flex-col">
        <WorkoutDetailHeader onBack={() => navigate("/workouts")} />
        <WorkoutDetailContent workoutId={id} userId={user.id} />
      </div>
    </SidebarProvider>
  );
};

const WorkoutDetailHeader = ({ onBack }: { onBack: () => void }) => {
  return (
    <header className="w-full border-b px-4 py-4 md:px-8 md:py-6 flex items-center gap-4">
      <Button variant="outline" size="icon" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Detalhes do treino</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Siga a ordem dos exercícios, use o timer de descanso e registre sua percepção ao final.
        </p>
      </div>
    </header>
  );
};

const WorkoutDetailContent = ({ workoutId, userId }: { workoutId: string; userId: string }) => {
  const { toast } = useToast();
  const { data: workout, isLoading: loadingWorkout } = useQuery<WorkoutDetailRecord | null>({
    queryKey: ["workout-detail", workoutId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("id, title, duration_min, goal, difficulty, calories_burned_est")
        .eq("id", workoutId)
        .maybeSingle();
      if (error) throw error;
      return (data as WorkoutDetailRecord) ?? null;
    },
  });

  const { data: exercises = [], isLoading: loadingExercises } = useQuery<WorkoutExercise[]>({
    queryKey: ["workout-exercises", workoutId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_exercises")
        .select("id, order_index, exercise_name, sets, reps, rest_seconds, instructions")
        .eq("workout_id", workoutId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as WorkoutExercise[];
    },
  });

  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [currentRest, setCurrentRest] = useState<number | null>(null);
  const [restRunning, setRestRunning] = useState(false);
  const [intensity, setIntensity] = useState<number>(7);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    if (restRunning && currentRest !== null && currentRest > 0) {
      timer = window.setTimeout(() => {
        setCurrentRest((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (restRunning && currentRest === 0) {
      setRestRunning(false);
    }
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [restRunning, currentRest]);

  const totalExercises = exercises.length;
  const completedCount = completedIds.length;
  const progress = totalExercises ? Math.round((completedCount / totalExercises) * 100) : 0;

  const startRest = (seconds: number | null) => {
    if (!seconds || seconds <= 0) return;
    setCurrentRest(seconds);
    setRestRunning(true);
  };

  const toggleExerciseDone = (id: string, restSeconds: number | null) => {
    setCompletedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    if (restSeconds && restSeconds > 0) {
      startRest(restSeconds);
    }
  };

  const handleFinish = async () => {
    if (!workout) return;
    setSaving(true);

    try {
      const today = new Date().toISOString().slice(0, 10);
      const payload = {
        user_id: userId,
        date: today,
        workout_id: workout.id,
        completed: true,
        intensity,
        notes: {
          finished_exercises: completedIds,
        },
      } as any;

      const { error } = await supabase.from("workout_logs").insert(payload);
      if (error) throw error;

      toast({
        title: "Treino registrado",
        description: "Excelente! O Vita vai considerar este treino nas próximas recomendações.",
      });
    } catch (error) {
      console.error("Erro ao salvar treino", error);
      toast({
        title: "Erro ao salvar treino",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const goalLabel = useMemo(() => {
    if (!workout) return "";
    if (workout.goal === "perda_gordura") return "Perda de gordura";
    if (workout.goal === "hipertrofia") return "Hipertrofia";
    if (workout.goal === "forca") return "Força";
    return "Mobilidade";
  }, [workout]);

  if (loadingWorkout || loadingExercises || !workout) {
    return (
      <main className="flex-1 px-4 py-6 md:px-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-6 md:px-8 space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-xl md:text-2xl flex items-center gap-2">
              {workout.title}
            </CardTitle>
            <CardDescription className="mt-2 flex flex-wrap gap-2 text-xs md:text-sm">
              <Badge variant="outline">
                <Timer className="h-3 w-3 mr-1" /> {workout.duration_min}min
              </Badge>
              <Badge variant="outline">{goalLabel}</Badge>
              <Badge variant="outline">Nível {workout.difficulty}</Badge>
              {typeof workout.calories_burned_est === "number" && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Flame className="h-3 w-3 text-primary" />
                  ≈ {workout.calories_burned_est} kcal
                </Badge>
              )}
            </CardDescription>
          </div>
          <div className="w-full md:w-56 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progresso do treino</span>
              <span>
                {completedCount}/{totalExercises} exercícios
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sequência de exercícios</CardTitle>
            <CardDescription>
              Vá marcando cada exercício como concluído e respeite os descansos sugeridos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {exercises.map((exercise) => {
                const done = completedIds.includes(exercise.id);
                return (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => toggleExerciseDone(exercise.id, exercise.rest_seconds)}
                    className={
                      "w-full flex items-start justify-between gap-3 rounded-lg border px-3 py-3 text-left transition-colors " +
                      (done
                        ? "bg-primary/5 border-primary/40"
                        : "bg-background hover:bg-muted/60")
                    }
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="text-xs text-muted-foreground">{exercise.order_index}.</span>
                        <span>{exercise.exercise_name}</span>
                        {done && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        {exercise.sets && (
                          <span>
                            {exercise.sets} x {exercise.reps ?? "reps"}
                          </span>
                        )}
                        {exercise.rest_seconds && (
                          <span>Descanso: {exercise.rest_seconds}s</span>
                        )}
                      </div>
                      {exercise.instructions && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {exercise.instructions}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Timer de descanso</span>
                {currentRest !== null && (
                  <span className="text-xs text-muted-foreground">
                    {currentRest}s restantes
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <div className="text-3xl font-semibold tabular-nums">
                {currentRest !== null ? currentRest : "--"}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentRest === null}
                  onClick={() => setRestRunning((prev) => !prev)}
                >
                  {restRunning ? (
                    <>
                      <Pause className="h-4 w-4 mr-1" /> Pausar
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-1" /> Retomar
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentRest === null}
                  onClick={() => {
                    setCurrentRest(0);
                    setRestRunning(false);
                  }}
                >
                  Zerar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Como foi o treino?</CardTitle>
              <CardDescription>
                Use a escala de 1 a 10 para indicar o quão intenso o treino pareceu.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Bem leve</span>
                <span>Muito intenso</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="w-full"
              />
              <div className="text-sm text-center">
                Intensidade percebida: <span className="font-medium">{intensity}/10</span>
              </div>
              <Button
                className="w-full mt-2 flex items-center justify-center gap-2"
                disabled={saving || !completedCount}
                onClick={handleFinish}
              >
                <CheckCircle2 className="h-4 w-4" />
                {saving ? "Salvando..." : "Finalizar treino"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
};

export default WorkoutDetail;
