-- Create exercise_logs table to track per-exercise performance
CREATE TABLE public.exercise_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workout_log_id UUID REFERENCES public.workout_logs(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  reps_completed INTEGER,
  weight_kg NUMERIC,
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own exercise logs" 
ON public.exercise_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercise logs" 
ON public.exercise_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercise logs" 
ON public.exercise_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercise logs" 
ON public.exercise_logs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_exercise_logs_user_id ON public.exercise_logs(user_id);
CREATE INDEX idx_exercise_logs_workout_log_id ON public.exercise_logs(workout_log_id);
CREATE INDEX idx_exercise_logs_exercise_name ON public.exercise_logs(exercise_name);