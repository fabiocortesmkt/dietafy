import confetti from "canvas-confetti";

export const launchConfetti = () => {
  void confetti({
    particleCount: 120,
    spread: 70,
    origin: { y: 0.7 },
    colors: ["#22c55e", "#0ea5e9", "#f97316"],
  });
};

export const launchConfettiPremium = () => {
  void confetti({
    particleCount: 150,
    spread: 180,
    origin: { y: 0 },
    angle: 270,
    startVelocity: 35,
    gravity: 0.8,
    drift: 0,
    ticks: 300,
    colors: ["#22c55e", "#0ea5e9", "#f97316", "#a855f7", "#eab308"],
    scalar: 1.2,
  });
};
