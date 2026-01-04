import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AuthenticatedLayout } from "@/components/layouts/AuthenticatedLayout";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Home, UtensilsCrossed, Dumbbell, LineChart, User as UserIcon, Activity, Flame, Salad, Clock, ArrowRight, MessageCircle } from "lucide-react";

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
}

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
    },
  ];
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

  if (loadingAuth || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-10 w-40" />
      </div>
    );
  }

  return (
    <AuthenticatedLayout>
      {/* Main content */}
      <div className="flex-1 flex flex-col pb-16 md:pb-0">
        <header className="w-full border-b px-4 py-3 md:px-8 md:py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Plano alimentar do dia
            </p>
            <h1 className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight">Dieta de hoje</h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              Use estes exemplos como base e vá ajustando com a Vita no registro diário. O importante é a direção, não a perfeição.
            </p>
          </div>

          <Card className="hidden sm:flex items-center gap-3 p-4 max-w-xs">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg">
              <Salad className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Dica da Vita</p>
              <p className="text-sm leading-snug">
                Não precisa seguir 100%: registre o que você realmente comeu para que o plano se adapte à sua rotina.
              </p>
            </div>
          </Card>
        </header>

        <main className="flex-1 px-4 py-3 md:px-8 md:py-4 space-y-6 overflow-y-auto">
          <section className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
            <div className="space-y-4">
              {loadingMeals ? (
                <>
                  <Card>
                    <CardHeader>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="mt-2 h-3 w-48" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-6 w-full" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="mt-2 h-3 w-44" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-6 w-full" />
                    </CardContent>
                  </Card>
                </>
              ) : (
                buildRecommendedMeals(userGoals).map((meal) => (
                  <Card key={meal.id} className="relative overflow-hidden">
                    <CardHeader className="flex flex-row items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-xs font-normal"
                          >
                            <Clock className="mr-1 h-3 w-3" /> {meal.timing}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="text-xs font-normal flex items-center gap-1"
                          >
                            <Flame className="h-3 w-3 text-primary" />
                            {meal.calories} kcal
                          </Badge>
                        </div>
                        <CardTitle className="text-base md:text-lg font-semibold leading-tight">
                          {meal.title}
                        </CardTitle>
                        <CardDescription className="text-sm leading-snug">
                          {meal.subtitle}
                        </CardDescription>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[11px] font-medium capitalize"
                      >
                        {meal.goalTag}
                      </Badge>
                    </CardHeader>
                    <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-t pt-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <MacroPill
                          label="Proteína"
                          value={meal.protein}
                          suffix="g"
                          emphasis
                        />
                        <MacroPill
                          label="Carbo"
                          value={meal.carbs}
                          suffix="g"
                        />
                        <MacroPill
                          label="Gordura"
                          value={meal.fat}
                          suffix="g"
                        />
                      </div>
                      <Button
                        size="sm"
                        className="mt-1 md:mt-0 flex items-center gap-2"
                        variant="outline"
                        onClick={() => navigate("/track")}
                      >
                        Registrar refeição parecida
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <aside className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Comece registrando o básico</CardTitle>
                  <CardDescription className="text-xs">
                    Em menos de 1 minuto você registra a refeição e a Vita entende melhor seu contexto alimentar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full flex items-center justify-between" onClick={() => navigate("/track")}>
                    <span className="flex items-center gap-2">
                      <Salad className="h-4 w-4" />
                      Registrar refeição agora
                    </span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Dica: se estiver em dúvida, tire uma foto do prato e deixe o Vita te ajudar a analisar depois.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Como a DietaFY pensa a sua dieta</CardTitle>
                  <CardDescription className="text-xs">
                    O objetivo é construir hábitos sustentáveis, alinhados ao seu plano de treinos e sono.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Priorizar proteína suficiente ao longo do dia.</li>
                    <li>Ajustar carboidratos em torno dos treinos.</li>
                    <li>Garantir saciedade com fibras e gorduras boas.</li>
                    <li>Manter flexibilidade para refeições sociais.</li>
                  </ul>
                </CardContent>
              </Card>
            </aside>
          </section>
        </main>
      </div>
    </AuthenticatedLayout>
  );
};

interface MacroPillProps {
  label: string;
  value: number;
  suffix?: string;
  emphasis?: boolean;
}

const MacroPill = ({ label, value, suffix, emphasis }: MacroPillProps) => {
  return (
    <span
      className={"inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] " +
        (emphasis ? "border-primary/60 bg-primary/5 text-primary" : "border-border/60 bg-muted/40")}
    >
      <span className="font-medium">{label}:</span>
      <span className="tabular-nums">
        {value}
        {suffix}
      </span>
    </span>
  );
};

export default Diet;
