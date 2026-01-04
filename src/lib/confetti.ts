import confetti from "canvas-confetti";

export const launchConfetti = () => {
  void confetti({
    particleCount: 120,
    spread: 70,
    origin: { y: 0.7 },
    colors: ["#22c55e", "#0ea5e9", "#f97316"],
  });
};
