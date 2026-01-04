import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

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

      // Master admin nunca deve acessar o onboarding
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

        // Master admin nunca deve acessar o onboarding
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando sua jornada...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10 opacity-30"
        style={{ background: "var(--gradient-hero)" }}
      />

      <div className="w-full max-w-3xl space-y-6">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Etapa {step} de {totalSteps}
            </span>
            <span>{Math.round(stepPercentage)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${stepPercentage}%` }}
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-stretch">
          {/* Wizard card */}
          <Card className="glass">
            <CardHeader>
              <CardTitle>
                {step === 1 && "Boas-vindas"}
                {step === 2 && "Dados básicos"}
                {step === 3 && "Objetivos"}
                {step === 4 && "Estilo de vida"}
                {step === 5 && "WhatsApp (opcional)"}
              </CardTitle>
              <CardDescription>
                {step === 1 &&
                  "Vamos iniciar sua jornada com a Vita ao seu lado."}
                {step === 2 &&
                  "Esses dados nos ajudam a calibrar seus planos."}
                {step === 3 &&
                  "Defina metas claras para que possamos te guiar."}
                {step === 4 &&
                  "Seu plano precisa funcionar na sua rotina real."}
                {step === 5 &&
                  "Se quiser, eu também posso te acompanhar pelo WhatsApp."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  {step === 1 && (
                    <div className="space-y-6">
                      <p className="text-base text-muted-foreground">
                        Olá! Eu sou o Vita, seu nutricionista pessoal de saúde 👋
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Vou fazer algumas perguntas para criar o plano perfeito
                        para você.
                      </p>
                      <div className="flex justify-end">
                        <Button type="button" onClick={goNext}>
                          Vamos lá!
                        </Button>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="full_name"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Nome completo</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Como você se apresenta?"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="date_of_birth"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Data de nascimento</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className="justify-start text-left font-normal"
                                  >
                                    {field.value ? (
                                      format(field.value, "dd/MM/yyyy")
                                    ) : (
                                      <span>Selecione</span>
                                    )}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto p-0"
                                align="start"
                              >
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date > new Date() ||
                                    date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="biological_sex"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sexo biológico</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="masculino">
                                  Masculino
                                </SelectItem>
                                <SelectItem value="feminino">
                                  Feminino
                                </SelectItem>
                                <SelectItem value="outro">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="height_cm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Altura</FormLabel>
                            <FormControl>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  step="0.5"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value
                                        ? Number(e.target.value)
                                        : undefined
                                    )
                                  }
                                />
                                <span className="text-sm text-muted-foreground">
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
                            <FormLabel>Peso atual</FormLabel>
                            <FormControl>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  step="0.1"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value
                                        ? Number(e.target.value)
                                        : undefined
                                    )
                                  }
                                />
                                <span className="text-sm text-muted-foreground">
                                  kg
                                </span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="goals"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Seus objetivos principais</FormLabel>
                            <div className="grid gap-2 md:grid-cols-2">
                              {[
                                ["perder_gordura", "Perder gordura corporal"],
                                ["ganhar_massa", "Ganhar massa muscular"],
                                [
                                  "controlar_glicose",
                                  "Controlar glicose/diabetes",
                                ],
                                [
                                  "reduzir_estresse",
                                  "Reduzir estresse e cortisol",
                                ],
                                ["melhorar_sono", "Melhorar sono"],
                                ["aumentar_energia", "Aumentar energia"],
                              ].map(([value, label]) => {
                                const checked = field.value?.includes(
                                  value as string
                                );
                                return (
                                  <label
                                    key={value}
                                    className="flex items-start gap-2 rounded-lg border bg-background/60 px-3 py-2 text-sm cursor-pointer hover:bg-accent/40 transition-colors"
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(next) => {
                                        if (next) {
                                          field.onChange([
                                            ...(field.value || []),
                                            value,
                                          ]);
                                        } else {
                                          field.onChange(
                                            (field.value || []).filter(
                                              (v) => v !== value
                                            )
                                          );
                                        }
                                      }}
                                    />
                                    <span>{label}</span>
                                  </label>
                                );
                              })}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="target_weight_kg"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Meta de peso (opcional)
                            </FormLabel>
                            <FormDescription>
                              Quero chegar em...
                            </FormDescription>
                            <FormControl>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  step="0.1"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value
                                        ? Number(e.target.value)
                                        : undefined
                                    )
                                  }
                                />
                                <span className="text-sm text-muted-foreground">
                                  kg
                                </span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="target_timeframe"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prazo desejado</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="1_mes">1 mês</SelectItem>
                                <SelectItem value="3_meses">3 meses</SelectItem>
                                <SelectItem value="6_meses">6 meses</SelectItem>
                                <SelectItem value="1_ano">1 ano</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="activity_level"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nível de atividade física</FormLabel>
                            <FormControl>
                              <RadioGroup
                                value={field.value}
                                onValueChange={field.onChange}
                                className="grid gap-3 md:grid-cols-2"
                              >
                                <label className="flex cursor-pointer flex-col gap-1 rounded-lg border bg-background/60 p-3 text-sm hover:bg-accent/40 transition-colors">
                                  <div className="flex items-center gap-2">
                                    <RadioGroupItem
                                      value="sedentario"
                                      id="sedentario"
                                    />
                                    <span className="font-medium">
                                      Sedentário
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    Pouco ou nenhum exercício
                                  </span>
                                </label>

                                <label className="flex cursor-pointer flex-col gap-1 rounded-lg border bg-background/60 p-3 text-sm hover:bg-accent/40 transition-colors">
                                  <div className="flex items-center gap-2">
                                    <RadioGroupItem value="leve" id="leve" />
                                    <span className="font-medium">Leve</span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    1–3x por semana
                                  </span>
                                </label>

                                <label className="flex cursor-pointer flex-col gap-1 rounded-lg border bg-background/60 p-3 text-sm hover:bg-accent/40 transition-colors">
                                  <div className="flex items-center gap-2">
                                    <RadioGroupItem
                                      value="moderado"
                                      id="moderado"
                                    />
                                    <span className="font-medium">
                                      Moderado
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    3–5x por semana
                                  </span>
                                </label>

                                <label className="flex cursor-pointer flex-col gap-1 rounded-lg border bg-background/60 p-3 text-sm hover:bg-accent/40 transition-colors">
                                  <div className="flex items-center gap-2">
                                    <RadioGroupItem
                                      value="intenso"
                                      id="intenso"
                                    />
                                    <span className="font-medium">
                                      Intenso
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    6–7x por semana
                                  </span>
                                </label>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="training_preference"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preferência de treino</FormLabel>
                            <div className="grid gap-2 md:grid-cols-2">
                              {[
                                [
                                  "casa_sem_equip",
                                  "Em casa (sem equipamento)",
                                ],
                                [
                                  "casa_com_equip",
                                  "Em casa (com equipamentos básicos)",
                                ],
                                ["academia", "Academia completa"],
                              ].map(([value, label]) => {
                                const current = (field.value || []) as string[];
                                const checked = current.includes(value as string);
                                return (
                                  <label
                                    key={value}
                                    className="flex items-start gap-2 rounded-lg border bg-background/60 px-3 py-2 text-sm cursor-pointer hover:bg-accent/40 transition-colors"
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(next) => {
                                        const base = (field.value || []) as string[];
                                        if (next) {
                                          field.onChange([...base, value]);
                                        } else {
                                          field.onChange(base.filter((v) => v !== value));
                                        }
                                      }}
                                    />
                                    <span>{label}</span>
                                  </label>
                                );
                              })}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dietary_restrictions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Restrições alimentares</FormLabel>
                            <div className="grid gap-2 md:grid-cols-2">
                              {[
                                ["nenhuma", "Nenhuma"],
                                ["vegetariano", "Vegetariano"],
                                ["vegano", "Vegano"],
                                [
                                  "intolerante_lactose",
                                  "Intolerante à lactose",
                                ],
                                [
                                  "intolerante_gluten",
                                  "Intolerante ao glúten",
                                ],
                                ["diabetes", "Diabetes"],
                                ["outro", "Outro"],
                              ].map(([value, label]) => {
                                const checked = field.value?.includes(
                                  value as string
                                );
                                return (
                                  <label
                                    key={value}
                                    className="flex items-start gap-2 rounded-lg border bg-background/60 px-3 py-2 text-sm cursor-pointer hover:bg-accent/40 transition-colors"
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(next) => {
                                        if (next) {
                                          if (value === "nenhuma") {
                                            field.onChange(["nenhuma"]);
                                          } else {
                                            field.onChange([
                                              ...(field.value || []).filter(
                                                (v) => v !== "nenhuma"
                                              ),
                                              value,
                                            ]);
                                          }
                                        } else {
                                          field.onChange(
                                            (field.value || []).filter(
                                              (v) => v !== value
                                            )
                                          );
                                        }
                                      }}
                                    />
                                    <span>{label}</span>
                                  </label>
                                );
                              })}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {form.watch("dietary_restrictions").includes("outro") && (
                        <FormField
                          control={form.control}
                          name="dietary_other"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descreva sua restrição</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Ex: alergia a frutos do mar"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  )}

                  {step === 5 && (
                    <div className="space-y-6">
                      <p className="text-sm text-muted-foreground">
                        Quer receber dicas, lembretes e check-ins rápidos pelo
                        WhatsApp?
                      </p>

                      <FormField
                        control={form.control}
                        name="whatsapp_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número de WhatsApp</FormLabel>
                            <FormDescription>
                              Formato brasileiro, com DDD. Ex: (11) 98765-4321
                            </FormDescription>
                            <FormControl>
                              <Input
                                placeholder="(11) 98765-4321"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="whatsapp_opt_in"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start gap-3 rounded-lg border bg-background/60 p-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm">
                                Aceito receber mensagens
                              </FormLabel>
                              <FormDescription>
                                Você pode cancelar a qualquer momento nas
                                configurações.
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Navigation buttons */}
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={step === 1 || loadingSubmit}
                      onClick={goBack}
                    >
                      Voltar
                    </Button>

                    {step < totalSteps && (
                      <Button
                        type="button"
                        onClick={goNext}
                        disabled={loadingSubmit}
                      >
                        Próximo
                      </Button>
                    )}

                    {step === totalSteps && (
                      <Button type="submit" disabled={loadingSubmit}>
                        {loadingSubmit ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Criando seu plano...
                          </>
                        ) : (
                          "Finalizar e Criar Meu Plano"
                        )}
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Vita side card */}
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <Card className="glass h-full flex flex-col justify-between overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                    <span className="absolute inline-flex h-8 w-8 rounded-full bg-primary opacity-40 animate-pulse" />
                    <span className="relative inline-flex h-4 w-4 rounded-full bg-primary" />
                  </span>
                  Vita
                </CardTitle>
                <CardDescription className="space-y-1">
                  <p className="font-medium">
                    {vitaMessages[step].title}
                  </p>
                  <p>{vitaMessages[step].text}</p>
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
