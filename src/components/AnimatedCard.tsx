import { ComponentProps } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

export const AnimatedCard = (props: ComponentProps<typeof Card>) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, boxShadow: "var(--shadow-card)" }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <Card {...props} />
    </motion.div>
  );
};
