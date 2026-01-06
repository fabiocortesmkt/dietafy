import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Sparkles, Clock, MessageCircle } from "lucide-react";
import { launchConfetti } from "@/lib/confetti";
import { useEffect } from "react";

const Welcome = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Trigger confetti on page load
    launchConfetti();
  }, []);

  const features = [
    { icon: Check, text: "Criar seu plano alimentar personalizado" },
    { icon: Check, text: "Receber orientações inteligentes de dieta" },
    { icon: Check, text: "Acompanhar sua evolução de forma simples" },
    { icon: Check, text: "Usar o Dietafy como seu nutricionista no bolso" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 -z-10 opacity-30"
        style={{
          background: "var(--gradient-hero)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg"
      >
        <Card className="border border-border/80 shadow-lg rounded-2xl bg-background/95 overflow-hidden">
          <CardContent className="p-6 md:p-8 space-y-6">
            {/* Header with celebration */}
            <div className="text-center space-y-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2"
              >
                <Sparkles className="w-8 h-8 text-primary" />
              </motion.div>
              <h1 className="text-2xl md:text-3xl font-bold text-gradient">
                🎉 Seu teste grátis de 3 dias começou!
              </h1>
              <p className="text-muted-foreground">
                Parabéns! Seu acesso ao Dietafy já está liberado.
              </p>
            </div>

            {/* Info box */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-muted/50 rounded-xl p-4 border border-border/50"
            >
              <p className="text-sm text-muted-foreground">
                👉 <span className="font-medium text-foreground">Nenhuma cobrança foi feita agora.</span>{" "}
                Você pode usar o app normalmente durante o período de teste.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Após 3 dias, a assinatura será ativada automaticamente, caso você não cancele antes.
              </p>
            </motion.div>

            {/* Features list */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                🥗 O que você já pode fazer agora
              </h2>
              <ul className="space-y-2">
                {features.map((feature, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="flex items-center gap-3 text-sm"
                  >
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                      <feature.icon className="w-3 h-3 text-primary" />
                    </div>
                    <span>{feature.text}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Button
                onClick={() => navigate("/onboarding")}
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                Começar agora 🚀
              </Button>
            </motion.div>

            {/* Reminder */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="bg-muted/30 rounded-xl p-4 border border-border/30"
            >
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">⏰ Lembrete importante</p>
                  <p className="mt-1">
                    Você pode cancelar a qualquer momento antes do fim do teste, direto pelo portal do cliente.
                    Sem burocracia. Sem multas.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Footer message */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="text-center space-y-2"
            >
              <p className="text-primary font-medium">💚 Aproveite o Dietafy</p>
              <p className="text-sm text-muted-foreground">
                Esperamos que esses próximos dias te ajudem a comer melhor, com mais praticidade e menos stress.
              </p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <MessageCircle className="w-3 h-3" />
                Qualquer dúvida, é só falar com a gente 💬
              </p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Welcome;
