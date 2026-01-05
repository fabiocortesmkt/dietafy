import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExerciseLog {
  id: string;
  user_id: string;
  workout_log_id: string | null;
  exercise_name: string;
  set_number: number;
  reps_completed: number | null;
  weight_kg: number | null;
  notes: string | null;
  completed_at: string;
  created_at: string;
}

export interface ExerciseLogInsert {
  exercise_name: string;
  set_number: number;
  reps_completed?: number;
  weight_kg?: number;
  notes?: string;
  workout_log_id?: string;
}

export function useExerciseLogs(userId: string | null) {
  const queryClient = useQueryClient();

  // Get all exercise logs for user
  const logsQuery = useQuery({
    queryKey: ["exercise-logs", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("exercise_logs")
        .select("*")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return data as ExerciseLog[];
    },
    enabled: !!userId,
  });

  // Get best performance for a specific exercise
  const getBestForExercise = (exerciseName: string) => {
    const logs = logsQuery.data || [];
    const exerciseLogs = logs.filter(
      (log) => log.exercise_name.toLowerCase() === exerciseName.toLowerCase()
    );
    
    if (exerciseLogs.length === 0) return null;
    
    // Find the heaviest weight with at least 1 rep
    const withWeight = exerciseLogs.filter((l) => l.weight_kg && l.weight_kg > 0);
    const bestWeight = withWeight.length > 0 
      ? Math.max(...withWeight.map((l) => l.weight_kg!))
      : null;
    
    // Find the most reps at any weight
    const withReps = exerciseLogs.filter((l) => l.reps_completed && l.reps_completed > 0);
    const bestReps = withReps.length > 0 
      ? Math.max(...withReps.map((l) => l.reps_completed!))
      : null;
    
    return { bestWeight, bestReps, totalSets: exerciseLogs.length };
  };

  // Get last performance for a specific exercise
  const getLastForExercise = (exerciseName: string) => {
    const logs = logsQuery.data || [];
    const exerciseLogs = logs.filter(
      (log) => log.exercise_name.toLowerCase() === exerciseName.toLowerCase()
    );
    
    if (exerciseLogs.length === 0) return null;
    
    // Group by completed_at date (same workout session)
    const latestLog = exerciseLogs[0];
    const sessionDate = latestLog.completed_at.slice(0, 10);
    const sessionLogs = exerciseLogs.filter(
      (l) => l.completed_at.slice(0, 10) === sessionDate
    );
    
    return sessionLogs;
  };

  // Add exercise log mutation
  const addLogMutation = useMutation({
    mutationFn: async (log: ExerciseLogInsert) => {
      if (!userId) throw new Error("User not authenticated");
      const { data, error } = await supabase
        .from("exercise_logs")
        .insert({
          user_id: userId,
          ...log,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-logs", userId] });
    },
  });

  // Add multiple logs at once
  const addMultipleLogsMutation = useMutation({
    mutationFn: async (logs: ExerciseLogInsert[]) => {
      if (!userId) throw new Error("User not authenticated");
      const { data, error } = await supabase
        .from("exercise_logs")
        .insert(logs.map((log) => ({ user_id: userId, ...log })))
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercise-logs", userId] });
    },
  });

  return {
    logs: logsQuery.data || [],
    isLoading: logsQuery.isLoading,
    getBestForExercise,
    getLastForExercise,
    addLog: addLogMutation.mutateAsync,
    addMultipleLogs: addMultipleLogsMutation.mutateAsync,
    isAdding: addLogMutation.isPending || addMultipleLogsMutation.isPending,
  };
}
