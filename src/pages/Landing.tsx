import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Utensils, Dumbbell, TrendingUp, ArrowRight, ChevronDown, ShieldCheck, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useVitaVoiceConversation } from "@/hooks/useVitaVoiceConversation";

const Landing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [demoStarts, setDemoStarts] = useState(0);

  const { conversation, isConnecting, startConversation, stopConversation } =
    useVitaVoiceConversation({
      agentType: "demo",
    });

  const steps = [
    {
      title: "1️⃣ Defina seu objetivo de emagrecimento",
      description: "Informe seu peso, rotina e preferências.",
    },
    {
      title: "2️⃣ Receba sua orientação personalizada",
      description: "A Vita cria uma estratégia adaptada à sua realidade.",
    },
    {
      title: "3️⃣ Acompanhamento diário",
      description: "Você recebe orientações, ajustes e motivação todos os dias.",
    },
    {
      title: "4️⃣ Evolução constante",
      description: "Acompanhe seu progresso e construa hábitos sustentáveis.",
    },
  ];

  const pricingPlans = [
    {
      name: "Gratuito",
      price: "R$ 0",
      features: [
        "Teste o acompanhamento",
        "Conversas limitadas com a Vita",
        "Acesso básico à plataforma",
      ],
      cta: "Começar grátis",
      featured: false,
    },
    {
      name: "Premium",
      price: "R$ 29,90",
      period: "/mês",
      features: [
        "Conversas ilimitadas",
        "Acompanhamento completo",
        "Integração com WhatsApp",
        "Relatórios de evolução",
        "Suporte prioritário",
      ],
      cta: "Assinar Premium",
      featured: true,
    },
  ];

  const handleDemoOrbClick = async () => {
    if (conversation.status === "disconnected") {
      if (demoStarts >= 5) {
        toast({
          title: "Demo concluída",
          description: "Para continuar falando com o Vita Nutri IA, crie sua conta gratuita.",
        });
        navigate("/auth");
        return;
      }

      await startConversation();
      setDemoStarts((prev) => prev + 1);
    } else {
      await stopConversation();
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden pb-16 md:pb-24"
        style={{
          background: "var(--gradient-hero)",
        }}
      >
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.15) 1px, transparent 0)` ,
              backgroundSize: "50px 50px",
            }}
          />
        </div>

        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6 max-w-4xl mx-auto"
          >
            <h1 className="text-4xl sm:text-5xl md:text-7xl text-gradient leading-tight drop-shadow-sm">
              Emagreça com acompanhamento diário e constante
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Tenha um assistente que te orienta todos os dias, com saúde e sem dietas malucas.
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Pare de começar dietas e desistir no meio do caminho. O DietaFY te acompanha diariamente para criar hábitos reais e emagrecer de forma sustentável.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                size="lg"
                className="text-lg px-8 py-6 glow"
                onClick={() => navigate("/auth?mode=signup")}
              >
                Começar grátis agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6"
                onClick={() =>
                  document
                    .getElementById("como-funciona")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Ver como funciona
              </Button>
            </div>
            <p className="mt-4 text-[11px] md:text-xs text-muted-foreground flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-primary" />
                <span>7 dias de garantia</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Lock className="h-3 w-3 text-primary" />
                <span>Não precisa de cartão</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Check className="h-3 w-3 text-primary" />
                <span>Sem fidelidade</span>
              </span>
            </p>
          </motion.div>

          {/* DEMONSTRAÇÃO AO VIVO - título e descrição */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mt-16 mb-6 text-center"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-gradient">
              Teste agora seu acompanhamento de emagrecimento
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              Converse gratuitamente com a Vita Nutri IA e veja como seria ter um assistente te acompanhando todos os dias para emagrecer com saúde.
            </p>
          </motion.div>

          {/* Vita Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 mb-16 md:mb-24 flex justify-center px-4"
          >
            <div
              className="relative w-full max-w-md rounded-3xl border border-border/40 bg-gradient-to-br from-card/98 via-background/95 to-card/90 shadow-[0_22px_70px_-30px_hsl(var(--primary)/0.75)] flex flex-col items-center justify-center py-8 md:py-10 px-6 gap-8"
            >
              {/* Top demo labels */}
              <div className="flex w-full flex-col items-center justify-between gap-2 sm:flex-row sm:items-center text-[0.65rem] sm:text-xs md:text-sm text-muted-foreground">
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-primary animate-pulse" />
                <span className="font-semibold tracking-[0.22em] uppercase text-[0.7rem] sm:text-[0.8rem] md:text-sm">
                  <span className="text-gradient">DEMONSTRAÇÃO AO VIVO DO VITA NUTRI IA</span>
                </span>
              </div>
                <span className="mt-0.5 sm:mt-0 font-medium px-2 py-0.5 rounded-full bg-muted/60 text-[0.6rem] sm:text-[0.7rem] md:text-xs text-muted-foreground">
                  Voz natural em português
                </span>
              </div>

              {/* Orb + CTA */}
              <div className="relative flex flex-col items-center justify-center gap-4 w-full">
                <div
                  className="pointer-events-none absolute inset-6 md:inset-8 rounded-[999px] opacity-60 blur-2xl"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 30%, hsl(var(--primary) / 0.35), transparent 60%)",
                  }}
                />

                <div className="relative flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleDemoOrbClick}
                    disabled={isConnecting}
                    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary rounded-full"
                  >
                    <div
                      className="h-32 w-32 rounded-full glow animate-pulse-glow flex items-center justify-center text-center text-[0.65rem] sm:text-xs md:text-sm font-semibold tracking-[0.18em] uppercase text-background/80 px-4"
                      style={{
                        background: "var(--gradient-primary)",
                      }}
                    >
                      {isConnecting
                        ? "Conectando com o Vita..."
                        : conversation.status === "connected"
                        ? conversation.isSpeaking
                          ? "Vita falando • Clique para interromper"
                          : "Conectado • Clique para encerrar"
                        : "Clique para ouvir o Vita ao vivo"}
                    </div>
                  </button>
                </div>

                <div className="flex flex-col items-center gap-3 w-full">
                  <p className="text-[0.7rem] sm:text-xs md:text-sm text-muted-foreground max-w-sm text-center">
                    Converse gratuitamente com a Vita Nutri IA em tempo real e veja como seria ter um assistente te acompanhando todos os dias para emagrecer com saúde.
                  </p>

                  <div className="flex flex-col items-center gap-2 w-full">
                    <div className="flex flex-wrap justify-center gap-2 text-[0.7rem] sm:text-xs md:text-sm text-muted-foreground">
                      <span className="px-3 py-1 rounded-full bg-muted/80">5 mensagens grátis</span>
                      <span className="px-3 py-1 rounded-full bg-muted/80">Sem cartão</span>
                      <span className="px-3 py-1 rounded-full bg-muted/80">Sem compromisso</span>
                    </div>
                    <Button
                      size="sm"
                      className="mt-1"
                      onClick={handleDemoOrbClick}
                      disabled={isConnecting}
                    >
                      Testar grátis agora
                    </Button>
                  </div>

                  <Collapsible
                    open={isHelpOpen}
                    onOpenChange={setIsHelpOpen}
                    className="w-full max-w-sm"
                  >
                    <Card className="w-full border border-border/70 bg-card/95 rounded-2xl shadow-sm hover:shadow-lg/80 hover-scale transition-shadow duration-200 backdrop-blur-sm">
                      <CardContent className="pt-3 pb-3 space-y-2 text-xs md:text-sm">
                        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 text-left">
                          <div className="space-y-1">
                            <p className="text-[11px] md:text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Como o Vita Nutri IA te ajuda
                            </p>
                            <p className="text-[0.7rem] sm:text-xs text-muted-foreground/90 max-w-xl">
                              Toque para ver exemplos de perguntas e como o Vita usa seus dados.
                            </p>
                          </div>
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted/80 text-muted-foreground shadow-sm animate-scale-in">
                            <ChevronDown className="h-3.5 w-3.5" />
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-3 pt-2">
                          <p className="text-[0.75rem] sm:text-xs text-muted-foreground leading-relaxed">
                            O Vita cruza os dados do seu DietaFY (peso, objetivo, refeições e treinos recentes) para te dar respostas práticas para <span className="font-medium">hoje</span>: o que ajustar nas próximas refeições, como montar o dia para emagrecer com saúde e como reduzir cansaço e ansiedade sem radicalizar.
                          </p>
                          <div className="grid gap-3 md:grid-cols-3 text-[0.7rem] sm:text-xs md:text-[13px]">
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">Para emagrecer no verão</p>
                              <ul className="space-y-1 text-muted-foreground">
                                <li>• "O que ajustar hoje pra secar barriga até o verão?"</li>
                                <li>• "Vita, monta um dia de alimentação leve pra mim hoje"</li>
                              </ul>
                            </div>
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">Sono e disposição</p>
                              <ul className="space-y-1 text-muted-foreground">
                                <li>• "O que mudar hoje pra dormir melhor e acordar menos cansado(a)?"</li>
                                <li>• "Me indica uma rotina simples pra relaxar antes de dormir"</li>
                              </ul>
                            </div>
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">Mounjaro, açúcar e colesterol</p>
                              <ul className="space-y-1 text-muted-foreground">
                                <li>• "Tô usando Mounjaro, como organizar minhas refeições de hoje?"</li>
                                <li>• "O que comer hoje pra ajudar no açúcar e colesterol sem pirar?"</li>
                              </ul>
                            </div>
                          </div>
                          <p className="text-[0.7rem] sm:text-xs text-muted-foreground/90">
                            Dica: fale com o Vita como se fosse <span className="font-medium">o seu nutricionista pessoal</span>. Conta como tá seu dia, o que anda comendo e o que te incomoda — ele te mostra o próximo passo mais inteligente pra agora, sem dieta maluca.
                          </p>
                        </CollapsibleContent>
                      </CardContent>
                    </Card>
                  </Collapsible>
                </div>
              </div>

              {/* Voice info removed per request */}
            </div>
          </motion.div>
        </div>
      </section>

      {/* PROBLEMA & SOLUÇÃO */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-3xl space-y-16">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span>❌</span>{" "}
              <span className="text-gradient">O problema</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-4">
              Por que emagrecer parece tão difícil?
            </p>
            <ul className="space-y-2 text-base md:text-lg text-muted-foreground">
              <li>• Você até começa motivado, mas perde o ritmo</li>
              <li>• Fica sozinho depois que monta a dieta</li>
              <li>• Um deslize vira desistência</li>
              <li>• Falta constância, não força de vontade</li>
              <li>• Apps comuns não te acompanham de verdade</li>
            </ul>
            <p className="mt-4 text-base md:text-lg font-medium text-foreground">
              👉 O problema não é você. É a falta de acompanhamento diário.
            </p>
          </div>

          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span>✅</span>{" "}
              <span className="text-gradient">A solução</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-4">
              O DietaFY resolve isso com acompanhamento real.
            </p>
            <p className="text-base md:text-lg text-muted-foreground mb-2">
              O DietaFY não é mais um app de dieta. É um assistente inteligente focado em emagrecimento, que te acompanha todos os dias, orienta suas escolhas e te ajuda a manter constância.
            </p>
            <ul className="mt-4 space-y-1 text-base md:text-lg text-muted-foreground">
              <li>• Sem terrorismo nutricional.</li>
              <li>• Sem dietas extremas.</li>
              <li>• Sem culpa.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* VITA NUTRI IA + WHATSAPP */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl grid gap-12 md:grid-cols-2 items-start">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              <span>🤖</span>{" "}
              <span className="text-gradient">Vita Nutri IA</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-4">
              Seu assistente de emagrecimento, todos os dias.
            </p>
            <p className="text-base md:text-lg text-muted-foreground mb-4">
              A Vita Nutri IA conversa com você de forma natural e te orienta no dia a dia para emagrecer com saúde.
            </p>
            <ul className="space-y-2 text-base md:text-lg text-muted-foreground">
              <li>• Orientações simples para suas refeições</li>
              <li>• Criação de hábitos saudáveis</li>
              <li>• Ajustes conforme sua rotina</li>
              <li>• Motivação sem julgamentos</li>
              <li>• Foco em constância, não perfeição</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              <span>📲</span>{" "}
              <span className="text-gradient">Acompanhamento no WhatsApp</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-4">
              Emagreça com acompanhamento direto no WhatsApp.
            </p>
            <p className="text-base md:text-lg text-muted-foreground mb-4">
              Nada de baixar um app e ser esquecido. Com o plano Premium, a Vita te acompanha pelo WhatsApp, onde você já está todos os dias.
            </p>
            <ul className="space-y-2 text-base md:text-lg text-muted-foreground">
              <li>• Lembretes de refeições</li>
              <li>• Check-ins diários</li>
              <li>• Orientações personalizadas</li>
              <li>• Motivação constante</li>
            </ul>
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="py-24 px-4 bg-muted/10">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14 animate-fade-in">
            <p className="text-xs md:text-sm font-semibold tracking-[0.28em] uppercase text-primary mb-3">
              Provas reais de emagrecimento com constância
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-gradient">
              Resultados de quem parou de tentar sozinho
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              Relatos de quem está sendo acompanhado pela Vita Nutri IA todos os dias.
            </p>
          </div>

          <div className="grid gap-6 sm:gap-7 sm:grid-cols-2 md:grid-cols-3 items-stretch">
            <div className="glass-card rounded-2xl border border-border/70 bg-background/95 p-6 flex flex-col gap-5 hover-lift hover-scale h-full shadow-lg animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[0.7rem] text-muted-foreground">
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold whitespace-nowrap">
                  -3,8 kg em 6 semanas
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-muted/70 whitespace-nowrap">
                  Acompanhamento diário com a Vita
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[0.7rem] text-muted-foreground">
                <div className="flex flex-col gap-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-muted/60 font-semibold text-foreground text-xs sm:text-[0.8rem]">
                    Antes: 84,2 kg
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-muted/40 text-xs sm:text-[0.8rem]">
                    Depois: 80,4 kg
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-muted/30 text-xs sm:text-[0.8rem]">
                  6 semanas de acompanhamento
                </span>
              </div>
              <div className="rounded-xl bg-muted/10 border border-primary/15 px-3.5 py-3.5 text-left text-[0.82rem] leading-relaxed shadow-md">
                <p className="font-semibold mb-1.5 text-foreground">
                  "Nunca consegui manter uma dieta por mais de 10 dias"
                </p>
                <p className="text-muted-foreground text-[0.8rem]">
                  Agora com a Vita me guiando todo dia eu nem sinto que estou "de dieta". Só fui ajustando com calma e o peso começou a descer.
                </p>
              </div>
              <p className="text-[0.78rem] text-muted-foreground leading-relaxed">
                Ana, 32 anos — perdeu 3,8 kg focando em constância e pequenas mudanças diárias.
              </p>
            </div>

            <div className="glass-card rounded-2xl border border-border/70 bg-background/95 p-6 flex flex-col gap-5 hover-lift hover-scale h-full shadow-lg animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[0.7rem] text-muted-foreground">
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold whitespace-nowrap">
                  +72% de constância nas refeições
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-muted/70 whitespace-nowrap">
                  Conversas semanais com a Vita
                </span>
              </div>
              <div className="flex flex-col gap-2 text-[0.7rem] text-muted-foreground">
                <span className="px-2.5 py-0.5 rounded-full bg-muted/30 w-fit text-xs sm:text-[0.8rem]">
                  Antes: pulava 2 refeições por dia
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-muted/30 w-fit text-xs sm:text-[0.8rem]">
                  Depois: 3 refeições + 1 lanche consciente
                </span>
              </div>
              <div className="rounded-xl bg-muted/10 border border-primary/15 px-3.5 py-3.5 text-left text-[0.82rem] leading-relaxed shadow-md">
                <p className="font-semibold mb-1.5 text-foreground">
                  "Mando foto das refeições e ela ajusta tudo pra mim"
                </p>
                <p className="text-muted-foreground text-[0.8rem]">
                  Quando vejo que vou exagerar, chamo a Vita no Whats e ela já me mostra um jeito mais leve de montar o prato.
                </p>
              </div>
              <p className="text-[0.78rem] text-muted-foreground leading-relaxed">
                Lucas, 27 anos — começou a organizar melhor as refeições e reduziu beliscos à noite.
              </p>
            </div>

            <div className="glass-card rounded-2xl border border-border/70 bg-background/95 p-6 flex flex-col gap-5 hover-lift hover-scale h-full shadow-lg animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[0.7rem] text-muted-foreground">
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold whitespace-nowrap">
                  -42% de episódios de "tudo ou nada"
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-muted/70 whitespace-nowrap">
                  Check-ins diários sem julgamento
                </span>
              </div>
              <div className="flex flex-col gap-2 text-[0.7rem] text-muted-foreground">
                <span className="px-2.5 py-0.5 rounded-full bg-muted/30 w-fit text-xs sm:text-[0.8rem]">
                  Antes: desistia após um deslize
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-muted/30 w-fit text-xs sm:text-[0.8rem]">
                  Depois: ajusta o resto do dia com a Vita
                </span>
              </div>
              <div className="rounded-xl bg-muted/10 border border-primary/15 px-3.5 py-3.5 text-left text-[0.82rem] leading-relaxed shadow-md">
                <p className="font-semibold mb-1.5 text-foreground">
                  "Parei de sentir culpa quando fujo um pouco"
                </p>
                <p className="text-muted-foreground text-[0.8rem]">
                  Em vez de desistir quando como algo fora, a Vita me mostra como compensar no resto do dia. Isso mudou tudo pra mim.
                </p>
              </div>
              <p className="text-[0.78rem] text-muted-foreground leading-relaxed">
                Carla, 41 anos — emagrecendo sem terrorismo nutricional e sem dietas extremas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="py-24 px-4 bg-muted/10">

        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">
              <span>🧭</span>{" "}
              <span className="text-gradient">Como funciona</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Simples, prático e focado em resultados reais.
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-8">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="flex gap-4 items-start"
              >
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center font-bold text-white shrink-0"
                  style={{
                    background: "var(--gradient-primary)",
                  }}
                >
                  {idx + 1}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-lg font-semibold">{step.title}</p>
                  <p className="text-base text-muted-foreground">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* MAIS DO QUE EMAGRECIMENTO */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span>🧠</span>{" "}
            <span className="text-gradient">Mais do que emagrecimento</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-4">
            Além de te ajudar a emagrecer, o DietaFY também auxilia em:
          </p>
          <ul className="space-y-2 text-base md:text-lg text-muted-foreground mb-4">
            <li>• Organização alimentar</li>
            <li>• Consumo de água</li>
            <li>• Sono e descanso</li>
            <li>• Atividade física</li>
            <li>• Redução do estresse</li>
          </ul>
          <p className="text-base md:text-lg text-muted-foreground">
            Tudo integrado ao seu objetivo principal: emagrecer com saúde.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">
              <span>💰</span>{" "}
              <span className="text-gradient">Planos</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Comece grátis e evolua quando estiver pronto.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {pricingPlans.map((plan, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <Card
                  className={`${plan.featured ? "glass shadow-2xl glow border-primary" : ""} relative`}
                >
                  {plan.featured && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span
                        className="px-4 py-1 rounded-full text-sm font-bold text-white"
                        style={{
                          background: "var(--gradient-primary)",
                        }}
                      >
                        Mais Popular
                      </span>
                    </div>
                  )}
                  <CardContent className="pt-6">
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold">{plan.price}</span>
                        {plan.period && (
                          <span className="text-muted-foreground">{plan.period}</span>
                        )}
                      </div>
                    </div>
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={plan.featured ? "default" : "outline"}
                      size="lg"
                      onClick={() => {
                        if (plan.featured) {
                          window.open("https://pay.kiwify.com.br/4DKAQbY", "_blank");
                        } else {
                          navigate("/auth?mode=signup");
                        }
                      }}
                    >
                      {plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Garantia e Compra Segura */}
      <section className="pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="rounded-2xl border bg-background/80 shadow-sm px-6 py-8 md:px-10 md:py-10 flex flex-col md:flex-row gap-8 items-start">
            {/* Coluna esquerda: mensagem principal */}
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50/80 dark:bg-emerald-900/20 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                <ShieldCheck className="h-4 w-4" />
                <span>Garantia de 7 dias • Compra segura pela Kiwify</span>
              </div>

              <h3 className="text-2xl md:text-3xl font-bold">
                Teste o DietaFY Premium por 7 dias sem risco
              </h3>

              <p className="text-base md:text-lg text-muted-foreground">
                Se dentro de 7 dias você sentir que o acompanhamento Premium da Vita não é pra você, é só solicitar o cancelamento que devolvemos 100% do seu investimento.
              </p>

              <ul className="space-y-2 text-sm md:text-base text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 mt-1" />
                  <span>Garantia incondicional de 7 dias – sem letras miúdas.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Lock className="h-4 w-4 text-emerald-500 mt-1" />
                  <span>Pagamento processado com segurança pela Kiwify, uma das principais plataformas de pagamento do Brasil.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 mt-1" />
                  <span>Acesso imediato ao seu plano Premium (Ultra Premium DietaFY) após a confirmação do pagamento.</span>
                </li>
              </ul>
            </div>

            {/* Coluna direita: reforço e CTA */}
            <div className="w-full md:w-72 space-y-4">
              <div className="rounded-xl border bg-muted/40 px-4 py-4 text-sm">
                <p className="font-semibold mb-1">Como funciona na prática?</p>
                <p className="text-muted-foreground mb-2">
                  Você faz o pagamento pela Kiwify, recebe o acesso ao DietaFY Premium e testa o acompanhamento completo.
                </p>
                <p className="text-muted-foreground">
                  Se não fizer sentido pra você, basta solicitar o cancelamento em até 7 dias.
                </p>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={() => window.open("https://pay.kiwify.com.br/4DKAQbY", "_blank")}
              >
                Garantir meu acesso seguro
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Pagamento seguro pela Kiwify • Garantia de 7 dias • Sem fidelidade
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-4 bg-muted/20">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4">
              <span>❓</span>{" "}
              <span className="text-gradient">Perguntas Frequentes</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Tire suas dúvidas antes de começar
            </p>
          </motion.div>

          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="item-1" className="bg-background/50 rounded-lg border px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="font-semibold text-base md:text-lg">
                  O DietaFY substitui um nutricionista?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base">
                Não. O DietaFY é uma ferramenta de acompanhamento diário que te ajuda a manter constância nos seus objetivos de emagrecimento. Recomendamos sempre consultar profissionais de saúde para avaliação individualizada, especialmente se você tem condições médicas específicas.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="bg-background/50 rounded-lg border px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="font-semibold text-base md:text-lg">
                  Preciso fazer dietas radicais?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base">
                Não! Nossa abordagem é focada em hábitos sustentáveis e constância. A Vita te ajuda a fazer pequenos ajustes diários nas suas refeições, sem terrorismo nutricional ou dietas impossíveis de seguir. O objetivo é criar mudanças que você consiga manter a longo prazo.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="bg-background/50 rounded-lg border px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="font-semibold text-base md:text-lg">
                  Como funciona o plano gratuito?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base">
                No plano gratuito você tem acesso básico à plataforma e conversas limitadas com a Vita Nutri IA. É perfeito para testar o acompanhamento e entender como funciona antes de decidir pelo plano Premium. Não pedimos cartão de crédito para começar.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="bg-background/50 rounded-lg border px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="font-semibold text-base md:text-lg">
                  O que está incluído no plano Premium?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base">
                O plano Premium (R$ 29,90/mês) inclui conversas ilimitadas com a Vita, acompanhamento completo pelo WhatsApp, relatórios de evolução detalhados e suporte prioritário. É ideal para quem quer um acompanhamento constante e personalizado todos os dias.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="bg-background/50 rounded-lg border px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="font-semibold text-base md:text-lg">
                  Quanto tempo leva para ver resultados?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base">
                Os resultados variam de pessoa para pessoa e dependem de diversos fatores como metabolismo, rotina e constância. Nossa abordagem prioriza mudanças sustentáveis ao longo do tempo, não promessas milagrosas. Com acompanhamento diário, a maioria dos usuários começa a perceber mudanças nos hábitos nas primeiras semanas.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="bg-background/50 rounded-lg border px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="font-semibold text-base md:text-lg">
                  Como a Vita Nutri IA me acompanha pelo WhatsApp?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base">
                No plano Premium, a Vita te envia lembretes de refeições, check-ins diários e orientações personalizadas direto no seu WhatsApp. Você pode mandar fotos das suas refeições, tirar dúvidas e receber ajustes em tempo real, no app que você já usa todo dia.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7" className="bg-background/50 rounded-lg border px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="font-semibold text-base md:text-lg">
                  Posso cancelar quando quiser?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base">
                Sim! Você pode cancelar sua assinatura Premium a qualquer momento sem burocracia. Não há período de fidelidade ou multas por cancelamento. Acreditamos que você deve continuar porque está tendo resultados, não por estar preso a um contrato.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8" className="bg-background/50 rounded-lg border px-6">
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="font-semibold text-base md:text-lg">
                  Meus dados estão seguros?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base">
                Sim. Levamos a segurança dos seus dados muito a sério. Utilizamos suas informações apenas para personalizar sua experiência no DietaFY e não vendemos seus dados pessoais para terceiros. Você pode consultar nossa Política de Privacidade completa a qualquer momento.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span>🟢</span>{" "}
            <span className="text-gradient">Emagreça com acompanhamento diário e constante</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-6">
            Pare de tentar sozinho. Comece hoje a ter acompanhamento todos os dias.
          </p>
          <Button
             size="lg"
             className="text-lg px-8 py-6 glow"
             onClick={() => navigate("/auth?mode=signup")}
           >
             Começar grátis agora
             <ArrowRight className="ml-2 h-5 w-5" />
           </Button>
           <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs md:text-sm text-muted-foreground">
             <span className="inline-flex items-center gap-1">
               <ShieldCheck className="h-3.5 w-3.5 text-primary" />
               <span>7 dias de garantia</span>
             </span>
             <span className="inline-flex items-center gap-1">
               <Lock className="h-3.5 w-3.5 text-primary" />
               <span>Pagamento seguro pela Kiwify</span>
             </span>
             <span className="inline-flex items-center gap-1">
               <Check className="h-3.5 w-3.5 text-primary" />
               <span>Sem fidelidade</span>
             </span>
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold text-gradient mb-2">DietaFY</h3>
              <p className="text-sm text-muted-foreground">
                Transformando vidas através da saúde inteligente
              </p>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="/sobre" className="hover:text-primary transition-colors cursor-pointer">
                Sobre
              </a>
              <a
                href="/privacidade"
                className="hover:text-primary transition-colors cursor-pointer"
              >
                Privacidade
              </a>
              <a href="/contato" className="hover:text-primary transition-colors cursor-pointer">
                Contato
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
