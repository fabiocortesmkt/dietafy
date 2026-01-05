// Exercise image imports and mapping
import jumpingJacks from "@/assets/exercises/jumping-jacks.png";
import burpees from "@/assets/exercises/burpees.png";
import squat from "@/assets/exercises/squat.png";
import plank from "@/assets/exercises/plank.png";
import pushup from "@/assets/exercises/pushup.png";
import lunges from "@/assets/exercises/lunges.png";
import benchpress from "@/assets/exercises/benchpress.png";
import deadlift from "@/assets/exercises/deadlift.png";
import pulldown from "@/assets/exercises/pulldown.png";
import bicepCurl from "@/assets/exercises/bicep-curl.png";
import mountainClimbers from "@/assets/exercises/mountain-climbers.png";
import crunches from "@/assets/exercises/crunches.png";

// Keyword mapping for exercise images
const exerciseKeywords: { keywords: string[]; image: string }[] = [
  { keywords: ["jumping jack", "polichinelo"], image: jumpingJacks },
  { keywords: ["burpee"], image: burpees },
  { keywords: ["agachamento", "squat", "leg press"], image: squat },
  { keywords: ["prancha", "plank", "hollow", "dead bug"], image: plank },
  { keywords: ["flexão", "push", "supino"], image: pushup },
  { keywords: ["afundo", "lunge"], image: lunges },
  { keywords: ["bench", "supino", "crucifixo", "fly"], image: benchpress },
  { keywords: ["deadlift", "stiff", "levantamento", "remada", "row"], image: deadlift },
  { keywords: ["puxada", "pulldown", "pull", "barra fixa"], image: pulldown },
  { keywords: ["rosca", "curl", "bíceps", "martelo"], image: bicepCurl },
  { keywords: ["mountain climber", "escalador", "corrida", "hiit", "sprint", "tabata"], image: mountainClimbers },
  { keywords: ["abdominal", "crunch", "canivete", "russian twist", "bicycle", "bicicleta", "v-up"], image: crunches },
];

// Default fallback image
const defaultExerciseImage = plank;

/**
 * Get the appropriate exercise image based on exercise name
 */
export function getExerciseImage(exerciseName: string): string {
  const nameLower = exerciseName.toLowerCase();
  
  for (const entry of exerciseKeywords) {
    for (const keyword of entry.keywords) {
      if (nameLower.includes(keyword.toLowerCase())) {
        return entry.image;
      }
    }
  }
  
  return defaultExerciseImage;
}

// Export individual images for direct use
export {
  jumpingJacks,
  burpees,
  squat,
  plank,
  pushup,
  lunges,
  benchpress,
  deadlift,
  pulldown,
  bicepCurl,
  mountainClimbers,
  crunches,
};
