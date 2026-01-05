import { motion } from "framer-motion";
import { Heart, Clock, Flame, Dumbbell, Home, Sparkles, Zap, Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getExerciseImage } from "@/lib/exerciseImages";

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

interface WorkoutCardProps {
  workout: Workout;
  isFavorite: boolean;
  isPremiumUser: boolean;
  onToggleFavorite: (id: string) => void;
  onStartWorkout: (workout: Workout) => void;
  index: number;
}

const difficultyConfig = {
  iniciante: { label: "Iniciante", className: "badge-difficulty-iniciante" },
  intermediario: { label: "Intermediário", className: "badge-difficulty-intermediario" },
  avancado: { label: "Avançado", className: "badge-difficulty-avancado" },
};

const goalLabels: Record<string, string> = {
  perda_gordura: "Queima de Gordura",
  hipertrofia: "Hipertrofia",
  forca: "Força",
  mobilidade: "Mobilidade",
};

const categoryConfig: Record<string, { label: string; icon: typeof Dumbbell; gradient: string }> = {
  cardio: { 
    label: "Cardio", 
    icon: Zap,
    gradient: "from-orange-500/20 to-red-500/20"
  },
  musculacao: { 
    label: "Musculação", 
    icon: Dumbbell,
    gradient: "from-blue-500/20 to-purple-500/20"
  },
  funcional: { 
    label: "Funcional", 
    icon: Target,
    gradient: "from-green-500/20 to-teal-500/20"
  },
  mobilidade: { 
    label: "Mobilidade", 
    icon: TrendingUp,
    gradient: "from-purple-500/20 to-pink-500/20"
  },
};

export function WorkoutCard({
  workout,
  isFavorite,
  isPremiumUser,
  onToggleFavorite,
  onStartWorkout,
  index,
}: WorkoutCardProps) {
  const difficulty = difficultyConfig[workout.difficulty] || difficultyConfig.iniciante;
  const category = categoryConfig[workout.category] || categoryConfig.funcional;
  const CategoryIcon = category.icon;
  const isLocked = workout.is_premium && !isPremiumUser;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className={cn(
        "workout-card rounded-xl",
        workout.is_premium && "workout-card-premium"
      )}
    >
      {/* Header with gradient and image */}
      <div className={cn(
        "relative h-32 rounded-t-xl bg-gradient-to-br overflow-hidden",
        category.gradient
      )}>
        {/* Exercise image */}
        <img 
          src={getExerciseImage(workout.title)} 
          alt={workout.title}
          className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay"
        />
        {/* Category icon */}
        <div className="absolute top-3 left-3">
          <div className="category-icon-bg rounded-lg p-2">
            <CategoryIcon className="h-5 w-5 text-primary" />
          </div>
        </div>

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(workout.id);
          }}
          className={cn(
            "favorite-btn absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur-sm",
            isFavorite && "active"
          )}
        >
          <Heart
            className={cn(
              "h-5 w-5 transition-colors",
              isFavorite ? "fill-current" : "text-muted-foreground"
            )}
          />
        </button>

        {/* Environment badge */}
        <div className="absolute bottom-3 left-3">
          <Badge variant="secondary" className="gap-1 bg-background/80 backdrop-blur-sm">
            {workout.environment === "casa" ? (
              <Home className="h-3 w-3" />
            ) : (
              <Dumbbell className="h-3 w-3" />
            )}
            {workout.environment === "casa" ? "Casa" : "Academia"}
          </Badge>
        </div>

        {/* Premium/Free badge */}
        <div className="absolute bottom-3 right-3">
          {workout.is_premium ? (
            <Badge className="badge-premium-shimmer gap-1">
              <Sparkles className="h-3 w-3" />
              Premium
            </Badge>
          ) : workout.is_basic ? (
            <Badge className="badge-free gap-1">
              Grátis
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-lg line-clamp-1">{workout.title}</h3>
          <p className="text-sm text-muted-foreground">
            {goalLabels[workout.goal] || workout.goal}
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{workout.duration_min} min</span>
          </div>
          {workout.calories_burned_est && (
            <div className="flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-orange-500" />
              <span>{workout.calories_burned_est} kcal</span>
            </div>
          )}
        </div>

        {/* Difficulty badge */}
        <div>
          <Badge className={cn("text-xs", difficulty.className)}>
            {difficulty.label}
          </Badge>
        </div>

        {/* Action button */}
        <Button
          className="w-full mt-2"
          variant={isLocked ? "outline" : "default"}
          onClick={() => onStartWorkout(workout)}
        >
          {isLocked ? (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Desbloquear
            </>
          ) : (
            "Iniciar treino"
          )}
        </Button>
      </div>
    </motion.div>
  );
}
