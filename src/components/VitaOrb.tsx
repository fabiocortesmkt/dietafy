import type { VitaOrbState } from "@/components/VitaChatPanel";

interface VitaOrbProps {
  state?: VitaOrbState;
  onClick?: () => void;
}

export const VitaOrb = ({ state, onClick }: VitaOrbProps) => {
  const currentState: VitaOrbState = state ?? "idle";

  const isActive = currentState === "listening" || currentState === "speaking";

  const scaleClass = !isActive
    ? ""
    : currentState === "speaking"
      ? "scale-110"
      : "scale-105";

  const brightnessClass = !isActive
    ? ""
    : currentState === "speaking"
      ? "brightness-110"
      : "brightness-105";

  const statusLabel =
    currentState === "speaking"
      ? "Respondendo"
      : currentState === "listening"
        ? "Ouvindo você"
        : "Online";

  const statusDotClass =
    currentState === "speaking"
      ? "bg-primary"
      : currentState === "listening"
        ? "bg-amber-400"
        : "bg-emerald-400";

  return (
    <div className="w-full flex flex-col items-center my-6 gap-2">
      <button
        type="button"
        onClick={onClick}
        className="focus:outline-none"
        aria-label="Controlar fala do Vita, seu nutricionista pessoal"
      >
        {isActive ? (
          <div
            className={`relative flex flex-col items-center justify-center transition-transform duration-500 ease-out ${scaleClass}`}
          >
            <div
              className={`h-32 w-32 rounded-full glow animate-pulse-glow transition duration-500 ease-out ${brightnessClass}`}
              style={{ background: "var(--gradient-primary)" }}
            />
            {/* Barras de volume simples sincronizadas com o estado de voz */}
            <div className="mt-3 flex items-end justify-center gap-1 h-5" aria-hidden="true">
              <span
                className={`w-1 rounded-full bg-primary/90 pulse ${
                  currentState === "speaking" ? "h-5" : "h-3.5"
                }`}
              />
              <span
                className={`w-1 rounded-full bg-primary/70 pulse ${
                  currentState === "speaking" ? "h-4" : "h-3"
                }`}
              />
              <span
                className={`w-1 rounded-full bg-primary/60 pulse ${
                  currentState === "speaking" ? "h-3.5" : "h-2.5"
                }`}
              />
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div
              className="h-32 w-32 rounded-full glow animate-pulse-glow"
              style={{ background: "var(--gradient-primary)" }}
            />
          </div>
        )}
      </button>
      <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className={`h-1.5 w-1.5 rounded-full animate-pulse ${statusDotClass}`}
          aria-hidden="true"
        />
        <span>{statusLabel}</span>
      </div>
    </div>
  );
};
