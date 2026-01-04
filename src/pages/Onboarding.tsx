import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, User, Ruler, Weight, Target, Dumbbell, MessageCircle, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DateOfBirthPicker } from "@/components/DateOfBirthPicker";
import { cn } from "@/lib/utils";

const onboardingSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(3, "Informe seu nome completo"),
    date_of_birth: z.date({
      required_error: "Informe sua data de nascimento",
    }),
    biological_sex: z.enum(["masculino", "feminino", "outro"], {
      required_error: "Selecione uma opção",
    }),
    height_cm: z
      .number({ invalid_type_error: "Altura inválida" })
      .min(100, "Altura mínima 100 cm")
      .max(250, "Altura máxima 250 cm"),
    weight_kg: z
      .number({ invalid_type_error: "Peso inválido" })
      .min(30, "Peso mínimo 30 kg")
      .max(300, "Peso máximo 300 kg"),

    goals: z.array(z.string()).min(1, "Selecione pelo menos um objetivo"),
    target_weight_kg: z
      .number({ invalid_type_error: "Peso alvo inválido" })
      .min(30)
      .max(300)
      .optional(),
    target_timeframe: z.enum(["1_mes", "3_meses", "6_meses", "1_ano"]),

    activity_level: z.enum(["sedentario", "leve", "moderado", "intenso"], {
      required_error: "Selecione seu nível de atividade",
    }),
    training_preference: z
      .array(z.enum(["casa_sem_equip", "casa_com_equip", "academia"]))
      .min(1, "Escolha pelo menos uma opção"),
    dietary_restrictions: z.array(z.string()),
    dietary_other: z
      .string()
      .trim()
      .max(200, "Máximo de 200 caracteres")
      .optional(),

    whatsapp_phone: z
      .string()
      .trim()
      .max(20, "Máximo de 20 caracteres")
      .optional(),
    whatsapp_opt_in: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.whatsapp_opt_in) {
      if (!data.whatsapp_phone) {
        ctx.addIssue({
          path: ["whatsapp_phone"],
          code: z.ZodIssueCode.custom,
          message: "Informe seu número de WhatsApp",
        });
      } else {
        const clean = data.whatsapp_phone.replace(/\D/g, "");
        if (clean.length < 10 || clean.length > 13) {
          ctx.addIssue({
            path: ["whatsapp_phone"],
            code: z.ZodIssueCode.custom,
            message: "Número de WhatsApp inválido",
          });
        }
      }
    }

    if (data.dietary_restrictions.includes("outro") && !data.dietary_other) {
      ctx.addIssue({
        path: ["dietary_other"],
        code: z.ZodIssueCode.custom,
        message: "Descreva sua restrição alimentar",
      });
    }
  });

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

const totalSteps = 5;

const vitaMessages: Record<number, { title: string; text: string }> = {
  1: {
    title: "Olá! Eu sou o Vita 👋",
    text: "Vou fazer algumas perguntas rápidas para criar o plano perfeito para você.",
  },
  2: {
    title: "Vamos começar pelo básico",
    text: "Quero entender quem é você para ajustar tudo ao seu corpo.",
  },
  3: {
    title: "Quais são seus objetivos?",
    text: "Me conte onde você quer chegar para eu traçar o caminho.",
  },
  4: {
    title: "Seu estilo de vida importa",
    text: "Vou adaptar o plano à sua rotina real, sem fórmulas mágicas.",
  },
  5: {
    title: "Quer ajuda pelo WhatsApp?",
    text: "Se quiser, posso te lembrar de beber água, treinar e muito mais.",
  },
};

const stepTitles: Record<number, string> = {
  1: "Boas-vindas",
  2: "Dados básicos",
  3: "Objetivos",
  4: "Estilo de vida",
  5: "WhatsApp",
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
  exit: { opacity: 0, x: -20 },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      full_name: "",
      date_of_birth: undefined,
      biological_sex: undefined,
      height_cm: undefined,
      weight_kg: undefined,
      goals: [],
      target_weight_kg: undefined,
      target_timeframe: "3_meses",
      activity_level: undefined,
      training_preference: [],
      dietary_restrictions: ["nenhuma"],
      dietary_other: "",
      whatsapp_phone: "",
      whatsapp_opt_in: false,
    } as any,
  });

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      const email = session?.user?.email ?? null;

      if (email && email.toLowerCase() === "admin@dev.local") {
        navigate("/admin");
        return;
      }

      setUserId(uid);
      setUserEmail(email);

      if (!uid) {
        navigate("/auth");
      }
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        const uid = session?.user?.id ?? null;
        const email = session?.user?.email ?? null;

        if (email && email.toLowerCase() === "admin@dev.local") {
          navigate("/admin");
          return;
        }

        setUserId(uid);
        setUserEmail(email);

        if (!uid) {
          navigate("/auth");
        }
      })
      .finally(() => setInitializing(false));

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const goNext = async () => {
    let fields: (keyof OnboardingFormValues)[] = [];

    if (step === 2) {
      fields = [
        "full_name",
        "date_of_birth",
        "biological_sex",
        "height_cm",
        "weight_kg",
      ];
    } else if (step === 3) {
      fields = ["goals", "target_weight_kg", "target_timeframe"];
    } else if (step === 4) {
      fields = [
        "activity_level",
        "training_preference",
        "dietary_restrictions",
        "dietary_other",
      ];
    }

    if (fields.length) {
      const valid = await form.trigger(fields, { shouldFocus: true });
      if (!valid) return;
    }

    setStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const goBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit = async (values: OnboardingFormValues) => {
    if (!userId) {
      toast({
        title: "Sessão expirada",
        description: "Faça login novamente para continuar.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setLoadingSubmit(true);

    try {
      const payload = {
        user_id: userId,
        full_name: values.full_name,
        date_of_birth: values.date_of_birth.toISOString().slice(0, 10),
        biological_sex: values.biological_sex,
        height_cm: values.height_cm,
        weight_kg: values.weight_kg,
        goals: values.goals,
        target_weight_kg: values.target_weight_kg ?? null,
        target_timeframe: values.target_timeframe,
        activity_level: values.activity_level,
        training_preference: values.training_preference,
        dietary_restrictions: values.dietary_restrictions,
        dietary_other: values.dietary_other || null,
        whatsapp_phone: values.whatsapp_phone || null,
        whatsapp_opt_in: values.whatsapp_opt_in,
        onboarding_completed: true,
      };

      const { error } = await supabase
        .from("user_profiles")
        .upsert(payload, { onConflict: "user_id" });

      if (error) throw error;

      toast({
        title: "Plano criado",
        description: "Te levando para o seu painel.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error?.message ?? "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setLoadingSubmit(false);
    }
  };

  const stepPercentage = (step / totalSteps) * 100;

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-animated">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando sua jornada...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-animated">
      {/* Fixed header with progress */}
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="w-full max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {stepTitles[step]}
            </span>
            <span className="text-xs font-medium text-primary">
              {step}/{totalSteps}
            </span>
          </div>
          <div className="progress-premium">
            <div
              className="progress-premium-fill"
              style={{ width: `${stepPercentage}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main content - scrollable */}
      <main className="flex-1 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-32">
          {/* Vita message card - always on top for mobile */}
          <motion.div
            key={`vita-${step}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <div className="glass-premium-vita rounded-2xl p-4 flex items-start gap-4">
              {/* Vita orb */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <div className="absolute w-12 h-12 rounded-full bg-primary/30 animate-pulse" />
                  <div className="relative w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">
                  {vitaMessages[step].title}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                  {vitaMessages[step].text}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Form card */}
          <div className="glass-premium rounded-2xl p-5 sm:p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={{ duration: 0.3 }}
                  >
                    {/* Step 1: Welcome */}
                    {step === 1 && (
                      <motion.div variants={itemVariants} className="space-y-6 text-center py-6">
                        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                          <Sparkles className="w-10 h-10 text-primary" />
                        </div>
                        <div className="space-y-2">
                          <h2 className="text-xl font-bold text-foreground">
                            Bem-vindo ao Dietafy
                          </h2>
                          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                            Em poucos minutos, vou criar um plano personalizado baseado nos seus objetivos e rotina.
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Step 2: Basic data */}
                    {step === 2 && (
                      <div className="space-y-5">
                        <motion.div variants={itemVariants}>
                          <FormField
                            control={form.control}
                            name="full_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2 text-sm font-medium">
                                  <User className="w-4 h-4 text-primary" />
                                  Nome completo
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Como você se chama?"
                                    className="h-12 bg-background/80 border-border/50 focus:border-primary/50"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>

                        <motion.div variants={itemVariants}>
                          <FormField
                            control={form.control}
                            name="date_of_birth"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">
                                  Data de nascimento
                                </FormLabel>
                                <FormControl>
                                  <DateOfBirthPicker
                                    value={field.value}
                                    onChange={field.onChange}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>

                        <motion.div variants={itemVariants}>
                          <FormField
                            control={form.control}
                            name="biological_sex"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">
                                  Sexo biológico
                                </FormLabel>
                                <div className="grid grid-cols-3 gap-2">
                                  {[
                                    { value: "masculino", label: "Masculino" },
                                    { value: "feminino", label: "Feminino" },
                                    { value: "outro", label: "Outro" },
                                  ].map((option) => (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => field.onChange(option.value)}
                                      className={cn(
                                        "option-card flex items-center justify-center py-3 text-sm font-medium",
                                        field.value === option.value && "selected"
                                      )}
                                    >
                                      {option.label}
                                    </button>
                                  ))}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>

                        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="height_cm"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2 text-sm font-medium">
                                  <Ruler className="w-4 h-4 text-primary" />
                                  Altura
                                </FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      inputMode="numeric"
                                      placeholder="170"
                                      className="h-12 bg-background/80 border-border/50 pr-10"
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(
                                          e.target.value ? Number(e.target.value) : undefined
                                        )
                                      }
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                      cm
                                    </span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="weight_kg"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2 text-sm font-medium">
                                  <Weight className="w-4 h-4 text-primary" />
                                  Peso atual
                                </FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      inputMode="decimal"
                                      step="0.1"
                                      placeholder="70"
                                      className="h-12 bg-background/80 border-border/50 pr-10"
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(
                                          e.target.value ? Number(e.target.value) : undefined
                                        )
                                      }
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                      kg
                                    </span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      </div>
                    )}

                    {/* Step 3: Goals */}
                    {step === 3 && (
                      <div className="space-y-5">
                        <motion.div variants={itemVariants}>
                          <FormField
                            control={form.control}
                            name="goals"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2 text-sm font-medium">
                                  <Target className="w-4 h-4 text-primary" />
                                  Seus objetivos principais
                                </FormLabel>
                                <div className="grid gap-2">
                                  {[
                                    { value: "perder_gordura", label: "Perder gordura corporal", emoji: "🔥" },
                                    { value: "ganhar_massa", label: "Ganhar massa muscular", emoji: "💪" },
                                    { value: "controlar_glicose", label: "Controlar glicose/diabetes", emoji: "📊" },
                                    { value: "reduzir_estresse", label: "Reduzir estresse e cortisol", emoji: "🧘" },
                                    { value: "melhorar_sono", label: "Melhorar sono", emoji: "😴" },
                                    { value: "aumentar_energia", label: "Aumentar energia", emoji: "⚡" },
                                  ].map((option) => {
                                    const checked = field.value?.includes(option.value);
                                    return (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                          if (checked) {
                                            field.onChange(field.value.filter((v) => v !== option.value));
                                          } else {
                                            field.onChange([...field.value, option.value]);
                                          }
                                        }}
                                        className={cn(
                                          "option-card flex items-center gap-3 text-left",
                                          checked && "selected"
                                        )}
                                      >
                                        <span className="text-lg">{option.emoji}</span>
                                        <span className="text-sm font-medium">{option.label}</span>
                                        {checked && (
                                          <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                            <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>

                        <motion.div variants={itemVariants}>
                          <FormField
                            control={form.control}
                            name="target_weight_kg"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">
                                  Meta de peso (opcional)
                                </FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      inputMode="decimal"
                                      step="0.1"
                                      placeholder="Quero chegar em..."
                                      className="h-12 bg-background/80 border-border/50 pr-10"
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(
                                          e.target.value ? Number(e.target.value) : undefined
                                        )
                                      }
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                      kg
                                    </span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>

                        <motion.div variants={itemVariants}>
                          <FormField
                            control={form.control}
                            name="target_timeframe"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Prazo desejado</FormLabel>
                                <div className="grid grid-cols-2 gap-2">
                                  {[
                                    { value: "1_mes", label: "1 mês" },
                                    { value: "3_meses", label: "3 meses" },
                                    { value: "6_meses", label: "6 meses" },
                                    { value: "1_ano", label: "1 ano" },
                                  ].map((option) => (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => field.onChange(option.value)}
                                      className={cn(
                                        "option-card flex items-center justify-center py-3 text-sm font-medium",
                                        field.value === option.value && "selected"
                                      )}
                                    >
                                      {option.label}
                                    </button>
                                  ))}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      </div>
                    )}

                    {/* Step 4: Lifestyle */}
                    {step === 4 && (
                      <div className="space-y-5">
                        <motion.div variants={itemVariants}>
                          <FormField
                            control={form.control}
                            name="activity_level"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2 text-sm font-medium">
                                  <Dumbbell className="w-4 h-4 text-primary" />
                                  Nível de atividade física
                                </FormLabel>
                                <div className="grid grid-cols-2 gap-2">
                                  {[
                                    { value: "sedentario", label: "Sedentário", desc: "Pouco ou nenhum" },
                                    { value: "leve", label: "Leve", desc: "1-3x/semana" },
                                    { value: "moderado", label: "Moderado", desc: "3-5x/semana" },
                                    { value: "intenso", label: "Intenso", desc: "6-7x/semana" },
                                  ].map((option) => (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => field.onChange(option.value)}
                                      className={cn(
                                        "option-card flex flex-col items-start py-3",
                                        field.value === option.value && "selected"
                                      )}
                                    >
                                      <span className="text-sm font-medium">{option.label}</span>
                                      <span className="text-xs text-muted-foreground">{option.desc}</span>
                                    </button>
                                  ))}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>

                        <motion.div variants={itemVariants}>
                          <FormField
                            control={form.control}
                            name="training_preference"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Preferência de treino</FormLabel>
                                <div className="grid gap-2">
                                  {[
                                    { value: "casa_sem_equip", label: "Em casa (sem equipamento)", emoji: "🏠" },
                                    { value: "casa_com_equip", label: "Em casa (com equipamentos)", emoji: "🏋️" },
                                    { value: "academia", label: "Academia completa", emoji: "💪" },
                                  ].map((option) => {
                                    const current = (field.value || []) as string[];
                                    const checked = current.includes(option.value);
                                    return (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                          if (checked) {
                                            field.onChange(current.filter((v) => v !== option.value));
                                          } else {
                                            field.onChange([...current, option.value]);
                                          }
                                        }}
                                        className={cn(
                                          "option-card flex items-center gap-3",
                                          checked && "selected"
                                        )}
                                      >
                                        <span className="text-lg">{option.emoji}</span>
                                        <span className="text-sm font-medium">{option.label}</span>
                                        {checked && (
                                          <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                            <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>

                        <motion.div variants={itemVariants}>
                          <FormField
                            control={form.control}
                            name="dietary_restrictions"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Restrições alimentares</FormLabel>
                                <div className="grid grid-cols-2 gap-2">
                                  {[
                                    { value: "nenhuma", label: "Nenhuma" },
                                    { value: "vegetariano", label: "Vegetariano" },
                                    { value: "vegano", label: "Vegano" },
                                    { value: "intolerante_lactose", label: "Sem lactose" },
                                    { value: "intolerante_gluten", label: "Sem glúten" },
                                    { value: "diabetes", label: "Diabetes" },
                                    { value: "outro", label: "Outro" },
                                  ].map((option) => {
                                    const checked = field.value?.includes(option.value);
                                    return (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                          if (option.value === "nenhuma") {
                                            field.onChange(["nenhuma"]);
                                          } else if (checked) {
                                            field.onChange(field.value.filter((v) => v !== option.value));
                                          } else {
                                            field.onChange([
                                              ...field.value.filter((v) => v !== "nenhuma"),
                                              option.value,
                                            ]);
                                          }
                                        }}
                                        className={cn(
                                          "option-card flex items-center justify-center py-2.5 text-sm font-medium",
                                          checked && "selected"
                                        )}
                                      >
                                        {option.label}
                                      </button>
                                    );
                                  })}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>

                        {form.watch("dietary_restrictions").includes("outro") && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <FormField
                              control={form.control}
                              name="dietary_other"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">Descreva sua restrição</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Ex: alergia a frutos do mar"
                                      className="h-12 bg-background/80 border-border/50"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </motion.div>
                        )}
                      </div>
                    )}

                    {/* Step 5: WhatsApp */}
                    {step === 5 && (
                      <div className="space-y-5">
                        <motion.div variants={itemVariants}>
                          <div className="text-center mb-4">
                            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-3">
                              <MessageCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Receba dicas, lembretes e check-ins diretamente no seu WhatsApp.
                            </p>
                          </div>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                          <FormField
                            control={form.control}
                            name="whatsapp_phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Número de WhatsApp</FormLabel>
                                <FormDescription className="text-xs">
                                  Formato brasileiro, com DDD
                                </FormDescription>
                                <FormControl>
                                  <Input
                                    placeholder="(11) 98765-4321"
                                    className="h-12 bg-background/80 border-border/50"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </motion.div>

                        <motion.div variants={itemVariants}>
                          <FormField
                            control={form.control}
                            name="whatsapp_opt_in"
                            render={({ field }) => (
                              <FormItem className={cn(
                                "option-card flex items-start gap-3",
                                field.value && "selected"
                              )}>
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    className="mt-0.5"
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-sm font-medium cursor-pointer">
                                    Aceito receber mensagens
                                  </FormLabel>
                                  <FormDescription className="text-xs">
                                    Você pode cancelar a qualquer momento.
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </form>
            </Form>
          </div>
        </div>
      </main>

      {/* Fixed bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border/50 safe-area-inset-bottom">
        <div className="w-full max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={loadingSubmit}
                onClick={goBack}
                className="flex-1 h-12 bg-background/80 border-border/50"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
            )}

            {step < totalSteps ? (
              <Button
                type="button"
                size="lg"
                onClick={goNext}
                disabled={loadingSubmit}
                className={cn(
                  "flex-1 h-12 bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg",
                  step === 1 && "w-full"
                )}
              >
                {step === 1 ? "Vamos lá!" : "Próximo"}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="lg"
                disabled={loadingSubmit}
                onClick={form.handleSubmit(onSubmit)}
                className="flex-1 h-12 bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg"
              >
                {loadingSubmit ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Criar Meu Plano
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
