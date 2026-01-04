import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { NavLink } from "@/components/NavLink";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AuthenticatedLayout } from "@/components/layouts/AuthenticatedLayout";
import { canUserAccessFeature, incrementDailyLimit } from "@/lib/limits";
import type { FeatureKey } from "@/lib/limits";
import { UpgradeLimitModal } from "@/components/UpgradeLimitModal";
import {
  Home,
  UtensilsCrossed,
  Dumbbell,
  LineChart,
  User as UserIcon,
  Droplets,
  Moon,
  Activity,
  Salad,
  CheckCircle2,
  Camera,
  MessageCircle,
} from "lucide-react";
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  BarChart,
  Bar,
} from "recharts";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";

const mealSchema = z.object({
  type: z.string().min(1, "Selecione o tipo de refeição"),
  description: z.string().min(3, "Descreva o que você comeu"),
  calories: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const num = Number(val);
      return !Number.isNaN(num) && num >= 0;
    }, {
      message: "Calorias deve ser um número positivo",
    }),
});

const weightSchema = z.object({
  date: z.string().min(1, "Selecione a data"),
  weight: z
    .string()
    .min(1, "Informe o peso")
    .transform((val) => Number(val))
    .refine((val) => !Number.isNaN(val) && val > 0 && val < 400, {
      message: "Peso inválido",
    }),
  fasting: z.boolean().optional(),
});

const waterSchema = z.object({
  ml: z
    .number()
    .int()
    .min(0)
    .max(10000),
});

const sleepSchema = z.object({
  date: z.string().min(1, "Selecione a data"),
  sleepTime: z.string().min(1, "Informe o horário que dormiu"),
  wakeTime: z.string().min(1, "Informe o horário que acordou"),
  quality: z.number().min(0).max(10),
  tags: z.array(z.string()).optional(),
});

const stressSchema = z.object({
  level: z.number().min(0).max(10),
  emoji: z.string().min(1, "Selecione um emoji"),
  notes: z.string().optional(),
});

const Track = () => {
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

  if (loadingAuth || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-10 w-40" />
      </div>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="flex-1 flex flex-col pb-16 md:pb-0">
        <header className="w-full border-b px-4 pt-3 pb-3 md:px-8 md:pt-4 md:pb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
            <h1 className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight">Registro diário</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Centralize aqui tudo o que influencia o seu metabolismo: refeições, peso, água, sono,
              estresse e treinos.
            </p>
          </div>
          <Card className="hidden sm:flex items-center gap-3 p-4 max-w-xs">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg">
              📝
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Dica da Vita</p>
              <p className="text-sm leading-snug">
                Quanto mais consistente for seu registro diário, mais precisas serão as recomendações da
                Vita.
              </p>
            </div>
          </Card>
        </header>

        <main className="flex-1 px-4 py-3 md:px-8 md:py-4 space-y-6 overflow-y-auto">
          <TrackTabs user={user} />
        </main>
      </div>
    </AuthenticatedLayout>
  );
};

type RefeicaoFormValues = z.infer<typeof mealSchema>;

interface TrackTabsProps {
  user: User;
}

const TrackTabs = ({ user }: TrackTabsProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const validTabs = ["refeicao", "peso", "agua", "sono", "estresse", "treino"] as const;
  const isValidTab = (value: string | null): value is (typeof validTabs)[number] =>
    !!value && (validTabs as readonly string[]).includes(value);

  const [currentTab, setCurrentTab] = useState<(typeof validTabs)[number]>(
    isValidTab(tabFromUrl) ? tabFromUrl : "refeicao",
  );

  const handleTabChange = (value: string) => {
    if (!isValidTab(value)) return;
    setCurrentTab(value as (typeof validTabs)[number]);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", value);
      return next;
    });
  };

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
      <TabsList className="w-full flex flex-wrap justify-start gap-1">
        <TabsTrigger value="refeicao" className="flex items-center gap-2">
          <Salad className="h-4 w-4" />
          Refeição
        </TabsTrigger>
        <TabsTrigger value="peso" className="flex items-center gap-2">
          <LineChart className="h-4 w-4" />
          Peso
        </TabsTrigger>
        <TabsTrigger value="agua" className="flex items-center gap-2">
          <Droplets className="h-4 w-4" />
          Água
        </TabsTrigger>
        <TabsTrigger value="sono" className="flex items-center gap-2">
          <Moon className="h-4 w-4" />
          Sono
        </TabsTrigger>
        <TabsTrigger value="estresse" className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Estresse
        </TabsTrigger>
        <TabsTrigger value="treino" className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4" />
          Treino
        </TabsTrigger>
      </TabsList>

      <TabsContent value="refeicao" className="space-y-6">
        <RefeicaoTab userId={user.id} />
      </TabsContent>

      <TabsContent value="peso" className="space-y-6">
        <PesoTab userId={user.id} />
      </TabsContent>

      <TabsContent value="agua" className="space-y-6">
        <AguaTab userId={user.id} />
      </TabsContent>

      <TabsContent value="sono" className="space-y-6">
        <SonoTab userId={user.id} />
      </TabsContent>

      <TabsContent value="estresse" className="space-y-6">
        <EstresseTab userId={user.id} />
      </TabsContent>

      <TabsContent value="treino" className="space-y-6">
        <TreinoTab userId={user.id} />
      </TabsContent>
    </Tabs>
  );
};
const RefeicaoTab = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<
    | {
        name: string;
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
        ingredients?: string[];
        healthScore?: number;
      }
    | null
  >(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [meals, setMeals] = useState<
    {
      id: string;
      datetime: string;
      type: string;
      description: string;
      calories: number | null;
      photo_url: string | null;
    }[]
  >([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [modalFeature, setModalFeature] = useState<FeatureKey>("log_meal");

  const form = useForm<RefeicaoFormValues>({
    resolver: zodResolver(mealSchema),
    defaultValues: {
      type: "",
      description: "",
      calories: undefined,
    },
  });

  useEffect(() => {
    const loadMeals = async () => {
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from("meals")
        .select("id, datetime, type, description, calories, photo_url")
        .eq("user_id", userId)
        .order("datetime", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Erro ao carregar refeições:", error);
        toast({
          title: "Erro ao carregar refeições",
          description: "Tente novamente mais tarde.",
          variant: "destructive",
        });
      } else {
        setMeals(data || []);
      }
      setLoadingHistory(false);
    };

    loadMeals();
  }, [userId, toast]);

  const groupedMeals = useMemo(() => {
    const groups: Record<string, typeof meals> = {};
    meals.forEach((meal) => {
      const dateKey = format(new Date(meal.datetime), "dd/MM", { locale: ptBR });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(meal);
    });
    return groups;
  }, [meals]);

  const onSubmit = async (values: RefeicaoFormValues) => {
    const { type, description, calories } = values;
    const today = new Date().toISOString().split("T")[0];

    const access = await canUserAccessFeature(userId, "log_meal");
    if (!access.allowed) {
      setModalFeature("log_meal");
      setShowUpgradeModal(true);
      return;
    }

    const { error } = await supabase.from("meals").insert({
      user_id: userId,
      datetime: new Date().toISOString(),
      type,
      description,
      calories: calories ? Number(calories) : null,
      ai_analysis: aiResult ? aiResult : null,
    });

    if (error) {
      console.error("Erro ao salvar refeição:", error);
      toast({
        title: "Erro ao salvar refeição",
        description: "Tente novamente.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Refeição registrada",
      description: "Vita vai usar isso para ajustar suas recomendações.",
    });

    await incrementDailyLimit(userId, today, "meals_logged");

    form.reset();
    setAiResult(null);

    const { data } = await supabase
      .from("meals")
      .select("id, datetime, type, description, calories, photo_url")
      .eq("user_id", userId)
      .order("datetime", { ascending: false })
      .limit(50);
    setMeals(data || []);
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handleAnalyzeWithAI = async () => {
    if (!photoPreview) {
      toast({
        title: "Selecione uma foto primeiro",
        variant: "destructive",
      });
      return;
    }

    const access = await canUserAccessFeature(userId, "photo_analysis");
    if (!access.allowed) {
      setModalFeature("photo_analysis");
      setShowUpgradeModal(true);
      return;
    }

    setAnalyzing(true);
    try {
      // Ponto de integração com Lovable AI / Firecrawl via Edge Function.
      // Quando a função estiver criada, basta descomentar a chamada abaixo.
      // const { data, error } = await supabase.functions.invoke("meals-ai-analyze", {
      //   body: { photoUrl: photoPreview },
      // });
      // if (error) throw error;
      // setAiResult(data?.analysis ?? null);

      // Placeholder temporário: simula uma análise básica.
      setTimeout(async () => {
        setAiResult({
          name: "Prato balanceado",
          calories: 520,
          protein: 32,
          carbs: 48,
          fat: 18,
          ingredients: ["Frango", "Arroz integral", "Salada"],
          healthScore: 8.5,
        });
        await incrementDailyLimit(userId, new Date().toISOString().split("T")[0], "photo_analyses");
        setAnalyzing(false);
        toast({
          title: "Análise simulada",
          description: "Integração completa com IA será conectada em breve.",
        });
      }, 1200);
    } catch (error) {
      console.error("Erro ao analisar refeição com IA:", error);
      setAnalyzing(false);
      toast({
        title: "Erro na análise de IA",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <UpgradeLimitModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} feature={modalFeature} />
      <div className="grid gap-4 md:grid-cols-2">
        {/* Opção A - Registro por foto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Registro por foto
            </CardTitle>
            <CardDescription>Tire uma foto ou escolha da galeria para a Vita analisar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input type="file" accept="image/*" onChange={handlePhotoChange} />
              {photoPreview && (
                <div className="mt-3 rounded-md overflow-hidden border bg-muted/40">
                  <img src={photoPreview} alt="Pré-visualização da refeição" className="w-full h-40 object-cover" />
                </div>
              )}
            </div>
            <Button onClick={handleAnalyzeWithAI} disabled={analyzing} className="w-full">
              {analyzing ? "O Vita está analisando..." : "Analisar com IA"}
            </Button>

            {aiResult && (
              <div className="mt-4 space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{aiResult.name}</p>
                    {aiResult.calories !== undefined && (
                      <p className="text-xs text-muted-foreground">{aiResult.calories} kcal (estimado)</p>
                    )}
                  </div>
                  {aiResult.healthScore !== undefined && (
                    <div className="text-right text-sm">
                      <span className="block text-xs text-muted-foreground">Score de saudabilidade</span>
                      <span className="text-lg font-semibold">{aiResult.healthScore.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                {(aiResult.protein || aiResult.carbs || aiResult.fat) && (
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="font-medium">Proteína</p>
                      <p className="text-muted-foreground">{aiResult.protein ?? "--"} g</p>
                    </div>
                    <div>
                      <p className="font-medium">Carbo</p>
                      <p className="text-muted-foreground">{aiResult.carbs ?? "--"} g</p>
                    </div>
                    <div>
                      <p className="font-medium">Gordura</p>
                      <p className="text-muted-foreground">{aiResult.fat ?? "--"} g</p>
                    </div>
                  </div>
                )}
                {aiResult.ingredients && aiResult.ingredients.length > 0 && (
                  <div className="text-xs">
                    <p className="font-medium mb-1">Ingredientes detectados</p>
                    <p className="text-muted-foreground">{aiResult.ingredients.join(", ")}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      form.setValue("description", aiResult.name);
                      if (aiResult.calories) form.setValue("calories", String(aiResult.calories));
                      toast({
                        title: "Dados preenchidos",
                        description: "Revise as informações antes de salvar.",
                      });
                    }}
                  >
                    Confirmar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      toast({
                        title: "Edite manualmente",
                        description: "Ajuste os campos ao lado como preferir.",
                      });
                    }}
                  >
                    Editar manualmente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Opção B - Registro manual */}
        <Card>
          <CardHeader>
            <CardTitle>Registro manual</CardTitle>
            <CardDescription>Descreva o que você comeu nesta refeição.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de refeição</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  {...form.register("type")}
                >
                  <option value="">Selecione</option>
                  <option value="cafe_manha">Café da manhã</option>
                  <option value="lanche_manha">Lanche da manhã</option>
                  <option value="almoco">Almoço</option>
                  <option value="lanche_tarde">Lanche da tarde</option>
                  <option value="jantar">Jantar</option>
                  <option value="ceia">Ceia</option>
                </select>
                {form.formState.errors.type && (
                  <p className="text-xs text-destructive">{form.formState.errors.type.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">O que você comeu?</label>
                <Textarea
                  rows={3}
                  placeholder="Ex: 150g de frango grelhado, 1 xícara de arroz integral, salada verde"
                  {...form.register("description")}
                />
                {form.formState.errors.description && (
                  <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center justify-between">
                  <span>Calorias (opcional)</span>
                  <button
                    type="button"
                    className="text-xs text-primary flex items-center gap-1"
                    onClick={() => {
                      toast({
                        title: "Perguntar para Vita",
                        description:
                          "Integração com IA para estimar calorias será conectada em uma próxima etapa.",
                      });
                    }}
                  >
                    <MessageCircle className="h-3 w-3" />
                    Perguntar para Vita
                  </button>
                </label>
                <Input type="number" step="1" min="0" placeholder="Ex: 520" {...form.register("calories")} />
                {form.formState.errors.calories && (
                  <p className="text-xs text-destructive">{form.formState.errors.calories.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Salvar refeição
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de refeições */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium tracking-tight">Histórico recente</h2>
        </div>
        {loadingHistory ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : meals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma refeição registrada ainda.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedMeals).map(([dateLabel, items]) => {
              const totalDay = items.reduce((acc, meal) => acc + (meal.calories ?? 0), 0);
              return (
                <div key={dateLabel} className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{dateLabel}</span>
                    {totalDay > 0 && <span>Total: {totalDay.toFixed(0)} kcal</span>}
                  </div>
                  <div className="space-y-2">
                    {items.map((meal) => (
                      <Card key={meal.id} className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center text-xs">
                            {format(new Date(meal.datetime), "HH:mm")}
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium leading-tight line-clamp-2">
                              {meal.description}
                            </p>
                            <p className="text-[11px] text-muted-foreground lowercase">
                              {meal.type.replace("_", " ")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          {meal.calories ? (
                            <p className="font-medium">{meal.calories.toFixed(0)} kcal</p>
                          ) : (
                            <p className="text-muted-foreground">-- kcal</p>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

const PesoTab = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof weightSchema>>({
    resolver: zodResolver(weightSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      weight: undefined as unknown as number,
      fasting: false,
    },
  });
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<
    { id: string; date: string; weight_kg: number; fasting: boolean }[]
  >([]);

  useEffect(() => {
    const loadWeights = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("weight_logs")
        .select("id, date, weight_kg, fasting")
        .eq("user_id", userId)
        .order("date", { ascending: true })
        .gte("date", format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));

      if (error) {
        console.error("Erro ao carregar pesos:", error);
        toast({
          title: "Erro ao carregar pesos",
          description: "Tente novamente mais tarde.",
          variant: "destructive",
        });
      } else {
        setLogs(data || []);
      }
      setLoading(false);
    };

    loadWeights();
  }, [userId, toast]);

  const onSubmit = async (values: z.infer<typeof weightSchema>) => {
    const { date, weight, fasting } = values;

    const { error } = await supabase.from("weight_logs").upsert(
      {
        user_id: userId,
        date,
        weight_kg: weight,
        fasting: fasting ?? false,
      },
      { onConflict: "user_id,date" },
    );

    if (error) {
      console.error("Erro ao salvar peso:", error);
      toast({
        title: "Erro ao salvar peso",
        description: "Tente novamente.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Peso registrado",
      description: "Seu gráfico de evolução foi atualizado.",
    });

    const { data } = await supabase
      .from("weight_logs")
      .select("id, date, weight_kg, fasting")
      .eq("user_id", userId)
      .order("date", { ascending: true })
      .gte("date", format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));
    setLogs(data || []);
  };

  const chartData = useMemo(
    () =>
      logs.map((log) => ({
        dateLabel: format(new Date(log.date), "dd/MM"),
        value: log.weight_kg,
      })),
    [logs],
  );

  const diffFromLast = useMemo(() => {
    if (logs.length < 2) return null;
    const last = logs[logs.length - 1];
    const prev = logs[logs.length - 2];
    return last.weight_kg - prev.weight_kg;
  }, [logs]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Registrar peso</CardTitle>
          <CardDescription>Use medidas consistentes, de preferência em jejum.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-[1.5fr,1fr]">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Peso (kg)</label>
                <Input type="number" step="0.1" placeholder="Ex: 72.4" {...form.register("weight")} />
                {form.formState.errors.weight && (
                  <p className="text-xs text-destructive">{form.formState.errors.weight.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Data</label>
                <Input type="date" {...form.register("date")} />
                {form.formState.errors.date && (
                  <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.watch("fasting")}
                  onCheckedChange={(checked) => form.setValue("fasting", Boolean(checked))}
                />
                Medição em jejum
              </label>
              <Button type="submit" className="w-full md:w-auto flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Salvar peso
              </Button>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Registrar seu peso diariamente ajuda a Vita a entender sua resposta às dietas e treinos ao longo do
                tempo.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium tracking-tight">Evolução nos últimos 30 dias</h2>
          {diffFromLast !== null && (
            <span
              className={cn(
                "text-xs font-medium",
                diffFromLast < 0 ? "text-emerald-500" : diffFromLast > 0 ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {diffFromLast < 0 ? "-" : diffFromLast > 0 ? "+" : ""}
              {Math.abs(diffFromLast).toFixed(1)} kg desde a última medição
            </span>
          )}
        </div>

        <Card className="p-4">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro de peso ainda.</p>
          ) : (
            <div className="h-52 w-full">
              <ReLineChart data={chartData} width={600} height={200}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={["dataMin - 1", "dataMax + 1"]} />
                <ReTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const item = payload[0];
                    return (
                      <div className="rounded-md border bg-background px-2 py-1 text-xs shadow-sm">
                        <p className="font-medium">{item.payload.dateLabel}</p>
                        <p>{Number(item.value ?? 0).toFixed(1)} kg</p>
                      </div>
                    );
                  }}
                />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </ReLineChart>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
};

const AguaTab = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const [ml, setMl] = useState(0);
  const [date] = useState(format(new Date(), "yyyy-MM-dd"));
  const metaMl = 2000;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWater = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("water_intake")
        .select("ml_consumed")
        .eq("user_id", userId)
        .eq("date", date)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Erro ao carregar água:", error);
        toast({
          title: "Erro ao carregar água",
          description: "Tente novamente mais tarde.",
          variant: "destructive",
        });
      } else {
        setMl(data?.ml_consumed ?? 0);
      }
      setLoading(false);
    };

    loadWater();
  }, [userId, date, toast]);

  const persistWater = async (nextMl: number) => {
    setMl(nextMl);
    const { error } = await supabase.from("water_intake").upsert(
      {
        user_id: userId,
        date,
        ml_consumed: nextMl,
      },
      { onConflict: "user_id,date" },
    );

    if (error) {
      console.error("Erro ao salvar água:", error);
      toast({
        title: "Erro ao salvar ingestão de água",
        description: "Tente novamente.",
        variant: "destructive",
      });
    }

    if (nextMl >= metaMl && ml < metaMl) {
      toast({
        title: "Meta de água atingida!",
        description: "A hidratação é uma das bases da sua saúde metabólica. 💧",
      });
    }
  };

  const filledCups = Math.round(ml / 250);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ingestão de água</CardTitle>
          <CardDescription>Cada copo representa 250ml.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }).map((_, idx) => {
                const isFilled = idx < filledCups;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const next = idx + 1 === filledCups ? (idx * 250) : (idx + 1) * 250;
                      persistWater(next);
                    }}
                    className={cn(
                      "h-12 w-10 rounded-md border flex flex-col items-center justify-center text-xs",
                      isFilled ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground",
                    )}
                  >
                    <Droplets className="h-4 w-4" />
                    <span>{(idx + 1) * 250}ml</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span>
              {(ml / 1000).toFixed(2)}L / {(metaMl / 1000).toFixed(1)}L meta
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const next = Math.min(ml + 250, 4000);
                persistWater(next);
              }}
            >
              +250ml
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const SonoTab = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<
    { id: string; date: string; sleep_time: string; wake_time: string; quality_score: number }[]
  >([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [sleepTime, setSleepTime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [quality, setQuality] = useState(7);

  useEffect(() => {
    const loadSleep = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("sleep_logs")
        .select("id, date, sleep_time, wake_time, quality_score")
        .eq("user_id", userId)
        .order("date", { ascending: true })
        .gte("date", format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));

      if (error) {
        console.error("Erro ao carregar sono:", error);
        toast({
          title: "Erro ao carregar dados de sono",
          description: "Tente novamente.",
          variant: "destructive",
        });
      } else {
        setLogs(data || []);
      }
      setLoading(false);
    };

    loadSleep();
  }, [userId, toast]);

  const saveSleep = async () => {
    const parsed = sleepSchema.safeParse({
      date,
      sleepTime,
      wakeTime,
      quality,
      tags: selectedTags,
    });

    if (!parsed.success) {
      toast({
        title: "Revise os dados",
        description: "Confira horários e qualidade do sono.",
        variant: "destructive",
      });
      return;
    }

    const sleepDateTime = new Date(`${date}T${sleepTime}:00`);
    let wakeDateTime = new Date(`${date}T${wakeTime}:00`);
    if (wakeDateTime <= sleepDateTime) {
      wakeDateTime = new Date(wakeDateTime.getTime() + 24 * 60 * 60 * 1000);
    }

    const { error } = await supabase.from("sleep_logs").upsert(
      {
        user_id: userId,
        date,
        sleep_time: sleepDateTime.toISOString(),
        wake_time: wakeDateTime.toISOString(),
        quality_score: quality,
        tags: selectedTags,
      },
      { onConflict: "user_id,date" },
    );

    if (error) {
      console.error("Erro ao salvar sono:", error);
      toast({
        title: "Erro ao salvar registro de sono",
        description: "Tente novamente.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sono registrado",
      description: "A Vita vai usar esse padrão para ajustar suas recomendações.",
    });

    const { data } = await supabase
      .from("sleep_logs")
      .select("id, date, sleep_time, wake_time, quality_score")
      .eq("user_id", userId)
      .order("date", { ascending: true })
      .gte("date", format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));
    setLogs(data || []);
  };

  const computeHours = (sleep: string, wake: string) => {
    const s = new Date(`${date}T${sleep}:00`);
    let w = new Date(`${date}T${wake}:00`);
    if (w <= s) w = new Date(w.getTime() + 24 * 60 * 60 * 1000);
    return (w.getTime() - s.getTime()) / (1000 * 60 * 60);
  };

  const hours = computeHours(sleepTime, wakeTime);

  const chartData = useMemo(
    () =>
      logs.map((log) => {
        const s = new Date(log.sleep_time);
        const w = new Date(log.wake_time);
        const diff = (w.getTime() - s.getTime()) / (1000 * 60 * 60);
        return {
          dateLabel: format(new Date(log.date), "dd/MM"),
          hours: diff,
        };
      }),
    [logs],
  );

  const tagOptions = [
    { id: "acordei_cansado", label: "Acordei cansado" },
    { id: "sonho_ruim", label: "Sonho ruim" },
    { id: "insonia", label: "Insônia" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Registro de sono</CardTitle>
          <CardDescription>Entenda como a qualidade do seu sono influencia seus resultados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Dormiu</label>
                  <Input type="time" value={sleepTime} onChange={(e) => setSleepTime(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Acordou</label>
                  <Input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Total estimado: {hours.toFixed(1)} horas de sono.</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center justify-between">
                  <span>Qualidade do sono (0-10)</span>
                  <span className="text-xs text-muted-foreground">{quality}</span>
                </label>
                <Slider
                  min={0}
                  max={10}
                  step={1}
                  value={[quality]}
                  onValueChange={(value: number[]) => setQuality(value[0] ?? 0)}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {tagOptions.map((tag) => {
                    const active = selectedTags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          setSelectedTags((prev) =>
                            prev.includes(tag.id) ? prev.filter((t) => t !== tag.id) : [...prev, tag.id],
                          );
                        }}
                        className={cn(
                          "px-3 py-1 rounded-full border text-xs",
                          active ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground",
                        )}
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button onClick={saveSleep} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Salvar sono
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium tracking-tight">Padrão semanal</h2>
        </div>
        <Card className="p-4">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro de sono ainda.</p>
          ) : (
            <div className="h-52 w-full">
              <BarChart data={chartData} width={600} height={200}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <ReTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const item = payload[0];
                    return (
                      <div className="rounded-md border bg-background px-2 py-1 text-xs shadow-sm">
                        <p className="font-medium">{item.payload.dateLabel}</p>
                        <p>{Number(item.value ?? 0).toFixed(1)} h de sono</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
};

const EstresseTab = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const [level, setLevel] = useState(3);
  const [emoji, setEmoji] = useState("😊");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<
    { id: string; datetime: string; level: number; emoji: string | null; notes: string | null }[]
  >([]);

  useEffect(() => {
    const loadStress = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("stress_logs")
        .select("id, datetime, level, emoji, notes")
        .eq("user_id", userId)
        .order("datetime", { ascending: false })
        .limit(30);

      if (error) {
        console.error("Erro ao carregar estresse:", error);
        toast({
          title: "Erro ao carregar registros de estresse",
          description: "Tente novamente.",
          variant: "destructive",
        });
      } else {
        setLogs(data || []);
      }
      setLoading(false);
    };

    loadStress();
  }, [userId, toast]);

  const saveStress = async () => {
    const parsed = stressSchema.safeParse({ level, emoji, notes });
    if (!parsed.success) {
      toast({
        title: "Revise os dados",
        description: "Escolha um emoji e ajuste o nível.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("stress_logs").insert({
      user_id: userId,
      datetime: new Date().toISOString(),
      level,
      emoji,
      notes: notes || null,
    });

    if (error) {
      console.error("Erro ao salvar estresse:", error);
      toast({
        title: "Erro ao salvar registro de estresse",
        description: "Tente novamente.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Estresse registrado",
      description: "A Vita vai considerar isso nas sugestões de recuperação.",
    });

    const { data } = await supabase
      .from("stress_logs")
      .select("id, datetime, level, emoji, notes")
      .eq("user_id", userId)
      .order("datetime", { ascending: false })
      .limit(30);
    setLogs(data || []);
    setNotes("");
  };

  const emojis = [
    { symbol: "😊", label: "Bem" },
    { symbol: "😐", label: "Neutro" },
    { symbol: "😟", label: "Preocupado" },
    { symbol: "😰", label: "Ansioso" },
    { symbol: "😫", label: "Exausto" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Registro de estresse</CardTitle>
          <CardDescription>Entenda seus gatilhos e momentos de maior carga emocional.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Como você se sente agora?</p>
            <div className="flex flex-wrap gap-2">
              {emojis.map((e) => (
                <button
                  key={e.symbol}
                  type="button"
                  onClick={() => setEmoji(e.symbol)}
                  className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center border text-2xl",
                    emoji === e.symbol ? "bg-primary text-primary-foreground" : "bg-background",
                  )}
                >
                  {e.symbol}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center justify-between">
              <span>Nível de estresse (0-10)</span>
              <span className="text-xs text-muted-foreground">{level}</span>
            </label>
            <Slider min={0} max={10} step={1} value={[level]} onValueChange={([val]) => setLevel(val)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">O que te estressou? (opcional)</label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: reunião longa, trânsito, pouco sono..."
            />
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="font-medium">Sugestões da Vita (baseado em evidência)</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Respiração 4-7-8 por 3 minutos.</li>
              <li>Meditação guiada curta (5-10 minutos).</li>
              <li>Caminhada leve de 10 minutos ao ar livre.</li>
            </ul>
          </div>

          <Button onClick={saveStress} className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Salvar registro de estresse
          </Button>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-tight">Histórico recente</h2>
        <Card className="p-4 space-y-2 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start justify-between text-xs py-1 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{log.emoji || "😐"}</span>
                  <div>
                    <p className="font-medium">
                      {format(new Date(log.datetime), "dd/MM HH:mm", { locale: ptBR })} - Nível {log.level}
                    </p>
                    {log.notes && <p className="text-muted-foreground line-clamp-2">{log.notes}</p>}
                  </div>
                </div>
              </div>
            ))
          )}
        </Card>
      </section>
    </div>
  );
};

const TreinoTab = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const [intensity, setIntensity] = useState(7);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<
    { id: string; date: string; completed: boolean; intensity: number | null }[]
  >([]);

  useEffect(() => {
    const loadWorkouts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("workout_logs")
        .select("id, date, completed, intensity")
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(14);

      if (error) {
        console.error("Erro ao carregar treinos:", error);
        toast({
          title: "Erro ao carregar treinos",
          description: "Tente novamente.",
          variant: "destructive",
        });
      } else {
        setLogs(data || []);
      }
      setLoading(false);
    };

    loadWorkouts();
  }, [userId, toast]);

  const saveWorkout = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const { error } = await supabase.from("workout_logs").upsert(
      {
        user_id: userId,
        date: today,
        completed,
        intensity,
      },
      { onConflict: "user_id,date,workout_id" },
    );

    if (error) {
      console.error("Erro ao salvar treino:", error);
      toast({
        title: "Erro ao salvar treino",
        description: "Tente novamente.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Treino registrado",
      description: "Vita considera essa sessão na sua carga semanal.",
    });

    const { data } = await supabase
      .from("workout_logs")
      .select("id, date, completed, intensity")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(14);
    setLogs(data || []);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Treino de hoje</CardTitle>
          <CardDescription>
            Escolha ou registre seu treino e marque como concluído para acompanhar sua consistência.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Button
              variant="outline"
              className="flex items-center justify-center gap-2"
              onClick={() =>
                toast({
                  title: "Biblioteca de treinos",
                  description: "Tela de treinos será implementada em breve.",
                })
              }
            >
              <Dumbbell className="h-4 w-4" />
              Escolher da biblioteca
            </Button>
            <Button
              variant="outline"
              className="flex items-center justify-center gap-2"
              onClick={() =>
                toast({
                  title: "Criar treino personalizado",
                  description: "Construtor de treinos será adicionado em uma próxima fase.",
                })
              }
            >
              Criar treino personalizado
            </Button>
            <Button
              variant="default"
              className="flex items-center justify-center gap-2"
              onClick={() =>
                toast({
                  title: "Pedir sugestão para Vita",
                  description: "Integração com IA para sugestões de treino será conectada em breve.",
                })
              }
            >
              <MessageCircle className="h-4 w-4" />
              Pedir sugestão para Vita
            </Button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={completed} onCheckedChange={(checked) => setCompleted(Boolean(checked))} />
                Marcar treino de hoje como concluído
              </label>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center justify-between">
                  <span>Intensidade percebida (1-10)</span>
                  <span className="text-xs text-muted-foreground">{intensity}</span>
                </label>
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[intensity]}
                  onValueChange={([val]) => setIntensity(val)}
                />
              </div>
              <Button onClick={saveWorkout} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Marcar como concluído
              </Button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                Após os treinos, faça sessões leves de respiração ou alongamento. Em breve a Vita poderá sugerir rotinas
                de recuperação personalizadas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-medium tracking-tight">Últimos treinos</h2>
        <Card className="p-4 space-y-2 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum treino registrado ainda.</p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between text-xs py-1 border-b last:border-0"
              >
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-3 w-3" />
                  <span>{format(new Date(log.date), "dd/MM", { locale: ptBR })}</span>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {log.completed ? "Concluído" : "Pendente"}
                    {log.intensity && ` • Int. ${log.intensity}`}
                  </p>
                </div>
              </div>
            ))
          )}
        </Card>
      </section>
    </div>
  );
};

export default Track;
