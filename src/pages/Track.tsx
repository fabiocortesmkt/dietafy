import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
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
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { useToast } from "@/hooks/use-toast";
import { AuthenticatedLayout } from "@/components/layouts/AuthenticatedLayout";
import { canUserAccessFeature, incrementDailyLimit } from "@/lib/limits";
import type { FeatureKey } from "@/lib/limits";
import { UpgradeLimitModal } from "@/components/UpgradeLimitModal";
import {
  Droplets,
  Moon,
  Activity,
  Salad,
  CheckCircle2,
  Camera,
  MessageCircle,
  Dumbbell,
  Scale,
  Sparkles,
  TrendingUp,
  Clock,
  Flame,
  Heart,
  Brain,
  Target,
  CalendarIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  BarChart,
  Bar,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const }
  }
};

const headerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const }
  }
};

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

// Tab configuration with colors
const tabConfig = [
  { id: "refeicao", label: "Refeição", icon: Salad, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "peso", label: "Peso", icon: Scale, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "agua", label: "Água", icon: Droplets, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { id: "sono", label: "Sono", icon: Moon, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { id: "estresse", label: "Estresse", icon: Activity, color: "text-orange-500", bg: "bg-orange-500/10" },
  { id: "treino", label: "Treino", icon: Dumbbell, color: "text-primary", bg: "bg-primary/10" },
] as const;

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
    return <LoadingOverlay message="Carregando registro diário..." />;
  }

  return (
    <AuthenticatedLayout>
      <div className="flex-1 flex flex-col pb-16 md:pb-0">
        {/* Premium Header */}
        <motion.header 
          className="workout-header-gradient w-full border-b px-4 pt-4 pb-5 md:px-8 md:pt-6 md:pb-6"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <motion.div variants={headerVariants} className="space-y-1">
                <p className="text-sm text-muted-foreground capitalize">
                  {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
                </p>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  Registro Diário
                </h1>
                <p className="text-sm text-muted-foreground max-w-md">
                  Centralize tudo o que influencia seu metabolismo: refeições, peso, água, sono, estresse e treinos.
                </p>
              </motion.div>

              {/* Vita Tip Card */}
              <motion.div 
                variants={itemVariants}
                className="glass-premium-vita p-4 rounded-xl max-w-xs hidden sm:block"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Dica da Vita</p>
                    <p className="text-sm leading-snug">
                      Quanto mais consistente for seu registro, mais precisas serão as recomendações.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Quick Stats Pills */}
            <motion.div 
              variants={itemVariants}
              className="flex flex-wrap gap-2 mt-4"
            >
              <QuickStatPill icon={Target} label="Dias esta semana" value="4/7" color="text-primary" />
              <QuickStatPill icon={Flame} label="Streak atual" value="12 dias" color="text-orange-500" />
              <QuickStatPill icon={Heart} label="Bem-estar" value="8.2" color="text-rose-500" />
            </motion.div>
          </div>
        </motion.header>

      <main className="flex-1 py-4 md:py-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <TrackTabs user={user} />
        </div>
        </main>
      </div>
    </AuthenticatedLayout>
  );
};

// Quick Stat Pill Component
const QuickStatPill = ({ icon: Icon, label, value, color }: { 
  icon: React.ElementType; 
  label: string; 
  value: string;
  color: string;
}) => (
  <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
    <Icon className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0", color)} />
    <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">{label}:</span>
    <span className="text-[10px] sm:text-xs font-semibold">{value}</span>
  </div>
);

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
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4 sm:space-y-6">
        {/* Premium Tab List - Horizontal scroll on mobile */}
            <motion.div variants={itemVariants}>
              <div className="pb-2">
                <TabsList className="grid grid-cols-3 md:inline-flex gap-2 bg-transparent p-2 w-full md:w-auto">
              {tabConfig.map((tab) => {
                const Icon = tab.icon;
                const isActive = currentTab === tab.id;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      "filter-chip flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border transition-all duration-300 shrink-0",
                      isActive 
                        ? "filter-chip active bg-primary/10 border-primary/30 text-foreground shadow-sm" 
                        : "bg-muted/30 border-transparent hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    <div className={cn(
                      "h-5 w-5 sm:h-6 sm:w-6 rounded-lg flex items-center justify-center transition-colors shrink-0",
                      isActive ? tab.bg : "bg-muted/50"
                    )}>
                      <Icon className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5", isActive ? tab.color : "text-muted-foreground")} />
                    </div>
                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </motion.div>

        <TabsContent value="refeicao" className="space-y-6 mt-6">
          <RefeicaoTab userId={user.id} />
        </TabsContent>

        <TabsContent value="peso" className="space-y-6 mt-6">
          <PesoTab userId={user.id} />
        </TabsContent>

        <TabsContent value="agua" className="space-y-6 mt-6">
          <AguaTab userId={user.id} />
        </TabsContent>

        <TabsContent value="sono" className="space-y-6 mt-6">
          <SonoTab userId={user.id} />
        </TabsContent>

        <TabsContent value="estresse" className="space-y-6 mt-6">
          <EstresseTab userId={user.id} />
        </TabsContent>

        <TabsContent value="treino" className="space-y-6 mt-6">
          <TreinoTab userId={user.id} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

// Premium Card Wrapper
const PremiumCard = ({ children, className, delay = 0 }: { 
  children: React.ReactNode; 
  className?: string;
  delay?: number;
}) => (
  <motion.div
    variants={itemVariants}
    initial="hidden"
    animate="visible"
    transition={{ delay }}
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
  >
    <Card className={cn(
      "workout-card border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300",
      "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20",
      "p-3 sm:p-4",
      className
    )}>
      {children}
    </Card>
  </motion.div>
);

// Section Header Component
const SectionHeader = ({ title, action }: { title: string; action?: React.ReactNode }) => (
  <motion.div 
    variants={itemVariants}
    className="flex items-center justify-between"
  >
    <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
    {action}
  </motion.div>
);

const RefeicaoTab = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{
    name: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    ingredients?: string[];
    healthScore?: number;
  } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [meals, setMeals] = useState<{
    id: string;
    datetime: string;
    type: string;
    description: string;
    calories: number | null;
    photo_url: string | null;
  }[]>([]);
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

  const mealTypeLabels: Record<string, string> = {
    cafe_manha: "Café da manhã",
    lanche_manha: "Lanche da manhã",
    almoco: "Almoço",
    lanche_tarde: "Lanche da tarde",
    jantar: "Jantar",
    ceia: "Ceia",
  };

  return (
    <motion.div 
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <UpgradeLimitModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} feature={modalFeature} />
      
      <div className="grid gap-4 md:grid-cols-2">
        {/* Photo Registration Card */}
        <PremiumCard>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                <Camera className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <CardTitle className="text-base">Registro por foto</CardTitle>
                <CardDescription className="text-xs">Tire uma foto para a Vita analisar</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Input 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoChange}
                className="file:mr-3 file:px-3 file:py-1 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:text-xs file:font-medium hover:file:bg-primary/20"
              />
              {photoPreview && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-3 rounded-xl overflow-hidden border-2 border-primary/20 bg-muted/40"
                >
                  <img src={photoPreview} alt="Pré-visualização" className="w-full h-40 object-cover" />
                </motion.div>
              )}
            </div>
            <Button 
              onClick={handleAnalyzeWithAI} 
              disabled={analyzing} 
              className="w-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
            >
              {analyzing ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  O Vita está analisando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analisar com IA
                </>
              )}
            </Button>

            {aiResult && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 space-y-3 border-t border-border/50 pt-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{aiResult.name}</p>
                    {aiResult.calories !== undefined && (
                      <p className="text-xs text-muted-foreground">{aiResult.calories} kcal (estimado)</p>
                    )}
                  </div>
                  {aiResult.healthScore !== undefined && (
                    <div className="text-right">
                      <span className="block text-xs text-muted-foreground">Score</span>
                      <span className="text-xl font-bold text-emerald-500">{aiResult.healthScore.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                
                {(aiResult.protein || aiResult.carbs || aiResult.fat) && (
                  <div className="grid grid-cols-3 gap-2">
                    <MacroPill label="Proteína" value={aiResult.protein} unit="g" color="bg-blue-500/10 text-blue-600" />
                    <MacroPill label="Carbo" value={aiResult.carbs} unit="g" color="bg-amber-500/10 text-amber-600" />
                    <MacroPill label="Gordura" value={aiResult.fat} unit="g" color="bg-rose-500/10 text-rose-600" />
                  </div>
                )}
                
                {aiResult.ingredients && aiResult.ingredients.length > 0 && (
                  <div className="text-xs">
                    <p className="font-medium mb-1">Ingredientes detectados</p>
                    <div className="flex flex-wrap gap-1">
                      {aiResult.ingredients.map((ing, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {ing}
                        </span>
                      ))}
                    </div>
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
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Confirmar
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Editar
                  </Button>
                </div>
              </motion.div>
            )}
          </CardContent>
        </PremiumCard>

        {/* Manual Registration Card */}
        <PremiumCard delay={0.1}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center">
                <Salad className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-base">Registro manual</CardTitle>
                <CardDescription className="text-xs">Descreva o que você comeu</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Tipo de refeição</label>
                <select
                  className="w-full rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
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
                <label className="text-xs font-medium text-muted-foreground">O que você comeu?</label>
                <Textarea
                  rows={3}
                  placeholder="Ex: 150g de frango grelhado, 1 xícara de arroz integral, salada verde"
                  className="rounded-xl border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 resize-none"
                  {...form.register("description")}
                />
                {form.formState.errors.description && (
                  <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                  <span>Calorias (opcional)</span>
                  <button
                    type="button"
                    className="text-xs text-primary flex items-center gap-1 hover:underline"
                    onClick={() => {
                      toast({
                        title: "Perguntar para Vita",
                        description: "Integração com IA para estimar calorias será conectada em breve.",
                      });
                    }}
                  >
                    <MessageCircle className="h-3 w-3" />
                    Perguntar para Vita
                  </button>
                </label>
                <Input 
                  type="number" 
                  step="1" 
                  min="0" 
                  placeholder="Ex: 520" 
                  className="rounded-xl border-border/50"
                  {...form.register("calories")} 
                />
              </div>

              <Button type="submit" className="w-full rounded-xl">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Salvar refeição
              </Button>
            </form>
          </CardContent>
        </PremiumCard>
      </div>

      {/* History Section */}
      <section className="space-y-4">
        <SectionHeader title="Histórico recente" />
        
        {loadingHistory ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : meals.length === 0 ? (
          <PremiumCard>
            <CardContent className="py-8 text-center">
              <Salad className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma refeição registrada ainda.</p>
            </CardContent>
          </PremiumCard>
        ) : (
          <motion.div className="space-y-4" variants={containerVariants}>
            {Object.entries(groupedMeals).map(([dateLabel, items], groupIndex) => {
              const totalDay = items.reduce((acc, meal) => acc + (meal.calories ?? 0), 0);
              return (
                <motion.div 
                  key={dateLabel} 
                  className="space-y-2"
                  variants={itemVariants}
                  custom={groupIndex}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{dateLabel}</span>
                    {totalDay > 0 && (
                      <span className="text-muted-foreground px-2 py-0.5 rounded-full bg-muted/50">
                        {totalDay.toFixed(0)} kcal
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {items.map((meal) => (
                      <motion.div
                        key={meal.id}
                        whileHover={{ scale: 1.01 }}
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30 hover:border-primary/20 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                            {format(new Date(meal.datetime), "HH:mm")}
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium line-clamp-1">{meal.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {mealTypeLabels[meal.type] || meal.type}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {meal.calories ? (
                            <p className="text-sm font-semibold">{meal.calories.toFixed(0)} <span className="text-xs font-normal text-muted-foreground">kcal</span></p>
                          ) : (
                            <p className="text-xs text-muted-foreground">-- kcal</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </section>
    </motion.div>
  );
};

// Macro Pill Component
const MacroPill = ({ label, value, unit, color }: { label: string; value?: number; unit: string; color: string }) => (
  <div className={cn("text-center p-2 rounded-lg", color)}>
    <p className="text-[10px] font-medium opacity-70">{label}</p>
    <p className="text-sm font-bold">{value ?? "--"}{unit}</p>
  </div>
);

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
  const [logs, setLogs] = useState<{ id: string; date: string; weight_kg: number; fasting: boolean }[]>([]);

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

  const currentWeight = logs.length > 0 ? logs[logs.length - 1].weight_kg : null;

  return (
    <motion.div 
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {/* Current Weight Card */}
        <PremiumCard className="md:col-span-1">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <div className="h-14 w-14 mx-auto rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                <Scale className="h-7 w-7 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-3">Peso atual</p>
              <p className="text-3xl font-bold">{currentWeight?.toFixed(1) ?? "--"} <span className="text-lg font-normal text-muted-foreground">kg</span></p>
              {diffFromLast !== null && (
                <div className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                  diffFromLast < 0 ? "bg-emerald-500/10 text-emerald-600" : 
                  diffFromLast > 0 ? "bg-rose-500/10 text-rose-600" : 
                  "bg-muted text-muted-foreground"
                )}>
                  <TrendingUp className={cn("h-3 w-3", diffFromLast < 0 && "rotate-180")} />
                  {diffFromLast < 0 ? "" : "+"}{diffFromLast.toFixed(1)} kg
                </div>
              )}
            </div>
          </CardContent>
        </PremiumCard>

        {/* Register Weight Card */}
        <PremiumCard className="md:col-span-2" delay={0.1}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                <Scale className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-base">Registrar peso</CardTitle>
                <CardDescription className="text-xs">Use medidas consistentes, de preferência em jejum</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Peso (kg)</label>
                  <Input 
                    type="number" 
                    step="0.1" 
                    placeholder="Ex: 72.4" 
                    className="rounded-xl border-border/50"
                    {...form.register("weight")} 
                  />
                  {form.formState.errors.weight && (
                    <p className="text-xs text-destructive">{form.formState.errors.weight.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Data</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal rounded-xl border-border/50 bg-background/50 hover:bg-muted/50",
                          !form.watch("date") && "text-muted-foreground"
                        )}
                      >
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mr-3">
                          <CalendarIcon className="h-4 w-4 text-blue-500" />
                        </div>
                        {form.watch("date") 
                          ? format(new Date(form.watch("date") + "T12:00:00"), "dd 'de' MMM, yyyy", { locale: ptBR }) 
                          : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-card/95 backdrop-blur-xl border-border/50" align="start">
                      <Calendar
                        mode="single"
                        selected={form.watch("date") ? new Date(form.watch("date") + "T12:00:00") : undefined}
                        onSelect={(date) => date && form.setValue("date", format(date, "yyyy-MM-dd"))}
                        disabled={(date) => date > new Date()}
                        initialFocus
                        locale={ptBR}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <motion.div
                onClick={() => form.setValue("fasting", !form.watch("fasting"))}
                className={cn(
                  "relative overflow-hidden cursor-pointer rounded-2xl border-2 p-4 transition-all duration-300",
                  form.watch("fasting") 
                    ? "border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-orange-500/10" 
                    : "border-border/30 bg-muted/20 hover:bg-muted/40"
                )}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300",
                      form.watch("fasting") 
                        ? "bg-gradient-to-br from-amber-500/30 to-orange-500/30" 
                        : "bg-muted/50"
                    )}>
                      <Clock className={cn(
                        "h-5 w-5 transition-colors duration-300",
                        form.watch("fasting") ? "text-amber-500" : "text-muted-foreground"
                      )} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Medição em jejum</p>
                      <p className="text-xs text-muted-foreground">Mais preciso para acompanhamento</p>
                    </div>
                  </div>
                  <Switch 
                    checked={form.watch("fasting")} 
                    onCheckedChange={(checked) => form.setValue("fasting", checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {form.watch("fasting") && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 text-xs text-amber-600 dark:text-amber-400 pl-[52px]"
                  >
                    ✨ Ótima escolha! Medições em jejum são mais consistentes.
                  </motion.p>
                )}
              </motion.div>
              
              <Button type="submit" className="w-full sm:w-auto rounded-xl">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Salvar peso
              </Button>
            </form>
          </CardContent>
        </PremiumCard>
      </div>

      {/* Chart Section */}
      <section className="space-y-4">
        <SectionHeader 
          title="Evolução nos últimos 30 dias"
          action={
            diffFromLast !== null && (
              <span className={cn(
                "text-xs font-medium px-2 py-1 rounded-full",
                diffFromLast < 0 ? "bg-emerald-500/10 text-emerald-600" : 
                diffFromLast > 0 ? "bg-rose-500/10 text-rose-600" : 
                "bg-muted text-muted-foreground"
              )}>
                {diffFromLast < 0 ? "" : "+"}{diffFromLast.toFixed(1)} kg desde última medição
              </span>
            )
          }
        />
        
        <PremiumCard>
          <CardContent className="pt-6">
            {loading ? (
              <Skeleton className="h-52 w-full rounded-xl" />
            ) : chartData.length === 0 ? (
              <div className="h-52 flex items-center justify-center">
                <div className="text-center">
                  <Scale className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum registro de peso ainda.</p>
                </div>
              </div>
            ) : (
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} domain={["dataMin - 1", "dataMax + 1"]} className="text-muted-foreground" />
                    <ReTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const item = payload[0];
                        return (
                          <div className="rounded-xl border bg-background/95 backdrop-blur-sm px-3 py-2 shadow-lg">
                            <p className="text-xs text-muted-foreground">{item.payload.dateLabel}</p>
                            <p className="text-sm font-bold">{Number(item.value ?? 0).toFixed(1)} kg</p>
                          </div>
                        );
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2} 
                      fill="url(#weightGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </PremiumCard>
      </section>
    </motion.div>
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
  const progress = Math.min((ml / metaMl) * 100, 100);

  return (
    <motion.div 
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {/* Progress Card */}
        <PremiumCard>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="relative h-32 w-32 mx-auto">
                <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="hsl(var(--muted))"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="hsl(var(--primary))"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${progress * 2.83} 283`}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Droplets className="h-6 w-6 text-cyan-500 mb-1" />
                  <span className="text-2xl font-bold">{ml}</span>
                  <span className="text-xs text-muted-foreground">/ {metaMl} ml</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium">{progress.toFixed(0)}% da meta diária</p>
                <p className="text-xs text-muted-foreground">
                  {metaMl - ml > 0 ? `Faltam ${metaMl - ml} ml` : "Meta atingida! 🎉"}
                </p>
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        {/* Controls Card */}
        <PremiumCard delay={0.1}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                <Droplets className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <CardTitle className="text-base">Ingestão de água</CardTitle>
                <CardDescription className="text-xs">Cada copo representa 250ml</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-20 w-full rounded-xl" />
            ) : (
              <>
                <div className="flex flex-wrap gap-2 justify-center">
                  {Array.from({ length: 8 }).map((_, idx) => {
                    const isFilled = idx < filledCups;
                    return (
                      <motion.button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const next = idx + 1 === filledCups ? idx * 250 : (idx + 1) * 250;
                          persistWater(next);
                        }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300",
                          isFilled
                            ? "bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30"
                            : "bg-muted/50 border border-border/50 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Droplets className="h-5 w-5" />
                      </motion.button>
                    );
                  })}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => persistWater(ml + 250)}
                    className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                  >
                    <Droplets className="h-4 w-4 mr-2" />
                    +250ml
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => persistWater(Math.max(0, ml - 250))}
                    className="rounded-xl"
                  >
                    -250ml
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </PremiumCard>
      </div>

      {/* Tips Card */}
      <PremiumCard delay={0.2}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Dicas da Vita para hidratação</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Beba um copo de água ao acordar</li>
                <li>• Mantenha uma garrafa sempre por perto</li>
                <li>• Aumente a ingestão em dias de treino</li>
                <li>• Frutas e vegetais também contribuem</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </PremiumCard>
    </motion.div>
  );
};

const SonoTab = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<{ id: string; date: string; sleep_time: string; wake_time: string; quality_score: number }[]>([]);
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
          quality: log.quality_score,
        };
      }),
    [logs],
  );

  const tagOptions = [
    { id: "acordei_cansado", label: "Acordei cansado", icon: "😴" },
    { id: "sonho_ruim", label: "Sonho ruim", icon: "😰" },
    { id: "insonia", label: "Insônia", icon: "🌙" },
    { id: "descansei_bem", label: "Descansei bem", icon: "😌" },
  ];

  // Calculate stats
  const avgHours = chartData.length > 0 
    ? chartData.reduce((acc, d) => acc + d.hours, 0) / chartData.length 
    : null;
  const avgQuality = chartData.length > 0 
    ? chartData.reduce((acc, d) => acc + d.quality, 0) / chartData.length 
    : null;
  const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;
  const lastHours = lastLog 
    ? (new Date(lastLog.wake_time).getTime() - new Date(lastLog.sleep_time).getTime()) / (1000 * 60 * 60)
    : null;

  return (
    <motion.div 
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Stats Cards Row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {/* Last Night Card */}
        <PremiumCard className="col-span-1">
          <CardContent className="pt-5 pb-4">
            <div className="text-center space-y-1.5">
              <div className="h-11 w-11 mx-auto rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                <Moon className="h-5 w-5 text-indigo-500" />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">Última noite</p>
              <p className="text-xl sm:text-2xl font-bold">{lastHours?.toFixed(1) ?? "--"}<span className="text-sm font-normal text-muted-foreground">h</span></p>
            </div>
          </CardContent>
        </PremiumCard>

        {/* Quality Card */}
        <PremiumCard className="col-span-1" delay={0.05}>
          <CardContent className="pt-5 pb-4">
            <div className="text-center space-y-1.5">
              <div className="h-11 w-11 mx-auto rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-purple-500" />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">Qualidade</p>
              <p className="text-xl sm:text-2xl font-bold">{lastLog?.quality_score ?? "--"}<span className="text-sm font-normal text-muted-foreground">/10</span></p>
            </div>
          </CardContent>
        </PremiumCard>

        {/* Avg Hours Card */}
        <PremiumCard className="col-span-1" delay={0.1}>
          <CardContent className="pt-5 pb-4">
            <div className="text-center space-y-1.5">
              <div className="h-11 w-11 mx-auto rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">Média 7d</p>
              <p className="text-xl sm:text-2xl font-bold">{avgHours?.toFixed(1) ?? "--"}<span className="text-sm font-normal text-muted-foreground">h</span></p>
            </div>
          </CardContent>
        </PremiumCard>

        {/* Avg Quality Card */}
        <PremiumCard className="col-span-1" delay={0.15}>
          <CardContent className="pt-5 pb-4">
            <div className="text-center space-y-1.5">
              <div className="h-11 w-11 mx-auto rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                <Brain className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">Bem-estar</p>
              <div className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1",
                avgQuality && avgQuality >= 7 ? "bg-emerald-500/10 text-emerald-600" : 
                avgQuality && avgQuality >= 5 ? "bg-amber-500/10 text-amber-600" : 
                avgQuality ? "bg-rose-500/10 text-rose-600" : "bg-muted text-muted-foreground"
              )}>
                {avgQuality ? (avgQuality >= 7 ? "Ótimo" : avgQuality >= 5 ? "Regular" : "Baixo") : "--"}
              </div>
            </div>
          </CardContent>
        </PremiumCard>
      </div>

      {/* Main Form Card */}
      <PremiumCard delay={0.2}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
              <Moon className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <CardTitle className="text-base">Registrar sono</CardTitle>
              <CardDescription className="text-xs">A qualidade do sono influencia diretamente seus resultados</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Date Picker */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Data</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal rounded-xl border-border/50 bg-background/50 hover:bg-muted/50",
                    !date && "text-muted-foreground"
                  )}
                >
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mr-3">
                    <CalendarIcon className="h-4 w-4 text-indigo-500" />
                  </div>
                  {date 
                    ? format(new Date(date + "T12:00:00"), "dd 'de' MMM, yyyy", { locale: ptBR }) 
                    : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card/95 backdrop-blur-xl border-border/50" align="start">
                <Calendar
                  mode="single"
                  selected={date ? new Date(date + "T12:00:00") : undefined}
                  onSelect={(d) => d && setDate(format(d, "yyyy-MM-dd"))}
                  disabled={(d) => d > new Date()}
                  initialFocus
                  locale={ptBR}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Inputs with Premium Styling */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div
              className="relative overflow-hidden rounded-2xl border-2 p-4 transition-all duration-300 border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-purple-500/5"
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center">
                  <Moon className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-xs font-medium">Dormiu às</p>
                  <p className="text-[10px] text-muted-foreground">Início do sono</p>
                </div>
              </div>
              <Input 
                type="time" 
                value={sleepTime} 
                onChange={(e) => setSleepTime(e.target.value)}
                className="rounded-xl border-indigo-500/20 bg-indigo-500/5 text-center text-lg font-semibold focus:border-indigo-500/50"
              />
            </motion.div>

            <motion.div
              className="relative overflow-hidden rounded-2xl border-2 p-4 transition-all duration-300 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5"
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-medium">Acordou às</p>
                  <p className="text-[10px] text-muted-foreground">Fim do sono</p>
                </div>
              </div>
              <Input 
                type="time" 
                value={wakeTime} 
                onChange={(e) => setWakeTime(e.target.value)}
                className="rounded-xl border-amber-500/20 bg-amber-500/5 text-center text-lg font-semibold focus:border-amber-500/50"
              />
            </motion.div>
          </div>

          {/* Total Hours Display */}
          <motion.div 
            className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-xs text-muted-foreground mb-1">Total de sono</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                {hours.toFixed(1)}
              </span>
              <span className="text-lg text-muted-foreground">horas</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {hours >= 7 && hours <= 9 ? "✨ Dentro do ideal!" : hours < 7 ? "💤 Tente dormir mais" : "😴 Sono excessivo"}
            </p>
          </motion.div>

          {/* Quality Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Qualidade do sono</label>
              <motion.span 
                key={quality}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className={cn(
                  "text-lg font-bold px-3 py-1 rounded-full",
                  quality >= 8 ? "text-emerald-600 bg-emerald-500/10" :
                  quality >= 5 ? "text-amber-600 bg-amber-500/10" :
                  "text-rose-600 bg-rose-500/10"
                )}
              >
                {quality}/10
              </motion.span>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
                <span className="text-[10px] text-muted-foreground">Péssimo</span>
                <span className="text-[10px] text-muted-foreground">Excelente</span>
              </div>
              <Slider
                min={0}
                max={10}
                step={1}
                value={[quality]}
                onValueChange={(value: number[]) => setQuality(value[0] ?? 0)}
                className="py-6"
              />
            </div>
          </div>

          {/* Tags Section */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Como você se sentiu ao acordar?</p>
            <div className="flex flex-wrap gap-2">
              {tagOptions.map((tag) => {
                const active = selectedTags.includes(tag.id);
                return (
                  <motion.button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      setSelectedTags((prev) =>
                        prev.includes(tag.id) ? prev.filter((t) => t !== tag.id) : [...prev, tag.id],
                      );
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "px-3 py-2 rounded-xl border text-xs flex items-center gap-2 transition-all duration-300",
                      active 
                        ? "bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                        : "bg-muted/30 border-border/30 text-muted-foreground hover:bg-muted/50 hover:border-border/50"
                    )}
                  >
                    <span className="text-base">{tag.icon}</span>
                    {tag.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Save Button */}
          <Button 
            onClick={saveSleep} 
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg shadow-indigo-500/25"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Salvar registro de sono
          </Button>
        </CardContent>
      </PremiumCard>

      {/* Chart Section */}
      <section className="space-y-4">
        <SectionHeader 
          title="Padrão da última semana"
          action={
            avgHours !== null && (
              <span className={cn(
                "text-xs font-medium px-2 py-1 rounded-full",
                avgHours >= 7 ? "bg-emerald-500/10 text-emerald-600" : 
                avgHours >= 6 ? "bg-amber-500/10 text-amber-600" : 
                "bg-rose-500/10 text-rose-600"
              )}>
                Média: {avgHours.toFixed(1)}h por noite
              </span>
            )
          }
        />
        
        <PremiumCard delay={0.3}>
          <CardContent className="pt-6">
            {loading ? (
              <Skeleton className="h-52 w-full rounded-xl" />
            ) : chartData.length === 0 ? (
              <div className="h-52 flex items-center justify-center">
                <div className="text-center">
                  <Moon className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum registro de sono ainda.</p>
                  <p className="text-xs text-muted-foreground mt-1">Comece registrando sua primeira noite acima.</p>
                </div>
              </div>
            ) : (
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(240, 60%, 60%)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(240, 60%, 60%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 12]} className="text-muted-foreground" />
                    <ReTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const item = payload[0];
                        return (
                          <div className="rounded-xl border bg-background/95 backdrop-blur-sm px-3 py-2 shadow-lg">
                            <p className="text-xs text-muted-foreground">{item.payload.dateLabel}</p>
                            <p className="text-sm font-bold">{Number(item.value ?? 0).toFixed(1)}h de sono</p>
                            <p className="text-xs text-muted-foreground">Qualidade: {item.payload.quality}/10</p>
                          </div>
                        );
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="hours" 
                      stroke="hsl(240, 60%, 60%)" 
                      strokeWidth={2.5} 
                      fill="url(#sleepGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </PremiumCard>
      </section>

      {/* Vita Tips Card */}
      <PremiumCard delay={0.4}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Dicas da Vita para melhorar seu sono</p>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  Mantenha horários consistentes de dormir e acordar
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  Evite telas 1h antes de dormir
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />
                  Ambiente escuro e fresco favorece o sono profundo
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Exercícios regulares melhoram a qualidade do sono
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </PremiumCard>
    </motion.div>
  );
};

const EstresseTab = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const [level, setLevel] = useState(3);
  const [emoji, setEmoji] = useState("😊");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<{ id: string; datetime: string; level: number; emoji: string | null; notes: string | null }[]>([]);

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
    { symbol: "😊", label: "Bem", color: "from-emerald-500/20 to-green-500/20" },
    { symbol: "😐", label: "Neutro", color: "from-gray-500/20 to-slate-500/20" },
    { symbol: "😟", label: "Preocupado", color: "from-amber-500/20 to-yellow-500/20" },
    { symbol: "😰", label: "Ansioso", color: "from-orange-500/20 to-red-500/20" },
    { symbol: "😫", label: "Exausto", color: "from-rose-500/20 to-red-500/20" },
  ];

  const getLevelColor = (lvl: number) => {
    if (lvl <= 3) return "text-emerald-500";
    if (lvl <= 6) return "text-amber-500";
    return "text-rose-500";
  };

  return (
    <motion.div 
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <PremiumCard>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-rose-500/20 flex items-center justify-center">
              <Brain className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-base">Registro de estresse</CardTitle>
              <CardDescription className="text-xs">Entenda seus gatilhos e momentos de maior carga emocional</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Como você se sente agora?</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {emojis.map((e) => (
                <motion.button
                  key={e.symbol}
                  type="button"
                  onClick={() => setEmoji(e.symbol)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "h-14 w-14 rounded-xl flex flex-col items-center justify-center border-2 transition-all duration-300",
                    emoji === e.symbol 
                      ? `bg-gradient-to-br ${e.color} border-primary shadow-lg` 
                      : "bg-muted/30 border-transparent hover:bg-muted/50"
                  )}
                >
                  <span className="text-2xl">{e.symbol}</span>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Nível de estresse</span>
              <span className={cn("text-lg font-bold", getLevelColor(level))}>{level}/10</span>
            </label>
            <Slider min={0} max={10} step={1} value={[level]} onValueChange={([val]) => setLevel(val)} className="py-2" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">O que te estressou? (opcional)</label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: reunião longa, trânsito, pouco sono..."
              className="rounded-xl border-border/50 resize-none"
            />
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border/30 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium">Sugestões da Vita</p>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 ml-6">
              <li>• Respiração 4-7-8 por 3 minutos</li>
              <li>• Meditação guiada curta (5-10 minutos)</li>
              <li>• Caminhada leve de 10 minutos ao ar livre</li>
            </ul>
          </div>

          <Button onClick={saveStress} className="w-full rounded-xl">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Salvar registro de estresse
          </Button>
        </CardContent>
      </PremiumCard>

      {/* History Section */}
      <section className="space-y-4">
        <SectionHeader title="Histórico recente" />
        <PremiumCard>
          <CardContent className="pt-4 max-h-64 overflow-y-auto">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="py-8 text-center">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log, idx) => (
                  <motion.div 
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-start justify-between p-3 rounded-xl bg-muted/20 border border-border/20"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{log.emoji || "😐"}</span>
                      <div>
                        <p className="text-xs font-medium">
                          {format(new Date(log.datetime), "dd/MM HH:mm", { locale: ptBR })}
                        </p>
                        {log.notes && <p className="text-xs text-muted-foreground line-clamp-1">{log.notes}</p>}
                      </div>
                    </div>
                    <span className={cn("text-sm font-bold", getLevelColor(log.level))}>
                      {log.level}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </PremiumCard>
      </section>
    </motion.div>
  );
};

const TreinoTab = ({ userId }: { userId: string }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [intensity, setIntensity] = useState(7);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<{ id: string; date: string; completed: boolean; intensity: number | null }[]>([]);

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

  const completedCount = logs.filter(l => l.completed).length;

  return (
    <motion.div 
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="grid gap-3 sm:grid-cols-3">
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/treinos")}
          className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 text-left hover:shadow-lg hover:shadow-primary/10 transition-all"
        >
          <Dumbbell className="h-6 w-6 text-primary mb-2" />
          <p className="text-sm font-medium">Biblioteca de treinos</p>
          <p className="text-xs text-muted-foreground">Escolha um treino pronto</p>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => toast({
            title: "Em breve",
            description: "Construtor de treinos personalizados.",
          })}
          className="p-4 rounded-xl bg-muted/30 border border-border/30 text-left hover:bg-muted/50 transition-all"
        >
          <Target className="h-6 w-6 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Criar treino</p>
          <p className="text-xs text-muted-foreground">Monte seu próprio treino</p>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/vita-nutri")}
          className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 text-left hover:shadow-lg hover:shadow-violet-500/10 transition-all"
        >
          <Sparkles className="h-6 w-6 text-violet-500 mb-2" />
          <p className="text-sm font-medium">Pedir sugestão</p>
          <p className="text-xs text-muted-foreground">Pergunte para a Vita</p>
        </motion.button>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Today's Workout Card */}
        <PremiumCard>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Treino de hoje</CardTitle>
                <CardDescription className="text-xs">Marque como concluído para acompanhar</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/30 cursor-pointer hover:bg-muted/50 transition-colors">
              <Checkbox 
                checked={completed} 
                onCheckedChange={(checked) => setCompleted(Boolean(checked))} 
                className="h-5 w-5"
              />
              <div className="flex-1">
                <span className="text-sm font-medium">Marcar treino como concluído</span>
                <p className="text-xs text-muted-foreground">Treino do dia {format(new Date(), "dd/MM")}</p>
              </div>
              {completed && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            </label>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Intensidade percebida</span>
                <span className="text-lg font-bold text-primary">{intensity}/10</span>
              </label>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[intensity]}
                onValueChange={([val]) => setIntensity(val)}
                className="py-2"
              />
            </div>
            
            <Button onClick={saveWorkout} className="w-full rounded-xl">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Salvar treino
            </Button>
          </CardContent>
        </PremiumCard>

        {/* Stats Card */}
        <PremiumCard delay={0.1}>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Flame className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Treinos nos últimos 14 dias</p>
                <p className="text-4xl font-bold">{completedCount}</p>
              </div>
              <div className="flex justify-center gap-1">
                {logs.slice(0, 7).map((log, i) => (
                  <div
                    key={log.id}
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-medium",
                      log.completed 
                        ? "bg-primary/20 text-primary" 
                        : "bg-muted/30 text-muted-foreground"
                    )}
                  >
                    {format(new Date(log.date), "dd")}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Dica: Mantenha consistência com 3-5 treinos por semana
              </p>
            </div>
          </CardContent>
        </PremiumCard>
      </div>

      {/* History Section */}
      <section className="space-y-4">
        <SectionHeader title="Últimos treinos" />
        <PremiumCard>
          <CardContent className="pt-4 max-h-64 overflow-y-auto">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="py-8 text-center">
                <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum treino registrado ainda.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log, idx) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center",
                        log.completed ? "bg-emerald-500/20" : "bg-muted/50"
                      )}>
                        <Dumbbell className={cn("h-4 w-4", log.completed ? "text-emerald-500" : "text-muted-foreground")} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{format(new Date(log.date), "EEEE, dd/MM", { locale: ptBR })}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.completed ? "Concluído" : "Pendente"}
                          {log.intensity && ` • Intensidade ${log.intensity}`}
                        </p>
                      </div>
                    </div>
                    {log.completed && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </PremiumCard>
      </section>
    </motion.div>
  );
};

export default Track;
