import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dumbbell,
  Home,
  Heart,
  Sparkles,
  Filter,
  Zap,
  Target,
  TrendingUp,
  Search,
} from "lucide-react";

import { AuthenticatedLayout } from "@/components/layouts/AuthenticatedLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkoutCard } from "@/components/WorkoutCard";
import { UpgradeLimitModal } from "@/components/UpgradeLimitModal";
import { cn } from "@/lib/utils";

interface Workout {
  id: string;
  title: string;
  category: string;
  environment: string;
  duration_min: number;
  difficulty: "iniciante" | "intermediario" | "avancado";
  goal: string;
  equipment_needed: string[];
  calories_burned_est: number | null;
  is_premium: boolean;
  is_basic: boolean;
}

type TabValue = "todos" | "gratuitos" | "casa" | "academia" | "favoritos";
type DifficultyFilter = "todos" | "iniciante" | "intermediario" | "avancado";
type GoalFilter = "todos" | "perda_gordura" | "hipertrofia" | "forca" | "mobilidade";

const goalLabels: Record<string, string> = {
  todos: "Todos",
  perda_gordura: "Queima",
  hipertrofia: "Hipertrofia",
  forca: "Força",
  mobilidade: "Mobilidade",
};

const difficultyLabels: Record<string, string> = {
  todos: "Todos",
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

export default function Workouts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [planType, setPlanType] = useState<string>("free");
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState<TabValue>("todos");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("todos");
  const [goalFilter, setGoalFilter] = useState<GoalFilter>("todos");
  const [searchQuery, setSearchQuery] = useState("");

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("plan_type")
        .eq("user_id", session.user.id)
        .single();

      if (profile) {
        setPlanType(profile.plan_type);
      }
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

  // Fetch workouts
  const { data: workouts = [], isLoading: isLoadingWorkouts } = useQuery({
    queryKey: ["workouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Workout[];
    },
    enabled: !!userId,
  });

  // Fetch favorites
  const { data: favoriteIds = [] } = useQuery({
    queryKey: ["workout-favorites", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_workout_favorites")
        .select("workout_id")
        .eq("user_id", userId!);

      if (error) throw error;
      return data.map((f) => f.workout_id);
    },
    enabled: !!userId,
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (workoutId: string) => {
      const isFavorite = favoriteIds.includes(workoutId);

      if (isFavorite) {
        const { error } = await supabase
          .from("user_workout_favorites")
          .delete()
          .eq("user_id", userId!)
          .eq("workout_id", workoutId);
        if (error) throw error;
      } else {
        // Check if premium workout and user is free
        const workout = workouts.find((w) => w.id === workoutId);
        if (workout?.is_premium && planType === "free") {
          setShowUpgradeModal(true);
          throw new Error("Premium only");
        }

        const { error } = await supabase
          .from("user_workout_favorites")
          .insert({ user_id: userId!, workout_id: workoutId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-favorites", userId] });
    },
    onError: (error) => {
      if (error.message !== "Premium only") {
        toast.error("Erro ao atualizar favoritos");
      }
    },
  });

  // Filter workouts
  const filteredWorkouts = useMemo(() => {
    let result = workouts;

    // Tab filter
    switch (activeTab) {
      case "gratuitos":
        result = result.filter((w) => w.is_basic);
        break;
      case "casa":
        result = result.filter((w) => w.environment === "casa");
        break;
      case "academia":
        result = result.filter((w) => w.environment === "academia");
        break;
      case "favoritos":
        result = result.filter((w) => favoriteIds.includes(w.id));
        break;
    }

    // Difficulty filter
    if (difficultyFilter !== "todos") {
      result = result.filter((w) => w.difficulty === difficultyFilter);
    }

    // Goal filter
    if (goalFilter !== "todos") {
      result = result.filter((w) => w.goal === goalFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (w) =>
          w.title.toLowerCase().includes(query) ||
          w.category.toLowerCase().includes(query)
      );
    }

    return result;
  }, [workouts, activeTab, difficultyFilter, goalFilter, searchQuery, favoriteIds]);

  const handleStartWorkout = (workout: Workout) => {
    if (workout.is_premium && planType === "free") {
      setShowUpgradeModal(true);
      return;
    }
    navigate(`/treinos/${workout.id}`);
  };

  const isPremiumUser = planType !== "free";

  if (isAuthChecking) {
    return (
      <AuthenticatedLayout>
        <div className="container py-8 space-y-8">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen">
        {/* Header Section */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="workout-header-gradient border-b"
        >
          <div className="container py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-3xl md:text-4xl font-bold text-gradient"
                >
                  Biblioteca de Treinos
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-muted-foreground mt-1"
                >
                  {workouts.length} treinos disponíveis para você
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2"
              >
                <Badge
                  variant={isPremiumUser ? "default" : "secondary"}
                  className={cn(
                    "px-4 py-1.5",
                    isPremiumUser && "badge-premium-shimmer"
                  )}
                >
                  {isPremiumUser ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-1" />
                      Premium
                    </>
                  ) : (
                    "Free"
                  )}
                </Badge>
              </motion.div>
            </div>

            {/* Search bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 relative max-w-md"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar treinos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50 backdrop-blur-sm"
              />
            </motion.div>
          </div>
        </motion.header>

        {/* Main Content */}
        <div className="container py-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="workout-tabs">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <TabsList className="h-auto flex-wrap gap-2 bg-transparent p-0 mb-6">
                <TabsTrigger value="todos" className="gap-2 data-[state=active]:bg-primary/10">
                  <Dumbbell className="h-4 w-4" />
                  Todos
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {workouts.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="gratuitos" className="gap-2 data-[state=active]:bg-primary/10">
                  <Zap className="h-4 w-4" />
                  Gratuitos
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {workouts.filter((w) => w.is_basic).length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="casa" className="gap-2 data-[state=active]:bg-primary/10">
                  <Home className="h-4 w-4" />
                  Casa
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {workouts.filter((w) => w.environment === "casa").length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="academia" className="gap-2 data-[state=active]:bg-primary/10">
                  <Target className="h-4 w-4" />
                  Academia
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {workouts.filter((w) => w.environment === "academia").length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="favoritos" className="gap-2 data-[state=active]:bg-primary/10">
                  <Heart className="h-4 w-4" />
                  Favoritos
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {favoriteIds.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </motion.div>

            {/* Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-6 mb-6"
            >
              {/* Difficulty Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Dificuldade
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(difficultyLabels) as DifficultyFilter[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => setDifficultyFilter(key)}
                      className={cn(
                        "filter-chip px-3 py-1.5 rounded-full text-sm font-medium",
                        difficultyFilter === key && "active"
                      )}
                    >
                      {difficultyLabels[key]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Goal Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Objetivo
                </label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(goalLabels) as GoalFilter[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => setGoalFilter(key)}
                      className={cn(
                        "filter-chip px-3 py-1.5 rounded-full text-sm font-medium",
                        goalFilter === key && "active"
                      )}
                    >
                      {goalLabels[key]}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Workouts Grid */}
            <TabsContent value={activeTab} className="mt-0">
              {isLoadingWorkouts ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Skeleton className="h-80 rounded-xl" />
                    </motion.div>
                  ))}
                </div>
              ) : filteredWorkouts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16"
                >
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
                    <Dumbbell className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Nenhum treino encontrado</h3>
                  <p className="text-muted-foreground mb-6">
                    Tente ajustar os filtros ou buscar por outro termo
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveTab("todos");
                      setDifficultyFilter("todos");
                      setGoalFilter("todos");
                      setSearchQuery("");
                    }}
                  >
                    Limpar filtros
                  </Button>
                </motion.div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${activeTab}-${difficultyFilter}-${goalFilter}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    {filteredWorkouts.map((workout, index) => (
                      <WorkoutCard
                        key={workout.id}
                        workout={workout}
                        isFavorite={favoriteIds.includes(workout.id)}
                        isPremiumUser={isPremiumUser}
                        onToggleFavorite={(id) => toggleFavoriteMutation.mutate(id)}
                        onStartWorkout={handleStartWorkout}
                        index={index}
                      />
                    ))}
                  </motion.div>
                </AnimatePresence>
              )}
            </TabsContent>
          </Tabs>

          {/* Premium CTA for free users */}
          {!isPremiumUser && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-12 p-8 rounded-2xl bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border border-primary/20 text-center"
            >
              <Sparkles className="h-10 w-10 mx-auto text-primary mb-4" />
              <h3 className="text-2xl font-bold mb-2">Desbloqueie todos os treinos</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Acesse {workouts.filter((w) => w.is_premium).length} treinos premium exclusivos
                com programas avançados e acompanhamento personalizado.
              </p>
              <Button size="lg" onClick={() => navigate("/upgrade")}>
                <Sparkles className="h-5 w-5 mr-2" />
                Fazer upgrade agora
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      <UpgradeLimitModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="advanced_workouts"
      />
    </AuthenticatedLayout>
  );
}
