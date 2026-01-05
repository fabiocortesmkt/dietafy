import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get exercises without images
    const { data: exercises, error: fetchError } = await supabase
      .from('workout_exercises')
      .select('id, exercise_name')
      .or('gif_url.is.null,gif_url.like.%tenor%,gif_url.like.%giphy%')
      .limit(10);

    if (fetchError) throw fetchError;

    if (!exercises || exercises.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No exercises need images', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const exercise of exercises) {
      try {
        // Generate image prompt for the exercise
        const prompt = `Professional fitness illustration of a person performing ${exercise.exercise_name} exercise, clean minimalist style, gym setting, proper form demonstration, anatomical accuracy, soft lighting, modern fitness aesthetic, no text, high quality`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            modalities: ['image', 'text']
          })
        });

        if (!response.ok) {
          console.error(`Image generation failed for ${exercise.exercise_name}:`, await response.text());
          continue;
        }

        const data = await response.json();
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (imageUrl) {
          // Update the exercise with the generated image
          const { error: updateError } = await supabase
            .from('workout_exercises')
            .update({ gif_url: imageUrl })
            .eq('id', exercise.id);

          if (updateError) {
            console.error(`Update failed for ${exercise.exercise_name}:`, updateError);
          } else {
            results.push({ id: exercise.id, name: exercise.exercise_name, success: true });
          }
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Error processing ${exercise.exercise_name}:`, err);
        results.push({ id: exercise.id, name: exercise.exercise_name, success: false, error: errorMessage });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${results.length} exercises`,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
