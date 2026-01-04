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
import { Sparkles, Volume2, VolumeX, ChevronDown, Mic, MicOff } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { AuthenticatedLayout } from "@/components/layouts/AuthenticatedLayout";

const vitaNutriPrompts = [
  "Montar um cardápio só para hoje para emagrecer com saúde",
  "Sugestões de 3 lanches rápidos e saudáveis para o trabalho",
  "O que posso ajustar nas refeições de hoje para reduzir estresse?",
  "O que comer antes e depois do treino de hoje para perder gordura?",
  "Qual o próximo passo simples hoje para equilibrar alimentação, sono e treino?",
];

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
      // Sempre garante que a voz padrão seja Masculina Ballad
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
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 flex flex-col">
        <header className="w-full border-b border-border/60 bg-gradient-to-b from-background/80 via-card/70 to-background/90 backdrop-blur-sm px-4 py-3 md:px-10 md:py-4 flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6 shadow-sm">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary shadow-[0_0_18px_hsl(var(--primary)/0.35)]">
              <Sparkles className="h-3 w-3" />
              Vita Nutri IA
            </div>

            <h1 className="text-2xl md:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight">
              Falar com o <span className="text-primary">Vita Nutri IA</span>
            </h1>
            <p className="mt-1 text-sm md:text-base lg:text-lg text-muted-foreground max-w-xl leading-relaxed">
              Seu nutricionista pessoal inteligente, conectado aos seus dados do DietaFY, para ajudar em emagrecimento, dieta, treino, sono e bem-estar.
            </p>
            <div className="mt-2 flex flex-col gap-1 sm:hidden">
              <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  {voiceEnabled ? <Volume2 className="h-3 w-3 text-primary" /> : <VolumeX className="h-3 w-3" />}
                  Voz do Vita
                </span>
                <Switch checked={voiceEnabled} onCheckedChange={setVoiceEnabled} className="scale-90" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "ballad", label: "Masculina - Ballad (padrão)" },
                  { id: "nova", label: "Feminina – Nova" },
                ].map((voice) => (
                  <Button
                    key={voice.id}
                    variant={voice.id === selectedVoiceId ? "default" : "outline"}
                    size="sm"
                    className="text-[10px] px-2 py-1 rounded-full border-border/70"
                    onClick={() => handleVoiceChange(voice.id)}
                  >
                    {voice.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <Card className="hidden sm:flex items-center gap-3 p-4 max-w-xs border-border/60 bg-card/90 shadow-[0_18px_40px_-26px_hsl(var(--primary)/0.65)] rounded-2xl">
            <CardContent className="p-0 flex flex-col gap-2 w-full">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                  {voiceEnabled ? <Volume2 className="h-3 w-3 text-primary" /> : <VolumeX className="h-3 w-3" />}
                  <span className="font-medium">Voz do Vita</span>
                </div>
                <Switch checked={voiceEnabled} onCheckedChange={setVoiceEnabled} />
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {[
                  { id: "ballad", label: "Masculina - Ballad (padrão)" },
                  { id: "nova", label: "Feminina – Nova" },
                ].map((voice) => (
                  <Button
                    key={voice.id}
                    variant={voice.id === selectedVoiceId ? "default" : "outline"}
                    size="sm"
                    className="text-[10px] px-2 py-1 rounded-full border-border/70"
                    onClick={() => handleVoiceChange(voice.id)}
                  >
                    {voice.label}
                  </Button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                Escolha entre vozes femininas e masculinas para o Vita falar suas respostas em voz alta.
              </p>
            </CardContent>
          </Card>
        </header>

        <main className="flex-1 flex flex-col items-center px-3 md:px-0 pb-5 gap-3 md:gap-4">
          <div className="w-full max-w-3xl flex flex-col items-center pt-2 md:pt-4 gap-3 md:gap-5">
            {showOnboarding && (
              <Collapsible className="w-full">
                <Card className="w-full border border-border/70 bg-gradient-to-br from-card/95 via-background/95 to-card/90 shadow-[0_20px_55px_-32px_hsl(var(--primary)/0.6)] rounded-2xl">
                  <CardContent className="pt-3 pb-3 space-y-2 text-sm">
                    <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 text-left">
                      <div className="space-y-1">
                        <p className="text-[11px] md:text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Como o Vita Nutri IA te ajuda
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground max-w-xl">
                          Toque para ver exemplos de perguntas e como o Vita usa seus dados.
                        </p>
                      </div>
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground shadow-sm">
                        <ChevronDown className="h-3.5 w-3.5" />
                      </span>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="space-y-3 pt-2">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        O Vita usa os seus dados do DietaFY (perfil, peso, objetivos, refeições e treinos
                        recentes) para adaptar as recomendações de alimentação, sono e manejo de estresse
                        à sua rotina real.
                      </p>
                      <div className="grid gap-4 md:gap-3 md:grid-cols-3 text-xs md:text-[13px]">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">Para emagrecimento</p>
                          <ul className="space-y-1 text-muted-foreground">
                            <li>• "Sugira um cardápio só para hoje para ajudar no emagrecimento"</li>
                            <li>• "O que ajustar no meu almoço de hoje para perder gordura?"</li>
                          </ul>
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">Para sono</p>
                          <ul className="space-y-1 text-muted-foreground">
                            <li>• "O que posso mudar na minha ceia de hoje para dormir melhor?"</li>
                            <li>• "Me dê 3 ajustes rápidos na rotina de hoje para melhorar o sono"</li>
                          </ul>
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">Para estresse</p>
                          <ul className="space-y-1 text-muted-foreground">
                            <li>• "Sugira 3 hábitos simples para reduzir meu estresse hoje"</li>
                            <li>
                              • "Como posso organizar minhas refeições de hoje para me sentir menos
                              sobrecarregado(a)?"
                            </li>
                          </ul>
                        </div>
                      </div>
                      <p className="text-[11px] md:text-xs text-muted-foreground">
                        Dica: fale com o Vita como se fosse um nutricionista pessoal. Conte seu contexto e peça
                        ajuda para dar o próximo passo, não para ser perfeito.
                      </p>
                    </CollapsibleContent>
                  </CardContent>
                </Card>
              </Collapsible>
            )}

            <VitaOrb state={orbState} onClick={handleOrbClick} />
            <div className="w-full max-w-3xl mb-3 flex flex-col items-center gap-2">
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
                    // Fallback para comportamento anterior baseado em callback
                    voiceToggleFn();
                    setIsVoiceBadgeActive((prev) => !prev);
                  }
                }}
                className="text-xs md:text-sm font-semibold tracking-wide uppercase rounded-full px-6 py-2 bg-primary/90 text-primary-foreground shadow-[0_0_26px_hsl(var(--primary)/0.6)] text-center cursor-pointer hover:bg-primary transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  {isVoiceBadgeActive ? (
                    <MicOff className="h-3.5 w-3.5" />
                  ) : (
                    <Mic className="h-3.5 w-3.5" />
                  )}
                  <span>conversar com o Vita Nutri IA por Voz</span>
                </span>
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="hidden md:inline-flex rounded-full mt-1"
                onClick={() => navigate("/dashboard")}
              >
                Voltar ao dashboard
              </Button>
            </div>
            <VitaChatPanel
              quickPrompts={vitaNutriPrompts}
              title="Vita Nutri IA – seu nutricionista pessoal"
              subtitle="Use linguagem natural: conte sua rotina, objetivos e desafios que o Vita ajusta a estratégia de alimentação e treino para você."
              showBackButton={false}
              onVitaMessage={handleVitaMessage}
              voiceEnabled={voiceEnabled}
              onOrbStateChange={setOrbState}
              onRegisterVoiceToggle={setVoiceToggleFn}
              voiceAgentRef={voiceAgentRef}
              embedded
            />
          </div>
        </main>
      </div>
    </AuthenticatedLayout>
  );
};

export default VitaNutriPage;
