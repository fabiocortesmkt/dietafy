import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      console.error("ELEVENLABS_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "TTS não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const voice = (voiceId as string) || "EXAVITQu4vr4xnSDxMaL";

    const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        output_format: "mp3_44100_128",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.4,
          use_speaker_boost: true,
          speed: 1.0,
        },
      }),
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error("ElevenLabs TTS error:", ttsResponse.status, errorText);

      let status = 500;
      let body: Record<string, unknown> = { error: "Failed to generate speech" };

      try {
        const parsed = JSON.parse(errorText) as any;
        const detail = parsed?.detail;
        const detailStatus = detail?.status as string | undefined;
        const detailMessage = detail?.message as string | undefined;

        if (detailStatus === "quota_exceeded" || detailStatus === "detected_unusual_activity") {
          status = 402;
          body = {
            error: detailMessage ?? "ElevenLabs quota exceeded or usage restricted",
            code: detailStatus,
          };
        }
      } catch {
        // ignore JSON parse errors and keep generic message
      }

      return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBuffer = await ttsResponse.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("elevenlabs-tts error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
