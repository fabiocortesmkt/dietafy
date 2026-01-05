import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthenticatedLayout } from "@/components/layouts/AuthenticatedLayout";
import { ExerciseTrackingForm } from "@/components/ExerciseTrackingForm";
import { useExerciseLogs } from "@/hooks/useExerciseLogs";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getExerciseImage } from "@/lib/exerciseImages";
import {
  ArrowLeft,
  CheckCircle2,
  Flame,
  Pause,
  Play,
  Timer,
  RotateCcw,
  Dumbbell,
  Target,
  Zap,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Trophy,
  Clock,
  Volume2,
  Weight,
} from "lucide-react";

interface WorkoutDetailRecord {
  id: string;
  title: string;
  duration_min: number;
  goal: string;
  difficulty: string;
  calories_burned_est: number | null;
  category: string;
  environment: string;
  is_premium: boolean;
}

interface WorkoutExercise {
  id: string;
  order_index: number;
  exercise_name: string;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  instructions: string | null;
  gif_url: string | null;
}

const goalConfig: Record<string, { label: string; icon: typeof Target; color: string }> = {
  perda_gordura: { label: "Queima de Gordura", icon: Flame, color: "text-orange-500" },
  hipertrofia: { label: "Hipertrofia", icon: Dumbbell, color: "text-blue-500" },
  forca: { label: "Força", icon: Zap, color: "text-yellow-500" },
  mobilidade: { label: "Mobilidade", icon: Target, color: "text-purple-500" },
};

const difficultyConfig: Record<string, { label: string; color: string; bg: string }> = {
  iniciante: { label: "Iniciante", color: "text-green-600", bg: "bg-green-500/10" },
  intermediario: { label: "Intermediário", color: "text-yellow-600", bg: "bg-yellow-500/10" },
  avancado: { label: "Avançado", color: "text-red-600", bg: "bg-red-500/10" },
};

export default function WorkoutDetail() {
  const { id } = useParams<{ id: string }>();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
      setIsAuthChecking(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!id || isAuthChecking || !userId) {
    return (
      <AuthenticatedLayout>
        <div className="container py-8 space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <div className="grid gap-4 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <WorkoutDetailContent workoutId={id} userId={userId} onBack={() => navigate("/treinos")} />
    </AuthenticatedLayout>
  );
}

interface WorkoutDetailContentProps {
  workoutId: string;
  userId: string;
  onBack: () => void;
}

function WorkoutDetailContent({ workoutId, userId, onBack }: WorkoutDetailContentProps) {
  const navigate = useNavigate();

  // Fetch workout
  const { data: workout, isLoading: loadingWorkout } = useQuery<WorkoutDetailRecord | null>({
    queryKey: ["workout-detail", workoutId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("id, title, duration_min, goal, difficulty, calories_burned_est, category, environment, is_premium")
        .eq("id", workoutId)
        .maybeSingle();
      if (error) throw error;
      return data as WorkoutDetailRecord | null;
    },
  });

  // Fetch exercises
  const { data: exercises = [], isLoading: loadingExercises } = useQuery<WorkoutExercise[]>({
    queryKey: ["workout-exercises", workoutId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_exercises")
        .select("id, order_index, exercise_name, sets, reps, rest_seconds, instructions, gif_url")
        .eq("workout_id", workoutId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as WorkoutExercise[];
    },
  });

  // Exercise logs hook
  const { 
    getBestForExercise, 
    getLastForExercise, 
    addMultipleLogs, 
    isAdding 
  } = useExerciseLogs(userId);

  // State
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [intensity, setIntensity] = useState<number>(7);
  const [saving, setSaving] = useState(false);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("info");

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerMax, setTimerMax] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerVisible, setTimerVisible] = useState(false);

  // Timer effect
  useEffect(() => {
    let interval: number | undefined;
    if (timerRunning && timerSeconds > 0) {
      interval = window.setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            // Play sound notification
            try {
              const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleBoAQK3eyJV4JwBI1d+2d0IOYOPowHguAH308M5cAgDM///VYAAA1///1WAAAACj///iYAAAzP//1WAAAAD///9gAAAA/////////wD///////8A/////////wD///////8A/////////wD///////8A");
              audio.volume = 0.5;
              audio.play();
            } catch {}
            toast.success("Descanso finalizado! Próximo exercício.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, timerSeconds]);

  const startTimer = useCallback((seconds: number) => {
    setTimerMax(seconds);
    setTimerSeconds(seconds);
    setTimerRunning(true);
    setTimerVisible(true);
  }, []);

  const toggleExercise = (id: string, restSeconds: number | null) => {
    const wasCompleted = completedIds.includes(id);
    setCompletedIds((prev) =>
      wasCompleted ? prev.filter((x) => x !== id) : [...prev, id]
    );
    
    // Start timer only when completing (not uncompleting)
    if (!wasCompleted && restSeconds && restSeconds > 0) {
      startTimer(restSeconds);
    }
  };

  const handleFinish = async () => {
    if (!workout) return;
    setSaving(true);

    try {
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("workout_logs").insert({
        user_id: userId,
        date: today,
        workout_id: workout.id,
        completed: true,
        intensity,
        notes: { finished_exercises: completedIds },
      } as any);
      
      if (error) throw error;

      toast.success("Treino registrado com sucesso!", {
        description: "Parabéns! Continue assim para alcançar seus objetivos.",
      });
      navigate("/treinos");
    } catch (error) {
      console.error("Erro ao salvar treino", error);
      toast.error("Erro ao salvar treino");
    } finally {
      setSaving(false);
    }
  };

  const goal = goalConfig[workout?.goal || ""] || goalConfig.forca;
  const difficulty = difficultyConfig[workout?.difficulty || ""] || difficultyConfig.iniciante;
  const GoalIcon = goal.icon;

  const totalExercises = exercises.length;
  const completedCount = completedIds.length;
  const progress = totalExercises ? Math.round((completedCount / totalExercises) * 100) : 0;
  const timerProgress = timerMax > 0 ? ((timerMax - timerSeconds) / timerMax) * 100 : 0;

  if (loadingWorkout || loadingExercises || !workout) {
    return (
      <div className="container py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="workout-header-gradient border-b sticky top-0 z-40 bg-background/95 backdrop-blur-sm"
      >
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold truncate">{workout.title}</h1>
                {workout.is_premium && (
                  <Badge className="badge-premium-shimmer shrink-0">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <GoalIcon className={cn("h-4 w-4", goal.color)} />
                <span>{goal.label}</span>
                <span className="text-muted-foreground/50">•</span>
                <Badge variant="secondary" className={cn("text-xs", difficulty.bg, difficulty.color)}>
                  {difficulty.label}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="container py-6 space-y-6">
        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="workout-card rounded-xl p-4 text-center">
            <Clock className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{workout.duration_min}</p>
            <p className="text-xs text-muted-foreground">minutos</p>
          </div>
          <div className="workout-card rounded-xl p-4 text-center">
            <Flame className="h-6 w-6 mx-auto text-orange-500 mb-2" />
            <p className="text-2xl font-bold">{workout.calories_burned_est || "--"}</p>
            <p className="text-xs text-muted-foreground">kcal estimadas</p>
          </div>
          <div className="workout-card rounded-xl p-4 text-center">
            <Dumbbell className="h-6 w-6 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{exercises.length}</p>
            <p className="text-xs text-muted-foreground">exercícios</p>
          </div>
          <div className="workout-card rounded-xl p-4 text-center">
            <Trophy className="h-6 w-6 mx-auto text-yellow-500 mb-2" />
            <p className="text-2xl font-bold">{completedCount}</p>
            <p className="text-xs text-muted-foreground">concluídos</p>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="workout-card rounded-xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progresso do treino</span>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Exercises List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              Exercícios
            </h2>

            <AnimatePresence>
              {exercises.map((exercise, index) => {
                const done = completedIds.includes(exercise.id);
                const isExpanded = expandedId === exercise.id;

                return (
                  <motion.div
                    key={exercise.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "workout-card rounded-xl overflow-hidden transition-all duration-300",
                      done && "ring-2 ring-primary/50 bg-primary/5"
                    )}
                  >
                    {/* Main row */}
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : exercise.id)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Order number with completion indicator */}
                        <div
                          className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold shrink-0 transition-all",
                            done
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {done ? <CheckCircle2 className="h-5 w-5" /> : exercise.order_index}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className={cn(
                            "font-semibold transition-all",
                            done && "line-through opacity-70"
                          )}>
                            {exercise.exercise_name}
                          </h3>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {exercise.sets && (
                              <Badge variant="secondary" className="text-xs">
                                {exercise.sets} x {exercise.reps || "reps"}
                              </Badge>
                            )}
                            {exercise.rest_seconds && exercise.rest_seconds > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Timer className="h-3 w-3 mr-1" />
                                {exercise.rest_seconds}s descanso
                              </Badge>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedId(isExpanded ? null : exercise.id);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t overflow-hidden"
                        >
                          <div className="p-4 space-y-4">
                            {/* Exercise illustration */}
                            <div className="aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-primary/5 to-secondary/5">
                              <img
                                src={getExerciseImage(exercise.exercise_name)}
                                alt={exercise.exercise_name}
                                className="w-full h-full object-contain"
                              />
                            </div>

                            {/* Tabs for Info vs Tracking */}
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="info">Instruções</TabsTrigger>
                                <TabsTrigger value="tracking" className="gap-1">
                                  <Weight className="h-4 w-4" />
                                  Registrar
                                </TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="info" className="mt-4">
                                {/* Instructions */}
                                {exercise.instructions && (
                                  <div className="bg-muted/50 rounded-lg p-3">
                                    <p className="text-sm font-medium mb-1">Instruções:</p>
                                    <p className="text-sm text-muted-foreground">
                                      {exercise.instructions}
                                    </p>
                                  </div>
                                )}

                                {/* Action button */}
                                <Button
                                  className="w-full mt-4"
                                  variant={done ? "outline" : "default"}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExercise(exercise.id, exercise.rest_seconds);
                                  }}
                                >
                                  {done ? (
                                    <>
                                      <RotateCcw className="h-4 w-4 mr-2" />
                                      Desmarcar
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="h-4 w-4 mr-2" />
                                      Marcar como concluído
                                    </>
                                  )}
                                </Button>
                              </TabsContent>
                              
                              <TabsContent value="tracking" className="mt-4">
                                <ExerciseTrackingForm
                                  exerciseName={exercise.exercise_name}
                                  targetSets={exercise.sets || 3}
                                  targetReps={exercise.reps}
                                  lastPerformance={getLastForExercise(exercise.exercise_name)}
                                  bestPerformance={getBestForExercise(exercise.exercise_name)}
                                  onSave={async (sets) => {
                                    try {
                                      await addMultipleLogs(
                                        sets.map((s: any, i: number) => ({
                                          exercise_name: exercise.exercise_name,
                                          set_number: i + 1,
                                          reps_completed: s.reps,
                                          weight_kg: s.weight,
                                        }))
                                      );
                                      toast.success("Progresso salvo!");
                                      // Auto-complete exercise after saving tracking
                                      if (!done) {
                                        toggleExercise(exercise.id, exercise.rest_seconds);
                                      }
                                    } catch (error) {
                                      console.error("Error saving progress:", error);
                                      toast.error("Erro ao salvar progresso");
                                    }
                                  }}
                                  isSaving={isAdding}
                                />
                              </TabsContent>
                            </Tabs>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Timer Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className={cn(
                "workout-card rounded-xl p-6 sticky top-24 transition-all",
                timerRunning && "ring-2 ring-primary animate-pulse"
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Timer className="h-5 w-5 text-primary" />
                  Timer de Descanso
                </h3>
                {timerSeconds > 0 && (
                  <Badge variant={timerRunning ? "default" : "secondary"}>
                    {timerRunning ? "Ativo" : "Pausado"}
                  </Badge>
                )}
              </div>

              {/* Circular timer */}
              <div className="relative w-40 h-40 mx-auto mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="8"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={440}
                    strokeDashoffset={440 - (440 * timerProgress) / 100}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold tabular-nums">
                    {timerSeconds}
                  </span>
                  <span className="text-sm text-muted-foreground">segundos</span>
                </div>
              </div>

              {/* Timer controls */}
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={timerSeconds === 0}
                  onClick={() => setTimerRunning(!timerRunning)}
                >
                  {timerRunning ? (
                    <>
                      <Pause className="h-4 w-4 mr-1" />
                      Pausar
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-1" />
                      Retomar
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={timerSeconds === 0}
                  onClick={() => {
                    setTimerSeconds(0);
                    setTimerRunning(false);
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Zerar
                </Button>
              </div>

              {/* Quick timer buttons */}
              <div className="flex gap-2 mt-4 justify-center">
                {[30, 60, 90].map((s) => (
                  <Button
                    key={s}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => startTimer(s)}
                  >
                    {s}s
                  </Button>
                ))}
              </div>
            </motion.div>

            {/* Intensity & Finish Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="workout-card rounded-xl p-6"
            >
              <h3 className="font-semibold mb-4">Finalizar Treino</h3>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-muted-foreground">
                      Intensidade percebida
                    </label>
                    <span className="text-sm font-bold text-primary">{intensity}/10</span>
                  </div>
                  <Slider
                    value={[intensity]}
                    onValueChange={(v) => setIntensity(v[0])}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                    <span>Leve</span>
                    <span>Intenso</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  disabled={saving || completedCount === 0}
                  onClick={handleFinish}
                >
                  {saving ? (
                    "Salvando..."
                  ) : (
                    <>
                      <Trophy className="h-5 w-5 mr-2" />
                      Finalizar Treino
                    </>
                  )}
                </Button>

                {completedCount === 0 && (
                  <p className="text-xs text-center text-muted-foreground">
                    Complete pelo menos um exercício para finalizar
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
