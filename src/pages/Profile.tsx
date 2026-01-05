import { useEffect, useMemo, useState, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
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
import { AuthenticatedLayout } from "@/components/layouts/AuthenticatedLayout";
import { 
  Loader2, 
  Shield, 
  User as UserIcon, 
  Camera, 
  Lock, 
  Mail, 
  Ruler, 
  Weight as WeightIcon, 
  Target, 
  Activity, 
  Dumbbell, 
  Salad,
  Bell,
  Droplets,
  LogOut,
  ChevronRight,
  Sparkles,
  Crown,
  Check
} from "lucide-react";

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

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const }
  }
};

const headerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] as const }
  }
};

// Premium Section Card Component
const SectionCard = ({ 
  icon: Icon, 
  title, 
  description, 
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  children,
  action,
  badge
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  iconColor?: string;
  iconBg?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  badge?: string;
}) => (
  <motion.div variants={itemVariants}>
    <Card className="glass-premium border-border/40 overflow-hidden">
      <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
            <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl ${iconBg} flex items-center justify-center shrink-0`}>
              <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${iconColor}`} />
            </div>
            <div className="space-y-0.5 sm:space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
                {badge && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-primary/20 text-primary">
                    {badge}
                  </span>
                )}
              </div>
              <CardDescription className="text-xs sm:text-sm line-clamp-2">{description}</CardDescription>
            </div>
          </div>
          {action && <div className="self-start sm:self-auto shrink-0">{action}</div>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
        {children}
      </CardContent>
    </Card>
  </motion.div>
);

// Premium Input Component
const PremiumInput = ({ 
  icon: Icon, 
  ...props 
}: { 
  icon?: React.ElementType 
} & React.ComponentProps<typeof Input>) => (
  <div className="relative">
    {Icon && (
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
    )}
    <Input 
      {...props} 
      className={`${Icon ? 'pl-10' : ''} bg-background/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all ${props.className || ''}`}
    />
  </div>
);

// Premium Checkbox Option
const CheckboxOption = ({ 
  id, 
  label, 
  checked, 
  onChange,
  icon: Icon
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  icon?: React.ElementType;
}) => (
  <motion.label
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl cursor-pointer transition-all touch-target ${
      checked 
        ? 'bg-primary/10 border border-primary/30' 
        : 'bg-background/50 border border-border/40 hover:border-border/60'
    }`}
  >
    <Checkbox
      checked={checked}
      onCheckedChange={onChange}
      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary h-4 w-4 sm:h-5 sm:w-5"
    />
    {Icon && <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${checked ? 'text-primary' : 'text-muted-foreground'}`} />}
    <span className={`text-xs sm:text-sm flex-1 ${checked ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
      {label}
    </span>
    {checked && <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />}
  </motion.label>
);

// Premium Button
const PremiumButton = ({ 
  children, 
  premiumVariant = "primary",
  ...props 
}: { 
  premiumVariant?: "primary" | "secondary" | "outline";
} & React.ComponentProps<typeof Button>) => {
  const baseClass = "relative overflow-hidden transition-all duration-300";
  const premiumStyles = {
    primary: "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40",
    secondary: "bg-secondary hover:bg-secondary/80",
    outline: "border-border/50 hover:border-primary/50 hover:bg-primary/5"
  };
  
  return (
    <Button {...props} className={`${baseClass} ${premiumStyles[premiumVariant]} ${props.className || ''}`}>
      {children}
    </Button>
  );
};

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

    const maxSize = 40 * 1024 * 1024;
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
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <p className="text-muted-foreground text-sm">Carregando perfil...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <AuthenticatedLayout>
      <div className="flex-1 flex flex-col pb-16 md:pb-0">
        {/* Premium Header */}
        <motion.header 
          variants={headerVariants}
          initial="hidden"
          animate="visible"
          className="relative w-full overflow-hidden"
        >
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative px-4 pt-6 pb-8 md:px-8 md:pt-8 md:pb-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              {/* Avatar and Info */}
              <div className="flex items-center gap-5">
                {/* Premium Avatar with Gradient Border */}
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="relative group"
                >
                  <div className="absolute -inset-1 bg-gradient-to-br from-primary via-primary/50 to-primary/20 rounded-full opacity-75 group-hover:opacity-100 transition-opacity blur-sm" />
                  <div className="relative h-20 w-20 md:h-24 md:w-24 rounded-full bg-background flex items-center justify-center overflow-hidden ring-2 ring-background">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Foto de perfil" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
                        {initials}
                      </span>
                    )}
                  </div>
                  {/* Camera overlay */}
                  <label 
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-lg"
                  >
                    <Camera className="h-4 w-4" />
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </label>
                </motion.div>

                <div className="space-y-1">
                  <motion.h1 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-2xl md:text-3xl font-bold tracking-tight"
                  >
                    {fullName || "Seu Perfil"}
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-sm text-muted-foreground"
                  >
                    {email}
                  </motion.p>
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center gap-2 mt-2"
                  >
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      <Sparkles className="h-3 w-3" />
                      Membro Dietafy
                    </span>
                    {isAdmin && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600">
                        <Crown className="h-3 w-3" />
                        Admin
                      </span>
                    )}
                  </motion.div>
                </div>
              </div>

              {/* Actions */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center gap-3"
              >
                {isAdmin && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate("/admin")}
                    className="gap-2 border-primary/30 hover:bg-primary/10"
                  >
                    <Shield className="h-4 w-4" />
                    Painel Admin
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout}
                  className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <motion.main 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex-1 px-4 py-6 md:px-8 md:py-8 space-y-6 overflow-y-auto"
        >
          {/* Onboarding Alert */}
          {!profile && (
            <motion.div variants={itemVariants}>
              <Card className="border-dashed border-primary/40 bg-gradient-to-r from-primary/10 to-primary/5">
                <CardContent className="py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Complete seu onboarding</CardTitle>
                      <CardDescription>
                        Antes de editar seus dados, conclua o questionário inicial.
                      </CardDescription>
                    </div>
                  </div>
                  <PremiumButton size="sm" onClick={() => navigate("/onboarding")}>
                    Ir para o onboarding
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </PremiumButton>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Two Column Layout */}
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-start">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Account Section */}
              <SectionCard
                icon={UserIcon}
                title="Conta"
                description="Nome, email e senha da sua conta"
                iconColor="text-blue-500"
                iconBg="bg-blue-500/10"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-sm font-medium">Nome completo</Label>
                    <PremiumInput
                      id="full_name"
                      icon={UserIcon}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Como você se apresenta?"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <PremiumInput
                      id="email"
                      icon={Mail}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                    />
                  </div>
                  <PremiumButton onClick={handleSaveAccount} className="w-full md:w-auto">
                    Salvar conta
                  </PremiumButton>
                </div>

                <div className="h-px w-full bg-border/50 my-4" />

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    Alterar senha
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new_password" className="text-sm font-medium">Nova senha</Label>
                    <PremiumInput
                      id="new_password"
                      icon={Lock}
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password" className="text-sm font-medium">Confirmar nova senha</Label>
                    <PremiumInput
                      id="confirm_password"
                      icon={Lock}
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                    />
                  </div>
                  <PremiumButton premiumVariant="outline" onClick={handleChangePassword} className="w-full md:w-auto">
                    Atualizar senha
                  </PremiumButton>
                </div>
              </SectionCard>

              {/* Photo Section */}
              <SectionCard
                icon={Camera}
                title="Foto de perfil"
                description="Personalize seu avatar"
                iconColor="text-purple-500"
                iconBg="bg-purple-500/10"
              >
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center overflow-hidden border-2 border-dashed border-border/60">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt="Foto de perfil"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserIcon className="h-8 w-8 text-muted-foreground/50" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Formatos aceitos: JPG, PNG, WEBP (máx. 40MB)
                    </p>
                    <Label
                      htmlFor="avatar"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border/50 bg-background/50 text-sm font-medium cursor-pointer hover:bg-muted/50 hover:border-primary/30 transition-all"
                    >
                      <Camera className="h-4 w-4" />
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
                </div>
              </SectionCard>

              {/* Notifications Section */}
              <SectionCard
                icon={Bell}
                title="Notificações"
                description="Controle seus lembretes"
                iconColor="text-amber-500"
                iconBg="bg-amber-500/10"
              >
                <div className="space-y-3">
                  <CheckboxOption
                    id="notify_water"
                    label="Lembrar de beber água"
                    checked={notifyWater}
                    onChange={() => setNotifyWater(!notifyWater)}
                    icon={Droplets}
                  />
                  <CheckboxOption
                    id="notify_workout"
                    label="Lembrar dos treinos"
                    checked={notifyWorkout}
                    onChange={() => setNotifyWorkout(!notifyWorkout)}
                    icon={Dumbbell}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Usadas pelos fluxos de comunicação (WhatsApp e notificações do app).
                </p>
                <PremiumButton onClick={handleSaveNotifications} className="w-full md:w-auto mt-2">
                  Salvar notificações
                </PremiumButton>
              </SectionCard>
            </div>

            {/* Right Column - Health & Goals */}
            <div className="space-y-6">
              <SectionCard
                icon={Activity}
                title="Dados de saúde & objetivos"
                description="Peso, altura, objetivos e preferências usadas para gerar seus planos"
                iconColor="text-emerald-500"
                iconBg="bg-emerald-500/10"
                badge="Personalização"
              >
                {/* Physical Data */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="height" className="text-sm font-medium flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-muted-foreground" />
                      Altura (cm)
                    </Label>
                    <PremiumInput
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
                    <Label htmlFor="weight" className="text-sm font-medium flex items-center gap-2">
                      <WeightIcon className="h-4 w-4 text-muted-foreground" />
                      Peso atual (kg)
                    </Label>
                    <PremiumInput
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

                {/* Goals */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    Objetivos principais
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { id: "perder_gordura", label: "Perder gordura", icon: Activity },
                      { id: "hipertrofia", label: "Ganhar massa muscular", icon: Dumbbell },
                      { id: "forca", label: "Ganho de força", icon: Target },
                      { id: "performance", label: "Performance/atletismo", icon: Sparkles },
                    ].map((goal) => (
                      <CheckboxOption
                        key={goal.id}
                        id={goal.id}
                        label={goal.label}
                        checked={goals.includes(goal.id)}
                        onChange={() => setGoals((current) => toggleArrayValue(current, goal.id))}
                        icon={goal.icon}
                      />
                    ))}
                  </div>
                </div>

                {/* Activity Level */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    Nível de atividade
                  </Label>
                  <Select
                    value={activityLevel}
                    onValueChange={(val) => setActivityLevel(val)}
                  >
                    <SelectTrigger className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20">
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

                {/* Training Preference */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-muted-foreground" />
                    Preferência de treino
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { id: "casa_sem_equip", label: "Casa sem equipamentos" },
                      { id: "casa_com_equip", label: "Casa com equipamentos" },
                      { id: "academia", label: "Academia" },
                    ].map((opt) => (
                      <CheckboxOption
                        key={opt.id}
                        id={opt.id}
                        label={opt.label}
                        checked={trainingPreference.includes(opt.id)}
                        onChange={() =>
                          setTrainingPreference((current) =>
                            toggleArrayValue(current, opt.id),
                          )
                        }
                      />
                    ))}
                  </div>
                </div>

                {/* Dietary Restrictions */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Salad className="h-4 w-4 text-muted-foreground" />
                    Restrições alimentares
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { id: "nenhuma", label: "Nenhuma" },
                      { id: "vegetariano", label: "Vegetariano" },
                      { id: "vegano", label: "Vegano" },
                      { id: "intolerancia_lactose", label: "Intolerância à lactose" },
                      { id: "intolerancia_gluten", label: "Intolerância ao glúten" },
                      { id: "outros", label: "Outros" },
                    ].map((opt) => (
                      <CheckboxOption
                        key={opt.id}
                        id={opt.id}
                        label={opt.label}
                        checked={dietaryRestrictions.includes(opt.id)}
                        onChange={() =>
                          setDietaryRestrictions((current) =>
                            toggleArrayValue(current, opt.id),
                          )
                        }
                      />
                    ))}
                  </div>
                  {dietaryRestrictions.includes("outros") && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <PremiumInput
                        placeholder="Descreva outras restrições..."
                        value={dietaryOther}
                        onChange={(e) => setDietaryOther(e.target.value)}
                      />
                    </motion.div>
                  )}
                </div>

                <PremiumButton className="w-full md:w-auto mt-4" onClick={handleSavePhysical}>
                  Salvar dados de saúde
                </PremiumButton>
              </SectionCard>
            </div>
          </section>
        </motion.main>
      </div>
    </AuthenticatedLayout>
  );
};

export default Profile;
