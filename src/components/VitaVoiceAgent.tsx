import { forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { useVitaVoiceConversation } from "@/hooks/useVitaVoiceConversation";

interface VitaVoiceAgentProps {
  onSpeakingChange?: (speaking: boolean) => void;
  onListeningChange?: (listening: boolean) => void;
  onUserTranscript?: (text: string) => void;
  onAgentResponse?: (text: string) => void;
}

export interface VitaVoiceAgentHandle {
  startConversation: () => void;
  stopConversation: () => void;
  toggleConversation: () => void;
}

export const VitaVoiceAgent = forwardRef<VitaVoiceAgentHandle, VitaVoiceAgentProps>(
  function VitaVoiceAgent(
    { onSpeakingChange, onListeningChange, onUserTranscript, onAgentResponse }: VitaVoiceAgentProps,
    ref,
  ) {
    const { conversation, isConnecting, startConversation, stopConversation, toggleConversation } =
      useVitaVoiceConversation({
        onSpeakingChange,
        onListeningChange,
        onUserTranscript,
        onAgentResponse,
      });

    const isDisconnected = conversation.status === "disconnected";

    useImperativeHandle(
      ref,
      () => ({
        startConversation,
        stopConversation,
        toggleConversation,
      }),
      [startConversation, stopConversation, toggleConversation],
    );

    return (
      <div className="flex items-center gap-2">
        <Button
          onClick={isDisconnected ? startConversation : stopConversation}
          disabled={isConnecting}
          size="icon"
          variant={isDisconnected ? "outline" : "secondary"}
          aria-label={
            isDisconnected ? "Iniciar conversa por voz com a Vita" : "Encerrar conversa por voz"
          }
        >
          {isDisconnected ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </Button>
      </div>
    );
  },
);
