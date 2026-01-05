import { motion } from "framer-motion";
import { useMemo } from "react";

interface ParticleBackgroundProps {
  particleCount?: number;
  className?: string;
}

const ParticleBackground = ({ particleCount = 25, className = "" }: ParticleBackgroundProps) => {
  const particles = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${60 + Math.random() * 40}%`,
      duration: 4 + Math.random() * 4,
      delay: Math.random() * 3,
      size: 2 + Math.random() * 3,
    }));
  }, [particleCount]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-primary/40"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
          }}
          animate={{
            y: [0, -200, -400],
            x: [0, Math.random() * 40 - 20, Math.random() * 60 - 30],
            opacity: [0, 0.8, 0.6, 0],
            scale: [0.5, 1, 0.8],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
};

export default ParticleBackground;
