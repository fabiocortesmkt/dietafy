import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, MessageCircle, Send, Trash2, Sparkles } from "lucide-react";
import {
  canUserAccessFeature,
  getDailyLimits,
  getUserPlan,
  incrementDailyLimit,
} from "@/lib/limits";
import { UpgradeLimitModal } from "@/components/UpgradeLimitModal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VitaVoiceAgent, type VitaVoiceAgentHandle } from "@/components/VitaVoiceAgent";
import { motion, AnimatePresence } from "framer-motion";

export interface ChatMessage {
  id: string;
  sender: "user" | "vita";
  message: string;
  created_at: string;
}

export type VitaOrbState = "idle" | "listening" | "speaking";

interface VitaChatPanelProps {
  quickPrompts?: string[];
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  onVitaMessage?: (text: string) => void | Promise<void>;
  voiceEnabled?: boolean;
  onOrbStateChange?: (state: VitaOrbState) => void;
  onRegisterVoiceToggle?: (toggleFn: () => void) => void;
  /** Optional external ref to control the VitaVoiceAgent from parent components */
  voiceAgentRef?: React.RefObject<VitaVoiceAgentHandle | null>;
  embedded?: boolean;
  /** Enable internal debug panel to inspect AI context payload */
  debugMode?: boolean;
}

const defaultQuickPrompts = [
  "O que comer agora?",
  "Receita saudável rápida",
  "Como reduzir cortisol?",
  "Exercício para gordura abdominal",
  "Analisar meu progresso",
];

const formatInline = (text: string): ReactNode => {
  if (!text.includes("**")) return text;

  const parts = text.split("**");
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <strong key={index} className="font-semibold">
          {part}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

export const formatChatMessage = (text: string): ReactNode => {
  const lines = text.split("\n");
  const nodes: ReactNode[] = [];
  let listItems: ReactNode[] = [];

  const flushList = () => {
    if (!listItems.length) return;
    const listIndex = nodes.length;
    nodes.push(
      <ul key={`ul-${listIndex}`} className="list-disc pl-5 space-y-1">
        {listItems.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd();
    const listMatch = line.trimStart().match(/^[-•]\s+(.*)$/);

    if (listMatch) {
      listItems.push(formatInline(listMatch[1]));
      return;
    }

    flushList();

    if (line.trim() === "") {
      nodes.push(<br key={`br-${idx}`} />);
    } else {
      nodes.push(
        <span key={`p-${idx}`} className="block">
          {formatInline(line)}
        </span>,
      );
    }
  });

  flushList();
  return nodes;
};

const messageVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: "easeOut" as const } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

export const VitaChatPanel = ({
  quickPrompts = defaultQuickPrompts,
  title = "Vita – Seu nutricionista pessoal",
  subtitle = "Responde em segundos sobre alimentação, treinos, sono e saúde.",
  showBackButton = true,
  onVitaMessage,
  voiceEnabled = false,
  onOrbStateChange,
  onRegisterVoiceToggle,
  voiceAgentRef,
  embedded = false,
  debugMode = false,
}: VitaChatPanelProps) => {
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [limits, setLimits] = useState<{
    used_today: number;
    remaining: number;
    limit: number;
  } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [planType, setPlanType] = useState<"free" | "premium" | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [debugContext, setDebugContext] = useState<any | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingIntervalRef = useRef<number | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const internalVoiceAgentRef = useRef<VitaVoiceAgentHandle | null>(null);
  const activeVoiceAgentRef = voiceAgentRef ?? internalVoiceAgentRef;

  const handleMicToggle = useCallback(() => {
    activeVoiceAgentRef.current?.toggleConversation();
  }, [activeVoiceAgentRef]);

  const handleVoiceUserTranscript = useCallback((text: string) => {
    const now = new Date().toISOString();
    const msg: ChatMessage = {
      id: `voice-user-${Date.now()}`,
      sender: "user",
      message: text,
      created_at: now,
    };

    setMessages((prev) => [...prev, msg]);
    setInput(text);
  }, []);

  const handleVoiceAgentResponse = useCallback((text: string) => {
    const now = new Date().toISOString();
    const msg: ChatMessage = {
      id: `voice-vita-${Date.now()}`,
      sender: "vita",
      message: text,
      created_at: now,
    };

    setMessages((prev) => [...prev, msg]);
  }, []);

  useEffect(() => {
    if (onRegisterVoiceToggle) {
      onRegisterVoiceToggle(handleMicToggle);
    }
  }, [onRegisterVoiceToggle, handleMicToggle]);

  useEffect(() => {
    if (voiceAgentRef && activeVoiceAgentRef.current) {
      (voiceAgentRef as React.MutableRefObject<VitaVoiceAgentHandle | null>).current =
        activeVoiceAgentRef.current;
    }
  }, [voiceAgentRef, activeVoiceAgentRef]);

  useEffect(() => {
    const loadInitial = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) return;
      setUserId(uid);

      const todayStr = new Date().toISOString().slice(0, 10);
      const [plan, daily] = await Promise.all([
        getUserPlan(uid),
        getDailyLimits(uid, todayStr),
      ]);
      if (plan) setPlanType(plan);
      const used = daily.ai_messages_sent;
      setLimits({ used_today: used, remaining: Math.max(10 - used, 0), limit: 10 });

      const { data: sessions } = await supabase
        .from("chat_sessions")
        .select("id, started_at")
        .order("started_at", { ascending: false })
        .limit(1);

      if (sessions && sessions.length > 0) {
        const existingId = sessions[0].id as string;
        setSessionId(existingId);
        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("id, sender, message, created_at")
          .eq("session_id", existingId)
          .order("created_at", { ascending: true });
        setMessages((msgs || []) as ChatMessage[]);
      }
    };

    loadInitial();
  }, []);

  useEffect(() => {
    if (scrollRef.current && shouldAutoScrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setHasNewMessages(false);
    }
  }, [messages, isTyping]);

  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    };
  }, []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
    shouldAutoScrollRef.current = atBottom;
    if (atBottom) {
      setHasNewMessages(false);
    }
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    shouldAutoScrollRef.current = true;
    setHasNewMessages(false);
  };

  const scrollToTop = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: "smooth" });
    shouldAutoScrollRef.current = false;
  };

  const animateVitaReply = (id: string, fullText: string) => {
    if (typingIntervalRef.current) {
      window.clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }

    const length = fullText.length;
    let typingSpeed = 30;
    if (length < 250) {
      typingSpeed = 40;
    } else if (length > 700) {
      typingSpeed = 18;
    } else if (length > 400) {
      typingSpeed = 24;
    }

    let index = 0;

    typingIntervalRef.current = window.setInterval(() => {
      index += 1;
      const partial = fullText.slice(0, index);

      setMessages((prev) =>
        prev.map((msg) => (msg.id === id ? { ...msg, message: partial } : msg)),
      );

      if (index >= fullText.length) {
        if (typingIntervalRef.current) {
          window.clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
      }
    }, typingSpeed);
  };

  const handleSend = async (prompt?: string, imageUrl?: string | null) => {
    const text = prompt ?? input.trim();
    if (!text || !userId) return;

    onOrbStateChange?.("listening");

    const access = await canUserAccessFeature(userId, "ai_message");
    if (!access.allowed) {
      setShowUpgradeModal(true);
      onOrbStateChange?.("idle");
      return;
    }

    if (limits && limits.remaining <= 0) {
      toast({
        title: "Limite diário atingido",
        description:
          "Você atingiu o limite de mensagens gratuitas de hoje. Volte amanhã ou faça upgrade para continuar.",
      });
      onOrbStateChange?.("idle");
      return;
    }

    setIsSending(true);
    setIsTyping(true);
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender: "user",
      message: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    if (!prompt) setInput("");

    let reply: ChatMessage | null = null;

    try {
      const { data, error } = await supabase.functions.invoke("vita-chat", {
        body: {
          session_id: sessionId,
          message: text,
          image_url: imageUrl ?? null,
          voice_enabled: voiceEnabled ?? false,
          debug: debugMode ?? false,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.error === "message_limit_reached") {
        setLimits({
          used_today: data.used_today,
          remaining: data.remaining,
          limit: data.limit,
        });
        toast({
          title: "Limite diário atingido",
          description:
            "Chegamos ao limite de hoje. Amanhã podemos continuar, ou faça upgrade para conversar ilimitado!",
        });
        onOrbStateChange?.("idle");
        return;
      }

      reply = {
        id: `vita-${Date.now()}`,
        sender: "vita",
        message: data?.reply ?? "",
        created_at: new Date().toISOString(),
      };

      if (debugMode && data?.debug_context) {
        setDebugContext(data.debug_context);
      }

      if (data?.session_id && !sessionId) {
        setSessionId(data.session_id);
      }

      if (data?.limits) {
        setLimits(data.limits);
      } else if (limits) {
        const used = limits.used_today + 1;
        setLimits({ ...limits, used_today: used, remaining: Math.max(limits.limit - used, 0) });
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      if (userId) {
        await incrementDailyLimit(userId, todayStr, "ai_messages_sent");
      }

      const vitaText = reply.message;

      if (voiceEnabled && onVitaMessage && vitaText) {
        const emptyReply: ChatMessage = { ...reply, message: "" };

        setMessages((prev) => [
          ...prev.filter((m) => !m.id.startsWith("temp-")),
          optimistic,
          emptyReply,
        ]);

        try {
          onOrbStateChange?.("speaking");
          void onVitaMessage(vitaText);
        } catch (e) {
          console.error("Erro ao tocar voz da Vita:", e);
        }

        setIsTyping(false);
        animateVitaReply(reply.id, vitaText);
      } else {
        onOrbStateChange?.("idle");
        setMessages((prev) => {
          const next = [
            ...prev.filter((m) => !m.id.startsWith("temp-")),
            optimistic,
            reply!,
          ];
          if (!shouldAutoScrollRef.current) {
            setHasNewMessages(true);
          }
          return next;
        });
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem para Vita", error);
      toast({
        title: "Erro ao falar com o Vita",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
      onOrbStateChange?.("idle");
    } finally {
      setIsSending(false);
      if (!voiceEnabled) {
        setIsTyping(false);
      }

      if (!voiceEnabled || !onVitaMessage || !reply?.message) {
        onOrbStateChange?.("idle");
      }
    }
  };

  const handleNewConversation = async () => {
    try {
      if (sessionId) {
        await supabase.from("chat_messages").delete().eq("session_id", sessionId);
        await supabase.from("chat_sessions").delete().eq("id", sessionId);
      }

      const fullGreetingText =
        "Começamos um novo papo! Me conta em uma frase qual é o principal objetivo ou dúvida de hoje para eu te ajudar no próximo passo.";

      const greeting: ChatMessage = {
        id: `vita-greeting-${Date.now()}`,
        sender: "vita",
        message: "",
        created_at: new Date().toISOString(),
      };

      setMessages([greeting]);
      setSessionId(null);
      setIsTyping(true);

      // TTS só é chamado quando voiceEnabled está ativo
      if (voiceEnabled && onVitaMessage) {
        try {
          onOrbStateChange?.("speaking");
          void onVitaMessage(fullGreetingText);
        } catch (e) {
          console.error("Erro na saudação por voz:", e);
        }
        animateVitaReply(greeting.id, fullGreetingText);
      } else {
        // Modo texto: exibe mensagem diretamente sem TTS
        setMessages([{ ...greeting, message: fullGreetingText }]);
      }

      setIsTyping(false);
      if (!shouldAutoScrollRef.current) {
        setHasNewMessages(true);
      }

      toast({
        title: "Nova conversa",
        duration: 1500,
      });
    } catch (error) {
      console.error("Erro ao limpar histórico da Vita", error);
      toast({
        title: "Erro ao limpar histórico",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
  };

  if (!userId && !planType) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-10 w-40" />
      </div>
    );
  }

  return (
    <div className={embedded ? "w-full flex flex-col" : "min-h-screen bg-background flex flex-col"}>
      {/* Premium Header */}
      <header
        className={
          embedded
            ? "px-0 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            : "border-b border-border/40 px-4 py-4 md:px-8 md:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        }
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-12 w-12 shadow-lg ring-2 ring-primary/20">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-lg">
                V
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-semibold flex items-center gap-2">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${isTyping ? "bg-amber-400" : "bg-emerald-400"} animate-pulse`} />
              {isTyping ? "Respondendo..." : "Online e pronto para ajudar"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all gap-2"
                onClick={handleNewConversation}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Nova conversa</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs max-w-xs">
              Limpa as mensagens atuais e inicia uma nova conversa.
            </TooltipContent>
          </Tooltip>
          
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex rounded-full text-xs text-muted-foreground hover:text-foreground"
            onClick={scrollToTop}
          >
            Ir ao início
          </Button>
          
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex rounded-full"
              onClick={() => history.back()}
              aria-label="Voltar"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      <main
        className={
          "flex-1 flex flex-col max-w-3xl w-full mx-auto py-4 gap-4 " +
          (embedded ? "px-0" : "px-4 md:px-0")
        }
      >
        {/* Debug Panel */}
        {debugMode && debugContext && (
          <Card className="border-dashed border-primary/40 bg-card/60 text-xs">
            <CardContent className="pt-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[11px] uppercase tracking-wide text-primary">
                  Payload da IA (debug interno)
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Somente você vê isso
                </Badge>
              </div>
              <div className="max-h-60 overflow-auto rounded-md bg-background/80 border text-[11px] font-mono px-3 py-2">
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify(debugContext, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chat Messages Area */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={
            (embedded
              ? "max-h-[55vh] min-h-[220px]"
              : "flex-1 max-h-[60vh] min-h-[260px]") +
            " rounded-2xl border border-border/40 bg-gradient-to-b from-card/60 via-background/40 to-card/60 p-4 overflow-y-auto shadow-inner"
          }
        >
          <AnimatePresence mode="popLayout">
            <div className="space-y-4">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  variants={messageVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                  className={
                    "flex w-full " + (msg.sender === "vita" ? "justify-start" : "justify-end")
                  }
                >
                  <div className="flex items-end gap-3 max-w-[85%]">
                    {msg.sender === "vita" && (
                      <Avatar className="h-8 w-8 ring-2 ring-primary/20 shadow-sm">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-semibold">
                          V
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={
                        "rounded-2xl px-4 py-3 shadow-sm " +
                        (msg.sender === "vita"
                          ? "bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 text-foreground border border-primary/10"
                          : "bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground shadow-[0_4px_20px_-8px_hsl(var(--primary)/0.5)]")
                      }
                    >
                      <p className="whitespace-pre-wrap break-words leading-relaxed text-sm md:text-base">
                        {formatChatMessage(msg.message)}
                      </p>
                      <p
                        className={
                          "mt-2 text-[10px] text-right " +
                          (msg.sender === "user"
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground")
                        }
                      >
                        {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex w-full justify-start"
                >
                  <div className="flex items-end gap-3 max-w-[85%]">
                    <Avatar className="h-8 w-8 ring-2 ring-primary/20 shadow-sm">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-semibold">
                        V
                      </AvatarFallback>
                    </Avatar>
                    <div className="rounded-2xl px-4 py-3 bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 border border-primary/10 flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-xs text-muted-foreground ml-1">Vita está pensando...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </AnimatePresence>
        </div>

        {/* New Messages Indicator */}
        {hasNewMessages && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center"
          >
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full px-4 py-2 text-xs flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow"
              onClick={scrollToBottom}
            >
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Novas mensagens
            </Button>
          </motion.div>
        )}

        {/* Quick Prompts & Input Section */}
        <section className="space-y-4">
          {/* Quick Prompts */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2 max-w-full">
              {quickPrompts.map((prompt, index) => (
                <motion.button
                  key={prompt}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleSend(prompt)}
                  className="group h-auto min-h-[40px] px-4 py-2 rounded-full border border-border/40 bg-gradient-to-r from-background via-card/80 to-background text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground hover:shadow-[0_4px_20px_-8px_hsl(var(--primary)/0.3)] transition-all duration-300"
                >
                  <span className="flex items-center gap-2 text-left">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60 group-hover:bg-primary group-hover:shadow-[0_0_8px_hsl(var(--primary)/0.6)] transition-all shrink-0" />
                    <span className="flex-1">{prompt}</span>
                  </span>
                </motion.button>
              ))}
            </div>
            
            {limits && (
              <Badge variant="outline" className="self-start sm:self-auto whitespace-nowrap rounded-full border-border/60 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3 mr-1.5 text-primary" />
                {limits.remaining}/{limits.limit} hoje
              </Badge>
            )}
          </div>

          {/* Input Card */}
          <Card className="glass-premium-vita border-primary/20 overflow-hidden">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <MessageCircle className="h-3.5 w-3.5 text-primary" />
                  Pergunte qualquer coisa sobre saúde, alimentação ou treinos.
                </span>
                {limits && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-muted/40 px-2.5 py-1 text-[11px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    {limits.remaining} restantes
                  </span>
                )}
              </div>
              
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="shrink-0 flex items-center gap-2">
                  <input
                    id="vita-file-input"
                    type="file"
                    accept="image/*,audio/*"
                    className="hidden"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file || !userId) return;

                      if (file.type.startsWith("image/")) {
                        try {
                          const filePath = `${userId}/${Date.now()}-${file.name}`;
                          const { data, error } = await supabase.storage
                            .from("meal-photos")
                            .upload(filePath, file);

                          if (error || !data) {
                            console.error("Erro ao enviar imagem", error);
                            toast({
                              title: "Erro ao enviar imagem",
                              description: "Tente novamente em alguns instantes.",
                              variant: "destructive",
                            });
                            return;
                          }

                          const { data: publicUrlData } = supabase.storage
                            .from("meal-photos")
                            .getPublicUrl(data.path);

                          const imageUrl = publicUrlData.publicUrl;

                          await handleSend(
                            input.trim() || "Analise esta refeição pela foto.",
                            imageUrl,
                          );
                        } catch (err) {
                          console.error("Erro ao processar imagem", err);
                          toast({
                            title: "Erro ao enviar imagem",
                            description: "Tente novamente em alguns instantes.",
                            variant: "destructive",
                          });
                        } finally {
                          event.target.value = "";
                        }
                      } else if (file.type.startsWith("audio/")) {
                        try {
                          const formData = new FormData();
                          formData.append("audio", file);

                          const response = await fetch(
                            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-transcribe`,
                            {
                              method: "POST",
                              headers: {
                                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                              },
                              body: formData,
                            },
                          );

                          if (!response.ok) {
                            console.error("Erro na transcrição de áudio", await response.text());
                            toast({
                              title: "Erro ao transcrever áudio",
                              description: "Tente novamente em alguns instantes.",
                              variant: "destructive",
                            });
                            return;
                          }

                          const data = (await response.json()) as { text?: string };

                          if (!data.text) {
                            toast({
                              title: "Erro ao transcrever áudio",
                              description: "Tente novamente em alguns instantes.",
                              variant: "destructive",
                            });
                            return;
                          }

                          await handleSend(data.text);
                        } catch (err) {
                          console.error("Erro ao processar áudio", err);
                          toast({
                            title: "Erro ao transcrever áudio",
                            description: "Tente novamente em alguns instantes.",
                            variant: "destructive",
                          });
                        } finally {
                          event.target.value = "";
                        }
                      } else {
                        toast({
                          title: "Formato não suportado",
                          description: "Envie apenas imagens ou áudios.",
                          variant: "destructive",
                        });
                        event.target.value = "";
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 h-12 w-12 rounded-xl border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all"
                    onClick={() => {
                      const inputEl = document.getElementById(
                        "vita-file-input",
                      ) as HTMLInputElement | null;
                      inputEl?.click();
                    }}
                  >
                    <Camera className="h-5 w-5" />
                  </Button>
                  <VitaVoiceAgent
                    ref={activeVoiceAgentRef}
                    onSpeakingChange={(speaking) =>
                      onOrbStateChange?.(speaking ? "speaking" : "idle")
                    }
                    onUserTranscript={handleVoiceUserTranscript}
                    onAgentResponse={handleVoiceAgentResponse}
                  />
                </div>
                
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder="Pergunte qualquer coisa sobre sua saúde..."
                  className="min-h-[48px] max-h-32 resize-none text-sm flex-1 w-full rounded-xl border-border/60 bg-background/80 shadow-inner focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/40"
                  rows={2}
                />
                
                <Button
                  size="icon"
                  className="shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)] hover:shadow-[0_12px_32px_-8px_hsl(var(--primary)/0.8)] hover:scale-105 transition-all duration-300"
                  disabled={
                    isSending ||
                    (!input.trim() && (!limits || limits.remaining <= 0)) ||
                    (limits && limits.remaining <= 0)
                  }
                  onClick={() => handleSend()}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
      
      <UpgradeLimitModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="ai_message"
      />
    </div>
  );
};
