import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Home, UtensilsCrossed, Dumbbell, LineChart, User as UserIcon, Activity, Salad, Flame, Clock, Sparkles, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FitRecipe {
  id: string;
  title: string;
  subtitle: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTime: string;
  difficulty: "fácil" | "médio" | "avançado";
  goalTags: string[];
  mealType: "café da manhã" | "lanche" | "almoço" | "jantar" | "sobremesa";
  sugarFriendly?: boolean;
  servings: number;
  ingredients: string[];
  steps: string[];
}

const buildFitRecipes = (goals: string[] | null): FitRecipe[] => {
  const normalized = (goals || []).map((g) => g.toLowerCase());
  const wantsFatLoss = normalized.some((g) => g.includes("perda") || g.includes("gordura") || g.includes("emagrec"));
  const wantsMuscle = normalized.some((g) => g.includes("massa") || g.includes("hipertrofia") || g.includes("muscular"));
  const wantsSugarControl = normalized.some((g) => g.includes("açucar") || g.includes("acucar") || g.includes("glicose") || g.includes("diabetes"));

  const base: FitRecipe[] = [];

  // Perda de gordura
  if (wantsFatLoss) {
    base.push(
      {
        id: "overnight_proteico",
        title: "Overnight oats proteico com frutas vermelhas",
        subtitle: "Aveia, iogurte, whey (opcional) e frutas com alto poder de saciedade.",
        calories: 320,
        protein: 26,
        carbs: 35,
        fat: 8,
        prepTime: "10 min",
        difficulty: "fácil",
        goalTags: ["perda de gordura", "saciedade"],
        mealType: "café da manhã",
        sugarFriendly: true,
        servings: 1,
        ingredients: [
          "3 colheres de sopa de aveia em flocos",
          "150 ml de iogurte natural ou iogurte proteico",
          "1 scoop de whey protein (opcional)",
          "1 colher de sopa de chia ou linhaça",
          "1 punhado de frutas vermelhas frescas ou congeladas",
        ],
        steps: [
          "Misture em um pote a aveia, o iogurte, a chia e o whey (se for usar)",
          "Deixe na geladeira por pelo menos 4 horas (idealmente de um dia para o outro)",
          "Na hora de comer, finalize com as frutas vermelhas por cima",
        ],
      },
      {
        id: "bowl_frango_quinoa",
        title: "Bowl de frango, quinoa e legumes",
        subtitle: "Refeição completa com proteína magra, carbo de qualidade e fibras.",
        calories: 480,
        protein: 34,
        carbs: 42,
        fat: 14,
        prepTime: "20–25 min",
        difficulty: "médio",
        goalTags: ["perda de gordura", "equilíbrio"],
        mealType: "almoço",
        sugarFriendly: true,
        servings: 2,
        ingredients: [
          "200 g de peito de frango em cubos",
          "1 xícara de chá de quinoa cozida",
          "1 xícara de chá de brócolis em floretes",
          "1/2 xícara de chá de cenoura em rodelas finas",
          "Azeite, sal, pimenta e alho a gosto",
        ],
        steps: [
          "Tempere o frango com sal, pimenta, alho e um fio de azeite",
          "Grelhe o frango em fogo médio até dourar por completo",
          "Cozinhe a quinoa em água até ficar macia e solta",
          "Cozinhe rapidamente brócolis e cenoura no vapor ou em água fervente",
          "Monte o bowl com a quinoa na base, legumes por cima e finalize com o frango",
        ],
      },
      {
        id: "salmão_legumes",
        title: "Salmão ao forno com legumes",
        subtitle: "Jantar leve, rico em ômega-3 e vegetais coloridos.",
        calories: 430,
        protein: 30,
        carbs: 22,
        fat: 18,
        prepTime: "25–30 min",
        difficulty: "médio",
        goalTags: ["perda de gordura", "saúde metabólica"],
        mealType: "jantar",
        sugarFriendly: true,
        servings: 2,
        ingredients: [
          "2 filés de salmão (cerca de 120 g cada)",
          "1 xícara de chá de abobrinha em meia-lua",
          "1 xícara de chá de pimentão em tiras",
          "1 xícara de chá de tomate-cereja",
          "Azeite, limão, sal, pimenta e ervas a gosto",
        ],
        steps: [
          "Tempere o salmão com sal, pimenta, limão e ervas",
          "Disponha os legumes em uma assadeira, regue com azeite e tempere levemente",
          "Coloque o salmão por cima dos legumes e leve ao forno médio por cerca de 20 minutos",
        ],
      },
    );
  }

  // Ganho de massa muscular
  if (wantsMuscle) {
    base.push(
      {
        id: "panqueca_proteica",
        title: "Panqueca proteica de aveia com banana",
        subtitle: "Clássico do pós-treino, com proteína e carbo de qualidade.",
        calories: 420,
        protein: 28,
        carbs: 48,
        fat: 10,
        prepTime: "15 min",
        difficulty: "fácil",
        goalTags: ["ganho de massa", "hipertrofia"],
        mealType: "café da manhã",
        servings: 1,
        ingredients: [
          "1 banana madura amassada",
          "2 ovos inteiros",
          "3 colheres de sopa de aveia em flocos",
          "1 colher de chá de fermento químico",
          "Canela a gosto",
        ],
        steps: [
          "Misture todos os ingredientes em uma tigela até formar uma massa homogênea",
          "Despeje a massa em uma frigideira antiaderente levemente untada",
          "Cozinhe em fogo baixo dos dois lados até dourar",
        ],
      },
      {
        id: "massa_integral_frango",
        title: "Macarrão integral com frango e legumes",
        subtitle: "Prato reforçado para treinos intensos, com boa densidade calórica.",
        calories: 620,
        protein: 36,
        carbs: 70,
        fat: 16,
        prepTime: "25–30 min",
        difficulty: "médio",
        goalTags: ["ganho de massa"],
        mealType: "almoço",
        servings: 2,
        ingredients: [
          "200 g de macarrão integral",
          "200 g de peito de frango em tiras",
          "1 xícara de chá de brócolis em floretes",
          "1/2 xícara de chá de cenoura em tiras finas",
          "Molho de tomate simples, azeite, sal e pimenta a gosto",
        ],
        steps: [
          "Cozinhe o macarrão integral em água fervente até ficar al dente",
          "Grelhe o frango temperado em uma frigideira com um fio de azeite",
          "Salteie os legumes rapidamente na mesma frigideira",
          "Misture o macarrão cozido com o molho de tomate, o frango e os legumes",
        ],
      },
      {
        id: "burrito_bowl",
        title: "Burrito bowl de carne magra",
        subtitle: "Arroz integral, feijão, carne magra e guacamole controlado.",
        calories: 590,
        protein: 34,
        carbs: 60,
        fat: 18,
        prepTime: "25 min",
        difficulty: "médio",
        goalTags: ["ganho de massa", "energia"],
        mealType: "jantar",
        servings: 2,
        ingredients: [
          "200 g de carne moída magra",
          "1 xícara de chá de arroz integral cozido",
          "1/2 xícara de chá de feijão cozido",
          "1/2 avocado amassado",
          "Folhas de alface, tomate em cubos e cebola roxa a gosto",
        ],
        steps: [
          "Tempere e refogue a carne moída até dourar bem",
          "Monte o bowl com arroz, feijão, carne e salada por cima",
          "Finalize com o avocado amassado temperado com sal, limão e pimenta",
        ],
      },
    );
  }

  // Controle de açúcar/glicose
  if (wantsSugarControl) {
    base.push(
      {
        id: "iogurte_chia_nozes",
        title: "Iogurte natural com chia, nozes e morangos",
        subtitle: "Combo de proteína, gordura boa e fibras para glicose estável.",
        calories: 260,
        protein: 15,
        carbs: 18,
        fat: 12,
        prepTime: "5 min",
        difficulty: "fácil",
        goalTags: ["controle de açúcar", "saciedade"],
        mealType: "lanche",
        sugarFriendly: true,
        servings: 1,
        ingredients: [
          "150 ml de iogurte natural sem açúcar",
          "1 colher de sopa de chia",
          "1 colher de sopa de nozes picadas",
          "1/2 xícara de chá de morangos em pedaços",
        ],
        steps: [
          "Coloque o iogurte em um bowl",
          "Misture a chia e deixe hidratar por alguns minutos",
          "Finalize com as nozes e os morangos por cima",
        ],
      },
      {
        id: "bolo_caneca_low_carb",
        title: "Bolo de caneca low-carb sem açúcar",
        subtitle: "Feito com ovo, cacau, adoçante e farinha de amêndoas ou aveia.",
        calories: 210,
        protein: 12,
        carbs: 14,
        fat: 11,
        prepTime: "7 min",
        difficulty: "fácil",
        goalTags: ["controle de açúcar", "sobremesa inteligente"],
        mealType: "sobremesa",
        sugarFriendly: true,
        servings: 1,
        ingredients: [
          "1 ovo inteiro",
          "1 colher de sopa de cacau em pó 100%",
          "2 colheres de sopa de farinha de amêndoas ou aveia",
          "1 colher de sopa de adoçante culinário",
          "1 colher de café de fermento químico",
        ],
        steps: [
          "Misture todos os ingredientes em uma caneca grande",
          "Leve ao micro-ondas por cerca de 1 minuto e 30 segundos (ou até firmar)",
          "Ajuste o tempo conforme a potência do seu micro-ondas",
        ],
      },
      {
        id: "overnight_canela",
        title: "Overnight oats com canela (controle glicêmico)",
        subtitle:
          "Aveia, leite ou bebida vegetal, chia e canela para melhorar a resposta à glicose.",
        calories: 310,
        protein: 16,
        carbs: 32,
        fat: 9,
        prepTime: "10 min",
        difficulty: "fácil",
        goalTags: ["controle de açúcar", "equilíbrio"],
        mealType: "café da manhã",
        sugarFriendly: true,
        servings: 1,
        ingredients: [
          "3 colheres de sopa de aveia em flocos",
          "150 ml de leite ou bebida vegetal sem açúcar",
          "1 colher de sopa de chia",
          "1 colher de chá de canela em pó",
        ],
        steps: [
          "Misture a aveia, o líquido, a chia e a canela em um pote",
          "Deixe na geladeira por pelo menos 4 horas",
          "Na hora de consumir, ajuste a textura com um pouco mais de líquido se necessário",
        ],
      },
    );
  }

  if (!base.length) {
    base.push(
      {
        id: "wrap_frango_sal",
        title: "Wrap integral de frango com salada",
        subtitle: "Clássico, prático e equilibrado para qualquer objetivo.",
        calories: 380,
        protein: 26,
        carbs: 38,
        fat: 11,
        prepTime: "15 min",
        difficulty: "fácil",
        goalTags: ["equilíbrio"],
        mealType: "almoço",
        servings: 1,
        ingredients: [
          "1 pão folha ou tortilha integral",
          "100 g de peito de frango desfiado",
          "Folhas de alface e tomate em fatias",
          "1 colher de sopa de cream cheese light ou pasta de ricota",
        ],
        steps: [
          "Aqueça rapidamente o pão folha em uma frigideira seca",
          "Espalhe o cream cheese, adicione o frango e a salada",
          "Enrole formando um wrap firme e corte ao meio",
        ],
      },
      {
        id: "bowl_iogurte_frutas",
        title: "Bowl de iogurte, frutas e granola",
        subtitle: "Ótima opção para café da manhã ou lanche reforçado.",
        calories: 340,
        protein: 18,
        carbs: 42,
        fat: 9,
        prepTime: "8 min",
        difficulty: "fácil",
        goalTags: ["equilíbrio"],
        mealType: "café da manhã",
        servings: 1,
        ingredients: [
          "150 ml de iogurte natural ou iogurte grego light",
          "1/2 xícara de chá de frutas picadas (banana, maçã, mamão, etc.)",
          "2 colheres de sopa de granola ou mix de castanhas",
        ],
        steps: [
          "Coloque o iogurte em um bowl",
          "Adicione as frutas picadas por cima",
          "Finalize com granola ou castanhas para dar crocância",
        ],
      },
    );
  }

  return base;
};

const ReceitasFit = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [userGoals, setUserGoals] = useState<string[] | null>(null);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("todas");
  const [variationByRecipe, setVariationByRecipe] = useState<Record<string, string | null>>({});
  const [variationLoadingId, setVariationLoadingId] = useState<string | null>(null);
  const { toast } = useToast();
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
        console.error("Erro ao buscar objetivos do usuário (receitas):", error);
        setLoadingRecipes(false);
        return;
      }

      setUserGoals((data?.goals as string[]) || null);
      setLoadingRecipes(false);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session) {
        setUser(null);
        setUserGoals(null);
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadUserGoals(session.user.id);
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

  const allRecipes = useMemo(() => buildFitRecipes(userGoals), [userGoals]);

  const filteredRecipes = useMemo(() => {
    if (activeFilter === "todas") return allRecipes;
    return allRecipes.filter((r) =>
      r.goalTags.some((tag) => tag.toLowerCase().includes(activeFilter.toLowerCase())),
    );
  }, [allRecipes, activeFilter]);

  const handleAskVitaVariation = async (recipe: FitRecipe) => {
    if (!user) return;

    try {
      setVariationLoadingId(recipe.id);
      const goalsText = (userGoals || []).join(", ") || "objetivos gerais de saúde";
      const prompt =
        "Quero uma variação prática e saudável da seguinte receita, mantendo o espírito geral, " +
        "mas adaptando porções e ingredientes ao meu dia a dia. Considere também meus objetivos atuais do onboarding.\n\n" +
        `Receita base: ${recipe.title}\n` +
        `Porções sugeridas: ${recipe.servings}\n` +
        `Objetivos declarados: ${goalsText}.\n\n` +
        "Responda com uma sugestão de variação (lista de ingredientes simplificada e modo de preparo enxuto), " +
        "mantendo o foco em alimentação saudável e realista para rotina.";

      const { data, error } = await supabase.functions.invoke("vita-chat", {
        body: {
          session_id: null,
          message: prompt,
          image_url: null,
          voice_enabled: false,
          debug: false,
        },
      });

      if (error) {
        console.error("Erro ao chamar Vita Nutri para variação de receita:", error);
        toast({
          title: "Variação não gerada",
          description: "Tente de novo em instantes ou chame o Vita direto.",
        });
        return;
      }

      const replyText = data?.reply || "O Vita não conseguiu responder agora. Tente novamente em alguns instantes.";
      setVariationByRecipe((prev) => ({ ...prev, [recipe.id]: replyText }));
    } catch (e) {
      console.error(e);
      toast({
        title: "Erro ao falar com o Vita Nutri",
        description: "Houve um problema de conexão. Tente mais tarde.",
      });
    } finally {
      setVariationLoadingId(null);
    }
  };

  if (loadingAuth || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-10 w-40" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        {/* Sidebar - desktop */}
        <Sidebar collapsible="icon" className="hidden md:flex border-r">
          <SidebarContent>
            <SidebarHeader className="px-4 py-6">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  DF
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold tracking-tight">DietaFY</span>
                  <span className="text-xs text-muted-foreground">Receitas personalizadas</span>
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent className="px-2">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/dashboard"
                      className="flex items-center gap-2 text-sm"
                      activeClassName="bg-primary/10 text-primary font-semibold"
                    >
                      <Home className="h-4 w-4" />
                      <span>Dashboard</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                      <NavLink
                        to="/vita-nutri"
                        className="flex items-center gap-2 text-sm"
                        activeClassName="bg-primary/10 text-primary font-semibold"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>Falar com o Vita Nutri IA</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/dieta"
                      className="flex items-center gap-2 text-sm"
                      activeClassName="bg-primary/10 text-primary font-semibold"
                    >
                      <UtensilsCrossed className="h-4 w-4" />
                      <span>Dieta</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/receitas-fit"
                      className="flex items-center gap-2 text-sm"
                      activeClassName="bg-primary/10 text-primary font-semibold"
                    >
                      <Salad className="h-4 w-4" />
                      <span>Receitas Fit</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/treinos"
                      className="flex items-center gap-2 text-sm"
                      activeClassName="bg-primary/10 text-primary font-semibold"
                    >
                      <Dumbbell className="h-4 w-4" />
                      <span>Treinos</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/progresso"
                      className="flex items-center gap-2 text-sm"
                      activeClassName="bg-primary/10 text-primary font-semibold"
                    >
                      <LineChart className="h-4 w-4" />
                      <span>Progresso</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/track"
                      className="flex items-center gap-2 text-sm"
                      activeClassName="bg-primary/10 text-primary font-semibold"
                    >
                      <Activity className="h-4 w-4" />
                      <span>Registro diário</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/perfil"
                      className="flex items-center gap-2 text-sm"
                      activeClassName="bg-primary/10 text-primary font-semibold"
                    >
                      <UserIcon className="h-4 w-4" />
                      <span>Perfil</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="mt-auto px-4 pb-6">
              <Button className="w-full justify-between" variant="outline" onClick={() => navigate("/dashboard")}>
                <span>Voltar ao dashboard</span>
              </Button>
            </SidebarFooter>
          </SidebarContent>
        </Sidebar>

        {/* Main content */}
        <div className="flex-1 flex flex-col pb-16 md:pb-0">
          <header className="w-full border-b px-4 py-3 md:px-8 md:py-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Cozinha inteligente
              </p>
              <h1 className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight">
                Receitas fit personalizadas
              </h1>
              <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                Sugestões de receitas alinhadas com o objetivo que você escolheu no onboarding: perder gordura, ganhar massa ou controlar açúcar.
              </p>
            </div>
            <Card className="hidden sm:flex items-center gap-3 p-4 max-w-xs">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Liberado em todos os planos</p>
                <p className="text-sm leading-snug">
                  Use estas ideias como base e registre o que você realmente preparou para a Vita ajustar tudo ao seu dia a dia.
                </p>
              </div>
            </Card>
          </header>

          <main className="flex-1 px-4 py-3 md:px-8 md:py-4 space-y-6 overflow-y-auto">
            <section aria-label="Filtros de objetivo" className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-[0.16em]">
                  Filtrar por objetivo
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {[
                  { id: "todas", label: "Todas" },
                  { id: "perda de gordura", label: "Perda de gordura" },
                  { id: "ganho de massa", label: "Ganho de massa" },
                  { id: "controle de açúcar", label: "Controle de açúcar" },
                ].map((filter) => (
                  <Button
                    key={filter.id}
                    size="sm"
                    variant={activeFilter === filter.id ? "default" : "outline"}
                    className="rounded-full px-3 text-xs whitespace-nowrap"
                    onClick={() => setActiveFilter(filter.id)}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
              <div className="space-y-4">
                {loadingRecipes ? (
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
                  filteredRecipes.map((recipe) => (
                    <Card key={recipe.id} className="relative overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/80 via-emerald-500/80 to-sky-500/80" />
                      <CardHeader className="flex flex-row items-start justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[11px] font-normal flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {recipe.prepTime}
                            </Badge>
                            <Badge variant="secondary" className="text-[11px] font-normal capitalize">
                              {recipe.mealType}
                            </Badge>
                            {recipe.sugarFriendly && (
                              <Badge variant="outline" className="text-[11px] font-normal">
                                Sem açúcar refinado
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-base md:text-lg font-semibold leading-tight">
                            {recipe.title}
                          </CardTitle>
                          <CardDescription className="text-sm leading-snug">
                            {recipe.subtitle}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant="outline" className="text-[11px] font-medium capitalize">
                            {recipe.difficulty}
                          </Badge>
                          <Badge variant="secondary" className="text-[11px] font-medium flex items-center gap-1">
                            <Flame className="h-3 w-3 text-primary" />
                            {recipe.calories} kcal
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-3 border-t pt-3 md:flex-row md:items-start md:justify-between">
                        <div className="flex flex-1 flex-col gap-3">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <MacroPill label="Proteína" value={recipe.protein} suffix="g" emphasis />
                            <MacroPill label="Carbo" value={recipe.carbs} suffix="g" />
                            <MacroPill label="Gordura" value={recipe.fat} suffix="g" />
                            <MacroPill label="Porções" value={recipe.servings} />
                          </div>
                          <div className="grid gap-3 text-xs text-muted-foreground md:grid-cols-2">
                            <div className="space-y-1">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/80">
                                Ingredientes base
                              </p>
                              <ul className="list-disc pl-4 space-y-0.5">
                                {recipe.ingredients.map((item, index) => (
                                  <li key={index}>{item}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/80">
                                Modo de preparo
                              </p>
                              <ol className="list-decimal pl-4 space-y-0.5">
                                {recipe.steps.map((step, index) => (
                                  <li key={index}>{step}</li>
                                ))}
                              </ol>
                            </div>
                          </div>
                          {variationByRecipe[recipe.id] && (
                            <div className="mt-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 text-xs text-foreground">
                              <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                                <Sparkles className="h-3 w-3" />
                                Variação sugerida pela Vita Nutri IA
                              </div>
                              <p className="whitespace-pre-line leading-relaxed">{variationByRecipe[recipe.id]}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
                          <div className="flex flex-wrap justify-start gap-1 md:justify-end">
                            {recipe.goalTags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[10px] font-medium capitalize">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="mt-1 flex flex-col gap-2 md:mt-0 md:flex-row">
                            <Button
                              size="sm"
                              className="flex items-center gap-2"
                              variant="outline"
                              onClick={() => navigate("/track")}
                            >
                              Registrar refeição parecida
                              <ArrowRightIcon className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              className="flex items-center gap-2"
                              variant="ghost"
                              disabled={variationLoadingId === recipe.id}
                              onClick={() => handleAskVitaVariation(recipe)}
                            >
                              <MessageCircle className="h-3.5 w-3.5 text-primary" />
                              {variationLoadingId === recipe.id
                                ? "Gerando variação..."
                                : "Pedir variação à Vita"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              <aside className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Como usar estas receitas</CardTitle>
                    <CardDescription className="text-xs">
                      Elas são guias, não regras rígidas. Adapte ingredientes ao que você tem em casa.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs text-muted-foreground">
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Escolha 1–2 receitas para testar por semana.</li>
                      <li>Troque ingredientes por versões similares (ex.: frango por peixe).</li>
                      <li>Registre no app o que você realmente cozinhou.</li>
                      <li>Converse com a Vita Nutri para adaptar por horário e rotina.</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Equilíbrio primeiro, perfeição depois</CardTitle>
                    <CardDescription className="text-xs">
                      O objetivo é criar pratos que você realmente consiga repetir na semana.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs text-muted-foreground">
                    <p>
                      Sempre que possível, combine proteína magra, carboidrato de boa qualidade, gordura boa e muitos vegetais.
                    </p>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/dieta")}>
                      Ver plano alimentar do dia
                    </Button>
                  </CardContent>
                </Card>
              </aside>
            </section>
          </main>
        </div>
      </div>
    </SidebarProvider>
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
      className={
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] " +
        (emphasis ? "border-primary/60 bg-primary/5 text-primary" : "border-border/60 bg-muted/40")
      }
    >
      <span className="font-medium">{label}:</span>
      <span className="tabular-nums">
        {value}
        {suffix}
      </span>
    </span>
  );
};

const ArrowRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

export default ReceitasFit;
