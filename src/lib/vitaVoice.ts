const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-tts`;

let currentAudio: HTMLAudioElement | null = null;

export async function playVitaVoice(text: string, voiceId = "nova") {
  if (!text.trim()) return;

  // Mapear IDs de voz da UI para vozes suportadas pelo OpenAI TTS
  // OpenAI aceita: 'nova', 'shimmer', 'echo', 'onyx', 'fable', 'alloy', 'ash', 'sage', 'coral'
  const voiceMap: Record<string, string> = {
    nova: "nova",
    ballad: "alloy", // opção masculina mapeada para uma voz suportada
  };

  const resolvedVoice = voiceMap[voiceId] ?? "nova";

  const response = await fetch(TTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ text, voice: resolvedVoice }),
  });

  if (!response.ok) {
    console.error("Erro no TTS da Vita:", response.status, await response.text());
    throw new Error(`Falha ao gerar áudio (${response.status})`);
  }

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);

  // Interrompe qualquer áudio anterior antes de iniciar um novo
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }

  const audio = new Audio(audioUrl);
  currentAudio = audio;

  await new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      currentAudio = null;
      resolve();
    };

    audio.onerror = () => {
      console.error("Erro na reprodução do áudio da Vita");
      currentAudio = null;
      reject(new Error("Erro na reprodução do áudio da Vita"));
    };

    audio
      .play()
      .catch((err) => {
        console.error("Erro ao iniciar áudio da Vita:", err);
        currentAudio = null;
        reject(err);
      });
  });
}

export function toggleVitaVoicePlayback(): "speaking" | "idle" {
  if (!currentAudio) {
    return "idle";
  }

  if (currentAudio.paused) {
    void currentAudio.play();
    return "speaking";
  } else {
    currentAudio.pause();
    return "idle";
  }
}
