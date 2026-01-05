import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AuthenticatedLayout } from "@/components/layouts/AuthenticatedLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Trophy, 
  TrendingUp, 
  Calendar,
  Dumbbell,
  Weight,
  Target
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

interface ExerciseLog {
  id: string;
  exercise_name: string;
  set_number: number;
  reps_completed: number | null;
  weight_kg: number | null;
  completed_at: string;
}

interface ExerciseStats {
  exercise_name: string;
  totalSets: number;
  maxWeight: number;
  maxReps: number;
  lastWeight: number;
  lastReps: number;
  progressData: { date: string; weight: number }[];
}

export default function WorkoutHistory() {
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

  // Fetch exercise logs
  const { data: logs = [], isLoading } = useQuery<ExerciseLog[]>({
    queryKey: ["exercise-logs-history", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("exercise_logs")
        .select("*")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as ExerciseLog[];
    },
    enabled: !!userId,
  });

  // Process logs into exercise stats
  const exerciseStats: ExerciseStats[] = (() => {
    const grouped: Record<string, ExerciseLog[]> = {};
    
    logs.forEach((log) => {
      const name = log.exercise_name.toLowerCase();
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push(log);
    });

    return Object.entries(grouped).map(([name, exerciseLogs]) => {
      const withWeight = exerciseLogs.filter((l) => l.weight_kg && l.weight_kg > 0);
      const withReps = exerciseLogs.filter((l) => l.reps_completed && l.reps_completed > 0);
      
      // Group by date for chart
      const byDate: Record<string, number[]> = {};
      withWeight.forEach((l) => {
        const date = l.completed_at.slice(0, 10);
        if (!byDate[date]) byDate[date] = [];
        byDate[date].push(l.weight_kg!);
      });

      const progressData = Object.entries(byDate)
        .map(([date, weights]) => ({
          date,
          weight: Math.max(...weights),
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30); // Last 30 days

      return {
        exercise_name: exerciseLogs[0].exercise_name,
        totalSets: exerciseLogs.length,
        maxWeight: withWeight.length > 0 ? Math.max(...withWeight.map((l) => l.weight_kg!)) : 0,
        maxReps: withReps.length > 0 ? Math.max(...withReps.map((l) => l.reps_completed!)) : 0,
        lastWeight: withWeight.length > 0 ? withWeight[0].weight_kg! : 0,
        lastReps: withReps.length > 0 ? withReps[0].reps_completed! : 0,
        progressData,
      };
    }).sort((a, b) => b.totalSets - a.totalSets);
  })();

  // Get recent activity
  const recentActivity = logs.slice(0, 20);

  // Get unique exercise count
  const uniqueExercises = new Set(logs.map((l) => l.exercise_name.toLowerCase())).size;

  // Get total volume (sets * reps * weight)
  const totalVolume = logs.reduce((sum, log) => {
    const reps = log.reps_completed || 0;
    const weight = log.weight_kg || 0;
    return sum + (reps * weight);
  }, 0);

  if (!userId || isAuthChecking) {
    return (
      <AuthenticatedLayout>
        <div className="container py-8 space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-40">
          <div className="container py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/treinos")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Histórico de Treino</h1>
                <p className="text-sm text-muted-foreground">Acompanhe sua evolução</p>
              </div>
            </div>
          </div>
        </header>

        <div className="container py-6 space-y-6">
          {/* Stats Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <Card>
              <CardContent className="pt-6 text-center">
                <Dumbbell className="h-8 w-8 mx-auto text-primary mb-2" />
                <p className="text-2xl font-bold">{logs.length}</p>
                <p className="text-sm text-muted-foreground">Séries totais</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Target className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                <p className="text-2xl font-bold">{uniqueExercises}</p>
                <p className="text-sm text-muted-foreground">Exercícios</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Weight className="h-8 w-8 mx-auto text-orange-500 mb-2" />
                <p className="text-2xl font-bold">{Math.round(totalVolume / 1000)}k</p>
                <p className="text-sm text-muted-foreground">Volume total (kg)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Trophy className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                <p className="text-2xl font-bold">
                  {exerciseStats.filter((e) => e.maxWeight > 0).length}
                </p>
                <p className="text-sm text-muted-foreground">Records pessoais</p>
              </CardContent>
            </Card>
          </motion.div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum registro ainda</h3>
                <p className="text-muted-foreground mb-4">
                  Comece a registrar seus treinos para ver seu progresso aqui.
                </p>
                <Button onClick={() => navigate("/treinos")}>
                  Ir para Treinos
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="exercises" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="exercises">Por Exercício</TabsTrigger>
                <TabsTrigger value="activity">Atividade Recente</TabsTrigger>
              </TabsList>

              <TabsContent value="exercises" className="mt-6 space-y-4">
                {exerciseStats.map((exercise, index) => (
                  <motion.div
                    key={exercise.exercise_name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between">
                          <span className="text-lg">{exercise.exercise_name}</span>
                          <Badge variant="secondary">{exercise.totalSets} séries</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="text-center p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground">Record Peso</p>
                            <p className="text-lg font-bold text-yellow-600">
                              {exercise.maxWeight}kg
                            </p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground">Record Reps</p>
                            <p className="text-lg font-bold">{exercise.maxReps}</p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground">Último Peso</p>
                            <p className="text-lg font-bold">{exercise.lastWeight}kg</p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground">Últimas Reps</p>
                            <p className="text-lg font-bold">{exercise.lastReps}</p>
                          </div>
                        </div>

                        {/* Progress Chart */}
                        {exercise.progressData.length > 1 && (
                          <div className="h-40 mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={exercise.progressData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis 
                                  dataKey="date" 
                                  tick={{ fontSize: 10 }}
                                  tickFormatter={(value) => format(new Date(value), "dd/MM")}
                                />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip
                                  labelFormatter={(value) => format(new Date(value), "dd MMM yyyy", { locale: ptBR })}
                                  formatter={(value: number) => [`${value}kg`, "Peso"]}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="weight"
                                  stroke="hsl(var(--primary))"
                                  strokeWidth={2}
                                  dot={{ fill: "hsl(var(--primary))" }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </TabsContent>

              <TabsContent value="activity" className="mt-6 space-y-3">
                {recentActivity.map((log, index) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Dumbbell className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{log.exercise_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Série {log.set_number}: {log.weight_kg || 0}kg x {log.reps_completed || 0} reps
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.completed_at), "dd MMM", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.completed_at), "HH:mm")}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
