import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Clock, ArrowRight, Loader2 } from "lucide-react";
import { launchConfetti } from "@/lib/confetti";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Declaração para evitar erros TypeScript com Meta Pixel
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const Welcome = () => {
  const navigate = useNavigate();
  const [sendingNotifications, setSendingNotifications] = useState(false);
  const notificationsSentRef = useRef(false);

  useEffect(() => {
    // Evento de Purchase será disparado pelo webhook Kiwify quando pagamento for confirmado
    console.log('Welcome page loaded - trial started');

    launchConfetti();
    // Second burst for extra celebration
    const timer = setTimeout(() => launchConfetti(), 500);

    // Send welcome notifications (email + WhatsApp) - only once
    const sendNotifications = async () => {
      if (notificationsSentRef.current) return;
      notificationsSentRef.current = true;

      setSendingNotifications(true);

      try {
        // Get onboarding data from localStorage
        const onboardingDataStr = localStorage.getItem('onboarding_data');
        if (!onboardingDataStr) {
          console.log('No onboarding data found in localStorage');
          setSendingNotifications(false);
          return;
        }

        const onboardingData = JSON.parse(onboardingDataStr);
        const { full_name, whatsapp_phone, whatsapp_opt_in, user_id, email } = onboardingData;

        // Send welcome email
        if (email) {
          supabase.functions.invoke("notify-new-signup", {
            body: {
              type: "INSERT",
              table: "users",
              record: {
                id: user_id,
                email: email,
                created_at: new Date().toISOString(),
                raw_user_meta_data: { full_name: full_name },
              },
            },
          }).catch((err) => {
            console.error("Failed to send welcome email:", err);
          });
          console.log('Welcome email triggered');
        }

        // Send WhatsApp welcome message if user opted in
        if (whatsapp_phone && whatsapp_opt_in) {
          supabase.functions.invoke("whatsapp-welcome", {
            body: {
              phone: whatsapp_phone,
              name: full_name,
              user_id: user_id,
            },
          }).catch((err) => {
            console.error("Failed to send WhatsApp welcome:", err);
          });
          console.log('WhatsApp welcome triggered');
        }

        // Clear the onboarding data from localStorage after sending
        localStorage.removeItem('onboarding_data');
      } catch (error) {
        console.error('Error sending notifications:', error);
      } finally {
        setSendingNotifications(false);
      }
    };

    sendNotifications();

    return () => clearTimeout(timer);
  }, []);

  const features = [
    "Criar seu plano alimentar personalizado",
    "Receber orientações inteligentes de dieta",
    "Acompanhar sua evolução de forma simples",
    "Usar o Dietafy como seu nutricionista no bolso",
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 2 }}
          className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-xl relative z-10"
      >
        {/* Main Card */}
        <div className="relative rounded-3xl overflow-hidden">
          {/* Gradient border effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/50 via-primary/20 to-accent/30 p-[1px] rounded-3xl" />
          
          <div className="relative bg-background/95 backdrop-blur-xl rounded-3xl p-8 md:p-10 space-y-8">
            {/* Header with celebration */}
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/30"
              >
                <Sparkles className="w-10 h-10 text-primary-foreground" />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text">
                  <span className="not-italic" style={{ fontStyle: 'normal' }}>🎉</span> Seu teste grátis de 3 dias começou!
                </h1>
              </motion.div>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-lg text-muted-foreground"
              >
                Parabéns! Seu acesso ao <span className="text-primary font-semibold">Dietafy</span> já está liberado.
              </motion.p>
            </div>

            {/* Info box with glass effect */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 p-5 border border-primary/20"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-2xl" />
              <p className="text-sm text-foreground relative z-10">
                <span className="font-semibold">👉 Nenhuma cobrança foi feita agora.</span>{" "}
                Você pode usar o app normalmente durante o período de teste.
              </p>
              <p className="text-sm text-muted-foreground mt-2 relative z-10">
                Após 3 dias, a assinatura será ativada automaticamente, caso você não cancele antes.
              </p>
            </motion.div>

            {/* Features list */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span>🥗</span> O que você já pode fazer agora
              </h2>
              <div className="grid gap-3">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + index * 0.1 }}
                    className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-sm">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="text-sm font-medium">{feature}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.3 }}
              className="pt-2"
            >
              <Button
                onClick={() => navigate("/dashboard")}
                disabled={sendingNotifications}
                className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02]"
                size="lg"
              >
                {sendingNotifications ? (
                  <>
                    <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                    Preparando...
                  </>
                ) : (
                  <>
                    Acessar meu painel
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>
            </motion.div>

            {/* Reminder */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4 }}
              className="rounded-xl bg-muted/20 p-4 border border-border/50"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">⏰ Lembrete importante</p>
                  <p className="mt-1">
                    Você pode cancelar a qualquer momento antes do fim do teste, direto pelo portal do cliente.
                    <span className="text-foreground font-medium"> Sem burocracia. Sem multas.</span>
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Footer message */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-center pt-2"
            >
              <p className="text-primary font-semibold text-lg">💚 Aproveite o Dietafy</p>
              <p className="text-sm text-muted-foreground mt-2">
                Esperamos que esses próximos dias te ajudem a comer melhor, com mais praticidade e menos stress.
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                Qualquer dúvida, é só falar com a gente 💬
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Welcome;
