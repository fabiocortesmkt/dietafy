import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { VitaOrb } from "@/components/VitaOrb";
import { VitaChatPanel, VitaOrbState } from "@/components/VitaChatPanel";
import type { VitaVoiceAgentHandle } from "@/components/VitaVoiceAgent";

import { playVitaVoice, toggleVitaVoicePlayback } from "@/lib/vitaVoice";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Volume2, VolumeX, ChevronDown, Mic, MicOff, Brain, Utensils, Moon, Heart } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AuthenticatedLayout } from "@/components/layouts/AuthenticatedLayout";
import { motion } from "framer-motion";

const vitaNutriPrompts = [
  "Montar um cardápio só para hoje para emagrecer com saúde",
  "Sugestões de 3 lanches rápidos e saudáveis para o trabalho",
  "O que posso ajustar nas refeições de hoje para reduzir estresse?",
  "O que comer antes e depois do treino de hoje para perder gordura?",
  "Qual o próximo passo simples hoje para equilibrar alimentação, sono e treino?",
];

const headerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  examples: string[];
  delay?: number;
}

const FeatureCard = ({ icon, title, examples, delay = 0 }: FeatureCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="group p-4 rounded-2xl bg-gradient-to-br from-card/80 via-background/60 to-card/70 border border-border/40 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.25)]"
  >
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <div className="flex-1 space-y-2">
        <p className="font-medium text-foreground text-sm">{title}</p>
        <ul className="space-y-1.5">
          {examples.map((ex, i) => (
            <li key={i} className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/50 mt-1.5 shrink-0" />
              <span>{ex}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </motion.div>
);

const VitaNutriPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("ballad");
  const [orbState, setOrbState] = useState<VitaOrbState>("idle");
  const [voiceToggleFn, setVoiceToggleFn] = useState<(() => void) | null>(null);
  const [isVoiceBadgeActive, setIsVoiceBadgeActive] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const voiceAgentRef = useRef<VitaVoiceAgentHandle | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      if (!currentUser) {
        setUser(null);
        navigate("/auth");
        return;
      }
      setUser(currentUser as User);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        const currentUser = session?.user ?? null;
        if (!currentUser) {
          navigate("/auth");
          return;
        }
        setUser(currentUser as User);
      })
      .finally(() => {
        setLoadingAuth(false);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    const stored = localStorage.getItem("vita-nutri-onboarding-dismissed");
    if (stored === "true") {
      setShowOnboarding(false);
    }

    const storedVoice = localStorage.getItem("vita-nutri-voice-id");
    const allowedVoices = ["nova", "ballad"];

    if (storedVoice && allowedVoices.includes(storedVoice)) {
      setSelectedVoiceId(storedVoice);
    } else {
      setSelectedVoiceId("ballad");
      localStorage.setItem("vita-nutri-voice-id", "ballad");
    }
  }, []);

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    localStorage.setItem("vita-nutri-voice-id", voiceId);
  };

  const handleVitaMessage = async (text: string) => {
    if (!voiceEnabled) return;
    try {
      setOrbState("speaking");
      await playVitaVoice(text, selectedVoiceId);
    } catch (error) {
      console.error("Erro ao tocar voz da Vita:", error);
    } finally {
      setOrbState("idle");
    }
  };

  if (loadingAuth || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-10 w-40" />
      </div>
    );
  }

  const handleOrbClick = () => {
    if (!voiceEnabled) return;
    const newState = toggleVitaVoicePlayback();
    setOrbState(newState);
  };

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Premium Header */}
        <motion.header
          variants={headerVariants}
          initial="hidden"
          animate="visible"
          className="w-full workout-header-gradient border-b border-border/40 px-4 py-6 md:px-8 md:py-8"
        >
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              {/* Left side - Title & Description */}
              <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4 max-w-2xl">
                <motion.div variants={itemVariants}>
                  <Badge className="badge-premium-shimmer gap-2 px-4 py-1.5 text-xs font-semibold">
                    <Sparkles className="h-3.5 w-3.5" />
                    Vita Nutri IA
                  </Badge>
                </motion.div>

                <motion.h1
                  variants={itemVariants}
                  className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight"
                >
                  Falar com o{" "}
                  <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                    Vita Nutri IA
                  </span>
                </motion.h1>

                <motion.p
                  variants={itemVariants}
                  className="text-base md:text-lg text-muted-foreground leading-relaxed"
                >
                  Seu nutricionista pessoal inteligente, conectado aos seus dados do DietaFY, 
                  para ajudar em emagrecimento, dieta, treino, sono e bem-estar.
                </motion.p>

                {/* Mobile Voice Controls */}
                <motion.div variants={itemVariants} className="flex flex-col gap-3 lg:hidden">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {voiceEnabled ? (
                        <Volume2 className="h-4 w-4 text-primary" />
                      ) : (
                        <VolumeX className="h-4 w-4" />
                      )}
                      <span className="font-medium">Voz do Vita</span>
                    </div>
                    <Switch checked={voiceEnabled} onCheckedChange={setVoiceEnabled} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "ballad", label: "Masculina" },
                      { id: "nova", label: "Feminina" },
                    ].map((voice) => (
                      <Button
                        key={voice.id}
                        variant={voice.id === selectedVoiceId ? "default" : "outline"}
                        size="sm"
                        className="rounded-full text-xs px-4"
                        onClick={() => handleVoiceChange(voice.id)}
                      >
                        {voice.label}
                      </Button>
                    ))}
                  </div>
                </motion.div>
              </motion.div>

              {/* Right side - Voice Control Card (Desktop) */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="hidden lg:block"
              >
                <Card className="glass-premium-vita border-primary/20 shadow-[0_20px_50px_-20px_hsl(var(--primary)/0.4)] min-w-[280px]">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        {voiceEnabled ? (
                          <Volume2 className="h-4 w-4 text-primary" />
                        ) : (
                          <VolumeX className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">Voz do Vita</span>
                      </div>
                      <Switch checked={voiceEnabled} onCheckedChange={setVoiceEnabled} />
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "ballad", label: "Masculina - Ballad" },
                        { id: "nova", label: "Feminina – Nova" },
                      ].map((voice) => (
                        <Button
                          key={voice.id}
                          variant={voice.id === selectedVoiceId ? "default" : "outline"}
                          size="sm"
                          className="rounded-full text-xs flex-1"
                          onClick={() => handleVoiceChange(voice.id)}
                        >
                          {voice.label}
                        </Button>
                      ))}
                    </div>
                    
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Escolha a voz para o Vita responder em áudio.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center px-4 md:px-0 pb-8 gap-6">
          <div className="w-full max-w-3xl flex flex-col items-center pt-6 gap-6">
            
            {/* Onboarding Card */}
            {showOnboarding && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="w-full"
              >
                <Collapsible defaultOpen>
                  <Card className="glass-premium-vita border-primary/20 overflow-hidden">
                    <CardContent className="p-0">
                      <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-primary/5 transition-colors">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                            Como o Vita Nutri IA te ajuda
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Toque para ver exemplos e como o Vita usa seus dados.
                          </p>
                        </div>
                        <span className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                        </span>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="px-5 pb-5 space-y-4">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            O Vita usa seus dados do DietaFY (perfil, peso, objetivos, refeições e treinos recentes) 
                            para adaptar as recomendações à sua rotina real.
                          </p>
                          
                          <div className="grid gap-4 md:grid-cols-3">
                            <FeatureCard
                              icon={<Utensils className="h-5 w-5" />}
                              title="Para emagrecimento"
                              examples={[
                                "Sugira um cardápio só para hoje",
                                "O que ajustar no almoço para perder gordura?"
                              ]}
                              delay={0.1}
                            />
                            <FeatureCard
                              icon={<Moon className="h-5 w-5" />}
                              title="Para sono"
                              examples={[
                                "O que mudar na ceia para dormir melhor?",
                                "3 ajustes rápidos para melhorar o sono"
                              ]}
                              delay={0.2}
                            />
                            <FeatureCard
                              icon={<Heart className="h-5 w-5" />}
                              title="Para estresse"
                              examples={[
                                "3 hábitos simples para reduzir estresse",
                                "Como organizar refeições para menos ansiedade?"
                              ]}
                              delay={0.3}
                            />
                          </div>
                          
                          <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
                            <Brain className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              <span className="font-medium text-foreground">Dica:</span> Fale com o Vita como se fosse um nutricionista pessoal. 
                              Conte seu contexto e peça ajuda para dar o próximo passo.
                            </p>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </CardContent>
                  </Card>
                </Collapsible>
              </motion.div>
            )}

            {/* Vita Orb */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <VitaOrb state={orbState} onClick={handleOrbClick} />
            </motion.div>
            
            {/* Voice Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col items-center gap-3"
            >
              <Badge
                variant="default"
                role="button"
                aria-label="Conversar com o Vita Nutri IA por voz"
                onClick={() => {
                  if (!voiceEnabled) {
                    setVoiceEnabled(true);
                  }
                  if (voiceAgentRef.current) {
                    voiceAgentRef.current.toggleConversation();
                    setIsVoiceBadgeActive((prev) => !prev);
                  } else if (voiceToggleFn) {
                    voiceToggleFn();
                    setIsVoiceBadgeActive((prev) => !prev);
                  }
                }}
                className="text-sm font-semibold tracking-wide uppercase rounded-full px-8 py-3 bg-gradient-to-r from-primary via-primary/90 to-primary text-primary-foreground shadow-[0_0_30px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.7)] cursor-pointer transition-all duration-300 hover:scale-105"
              >
                <span className="inline-flex items-center gap-2">
                  {isVoiceBadgeActive ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                  <span>Conversar por Voz</span>
                </span>
              </Badge>
              
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => navigate("/dashboard")}
              >
                Voltar ao dashboard
              </Button>
            </motion.div>

            {/* Chat Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="w-full"
            >
              <VitaChatPanel
                quickPrompts={vitaNutriPrompts}
                title="Vita Nutri IA – seu nutricionista pessoal"
                subtitle="Use linguagem natural: conte sua rotina, objetivos e desafios."
                showBackButton={false}
                onVitaMessage={handleVitaMessage}
                voiceEnabled={voiceEnabled}
                onOrbStateChange={setOrbState}
                onRegisterVoiceToggle={setVoiceToggleFn}
                voiceAgentRef={voiceAgentRef}
                embedded
              />
            </motion.div>
          </div>
        </main>
      </div>
    </AuthenticatedLayout>
  );
};

export default VitaNutriPage;
