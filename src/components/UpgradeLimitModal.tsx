import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { FeatureKey } from "@/lib/limits";

interface UpgradeLimitModalProps {
  open: boolean;
  onClose: () => void;
  feature: FeatureKey;
}

const featureMessages: Record<FeatureKey, { title: string; body: string }> = {
  log_meal: {
    title: "Você atingiu o limite diário de refeições",
    body: "No plano gratuito você pode registrar até 5 refeições por dia. No Premium, os registros são ilimitados.",
  },
  ai_message: {
    title: "\uD83D\uDE80 Você atingiu o limite diário",
    body: "Você já usou suas 10 mensagens com a Vita hoje. No Premium, você conversa ilimitado com a Vita.",
  },
  photo_analysis: {
    title: "Limite de análises por foto atingido",
    body: "No plano gratuito você tem 3 análises de fotos por dia. No Premium, as análises são ilimitadas.",
  },
  whatsapp: {
    title: "Canal WhatsApp é exclusivo do Premium",
    body: "Para ter o Vita, seu nutricionista pessoal, ativo 24/7 no WhatsApp você precisa do plano Premium do DietaFY.",
  },
  advanced_workouts: {
    title: "Treinos avançados são Premium",
    body: "Os treinos completos e avançados fazem parte do plano Premium.",
  },
  custom_plans: {
    title: "Planos personalizados são Premium",
    body: "Planos totalmente personalizados estão disponíveis para assinantes Premium.",
  },
};

export const UpgradeLimitModal = ({ open, onClose, feature }: UpgradeLimitModalProps) => {
  const copy = featureMessages[feature];

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {copy.body}
            <br />
            <br />
            Com o plano Premium você desbloqueia:
            <br />
            \u2728 Mensagens ilimitadas com a Vita
            <br />
            \u2728 WhatsApp ativo 24/7
            <br />
            \u2728 Análises de fotos ilimitadas
            <br />
            \u2728 +15 treinos exclusivos
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-4">
          <Button className="w-full" onClick={() => window.open("https://pay.kiwify.com.br/4DKAQbY", "_blank")}> 
            Upgrade por R$ 29,90/mês
          </Button>
          <Button variant="outline" className="w-full" onClick={onClose}>
            Continuar grátis
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
