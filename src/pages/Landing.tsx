import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Utensils, Dumbbell, TrendingUp, ArrowRight, ChevronDown, ShieldCheck, Lock, Star, Users, Zap, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useVitaVoiceConversation } from "@/hooks/useVitaVoiceConversation";
import ParticleBackground from "@/components/ParticleBackground";
import AudioWaves from "@/components/AudioWaves";
import { launchConfetti } from "@/lib/confetti";
import TypewriterText from "@/components/TypewriterText";

const Landing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [demoStarts, setDemoStarts] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(127);

  const { conversation, isConnecting, startConversation, stopConversation } =
    useVitaVoiceConversation({
      agentType: "demo",
    });

  // Simulate live user counter
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineUsers((prev) => prev + Math.floor(Math.random() * 3) - 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const steps = [
    {
      title: "Defina seu objetivo de emagrecimento",
      description: "Informe seu peso, rotina e preferências.",
      icon: "🎯",
    },
    {
      title: "Receba sua orientação personalizada",
      description: "A Vita cria uma estratégia adaptada à sua realidade.",
      icon: "✨",
    },
    {
      title: "Acompanhamento diário",
      description: "Você recebe orientações, ajustes e motivação todos os dias.",
      icon: "📱",
    },
    {
      title: "Evolução constante",
      description: "Acompanhe seu progresso e construa hábitos sustentáveis.",
      icon: "📈",
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

  const handleCTAClick = () => {
    launchConfetti();
    navigate("/auth?mode=signup");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Hero Section with Premium Effects */}
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden pb-16 md:pb-24 mesh-gradient-animated"
        style={{
          background: "var(--gradient-hero)",
        }}
      >
        {/* Floating Particles */}
        <ParticleBackground particleCount={30} />

        {/* Dot Pattern */}
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.2) 1px, transparent 0)`,
              backgroundSize: "50px 50px",
            }}
          />
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6 max-w-4xl mx-auto"
          >
            {/* Social Proof Badge */}
            <motion.div
              variants={itemVariants}
              className="inline-flex flex-col sm:flex-row items-center gap-1 sm:gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-2 text-sm font-medium text-primary mb-4 mt-4 sm:mt-0"
            >
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="counter-live">{onlineUsers} pessoas online agora</span>
              </span>
              <span className="text-muted-foreground hidden sm:inline">•</span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                +500 emagrecendo com acompanhamento
              </span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-tight"
            >
              <span className="text-shine">
                <TypewriterText 
                  text="Emagreça com acompanhamento" 
                  delay={500}
                  speed={40}
                />
              </span>
              <br />
              <span className="text-gradient">
                <TypewriterText 
                  text="diário e constante" 
                  delay={1700}
                  speed={50}
                />
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto"
            >
              Tenha um assistente que te orienta todos os dias, com saúde e sem dietas malucas.
            </motion.p>

            <motion.p
              variants={itemVariants}
              className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              Pare de começar dietas e desistir no meio do caminho. O DietaFY te acompanha diariamente para criar hábitos reais e emagrecer de forma sustentável.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
            >
              <Button
                size="lg"
                className="text-base sm:text-lg px-6 py-4 sm:px-8 sm:py-6 pulse-glow-cta relative overflow-hidden group"
                onClick={handleCTAClick}
              >
                <span className="relative z-10 flex items-center">
                  Começar grátis agora
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base sm:text-lg px-6 py-4 sm:px-8 sm:py-6 border-glow-animated"
                onClick={() =>
                  document
                    .getElementById("como-funciona")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Ver como funciona
              </Button>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
            >
              {[
                { icon: ShieldCheck, text: "7 dias de garantia" },
                { icon: Lock, text: "Não precisa de cartão" },
                { icon: Check, text: "Sem fidelidade" },
              ].map((item, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <item.icon className="h-4 w-4 text-primary" />
                  <span>{item.text}</span>
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Demo Section Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mt-20 mb-8 text-center"
          >
            <div className="inline-flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold tracking-widest uppercase text-primary">
                Demonstração ao vivo
              </span>
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-gradient">
              Teste agora seu acompanhamento de emagrecimento
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              Converse gratuitamente com a Vita Nutri IA e veja como seria ter um assistente te acompanhando todos os dias.
            </p>
          </motion.div>

          {/* Vita Preview - Premium Glass Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-8 mb-16 md:mb-24 flex justify-center px-4"
          >
            <div className="relative w-full max-w-[340px] sm:max-w-md rounded-3xl glass-intense border-glow-animated flex flex-col items-center justify-center py-8 sm:py-10 px-4 sm:px-6 gap-6 sm:gap-8">
              {/* Glow effect behind card */}
              <div
                className="absolute -inset-4 rounded-[2rem] opacity-50 blur-3xl -z-10"
                style={{
                  background: "radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.3), transparent 70%)",
                }}
              />

              {/* Top demo labels */}
              <div className="flex w-full flex-col items-center justify-between gap-2 sm:flex-row sm:items-center text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold tracking-widest uppercase text-gradient">
                    VITA NUTRI IA AO VIVO
                  </span>
                </div>
                <span className="font-medium px-3 py-1 rounded-full bg-muted/60 text-xs">
                  Voz natural em português
                </span>
              </div>

              {/* Orb + Audio Waves */}
              <div className="relative flex flex-col items-center justify-center gap-6 w-full">
                <div
                  className="pointer-events-none absolute inset-8 rounded-[999px] opacity-40 blur-2xl"
                  style={{
                    background: "radial-gradient(circle at 50% 30%, hsl(var(--primary) / 0.5), transparent 60%)",
                  }}
                />

                <div className="relative flex flex-col items-center gap-4">
                  <button
                    type="button"
                    onClick={handleDemoOrbClick}
                    disabled={isConnecting}
                    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary rounded-full"
                  >
                    <div
                      className={`h-36 w-36 rounded-full flex items-center justify-center text-center text-xs font-semibold tracking-wider uppercase text-background/90 px-4 transition-all duration-500 ${
                        conversation.status === "connected" ? "orb-breathe" : "hover:scale-105"
                      }`}
                      style={{
                        background: "var(--gradient-primary)",
                        boxShadow: conversation.status === "connected"
                          ? "0 0 60px hsl(var(--primary) / 0.5), 0 0 100px hsl(var(--primary) / 0.3)"
                          : "0 0 30px hsl(var(--primary) / 0.3)",
                      }}
                    >
                      {isConnecting
                        ? "Conectando..."
                        : conversation.status === "connected"
                        ? conversation.isSpeaking
                          ? "Vita falando"
                          : "Conectado"
                        : "Clique para ouvir"}
                    </div>
                  </button>

                  {/* Audio Waves */}
                  {conversation.status === "connected" && (
                    <AudioWaves isActive={conversation.isSpeaking} barCount={7} />
                  )}
                </div>

                <div className="flex flex-col items-center gap-4 w-full">
                  <p className="text-xs text-muted-foreground max-w-sm text-center">
                    Converse gratuitamente com a Vita Nutri IA em tempo real.
                  </p>

                  <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                    <span className="px-3 py-1.5 rounded-full bg-muted/60 border border-border/50">5 mensagens grátis</span>
                    <span className="px-3 py-1.5 rounded-full bg-muted/60 border border-border/50">Sem cartão</span>
                    <span className="px-3 py-1.5 rounded-full bg-muted/60 border border-border/50">Sem compromisso</span>
                  </div>

                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={handleDemoOrbClick}
                    disabled={isConnecting}
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    Testar grátis agora
                  </Button>

                  {/* Help Collapsible */}
                  <Collapsible
                    open={isHelpOpen}
                    onOpenChange={setIsHelpOpen}
                    className="w-full max-w-sm mt-2"
                  >
                    <Card className="w-full border border-border/50 bg-card/80 rounded-2xl shadow-lg backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                      <CardContent className="pt-3 pb-3 space-y-2 text-xs">
                        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 text-left">
                          <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                              Como o Vita te ajuda
                            </p>
                            <p className="text-xs text-muted-foreground/90">
                              Toque para ver exemplos
                            </p>
                          </div>
                          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted/80 text-muted-foreground shadow-sm transition-transform duration-300 ${isHelpOpen ? "rotate-180" : ""}`}>
                            <ChevronDown className="h-3.5 w-3.5" />
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-3 pt-2">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            O Vita cruza seus dados para te dar respostas práticas: o que ajustar nas refeições, como organizar o dia para emagrecer com saúde.
                          </p>
                          <div className="grid gap-2 text-xs">
                            <div className="p-2 rounded-lg bg-muted/40">
                              <p className="font-medium text-foreground mb-1">Para emagrecer</p>
                              <p className="text-muted-foreground text-xs">"O que ajustar hoje pra secar barriga?"</p>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/40">
                              <p className="font-medium text-foreground mb-1">Sono e disposição</p>
                              <p className="text-muted-foreground text-xs">"O que mudar pra dormir melhor?"</p>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </CardContent>
                    </Card>
                  </Collapsible>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* PROBLEMA & SOLUÇÃO */}
      <section className="py-16 md:py-24 px-4 relative">
        <div className="container mx-auto max-w-3xl space-y-12 md:space-y-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              <span>❌</span>{" "}
              <span className="text-gradient">O problema</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-4">
              Por que emagrecer parece tão difícil?
            </p>
            <ul className="space-y-3 text-base md:text-lg text-muted-foreground">
              {[
                "Você até começa motivado, mas perde o ritmo",
                "Fica sozinho depois que monta a dieta",
                "Um deslize vira desistência",
                "Falta constância, não força de vontade",
                "Apps comuns não te acompanham de verdade",
              ].map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-2"
                >
                  <span className="text-destructive">•</span>
                  <span>{item}</span>
                </motion.li>
              ))}
            </ul>
            <p className="mt-6 text-base md:text-lg font-medium text-foreground flex items-center gap-2">
              <span className="text-2xl">👉</span>
              O problema não é você. É a falta de acompanhamento diário.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              <span>✅</span>{" "}
              <span className="text-gradient">A solução</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-4">
              O DietaFY resolve isso com acompanhamento real.
            </p>
            <p className="text-base md:text-lg text-muted-foreground mb-4">
              O DietaFY não é mais um app de dieta. É um assistente inteligente focado em emagrecimento, que te acompanha todos os dias.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              {["Sem terrorismo nutricional", "Sem dietas extremas", "Sem culpa"].map((item, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm border border-primary/20"
                >
                  ✓ {item}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* VITA NUTRI IA + WHATSAPP */}
      <section className="py-16 md:py-20 px-4 bg-muted/20 relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient-animated opacity-50" />
        <div className="container mx-auto max-w-4xl grid gap-8 md:gap-12 md:grid-cols-2 items-start relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="glass-card rounded-2xl p-6 border"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              <span>🤖</span>{" "}
              <span className="text-gradient">Vita Nutri IA</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-4">
              Seu assistente de emagrecimento, todos os dias.
            </p>
            <ul className="space-y-3 text-base text-muted-foreground">
              {[
                "Orientações simples para suas refeições",
                "Criação de hábitos saudáveis",
                "Ajustes conforme sua rotina",
                "Motivação sem julgamentos",
                "Foco em constância, não perfeição",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="glass-card rounded-2xl p-6 border"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              <span>📲</span>{" "}
              <span className="text-gradient">WhatsApp</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-4">
              Emagreça com acompanhamento direto no WhatsApp.
            </p>
            <ul className="space-y-3 text-base text-muted-foreground">
              {[
                "Lembretes de refeições",
                "Check-ins diários",
                "Orientações personalizadas",
                "Motivação constante",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* DEPOIMENTOS - Premium Cards */}
      <section className="py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-3">
              Provas reais de emagrecimento com constância
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-gradient">
              Resultados de quem parou de tentar sozinho
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              Relatos de quem está sendo acompanhado pela Vita Nutri IA todos os dias.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch">
            {[
              {
                badge: "-3,8 kg em 6 semanas",
                stats: ["Antes: 84,2 kg", "Depois: 80,4 kg"],
                quote: "Nunca consegui manter uma dieta por mais de 10 dias",
                detail: "Agora com a Vita me guiando todo dia eu nem sinto que estou \"de dieta\". Só fui ajustando com calma e o peso começou a descer.",
                author: "Ana, 32 anos",
              },
              {
                badge: "+72% de constância",
                stats: ["Antes: pulava 2 refeições", "Depois: 3 refeições + lanche"],
                quote: "Mando foto das refeições e ela ajusta tudo pra mim",
                detail: "Quando vejo que vou exagerar, chamo a Vita no Whats e ela já me mostra um jeito mais leve de montar o prato.",
                author: "Lucas, 27 anos",
              },
              {
                badge: "-42% episódios de \"tudo ou nada\"",
                stats: ["Antes: desistia após deslize", "Depois: ajusta o dia"],
                quote: "Parei de sentir culpa quando fujo um pouco",
                detail: "Em vez de desistir quando como algo fora, a Vita me mostra como compensar no resto do dia.",
                author: "Carla, 41 anos",
              },
            ].map((testimonial, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                viewport={{ once: true }}
                className="testimonial-card-premium glass-card rounded-2xl border p-6 flex flex-col gap-4 h-full"
              >
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-primary/15 text-primary font-semibold text-xs">
                    {testimonial.badge}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {testimonial.stats.map((stat, i) => (
                    <span key={i} className="px-2 py-1 rounded-full bg-muted/60">{stat}</span>
                  ))}
                </div>
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
                  <p className="font-semibold text-foreground mb-2 text-sm">"{testimonial.quote}"</p>
                  <p className="text-muted-foreground text-xs">{testimonial.detail}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-auto">{testimonial.author}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA - Premium Timeline */}
      <section id="como-funciona" className="py-16 md:py-24 px-4 bg-muted/10 relative overflow-hidden">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-12 md:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <span>🧭</span>{" "}
              <span className="text-gradient">Como funciona</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Simples, prático e focado em resultados reais.
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto relative">
            {/* Timeline Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 timeline-line-premium hidden md:block" />

            <div className="space-y-8">
              {steps.map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.15 }}
                  viewport={{ once: true }}
                  className="flex gap-4 sm:gap-6 items-start"
                >
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center font-bold text-primary-foreground shrink-0 step-number-glow relative z-10"
                    style={{
                      background: "var(--gradient-primary)",
                    }}
                  >
                    {step.icon}
                  </div>
                  <div className="flex-1 text-left glass-card rounded-xl p-4 border">
                    <p className="text-lg font-semibold mb-1">{step.title}</p>
                    <p className="text-base text-muted-foreground">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MAIS DO QUE EMAGRECIMENTO */}
      <section className="py-16 md:py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              <span>🧠</span>{" "}
              <span className="text-gradient">Mais do que emagrecimento</span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground mb-6">
              Além de te ajudar a emagrecer, o DietaFY também auxilia em:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {[
                { icon: "🍽️", label: "Organização alimentar" },
                { icon: "💧", label: "Consumo de água" },
                { icon: "😴", label: "Sono e descanso" },
                { icon: "🏃", label: "Atividade física" },
                { icon: "🧘", label: "Redução do estresse" },
                { icon: "📊", label: "Acompanhamento de peso" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="glass-card rounded-xl p-3 sm:p-4 text-center border hover-scale cursor-default"
                >
                  <span className="text-2xl mb-2 block">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing - Premium Cards */}
      <section className="py-16 md:py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient-animated opacity-30" />
        <div className="container mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-12 md:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <span>💰</span>{" "}
              <span className="text-gradient">Planos</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Comece grátis e evolua quando estiver pronto.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto pt-6">
            {pricingPlans.map((plan, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                viewport={{ once: true }}
                className={plan.featured ? "relative" : ""}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30">
                    <span className="badge-premium-animated px-4 py-1.5 rounded-full text-sm font-bold text-primary-foreground shadow-lg whitespace-nowrap">
                      <span className="relative z-10">⭐ Mais Popular</span>
                    </span>
                  </div>
                )}
                <Card
                  className={`relative h-full ${
                    plan.featured
                      ? "pricing-card-premium border-primary shadow-2xl"
                      : "border"
                  }`}
                >
                  {plan.featured && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary rounded-t-lg" />
                  )}
                  <CardContent className="pt-8 pb-6 relative z-10">
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
                      className={`w-full ${plan.featured ? "pulse-glow-cta" : ""}`}
                      variant={plan.featured ? "default" : "outline"}
                      size="lg"
                      onClick={() => {
                        if (plan.featured) {
                          launchConfetti();
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
      <section className="py-16 md:pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="rounded-2xl glass-card border shadow-xl px-4 sm:px-6 py-6 sm:py-8 md:px-10 md:py-10 flex flex-col md:flex-row gap-6 md:gap-8 items-start"
          >
            <div className="flex-1 space-y-4 text-center md:text-left">
              <div className="inline-flex items-center gap-2 flex-wrap justify-center md:justify-start rounded-full bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                <ShieldCheck className="h-4 w-4" />
                <span>Garantia de 7 dias • Compra segura pela Kiwify</span>
              </div>

              <h3 className="text-2xl md:text-3xl font-bold">
                Teste o DietaFY Premium por 7 dias sem risco
              </h3>

              <p className="text-base md:text-lg text-muted-foreground">
                Se dentro de 7 dias você sentir que o acompanhamento não é pra você, devolvemos 100% do seu investimento.
              </p>

              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  { icon: Check, text: "Garantia incondicional de 7 dias" },
                  { icon: Lock, text: "Pagamento seguro pela Kiwify" },
                  { icon: Zap, text: "Acesso imediato após confirmação" },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <item.icon className="h-4 w-4 text-emerald-500 mt-0.5" />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="w-full md:w-72 space-y-4">
              <div className="rounded-xl border bg-muted/30 px-4 py-4 text-sm">
                <p className="font-semibold mb-1">Como funciona?</p>
                <p className="text-muted-foreground text-xs">
                  Faça o pagamento, receba acesso imediato e teste por 7 dias. Se não gostar, solicite cancelamento.
                </p>
              </div>

              <Button
                className="w-full pulse-glow-cta"
                size="lg"
                onClick={() => {
                  launchConfetti();
                  window.open("https://pay.kiwify.com.br/4DKAQbY", "_blank");
                }}
              >
                Garantir meu acesso seguro
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Pagamento seguro • 7 dias de garantia • Sem fidelidade
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ - Premium Accordion */}
      <section className="py-16 md:py-24 px-4 bg-muted/10">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-10 md:mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              <span>❓</span>{" "}
              <span className="text-gradient">Perguntas Frequentes</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Tire suas dúvidas antes de começar
            </p>
          </motion.div>

          <Accordion type="single" collapsible className="w-full space-y-4">
            {[
              {
                question: "O DietaFY substitui um nutricionista?",
                answer: "Não. O DietaFY é uma ferramenta de acompanhamento diário que te ajuda a manter constância. Recomendamos sempre consultar profissionais de saúde.",
              },
              {
                question: "Preciso fazer dietas radicais?",
                answer: "Não! Nossa abordagem é focada em hábitos sustentáveis e constância. A Vita te ajuda com pequenos ajustes diários.",
              },
              {
                question: "Como funciona o plano gratuito?",
                answer: "No plano gratuito você tem acesso básico e conversas limitadas com a Vita. Perfeito para testar antes de decidir pelo Premium.",
              },
              {
                question: "O que está incluído no Premium?",
                answer: "Conversas ilimitadas, acompanhamento pelo WhatsApp, relatórios de evolução e suporte prioritário por R$ 29,90/mês.",
              },
              {
                question: "Quanto tempo leva para ver resultados?",
                answer: "Varia de pessoa para pessoa. Com acompanhamento diário, a maioria percebe mudanças nos hábitos nas primeiras semanas.",
              },
              {
                question: "Como a Vita me acompanha pelo WhatsApp?",
                answer: "No Premium, a Vita envia lembretes, check-ins diários e orientações personalizadas direto no seu WhatsApp.",
              },
              {
                question: "Posso cancelar quando quiser?",
                answer: "Sim! Cancele a qualquer momento sem burocracia. Não há período de fidelidade ou multas.",
              },
              {
                question: "Meus dados estão seguros?",
                answer: "Sim. Usamos seus dados apenas para personalizar sua experiência e não vendemos para terceiros.",
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                viewport={{ once: true }}
              >
                <AccordionItem
                  value={`item-${idx}`}
                  className="faq-item-premium bg-background/80 backdrop-blur-sm rounded-xl px-6"
                >
                  <AccordionTrigger className="text-left hover:no-underline py-5">
                    <span className="font-semibold text-base md:text-lg pr-4">
                      {item.question}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base pb-5">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA FINAL - Premium */}
      <section className="py-16 md:py-24 px-4 relative overflow-hidden mesh-gradient-animated">
        <div className="container mx-auto max-w-3xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-4 sm:space-y-6"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
              <span>🟢</span>{" "}
              <span className="text-gradient">Emagreça com acompanhamento diário</span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              Pare de tentar sozinho. Comece hoje a ter acompanhamento todos os dias.
            </p>
            <Button
              size="lg"
              className="text-base sm:text-lg px-6 py-5 sm:px-10 sm:py-7 pulse-glow-cta"
              onClick={handleCTAClick}
            >
              Começar grátis agora
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {[
                { icon: ShieldCheck, text: "7 dias de garantia" },
                { icon: Lock, text: "Pagamento seguro" },
                { icon: Check, text: "Sem fidelidade" },
              ].map((item, i) => (
                <span key={i} className="inline-flex items-center gap-1.5">
                  <item.icon className="h-4 w-4 text-primary" />
                  <span>{item.text}</span>
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer - Premium */}
      <footer className="py-8 md:py-12 px-4 border-t relative">
        <div className="gradient-separator absolute top-0 left-0 right-0" />
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold text-gradient mb-2">DietaFY</h3>
              <p className="text-sm text-muted-foreground">
                Transformando vidas através da saúde inteligente
              </p>
            </div>
            <div className="flex gap-4 sm:gap-6 md:gap-8 text-sm flex-wrap justify-center md:justify-end">
              {[
                { href: "/sobre", label: "Sobre" },
                { href: "/privacidade", label: "Privacidade" },
                { href: "/contato", label: "Contato" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="footer-link-premium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
