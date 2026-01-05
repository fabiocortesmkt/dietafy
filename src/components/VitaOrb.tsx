import type { VitaOrbState } from "@/components/VitaChatPanel";
import { motion } from "framer-motion";

interface VitaOrbProps {
  state?: VitaOrbState;
  onClick?: () => void;
}

export const VitaOrb = ({ state, onClick }: VitaOrbProps) => {
  const currentState: VitaOrbState = state ?? "idle";

  const isActive = currentState === "listening" || currentState === "speaking";

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
    <div className="w-full flex flex-col items-center my-8 gap-4">
      <motion.button
        type="button"
        onClick={onClick}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-full"
        aria-label="Controlar fala do Vita, seu nutricionista pessoal"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="relative flex flex-col items-center justify-center">
          {/* Outer glow rings */}
          <motion.div
            className="absolute inset-0 h-36 w-36 rounded-full"
            style={{
              background: "radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)",
            }}
            animate={{
              scale: isActive ? [1, 1.3, 1] : [1, 1.15, 1],
              opacity: isActive ? [0.6, 0.2, 0.6] : [0.4, 0.2, 0.4],
            }}
            transition={{
              duration: isActive ? 1.5 : 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          {/* Secondary ring */}
          <motion.div
            className="absolute inset-0 h-36 w-36 rounded-full"
            style={{
              background: "radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, transparent 60%)",
            }}
            animate={{
              scale: isActive ? [1.1, 1.4, 1.1] : [1.05, 1.2, 1.05],
              opacity: isActive ? [0.4, 0.1, 0.4] : [0.3, 0.1, 0.3],
            }}
            transition={{
              duration: isActive ? 1.8 : 3.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.3,
            }}
          />

          {/* Main orb */}
          <motion.div
            className="relative h-36 w-36 rounded-full overflow-hidden shadow-[0_0_60px_hsl(var(--primary)/0.4)]"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 50%, hsl(var(--primary) / 0.5) 100%)",
            }}
            animate={{
              scale: currentState === "speaking" ? [1, 1.08, 1] : currentState === "listening" ? [1, 1.04, 1] : 1,
              boxShadow: isActive
                ? [
                    "0 0 60px hsl(var(--primary)/0.4)",
                    "0 0 80px hsl(var(--primary)/0.6)",
                    "0 0 60px hsl(var(--primary)/0.4)",
                  ]
                : "0 0 60px hsl(var(--primary)/0.4)",
            }}
            transition={{
              duration: currentState === "speaking" ? 0.8 : 1.2,
              repeat: isActive ? Infinity : 0,
              ease: "easeInOut",
            }}
          >
            {/* Inner gradient overlay */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle at 30% 30%, hsl(var(--primary-foreground) / 0.3) 0%, transparent 50%)",
              }}
            />
            
            {/* Shine effect */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: "linear-gradient(135deg, transparent 40%, hsl(var(--primary-foreground) / 0.2) 50%, transparent 60%)",
              }}
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>

          {/* Voice bars - only when active */}
          {isActive && (
            <div className="absolute -bottom-2 flex items-end justify-center gap-1 h-6" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.span
                  key={i}
                  className="w-1 rounded-full bg-primary"
                  animate={{
                    height: currentState === "speaking"
                      ? [8 + i * 2, 16 + i * 3, 8 + i * 2]
                      : [6 + i, 10 + i * 2, 6 + i],
                  }}
                  transition={{
                    duration: currentState === "speaking" ? 0.4 : 0.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.08,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </motion.button>

      {/* Status indicator */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 border border-border/40 backdrop-blur-sm shadow-sm"
      >
        <motion.span
          className={`h-2 w-2 rounded-full ${statusDotClass}`}
          animate={{
            scale: isActive ? [1, 1.3, 1] : [1, 1.15, 1],
            opacity: isActive ? [1, 0.7, 1] : [1, 0.8, 1],
          }}
          transition={{
            duration: isActive ? 0.8 : 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <span className="text-sm font-medium text-muted-foreground">{statusLabel}</span>
      </motion.div>
    </div>
  );
};
