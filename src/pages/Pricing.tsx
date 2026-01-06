import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { ShieldCheck, Lock, Check } from "lucide-react";
import { AuthenticatedLayout } from "@/components/layouts/AuthenticatedLayout";

const Pricing = () => {
  const navigate = useNavigate();
  const [planType, setPlanType] = useState<"free" | "premium" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlan = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("user_profiles")
        .select("plan_type")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        console.error("Erro ao carregar plano do usuário", error);
      }
      setPlanType((data?.plan_type as "free" | "premium") ?? "free");
      setLoading(false);
    };
    loadPlan();
  }, []);

  return (
    <AuthenticatedLayout>
      <div className="flex-1 overflow-y-auto bg-background flex flex-col items-center px-4 py-6">
      <header className="max-w-3xl w-full mb-8 text-center space-y-3">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Planos DietaFY</p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Escolha como quer evoluir com a Vita</h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
          Comece grátis e faça upgrade para desbloquear o potencial completo do DietaFY quando estiver pronto.
        </p>
        {loading ? (
          <div className="flex justify-center mt-2">
            <Skeleton className="h-6 w-24" />
          </div>
        ) : planType && (
          <div className="flex justify-center mt-2">
            <Badge variant="outline">Seu plano atual: {planType === "premium" ? "PREMIUM" : "FREE"}</Badge>
          </div>
        )}
      </header>

      <main className="grid gap-6 md:grid-cols-2 max-w-4xl w-full">
        <Card className="border-muted">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Gratuito</span>
              <Badge variant="outline">Ideal para começar</Badge>
            </CardTitle>
            <CardDescription>Use o básico do DietaFY sem pagar nada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-semibold">
              R$ 0
              <span className="text-base font-normal text-muted-foreground">/mês</span>
            </div>
            <ul className="text-sm space-y-2">
              <li>✓ Até 5 refeições registradas por dia</li>
              <li>✓ 10 mensagens/dia com a Vita</li>
              <li>✓ 3 treinos básicos liberados</li>
              <li>✗ Treinos premium, blocos semanais e variações extras</li>
              <li>✗ WhatsApp ativo</li>
              <li>✗ Análises avançadas e relatórios completos</li>
              <li>✗ Suporte prioritário</li>
            </ul>
            <Button variant="outline" className="w-full mt-2" onClick={() => navigate("/dashboard")}>
               Continuar grátis
             </Button>
             <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
               <span className="inline-flex items-center gap-1">
                 <Check className="h-3 w-3 text-primary" />
                 <span>Sem fidelidade</span>
               </span>
               <span className="inline-flex items-center gap-1">
                 <ShieldCheck className="h-3 w-3 text-primary" />
                 <span>Você pode migrar para o Premium quando quiser</span>
               </span>
             </div>
          </CardContent>
        </Card>

        <Card className="border-primary shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent pointer-events-none" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center justify-between">
              <span>Premium</span>
              <Badge variant="default">Mais popular ⭐</Badge>
            </CardTitle>
            <CardDescription>Para quem quer o acompanhamento completo da Vita.</CardDescription>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div className="text-3xl font-semibold">
              R$ 29,90
              <span className="text-base font-normal text-muted-foreground">/mês</span>
            </div>
            <ul className="text-sm space-y-2">
              <li>✓ Refeições ilimitadas</li>
              <li>✓ Mensagens ilimitadas com a Vita</li>
              <li>✓ Biblioteca completa com todos os treinos, inclusive premium</li>
              <li>✓ Blocos de treino organizados por semanas (4–8 semanas)</li>
              <li>✓ Variações extras por exercício (fácil, padrão, avançado)</li>
              <li>✓ Sugestões automáticas de treino com base no seu objetivo</li>
              <li>✓ WhatsApp ativo 24/7</li>
              <li>✓ Análises avançadas e relatórios completos</li>
              <li>✓ Planos personalizados e suporte prioritário</li>
              <li>✓ Sem anúncios</li>
            </ul>
            <Button className="w-full mt-2" onClick={() => window.open("https://buy.stripe.com/3cI5kD7NbeuH1yQ6kJ7bW01", "_blank")}>
               Assinar agora
             </Button>
             <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
               <span className="inline-flex items-center gap-1">
                 <ShieldCheck className="h-3 w-3 text-primary" />
                 <span>7 dias de garantia</span>
               </span>
               <span className="inline-flex items-center gap-1">
                  <Lock className="h-3 w-3 text-primary" />
                  <span>Pagamento seguro via Stripe</span>
                </span>
               <span className="inline-flex items-center gap-1">
                 <Check className="h-3 w-3 text-primary" />
                 <span>Sem fidelidade</span>
               </span>
             </div>
          </CardContent>
        </Card>
      </main>

      {/* Benefícios específicos em treinos */}
      <section className="mt-10 max-w-4xl w-full text-left space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Por que os treinos Premium valem a pena?</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          O plano Premium do DietaFY transforma a sua área de treinos em um verdadeiro programa estruturado, não apenas
          uma lista de exercícios soltos.
        </p>
        <div className="grid gap-4 md:grid-cols-3 text-sm">
          <div className="space-y-1">
            <h3 className="font-semibold">Mais exercícios e variações</h3>
            <p className="text-muted-foreground text-xs md:text-sm">
              Acesso a treinos completos com variações de carga, volume e dificuldade, pensados para casa e academia.
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold">Blocos semana a semana</h3>
            <p className="text-muted-foreground text-xs md:text-sm">
              Estruturas de 4 a 8 semanas para seguir uma progressão clara, sem precisar montar planilhas por conta
              própria.
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold">Treinos alinhados à Vita</h3>
            <p className="text-muted-foreground text-xs md:text-sm">
              A IA entende seus objetivos e usa os treinos Premium para sugerir o que fazer em cada dia, junto com
              alimentação e recuperação.
            </p>
          </div>
        </div>
      </section>

      {/* Comparação lado a lado */}
      <section className="mt-10 max-w-5xl w-full text-left space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Free vs Premium em detalhes</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Veja exatamente o que você já tem hoje no plano Free e o que desbloqueia ao virar Premium.
        </p>
        <div className="grid gap-4 md:grid-cols-2 text-sm">
          <Card className="border-muted">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>Free</span>
                <Badge variant="outline">Plano atual para começar</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-xs md:text-sm text-muted-foreground">
                <li>• Registro básico de refeições e água.</li>
                <li>• Acesso limitado à biblioteca de treinos (apenas treinos básicos).</li>
                <li>• Acompanhamento simples de peso, sono e estresse.</li>
                <li>• Experiência ideal para testar a rotina com a Vita.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>Premium</span>
                <Badge>Recomendado pela Vita</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-xs md:text-sm text-muted-foreground">
                <li>• Biblioteca completa de treinos, inclusive premium e avançados.</li>
                <li>• Blocos estruturados por semanas para seguir um plano claro.</li>
                <li>• Sugestões inteligentes combinando treino, dieta e recuperação.</li>
                <li>• Mais métricas, relatórios e acompanhamento próximo da Vita.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="mt-10 max-w-5xl w-full text-left space-y-4">
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Quem virou Premium com a Vita</h2>
        <p className="text-sm md:text-base text-muted-foreground">
          Histórias reais de pessoas que aproveitaram os treinos Premium e o acompanhamento completo.
        </p>
        <div className="grid gap-4 md:grid-cols-3 text-sm">
          <Card>
            <CardContent className="pt-4 space-y-2 text-xs md:text-sm">
              <p className="font-medium">Ana, 32 anos</p>
              <p className="text-muted-foreground">
                “Eu nunca sabia o que treinar. Com os blocos semanais, só abro o app e sigo o treino do dia.”
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 space-y-2 text-xs md:text-sm">
              <p className="font-medium">Marcos, 41 anos</p>
              <p className="text-muted-foreground">
                “Os treinos de casa Premium já valeram a assinatura. Consigo treinar mesmo nos dias mais corridos.”
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 space-y-2 text-xs md:text-sm">
              <p className="font-medium">Bianca, 27 anos</p>
              <p className="text-muted-foreground">
                “Ver tudo integrado: dieta, treino e sono, me deu clareza do que realmente faz diferença.”
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-10 max-w-4xl w-full text-left space-y-4 mb-10">
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Perguntas frequentes</h2>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="pagamento">
            <AccordionTrigger className="text-sm">Como funciona o pagamento do plano Premium?</AccordionTrigger>
            <AccordionContent className="text-xs md:text-sm text-muted-foreground">
              Hoje o upgrade é processado manualmente pela nossa equipe. Você preenche seus dados na tela de upgrade e
              recebe as instruções de pagamento por e-mail.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="cancelamento">
            <AccordionTrigger className="text-sm">Posso cancelar quando quiser?</AccordionTrigger>
            <AccordionContent className="text-xs md:text-sm text-muted-foreground">
              Sim. Caso não queira continuar, basta entrar em contato com o suporte. Seu acesso ao Premium permanece até
              o fim do período já pago.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="treinos-free">
            <AccordionTrigger className="text-sm">O que continuo tendo acesso mesmo sem ser Premium?</AccordionTrigger>
            <AccordionContent className="text-xs md:text-sm text-muted-foreground">
              Você mantém acesso ao plano Free: registro de refeições, água, alguns treinos básicos (especialmente de
              casa) e ao acompanhamento essencial da Vita.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
      </div>
    </AuthenticatedLayout>
  );
};

export default Pricing;
