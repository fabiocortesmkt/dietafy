import { motion } from "framer-motion";

interface AudioWavesProps {
  isActive?: boolean;
  barCount?: number;
  className?: string;
}

const AudioWaves = ({ isActive = true, barCount = 5, className = "" }: AudioWavesProps) => {
  return (
    <div className={`flex items-center justify-center gap-0.5 ${className}`}>
      {Array.from({ length: barCount }, (_, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full"
          style={{
            background: "var(--gradient-primary)",
          }}
          animate={
            isActive
              ? {
                  height: [8, 20 + Math.random() * 10, 8],
                }
              : { height: 8 }
          }
          transition={{
            duration: 0.6 + Math.random() * 0.4,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

export default AudioWaves;
