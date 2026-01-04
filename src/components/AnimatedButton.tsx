import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Button, type ButtonProps } from "@/components/ui/button";

export const AnimatedButton = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  return (
    <motion.button whileTap={{ scale: 0.98 }} transition={{ duration: 0.05 }}>
      <Button ref={ref} {...props} />
    </motion.button>
  );
});

AnimatedButton.displayName = "AnimatedButton";
