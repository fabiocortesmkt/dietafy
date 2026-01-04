import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
const ELEVENLABS_AGENT_ID_DEMO = Deno.env.get("ELEVENLABS_AGENT_ID_DEMO");
const ELEVENLABS_AGENT_ID_APP = Deno.env.get("ELEVENLABS_AGENT_ID_APP");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agentType = "app" } = await req.json().catch(() => ({}));
    
    const agentId = agentType === "demo" 
      ? ELEVENLABS_AGENT_ID_DEMO 
      : ELEVENLABS_AGENT_ID_APP;

    if (!ELEVENLABS_API_KEY) {
      console.error("Missing ELEVENLABS_API_KEY");
      return new Response(
        JSON.stringify({ error: "ElevenLabs API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!agentId) {
      const secretName = agentType === "demo" ? "ELEVENLABS_AGENT_ID_DEMO" : "ELEVENLABS_AGENT_ID_APP";
      console.error(`Missing ${secretName}`);
      return new Response(
        JSON.stringify({ error: `ElevenLabs agent ID for ${agentType} not configured. Please add ${secretName} secret.` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`,
      {
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
      },
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Error fetching conversation token:", response.status, text);
      return new Response(
        JSON.stringify({ error: "Failed to get conversation token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { token } = await response.json();

    return new Response(JSON.stringify({ token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("elevenlabs-conversation-token error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
