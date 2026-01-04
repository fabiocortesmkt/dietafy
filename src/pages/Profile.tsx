import { useEffect, useMemo, useState, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUserRoles } from "@/hooks/useCurrentUserRoles";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NavLink } from "@/components/NavLink";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AuthenticatedLayout } from "@/components/layouts/AuthenticatedLayout";
import { Loader2, Home, UtensilsCrossed, Dumbbell, LineChart, User as UserIcon, Activity, MessageCircle, Shield } from "lucide-react";

interface UserProfile {
  full_name: string;
  avatar_url: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  goals: string[] | null;
  activity_level: string | null;
  training_preference: string[] | null;
  dietary_restrictions: string[] | null;
  dietary_other: string | null;
  notify_water: boolean;
  notify_workout: boolean;
}


const accountSchema = z.object({
  full_name: z.string().trim().min(3, "Informe seu nome completo"),
  email: z.string().trim().email("Email inválido"),
});

const passwordSchema = z
  .object({
    newPassword: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
    confirmPassword: z.string().min(8, "Confirme a nova senha"),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "As senhas não coincidem",
      });
    }
  });

const physicalSchema = z.object({
  height_cm: z
    .union([
      z.string().trim().length(0),
      z
        .string()
        .trim()
        .transform((val) => Number(val))
        .pipe(z.number().min(100, "Mínimo 100 cm").max(250, "Máximo 250 cm")),
    ])
    .optional(),
  weight_kg: z
    .union([
      z.string().trim().length(0),
      z
        .string()
        .trim()
        .transform((val) => Number(val))
        .pipe(z.number().min(30, "Mínimo 30 kg").max(300, "Máximo 300 kg")),
    ])
    .optional(),
  goals: z.array(z.string()).optional(),
  activity_level: z
    .union([
      z.literal(""),
      z.enum(["sedentario", "leve", "moderado", "intenso"]),
    ])
    .optional(),
  training_preference: z.array(z.string()).optional(),
});

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useCurrentUserRoles();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [activityLevel, setActivityLevel] = useState("");
  const [trainingPreference, setTrainingPreference] = useState<string[]>([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [dietaryOther, setDietaryOther] = useState("");
  const [notifyWater, setNotifyWater] = useState(false);
  const [notifyWorkout, setNotifyWorkout] = useState(false);


  useEffect(() => {
    let mounted = true;

    const loadProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select(
          "full_name, avatar_url, height_cm, weight_kg, goals, activity_level, training_preference, dietary_restrictions, dietary_other, notify_water, notify_workout",
        )
        .eq("user_id", userId)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error("Erro ao buscar perfil do usuário:", error);
        toast({
          title: "Erro ao carregar perfil",
          description: "Tente novamente em instantes.",
          variant: "destructive",
        });
        return;
      }

      const typed = (data || null) as UserProfile | null;
      setProfile(typed);

      if (typed) {
        setFullName(typed.full_name || "");
        setHeight(typed.height_cm != null ? String(typed.height_cm) : "");
        setWeight(typed.weight_kg != null ? String(typed.weight_kg) : "");
        setGoals(typed.goals || []);
        setActivityLevel(typed.activity_level || "");
        setTrainingPreference(typed.training_preference || []);
        setDietaryRestrictions(typed.dietary_restrictions || []);
        setDietaryOther(typed.dietary_other || "");
        setNotifyWater(typed.notify_water ?? false);
        setNotifyWorkout(typed.notify_workout ?? false);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          setUser(null);
          setProfile(null);
          navigate("/auth");
          return;
        }
        setUser(session.user);
        setEmail(session.user.email ?? "");
        loadProfile(session.user.id);
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
        setEmail(session.user.email ?? "");
        loadProfile(session.user.id);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const initials = useMemo(() => {
    const name = fullName || user?.email || "";
    if (!name) return "?";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("");
  }, [fullName, user?.email]);

  const handleSaveAccount = async () => {
    if (!user) return;

    const parsed = accountSchema.safeParse({ full_name: fullName, email });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Dados inválidos";
      toast({ title: "Verifique os dados", description: msg, variant: "destructive" });
      return;
    }

    try {
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({ full_name: fullName })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      if (email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({ email });
        if (authError) throw authError;
      }

      toast({ title: "Perfil atualizado", description: "Dados de conta salvos com sucesso." });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error?.message ?? "Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  };

  const handleChangePassword = async () => {
    const parsed = passwordSchema.safeParse({ newPassword, confirmPassword });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Verifique a nova senha";
      toast({ title: "Senha inválida", description: msg, variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setNewPassword("");
      setConfirmPassword("");

      toast({ title: "Senha atualizada", description: "Sua senha foi alterada com sucesso." });
    } catch (error: any) {
      toast({
        title: "Erro ao alterar senha",
        description: error?.message ?? "Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  };

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Arquivo inválido",
        description: "Envie uma imagem (JPG, PNG, WEBP)",
        variant: "destructive",
      });
      return;
    }

    const maxSize = 40 * 1024 * 1024; // 40 MB
    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: "Tamanho máximo permitido é 40MB.",
        variant: "destructive",
      });
      return;
    }

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));

      toast({ title: "Foto atualizada", description: "Sua foto de perfil foi atualizada." });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar foto",
        description: error?.message ?? "Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  };

  const toggleArrayValue = (current: string[], value: string) => {
    return current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
  };

  const handleSavePhysical = async () => {
    if (!user) return;

    const parsed = physicalSchema.safeParse({
      height_cm: height,
      weight_kg: weight,
      goals,
      activity_level: activityLevel,
      training_preference: trainingPreference,
    });

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Dados inválidos";
      toast({ title: "Verifique os dados", description: msg, variant: "destructive" });
      return;
    }

    const values = parsed.data;

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          height_cm:
            typeof values.height_cm === "number"
              ? values.height_cm
              : height
              ? Number(height)
              : null,
          weight_kg:
            typeof values.weight_kg === "number"
              ? values.weight_kg
              : weight
              ? Number(weight)
              : null,
          goals: values.goals ?? [],
          activity_level: values.activity_level || null,
          training_preference: values.training_preference ?? [],
          dietary_restrictions: dietaryRestrictions,
          dietary_other: dietaryOther || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado",
        description: "Dados físicos e preferências salvos com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error?.message ?? "Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  };

  const handleSaveNotifications = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          notify_water: notifyWater,
          notify_workout: notifyWorkout,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Notificações atualizadas",
        description: "Suas preferências de lembretes foram salvas.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error?.message ?? "Tente novamente em instantes.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (!user && loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <AuthenticatedLayout>
      <div className="flex-1 flex flex-col pb-16 md:pb-0">
        <header className="w-full border-b px-4 pt-3 pb-3 md:px-8 md:pt-4 md:pb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Foto de perfil" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-semibold text-muted-foreground">{initials}</span>
                )}
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Perfil & conta</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ajuste suas informações de acesso, foto e dados do seu plano.
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sair
          </Button>
        </header>

        <main className="flex-1 px-4 py-3 md:px-8 md:py-4 space-y-6 overflow-y-auto">
          {isAdmin && (
            <Card className="border-primary/40 bg-primary/5 animate-fade-in">
              <CardContent className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Painel de Administração</CardTitle>
                    <CardDescription>
                      Acesse métricas, usuários e configurações da plataforma
                    </CardDescription>
                  </div>
                </div>
                <Button size="sm" onClick={() => navigate("/admin")} className="whitespace-nowrap">
                  Acessar Painel
                </Button>
              </CardContent>
            </Card>
          )}

          {!profile && (
            <Card className="border-dashed border-primary/40 bg-primary/5">
              <CardContent className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Complete seu onboarding</CardTitle>
                  <CardDescription>
                    Antes de editar seus dados físicos e preferências, conclua o questionário inicial.
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => navigate("/onboarding")}>
                  Ir para o onboarding
                </Button>
              </CardContent>
            </Card>
          )}

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)] items-start">
            <div className="space-y-6">
              {/* Card Conta */}
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle>Conta</CardTitle>
                  <CardDescription>
                    Nome, email de acesso e atualização de senha da sua conta.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome completo</Label>
                    <Input
                      id="full_name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Como você se apresenta?"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                    />
                  </div>
                  <Button onClick={handleSaveAccount}>Salvar conta</Button>

                  <div className="h-px w-full bg-border my-2" />

                  <div className="space-y-2">
                    <Label htmlFor="new_password">Nova senha</Label>
                    <Input
                      id="new_password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirmar nova senha</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                    />
                  </div>
                  <Button variant="outline" onClick={handleChangePassword}>
                    Atualizar senha
                  </Button>
                </CardContent>
              </Card>

              {/* Card Foto de perfil */}
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle>Foto de perfil</CardTitle>
                  <CardDescription>
                    Envie uma imagem até 40MB para personalizar seu avatar.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt="Foto de perfil"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-base font-semibold text-muted-foreground">
                          {initials}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Formatos aceitos: JPG, PNG, WEBP.</p>
                      <p>Tamanho máximo: 40MB.</p>
                    </div>
                  </div>
                  <div>
                    <Label
                      htmlFor="avatar"
                      className="inline-flex items-center justify-center px-4 py-2 rounded-md border bg-background text-sm font-medium cursor-pointer hover:bg-muted transition-colors"
                    >
                      Escolher imagem
                    </Label>
                    <input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Card Dados de Onboarding */}
            <div className="space-y-6">
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle>Dados de saúde & objetivos</CardTitle>
                  <CardDescription>
                    Ajuste peso, altura, objetivos e preferências usadas para gerar seus planos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="height">Altura (cm)</Label>
                      <Input
                        id="height"
                        type="number"
                        min={100}
                        max={250}
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        placeholder="Ex: 170"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weight">Peso atual (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        min={30}
                        max={300}
                        step={0.1}
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="Ex: 72.5"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Objetivos principais</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { id: "perder_gordura", label: "Perder gordura" },
                        { id: "hipertrofia", label: "Ganhar massa muscular" },
                        { id: "forca", label: "Ganho de força" },
                        { id: "performance", label: "Performance/atletismo" },
                      ].map((goal) => (
                        <label
                          key={goal.id}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <Checkbox
                            checked={goals.includes(goal.id)}
                            onCheckedChange={() =>
                              setGoals((current) => toggleArrayValue(current, goal.id))
                            }
                          />
                          <span>{goal.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Nível de atividade</Label>
                    <Select
                      value={activityLevel}
                      onValueChange={(val) => setActivityLevel(val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione seu nível" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sedentario">Sedentário</SelectItem>
                        <SelectItem value="leve">Leve</SelectItem>
                        <SelectItem value="moderado">Moderado</SelectItem>
                        <SelectItem value="intenso">Intenso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Preferência de treino</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { id: "casa_sem_equip", label: "Casa sem equipamentos" },
                        { id: "casa_com_equip", label: "Casa com equipamentos" },
                        { id: "academia", label: "Academia" },
                      ].map((opt) => (
                        <label
                          key={opt.id}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <Checkbox
                            checked={trainingPreference.includes(opt.id)}
                            onCheckedChange={() =>
                              setTrainingPreference((current) =>
                                toggleArrayValue(current, opt.id),
                              )
                            }
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Restrições alimentares</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { id: "nenhuma", label: "Nenhuma" },
                        { id: "vegetariano", label: "Vegetariano" },
                        { id: "vegano", label: "Vegano" },
                        { id: "intolerancia_lactose", label: "Intolerância à lactose" },
                        { id: "intolerancia_gluten", label: "Intolerância ao glúten" },
                        { id: "outros", label: "Outros" },
                      ].map((opt) => (
                        <label
                          key={opt.id}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <Checkbox
                            checked={dietaryRestrictions.includes(opt.id)}
                            onCheckedChange={() =>
                              setDietaryRestrictions((current) =>
                                toggleArrayValue(current, opt.id),
                              )
                            }
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                    <Input
                      placeholder="Descreva outras restrições (opcional)"
                      value={dietaryOther}
                      onChange={(e) => setDietaryOther(e.target.value)}
                    />
                  </div>

                  <Button className="mt-2" onClick={handleSavePhysical}>
                    Salvar dados de saúde
                  </Button>
                </CardContent>
              </Card>

              {/* Card Notificações & lembretes */}
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle>Notificações & lembretes</CardTitle>
                  <CardDescription>
                    Controle se o Vita, seu nutricionista pessoal, deve te lembrar de beber água e treinar ao longo do dia.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Lembretes principais</Label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={notifyWater}
                          onCheckedChange={(checked) => setNotifyWater(Boolean(checked))}
                        />
                        <span>Lembrar de beber água ao longo do dia</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={notifyWorkout}
                          onCheckedChange={(checked) => setNotifyWorkout(Boolean(checked))}
                        />
                        <span>Lembrar dos treinos planejados</span>
                      </label>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Essas preferências serão usadas pelos fluxos de comunicação (como WhatsApp e notificações do app)
                    para adaptar a frequência dos lembretes com base nos seus hábitos registrados.
                  </p>

                  <Button onClick={handleSaveNotifications}>Salvar notificações</Button>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
      </div>
    </AuthenticatedLayout>
  );
};

export default Profile;
