import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthenticatedLayout } from "@/components/layouts/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, CreditCard, TrendingUp, Activity, MessageSquare, Utensils, Dumbbell, AlertTriangle, LayoutDashboard, UserCog, Shield } from "lucide-react";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { UserManagement } from "@/components/admin/UserManagement";
import { AuditLogs } from "@/components/admin/AuditLogs";

interface DashboardStats {
  totalUsers: number;
  premiumUsers: number;
  freeUsers: number;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  totalMeals: number;
  totalWorkouts: number;
  totalMessages: number;
  avgMealsPerUser: number;
  avgWorkoutsPerUser: number;
}

interface UserGrowthData {
  date: string;
  users: number;
}

interface RecentUser {
  id: string;
  full_name: string;
  plan_type: string;
  created_at: string;
  onboarding_completed: boolean;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    premiumUsers: 0,
    freeUsers: 0,
    newUsersLast7Days: 0,
    newUsersLast30Days: 0,
    totalMeals: 0,
    totalWorkouts: 0,
    totalMessages: 0,
    avgMealsPerUser: 0,
    avgWorkoutsPerUser: 0,
  });
  const [growthData, setGrowthData] = useState<UserGrowthData[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [adminHealth, setAdminHealth] = useState<{
    hasAdminRole: boolean;
    isPremiumPlan: boolean;
  } | null>(null);
  const [fixingAdmin, setFixingAdmin] = useState(false);

  useEffect(() => {
    let active = true;

    const checkAdmin = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session) {
        navigate("/auth");
        return;
      }

      const email = session.user.email?.toLowerCase() ?? null;
      setCurrentUserId(session.user.id);

      // Conta master admin tem acesso garantido ao painel, independente de roles
      if (email === "admin@dev.local") {
        if (!active) return;
        setIsAdmin(true);
        setChecking(false);
        return;
      }

      const { data: rolesData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (!active) return;

      if (error) {
        console.error("Erro ao carregar roles do usuário:", error);
        navigate("/dashboard");
        return;
      }

      const isAdminRole = rolesData?.some((role) => role.role === "admin") ?? false;

      if (!isAdminRole) {
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      setChecking(false);
    };

    checkAdmin();

    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (!isAdmin || !currentUserId) return;

    const loadDashboardData = async () => {
      try {
        // Total de usuários
        const { count: totalUsers } = await supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true });

        // Usuários premium e free
        const { count: premiumUsers } = await supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true })
          .eq("plan_type", "premium");

        const { count: freeUsers } = await supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true })
          .eq("plan_type", "free");

        // Novos usuários últimos 7 dias
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { count: newUsersLast7Days } = await supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", sevenDaysAgo.toISOString());

        // Novos usuários últimos 30 dias
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { count: newUsersLast30Days } = await supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", thirtyDaysAgo.toISOString());

        // Total de refeições
        const { count: totalMeals } = await supabase
          .from("meals")
          .select("*", { count: "exact", head: true });

        // Total de treinos
        const { count: totalWorkouts } = await supabase
          .from("workout_logs")
          .select("*", { count: "exact", head: true });

        // Total de mensagens
        const { count: totalMessages } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true });

        // Dados de crescimento (últimos 30 dias)
        const { data: profilesData } = await supabase
          .from("user_profiles")
          .select("created_at")
          .gte("created_at", thirtyDaysAgo.toISOString())
          .order("created_at");

        // Agrupar por dia
        const growthMap = new Map<string, number>();
        profilesData?.forEach((profile) => {
          const date = new Date(profile.created_at).toLocaleDateString("pt-BR");
          growthMap.set(date, (growthMap.get(date) || 0) + 1);
        });

        const growthArray: UserGrowthData[] = Array.from(growthMap.entries()).map(([date, users]) => ({
          date,
          users,
        }));

        // Usuários recentes
        const { data: recentUsersData } = await supabase
          .from("user_profiles")
          .select("id, full_name, plan_type, created_at, onboarding_completed")
          .order("created_at", { ascending: false })
          .limit(5);

        setStats({
          totalUsers: totalUsers || 0,
          premiumUsers: premiumUsers || 0,
          freeUsers: freeUsers || 0,
          newUsersLast7Days: newUsersLast7Days || 0,
          newUsersLast30Days: newUsersLast30Days || 0,
          totalMeals: totalMeals || 0,
          totalWorkouts: totalWorkouts || 0,
          totalMessages: totalMessages || 0,
          avgMealsPerUser: totalUsers ? Math.round((totalMeals || 0) / totalUsers) : 0,
          avgWorkoutsPerUser: totalUsers ? Math.round((totalWorkouts || 0) / totalUsers) : 0,
        });

        setGrowthData(growthArray);
        setRecentUsers(recentUsersData || []);
      } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    const loadAdminHealth = async () => {
      try {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("plan_type")
          .eq("user_id", currentUserId)
          .maybeSingle();

        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", currentUserId);

        setAdminHealth({
          isPremiumPlan: profile?.plan_type === "premium",
          hasAdminRole: rolesData?.some((r) => r.role === "admin") ?? false,
        });
      } catch (error) {
        console.error("Erro ao verificar consistência da conta admin:", error);
      }
    };

    loadDashboardData();
    loadAdminHealth();

    // Configurar realtime updates
    const channel = supabase
      .channel("admin-dashboard")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_profiles",
        },
        () => {
          loadDashboardData();
          loadAdminHealth();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, currentUserId]);

  const handleFixAdmin = async () => {
    setFixingAdmin(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-admin");
      
      if (error) throw error;

      toast.success("Conta admin corrigida com sucesso!");
      
      // Recarregar health check
      if (currentUserId) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("plan_type")
          .eq("user_id", currentUserId)
          .maybeSingle();

        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", currentUserId);

        setAdminHealth({
          isPremiumPlan: profile?.plan_type === "premium",
          hasAdminRole: rolesData?.some((r) => r.role === "admin") ?? false,
        });
      }
    } catch (error) {
      console.error("Erro ao corrigir conta admin:", error);
      toast.error("Erro ao corrigir conta admin. Verifique os logs.");
    } finally {
      setFixingAdmin(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const planData = [
    { name: "Premium", value: stats.premiumUsers, color: "#10b981" },
    { name: "Free", value: stats.freeUsers, color: "#6b7280" },
  ];

  return (
    <AuthenticatedLayout>
      <div className="flex-1 px-4 md:px-8 py-6 md:py-8 space-y-6 overflow-y-auto">
        {/* Header */}
        <div className="space-y-2">
          <Badge className="uppercase tracking-wide text-[10px] bg-primary/10 text-primary border border-primary/30">
            Painel interno
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold text-gradient">
            DietaFY Admin Dashboard
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
            Visão completa e em tempo real de todos os usuários, métricas de engajamento e crescimento da plataforma.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <UserCog className="h-4 w-4" />
              Gestão de Usuários
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <Shield className="h-4 w-4" />
              Auditoria
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">

        {adminHealth && (!adminHealth.hasAdminRole || !adminHealth.isPremiumPlan) && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="py-3 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-2 text-sm">
                <p className="font-medium text-destructive">
                  Atenção: conta admin inconsistente
                </p>
                <p className="text-muted-foreground text-xs">
                  A conta atual deveria ter plano <span className="font-semibold">premium</span> e
                  role <span className="font-semibold">admin</span> na tabela de permissões.
                </p>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleFixAdmin}
                  disabled={fixingAdmin}
                  className="mt-2"
                >
                  {fixingAdmin ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Corrigindo...
                    </>
                  ) : (
                    "Corrigir Automaticamente"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Cards de Métricas Principais */}
            <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    +{stats.newUsersLast7Days} nos últimos 7 dias
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Usuários Premium</CardTitle>
                  <CreditCard className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.premiumUsers}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.totalUsers > 0
                      ? Math.round((stats.premiumUsers / stats.totalUsers) * 100)
                      : 0}
                    % do total
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Crescimento (30d)</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+{stats.newUsersLast30Days}</div>
                  <p className="text-xs text-muted-foreground mt-1">novos usuários</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Engajamento</CardTitle>
                  <Activity className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalMessages}</div>
                  <p className="text-xs text-muted-foreground mt-1">mensagens enviadas</p>
                </CardContent>
              </Card>
            </div>

            {/* Métricas de Uso */}
            <div className="grid gap-4 md:gap-6 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Refeições Registradas</CardTitle>
                  <Utensils className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalMeals}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ~{stats.avgMealsPerUser} por usuário
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Treinos Realizados</CardTitle>
                  <Dumbbell className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalWorkouts}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ~{stats.avgWorkoutsPerUser} por usuário
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Mensagens com Vita</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalMessages}</div>
                  <p className="text-xs text-muted-foreground mt-1">conversas ativas</p>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos */}
            <div className="grid gap-4 md:gap-6 md:grid-cols-2">
              {/* Gráfico de Crescimento */}
              <Card>
                <CardHeader>
                  <CardTitle>Crescimento de Usuários (30 dias)</CardTitle>
                  <CardDescription>Novos cadastros por dia</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={growthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="users"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        name="Novos usuários"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Gráfico de Distribuição de Planos */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Planos</CardTitle>
                  <CardDescription>Premium vs Free</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={planData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {planData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Usuários Recentes */}
            <Card>
              <CardHeader>
                <CardTitle>Usuários Recentes</CardTitle>
                <CardDescription>Últimos 5 cadastros na plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(user.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={user.plan_type === "premium" ? "default" : "outline"}
                          className={user.plan_type === "premium" ? "bg-green-600" : ""}
                        >
                          {user.plan_type === "premium" ? "Premium" : "Free"}
                        </Badge>
                        {user.onboarding_completed && (
                          <Badge variant="outline" className="text-xs">
                            ✓ Onboarding
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogs />
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  );
}
