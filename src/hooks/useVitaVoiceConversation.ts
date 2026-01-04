import { useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UseVitaVoiceConversationParams {
  agentType?: "demo" | "app";
  onSpeakingChange?: (speaking: boolean) => void;
  onListeningChange?: (listening: boolean) => void;
  onUserTranscript?: (text: string) => void;
  onAgentResponse?: (text: string) => void;
}

export interface UseVitaVoiceConversationResult {
  conversation: ReturnType<typeof useConversation>;
  isConnecting: boolean;
  startConversation: () => Promise<void>;
  stopConversation: () => Promise<void>;
  toggleConversation: () => void;
}

function isDemoGoodbye(text: string): boolean {
  const normalized = text
    .trim()
    .replace(/\s+/g, " ");

  const target =
    "Até logo, esta foi a demonstração da Vita Nutri IA aqui na DietaFY.";

  return normalized.endsWith(target);
}
 
export function useVitaVoiceConversation(
  params: UseVitaVoiceConversationParams = {},
): UseVitaVoiceConversationResult {
  const { agentType = "app", onSpeakingChange, onListeningChange, onUserTranscript, onAgentResponse } = params;
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const demoEndTimeoutRef = useRef<number | null>(null);

  const conversation = useConversation({
    onConnect: () => {
      toast({
        title: "Voz conectada",
        description: "Vita Nutri IA pronta para você.",
      });
      onListeningChange?.(false);
      onSpeakingChange?.(false);
    },
    onDisconnect: () => {
      if (demoEndTimeoutRef.current !== null) {
        window.clearTimeout(demoEndTimeoutRef.current);
        demoEndTimeoutRef.current = null;
      }

      toast({
        title: "Voz encerrada",
        description: "Conversa finalizada com sucesso.",
      });
      onSpeakingChange?.(false);
      onListeningChange?.(false);
    },
    onError: (error) => {
      console.error("Erro na conversa por voz:", error);

      if (demoEndTimeoutRef.current !== null) {
        window.clearTimeout(demoEndTimeoutRef.current);
        demoEndTimeoutRef.current = null;
      }

      toast({
        variant: "destructive",
        title: "Falha na voz",
        description: "Não foi possível conectar agora. Tente de novo em instantes.",
      });
      onSpeakingChange?.(false);
      onListeningChange?.(false);
    },
    onVadScore: ({ vadScore }) => {
      const isListening = vadScore > 0.5 && !conversation.isSpeaking;
      onListeningChange?.(isListening);
    },
    onMessage: (message: any) => {
      try {
        switch (message.type) {
          case "user_transcript": {
            const text = message.user_transcription_event?.user_transcript;
            if (text && onUserTranscript) {
              onUserTranscript(text);
            }
            break;
          }
          case "agent_response": {
            const text = message.agent_response_event?.agent_response;
            if (text) {
              onAgentResponse?.(text);

              if (agentType === "demo" && isDemoGoodbye(text)) {
                toast({
                  title: "Demonstração encerrada",
                  description:
                    "Clique em 'Começar Agora' para liberar a versão completa da Vita Nutri IA e receber um plano personalizado para você.",
                });

                if (demoEndTimeoutRef.current !== null) {
                  window.clearTimeout(demoEndTimeoutRef.current);
                }

                demoEndTimeoutRef.current = window.setTimeout(() => {
                  conversation
                    .endSession()
                    .catch((err) =>
                      console.error("Erro ao encerrar demo automaticamente:", err),
                    )
                    .finally(() => {
                      demoEndTimeoutRef.current = null;
                    });
                }, 2000);
              }
            }
            break;
          }
          default:
            break;
        }
      } catch (err) {
        console.error("Erro ao processar mensagem da conversa por voz:", err);
      }
    },
  });

  useEffect(() => {
    onSpeakingChange?.(conversation.isSpeaking ?? false);
    if (conversation.isSpeaking) {
      onListeningChange?.(false);
    }
  }, [conversation.isSpeaking, onSpeakingChange, onListeningChange]);

  const startConversation = useCallback(async () => {
    if (isConnecting) {
      // Evita múltiplas conexões concorrentes com cliques rápidos
      return;
    }

    setIsConnecting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data, error } = await supabase.functions.invoke("elevenlabs-conversation-token", {
        body: { agentType },
      });

      if (error || !data?.token) {
        throw new Error(error?.message || "Token não recebido");
      }

      const maxAttempts = 3;
      const retryDelayMs = 400;

      const tryConnect = async (attempt: number): Promise<void> => {
        try {
          await conversation.startSession({
            conversationToken: data.token,
            connectionType: "webrtc",
          });
        } catch (connectErr) {
          console.warn(
            `Tentativa de conexão de voz ${attempt}/${maxAttempts} falhou`,
            connectErr,
          );

          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
            return tryConnect(attempt + 1);
          }

          throw connectErr;
        }
      };

      await tryConnect(1);
    } catch (err) {
      console.error("Erro ao iniciar conversa por voz:", err);
      toast({
        variant: "destructive",
        title: "Falha na conexão",
        description:
          "Não foi possível iniciar a voz agora. Aguarde alguns segundos e tente novamente.",
      });
      onSpeakingChange?.(false);
      onListeningChange?.(false);
    } finally {
      setIsConnecting(false);
    }
  }, [conversation, toast, onListeningChange, onSpeakingChange, isConnecting, agentType]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const toggleConversation = useCallback(() => {
    if (conversation.status === "disconnected") {
      void startConversation();
    } else {
      void stopConversation();
    }
  }, [conversation.status, startConversation, stopConversation]);

  return {
    conversation,
    isConnecting,
    startConversation,
    stopConversation,
    toggleConversation,
  };
}
