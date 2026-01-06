import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const upgradeSchema = z.object({
  email: z.string().email("E-mail inválido"),
  fullName: z.string().min(3, "Informe seu nome completo"),
  cpf: z
    .string()
    .min(11, "CPF inválido")
    .max(14)
    .regex(/^[0-9\.\-]+$/, "Use apenas números e pontuação do CPF"),
});

type UpgradeFormValues = z.infer<typeof upgradeSchema>;

const Upgrade = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<UpgradeFormValues>({
    resolver: zodResolver(upgradeSchema),
    defaultValues: {
      email: "",
      fullName: "",
      cpf: "",
    },
  });

  useEffect(() => {
    const loadUser = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserId(user.id);
      form.setValue("email", user.email ?? "");

      const { data, error } = await supabase
        .from("user_profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Erro ao carregar perfil para upgrade", error);
      }
      if (data?.full_name) {
        form.setValue("fullName", data.full_name);
      }
      setLoading(false);
    };

    loadUser();
  }, [form, navigate]);

  const onSubmit = async (values: UpgradeFormValues) => {
    if (!userId) return;

    try {
      const { error } = await supabase.from("upgrade_intents").insert({
        user_id: userId,
        email: values.email,
        full_name: values.fullName,
        cpf: values.cpf,
      });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: "Pedido registrado",
        description: "Em breve você receberá instruções de pagamento por e-mail.",
      });
    } catch (error) {
      console.error("Erro ao registrar intenção de upgrade", error);
      toast({
        title: "Erro ao enviar pedido",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-10 w-40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Upgrade para o Premium</CardTitle>
          <CardDescription>
            Desbloqueie toda a biblioteca de treinos do DietaFY: treinos premium, blocos semanais estruturados e
            variações guiadas pelo Vita para você saber exatamente o que fazer em cada fase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4 text-sm">
              <p>
                Obrigado! Em breve você receberá instruções de pagamento por e-mail. Assim que o pagamento for
                confirmado, seu plano será atualizado para <strong>Premium</strong> e os treinos avançados serão
                liberados automaticamente.
              </p>
              <Button className="w-full" onClick={() => navigate("/dashboard")}>
                Voltar ao app
              </Button>
            </div>
          ) : (
            <div className="space-y-6 text-sm">
              <div className="space-y-2">
                <h2 className="text-base font-semibold tracking-tight">O que muda nos treinos ao virar Premium?</h2>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Acesso imediato a todos os treinos premium, sem cadeado.</li>
                  <li>
                    Blocos semanais de treino (ex.: 4 semanas de HIIT + força) prontos para seguir, sem precisar montar
                    planilhas.
                  </li>
                  <li>
                    Variações por exercício (fácil, padrão, avançado) para adaptar cargas e volume conforme sua
                    evolução.
                  </li>
                  <li>
                    Sugestões mais inteligentes do Vita, seu nutricionista pessoal, combinando alimentação, treino e recuperação,
                    usando os treinos premium como base.
                  </li>
                </ul>
              </div>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" {...form.register("email")} />
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input id="fullName" type="text" {...form.register("fullName")} />
                  {form.formState.errors.fullName && (
                    <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input id="cpf" type="text" placeholder="000.000.000-00" {...form.register("cpf")} />
                  {form.formState.errors.cpf && (
                    <p className="text-xs text-destructive">{form.formState.errors.cpf.message}</p>
                  )}
                </div>
                <Button 
                  type="button" 
                  className="w-full mt-2"
                  onClick={() => window.open("https://buy.stripe.com/4gMdR97Nb9angtKfVj7bW02", "_blank")}
                >
                  Assinar Premium
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Upgrade;
