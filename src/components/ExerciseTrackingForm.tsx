import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Plus, Minus, Check, Trophy, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SetData {
  reps: number;
  weight: number;
}

interface ExerciseTrackingFormProps {
  exerciseName: string;
  targetSets: number;
  targetReps: string | null;
  lastPerformance: { set_number: number; reps_completed: number | null; weight_kg: number | null }[] | null;
  bestPerformance: { bestWeight: number | null; bestReps: number | null; totalSets: number } | null;
  onSave: (sets: SetData[]) => Promise<void>;
  isSaving: boolean;
}

export function ExerciseTrackingForm({
  exerciseName,
  targetSets,
  targetReps,
  lastPerformance,
  bestPerformance,
  onSave,
  isSaving,
}: ExerciseTrackingFormProps) {
  const numSets = targetSets || 3;
  const parsedTargetReps = parseInt(targetReps || "10", 10) || 10;

  // Initialize sets from last performance or defaults
  const [sets, setSets] = useState<SetData[]>(() => {
    if (lastPerformance && lastPerformance.length > 0) {
      return Array.from({ length: numSets }, (_, i) => {
        const last = lastPerformance.find((p) => p.set_number === i + 1);
        return {
          reps: last?.reps_completed || parsedTargetReps,
          weight: last?.weight_kg || 0,
        };
      });
    }
    return Array.from({ length: numSets }, () => ({
      reps: parsedTargetReps,
      weight: 0,
    }));
  });

  const [completedSets, setCompletedSets] = useState<boolean[]>(
    Array.from({ length: numSets }, () => false)
  );

  const updateSet = (index: number, field: "reps" | "weight", value: number) => {
    setSets((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: Math.max(0, value) };
      return updated;
    });
  };

  const toggleSetComplete = (index: number) => {
    setCompletedSets((prev) => {
      const updated = [...prev];
      updated[index] = !updated[index];
      return updated;
    });
  };

  const handleSave = async () => {
    const completedData = sets.filter((_, i) => completedSets[i]);
    if (completedData.length === 0) return;
    await onSave(completedData.map((s, i) => ({ ...s, setNumber: i + 1 })) as any);
  };

  const allCompleted = completedSets.every((c) => c);
  const someCompleted = completedSets.some((c) => c);

  // Check for new personal record
  const currentMaxWeight = Math.max(...sets.map((s) => s.weight));
  const isNewPR = bestPerformance?.bestWeight && currentMaxWeight > bestPerformance.bestWeight;

  return (
    <div className="space-y-4">
      {/* Performance history badges */}
      {(lastPerformance || bestPerformance) && (
        <div className="flex flex-wrap gap-2">
          {bestPerformance?.bestWeight && (
            <Badge variant="secondary" className="gap-1">
              <Trophy className="h-3 w-3 text-yellow-500" />
              Record: {bestPerformance.bestWeight}kg
            </Badge>
          )}
          {lastPerformance && lastPerformance.length > 0 && (
            <Badge variant="outline" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              Último: {lastPerformance[0]?.weight_kg || 0}kg x {lastPerformance[0]?.reps_completed || 0}
            </Badge>
          )}
        </div>
      )}

      {/* Sets tracking */}
      <div className="space-y-3">
        {sets.map((set, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-all",
              completedSets[index]
                ? "bg-primary/10 border-primary/30"
                : "bg-muted/30 border-border"
            )}
          >
            {/* Set number */}
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                completedSets[index]
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {completedSets[index] ? <Check className="h-4 w-4" /> : index + 1}
            </div>

            {/* Weight input */}
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Peso (kg)</Label>
              <div className="flex items-center gap-1 mt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateSet(index, "weight", set.weight - 2.5)}
                  disabled={completedSets[index]}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  value={set.weight}
                  onChange={(e) => updateSet(index, "weight", parseFloat(e.target.value) || 0)}
                  className="h-8 w-16 text-center text-sm"
                  disabled={completedSets[index]}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateSet(index, "weight", set.weight + 2.5)}
                  disabled={completedSets[index]}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Reps input */}
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Reps</Label>
              <div className="flex items-center gap-1 mt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateSet(index, "reps", set.reps - 1)}
                  disabled={completedSets[index]}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  value={set.reps}
                  onChange={(e) => updateSet(index, "reps", parseInt(e.target.value) || 0)}
                  className="h-8 w-12 text-center text-sm"
                  disabled={completedSets[index]}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateSet(index, "reps", set.reps + 1)}
                  disabled={completedSets[index]}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Complete button */}
            <Button
              type="button"
              variant={completedSets[index] ? "default" : "outline"}
              size="sm"
              className="shrink-0"
              onClick={() => toggleSetComplete(index)}
            >
              {completedSets[index] ? "Feito" : "Concluir"}
            </Button>
          </motion.div>
        ))}
      </div>

      {/* New PR indicator */}
      <AnimatePresence>
        {isNewPR && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center justify-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30"
          >
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="font-semibold text-yellow-600 dark:text-yellow-400">
              Novo Record Pessoal!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save button */}
      {someCompleted && (
        <Button
          className="w-full"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Salvando..." : "Salvar Progresso"}
        </Button>
      )}
    </div>
  );
}
