import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AuthenticatedLayout } from "@/components/layouts/AuthenticatedLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Flame, 
  Salad, 
  Clock, 
  ArrowRight, 
  Sparkles,
  Camera,
  UtensilsCrossed,
  Apple,
  Coffee,
  Moon,
  Sun,
  Zap,
  CheckCircle2,
  ChefHat,
  Target,
} from "lucide-react";

interface RecommendedMeal {
  id: string;
  title: string;
  subtitle: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timing: string;
  goalTag: string;
  icon: "coffee" | "sun" | "moon" | "apple";
}

const mealIcons = {
  coffee: Coffee,
  sun: Sun,
  moon: Moon,
  apple: Apple,
};

const buildRecommendedMeals = (goals: string[] | null): RecommendedMeal[] => {
  const normalizedGoals = (goals || []).map((g) => g.toLowerCase());
  const hasFatLoss = normalizedGoals.some((g) => g.includes("perda") || g.includes("gordura"));
  const hasHypertrophy = normalizedGoals.some((g) => g.includes("hipertrofia"));
  const hasPerformance = normalizedGoals.some((g) => g.includes("performance") || g.includes("força") || g.includes("forca"));

  if (hasFatLoss) {
    return [
      {
        id: "cafe_perda",
        title: "Café da manhã leve e proteico",
        subtitle: "Omelete com claras, legumes e 1 fatia de pão integral",
        calories: 320,
        protein: 26,
        carbs: 24,
        fat: 10,
        timing: "Café da manhã",
        goalTag: "perda de gordura",
        icon: "coffee",
      },
      {
        id: "almoco_perda",
        title: "Almoço foco em saciedade",
        subtitle: "Frango grelhado, salada grande, legumes e pequena porção de carbo",
        calories: 480,
        protein: 35,
        carbs: 38,
        fat: 14,
        timing: "Almoço",
        goalTag: "perda de gordura",
        icon: "sun",
      },
      {
        id: "jantar_perda",
        title: "Jantar leve antes de dormir",
        subtitle: "Peixe ou ovos, legumes cozidos e salada",
        calories: 420,
        protein: 30,
        carbs: 28,
        fat: 14,
        timing: "Jantar",
        goalTag: "perda de gordura",
        icon: "moon",
      },
    ];
  }

  if (hasHypertrophy) {
    return [
      {
        id: "pre_treino_hipertrofia",
        title: "Pré‑treino para hipertrofia",
        subtitle: "Iogurte proteico, banana e aveia",
        calories: 340,
        protein: 22,
        carbs: 45,
        fat: 7,
        timing: "60–90 min antes do treino",
        goalTag: "hipertrofia",
        icon: "apple",
      },
      {
        id: "pos_treino_hipertrofia",
        title: "Pós‑treino completo",
        subtitle: "Arroz, feijão, carne magra e legumes",
        calories: 620,
        protein: 38,
        carbs: 70,
        fat: 14,
        timing: "Pós‑treino / Almoço",
        goalTag: "hipertrofia",
        icon: "sun",
      },
      {
        id: "ceia_hipertrofia",
        title: "Ceia para recuperação",
        subtitle: "Iogurte ou cottage com frutas e castanhas",
        calories: 380,
        protein: 24,
        carbs: 28,
        fat: 15,
        timing: "Ceia",
        goalTag: "hipertrofia",
        icon: "moon",
      },
    ];
  }

  if (hasPerformance) {
    return [
      {
        id: "pre_treino",
        title: "Pré‑treino leve",
        subtitle: "Iogurte proteico + fruta + castanhas",
        calories: 280,
        protein: 18,
        carbs: 28,
        fat: 9,
        timing: "30–60 min antes do treino",
        goalTag: "performance",
        icon: "apple",
      },
      {
        id: "refeicao_dia_treino",
        title: "Refeição em dia de treino",
        subtitle: "Carne magra, arroz, feijão, legumes e salada",
        calories: 560,
        protein: 34,
        carbs: 60,
        fat: 15,
        timing: "Almoço / Jantar",
        goalTag: "performance",
        icon: "sun",
      },
      {
        id: "lanchinho_rapido",
        title: "Lanche rápido entre reuniões",
        subtitle: "Fruta, oleaginosas e fonte de proteína prática",
        calories: 260,
        protein: 14,
        carbs: 22,
        fat: 11,
        timing: "Lanche",
        goalTag: "equilíbrio",
        icon: "apple",
      },
    ];
  }

  return [
    {
      id: "cafe_equilibrio",
      title: "Café da manhã equilibrado",
      subtitle: "Pão integral, ovos mexidos e fruta",
      calories: 360,
      protein: 22,
      carbs: 42,
      fat: 11,
      timing: "Café da manhã",
      goalTag: "equilíbrio",
      icon: "coffee",
    },
    {
      id: "almoco_equilibrio",
      title: "Almoço de dia útil",
      subtitle: "Prato feito com carne magra, arroz, feijão e salada",
      calories: 540,
      protein: 30,
      carbs: 60,
      fat: 16,
      timing: "Almoço",
      goalTag: "equilíbrio",
      icon: "sun",
    },
    {
      id: "jantar_equilibrio",
      title: "Jantar simples e nutritivo",
      subtitle: "Sopa de legumes com proteína ou omelete completo",
      calories: 430,
      protein: 24,
      carbs: 40,
      fat: 13,
      timing: "Jantar",
      goalTag: "equilíbrio",
      icon: "moon",
    },
  ];
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
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

const Diet = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [userGoals, setUserGoals] = useState<string[] | null>(null);
  const [loadingMeals, setLoadingMeals] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const loadUserGoals = async (userId: string) => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("goals")
        .eq("user_id", userId)
        .maybeSingle();

      if (!mounted) return;
      if (error) {
        console.error("Erro ao buscar objetivos do usuário (dieta):", error);
        setLoadingMeals(false);
        return;
      }

      setUserGoals((data?.goals as string[]) || null);
      setLoadingMeals(false);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        if (!session) {
          setUser(null);
          setUserGoals(null);
          navigate("/auth");
          return;
        }
        setUser(session.user);
        loadUserGoals(session.user.id);
      },
    );

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        if (!session) {
          navigate("/auth");
          return;
        }
        setUser(session.user);
        loadUserGoals(session.user.id);
      })
      .finally(() => {
        if (mounted) setLoadingAuth(false);
      });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const meals = buildRecommendedMeals(userGoals);
  const totalCalories = meals.reduce((acc, m) => acc + m.calories, 0);
  const totalProtein = meals.reduce((acc, m) => acc + m.protein, 0);
  const totalCarbs = meals.reduce((acc, m) => acc + m.carbs, 0);
  const totalFat = meals.reduce((acc, m) => acc + m.fat, 0);

  if (loadingAuth || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/20 animate-pulse" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

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
                className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"
              >
                Plano alimentar do dia
              </motion.p>
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight"
              >
                Dieta de <span className="text-gradient">hoje</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-muted-foreground max-w-md"
              >
                Use estes exemplos como base e vá ajustando com a Vita no registro diário.
              </motion.p>
            </div>

            {/* Vita Tip Card - Desktop */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="hidden lg:block"
            >
              <Card className="glass-premium-vita max-w-sm">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Salad className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-primary">Dica da Vita</p>
                    <p className="text-sm leading-relaxed">
                      Não precisa seguir 100%: registre o que você realmente comeu para que o plano se adapte.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Macros Summary Bar */}
          {!loadingMeals && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-4 flex flex-wrap items-center gap-3"
            >
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-semibold">{totalCalories}</span>
                <span className="text-xs text-muted-foreground">kcal</span>
              </div>
              <MacroSummaryPill label="Proteína" value={totalProtein} color="emerald" />
              <MacroSummaryPill label="Carbo" value={totalCarbs} color="blue" />
              <MacroSummaryPill label="Gordura" value={totalFat} color="amber" />
            </motion.div>
          )}

          {/* Vita Tip Card - Mobile */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:hidden mt-4"
          >
            <Card className="glass-premium-vita">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Salad className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-primary">Dica da Vita</p>
                  <p className="text-sm leading-relaxed">
                    Registre o que você realmente comeu para que o plano se adapte.
                  </p>
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
          >
            <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              {/* Meals List */}
              <div className="space-y-4">
                <motion.div variants={itemVariants} className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                    <ChefHat className="h-5 w-5 text-primary" />
                    Refeições sugeridas
                  </h2>
                  <Badge variant="secondary" className="text-xs">
                    {meals.length} refeições
                  </Badge>
                </motion.div>

                {loadingMeals ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="workout-card">
                        <CardHeader>
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="mt-2 h-3 w-48" />
                        </CardHeader>
                        <CardContent>
                          <Skeleton className="h-6 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {meals.map((meal, index) => (
                      <MealCard 
                        key={meal.id} 
                        meal={meal} 
                        index={index} 
                        onRegister={() => navigate("/track")} 
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <aside className="space-y-4">
                <motion.div variants={itemVariants}>
                  <Card className="workout-card workout-card-premium overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg category-icon-bg flex items-center justify-center">
                          <Camera className="h-4 w-4 text-primary" />
                        </div>
                        <CardTitle className="text-sm">Registrar refeição</CardTitle>
                      </div>
                      <CardDescription className="text-xs">
                        Em menos de 1 minuto você registra e a Vita entende seu contexto.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button 
                        className="w-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25" 
                        onClick={() => navigate("/track")}
                      >
                        <Salad className="h-4 w-4 mr-2" />
                        Registrar agora
                        <ArrowRight className="h-4 w-4 ml-auto" />
                      </Button>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        💡 Dica: tire uma foto do prato e deixe a Vita te ajudar a analisar depois.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Card className="workout-card overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg category-icon-bg flex items-center justify-center">
                          <Target className="h-4 w-4 text-primary" />
                        </div>
                        <CardTitle className="text-sm">Como pensamos sua dieta</CardTitle>
                      </div>
                      <CardDescription className="text-xs">
                        Hábitos sustentáveis alinhados ao seu treino e sono.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        <PrincipleItem icon={Zap} text="Priorizar proteína suficiente ao longo do dia" />
                        <PrincipleItem icon={Flame} text="Ajustar carboidratos em torno dos treinos" />
                        <PrincipleItem icon={Salad} text="Garantir saciedade com fibras e gorduras boas" />
                        <PrincipleItem icon={Sparkles} text="Manter flexibilidade para refeições sociais" />
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Card className="workout-card overflow-hidden border-dashed">
                    <CardContent className="p-4 text-center">
                      <div className="h-12 w-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium">Quer uma dieta 100% personalizada?</p>
                      <p className="text-xs text-muted-foreground mt-1 mb-3">
                        Fale com a Vita Nutri IA para criar um plano único pra você.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => navigate("/vita-nutri")}
                      >
                        Falar com Vita
                        <ArrowRight className="h-3 w-3 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </aside>
            </section>
          </motion.div>
        </main>
      </div>
    </AuthenticatedLayout>
  );
};

// Meal Card Component
interface MealCardProps {
  meal: RecommendedMeal;
  index: number;
  onRegister: () => void;
}

const MealCard = ({ meal, index, onRegister }: MealCardProps) => {
  const IconComponent = mealIcons[meal.icon];
  
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card className="workout-card overflow-hidden">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={cn(
                "h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center flex-shrink-0",
                meal.icon === "coffee" && "bg-amber-500/10 text-amber-600",
                meal.icon === "sun" && "bg-orange-500/10 text-orange-600",
                meal.icon === "moon" && "bg-indigo-500/10 text-indigo-600",
                meal.icon === "apple" && "bg-emerald-500/10 text-emerald-600",
              )}>
                <IconComponent className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] sm:text-xs font-normal gap-1 px-1.5 sm:px-2">
                    <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    {meal.timing}
                  </Badge>
                  <Badge className="badge-premium-shimmer text-[10px] sm:text-xs font-normal gap-1 px-1.5 sm:px-2">
                    <Flame className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    {meal.calories} kcal
                  </Badge>
                </div>
                <CardTitle className="text-sm sm:text-base font-semibold leading-tight">
                  {meal.title}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm leading-snug line-clamp-2">
                  {meal.subtitle}
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-[9px] sm:text-[10px] font-medium capitalize shrink-0 self-start sm:self-auto">
              {meal.goalTag}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="flex flex-col gap-3 border-t border-border/50 pt-3">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <MacroPill label="Proteína" value={meal.protein} suffix="g" color="emerald" emphasis />
              <MacroPill label="Carbo" value={meal.carbs} suffix="g" color="blue" />
              <MacroPill label="Gordura" value={meal.fat} suffix="g" color="amber" />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="group hover:border-primary/50 hover:bg-primary/5 w-full sm:w-auto sm:self-end min-h-[44px]"
              onClick={onRegister}
            >
              <CheckCircle2 className="h-3 w-3 mr-1 group-hover:text-primary transition-colors" />
              Registrar similar
              <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Macro Summary Pill for Header
interface MacroSummaryPillProps {
  label: string;
  value: number;
  color: "emerald" | "blue" | "amber";
}

const MacroSummaryPill = ({ label, value, color }: MacroSummaryPillProps) => {
  const colorClasses = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    blue: "text-blue-600 dark:text-blue-400",
    amber: "text-amber-600 dark:text-amber-400",
  };

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50">
      <span className={cn("text-xs sm:text-sm font-semibold tabular-nums", colorClasses[color])}>
        {value}g
      </span>
      <span className="text-[10px] sm:text-xs text-muted-foreground">{label}</span>
    </div>
  );
};

// Macro Pill Component
interface MacroPillProps {
  label: string;
  value: number;
  suffix?: string;
  color?: "emerald" | "blue" | "amber";
  emphasis?: boolean;
}

const MacroPill = ({ label, value, suffix, color = "emerald", emphasis }: MacroPillProps) => {
  const colorClasses = {
    emerald: emphasis 
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" 
      : "border-border/60 bg-muted/40",
    blue: emphasis 
      ? "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400" 
      : "border-border/60 bg-muted/40",
    amber: emphasis 
      ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400" 
      : "border-border/60 bg-muted/40",
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
      colorClasses[color]
    )}>
      <span className="font-medium">{label}:</span>
      <span className="tabular-nums font-semibold">
        {value}{suffix}
      </span>
    </span>
  );
};

// Principle Item Component
interface PrincipleItemProps {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}

const PrincipleItem = ({ icon: Icon, text }: PrincipleItemProps) => (
  <li className="flex items-start gap-2 text-xs text-muted-foreground">
    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon className="h-3 w-3 text-primary" />
    </div>
    <span>{text}</span>
  </li>
);

export default Diet;
