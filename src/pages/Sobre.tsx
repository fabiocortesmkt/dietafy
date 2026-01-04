import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Sobre = () => {
  return (
    <div className="min-h-screen bg-background">
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl space-y-4">
          <div className="mb-4">
            <Button asChild variant="ghost" size="sm" className="gap-2 px-0 text-muted-foreground">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
                Voltar para a página inicial
              </Link>
            </Button>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-bold"
          >
            <span>ℹ️</span>{" "}
            <span className="text-gradient">Sobre o DietaFY</span>
          </motion.h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            O DietaFY nasceu para ajudar pessoas comuns a emagrecer com saúde, sem terrorismo
            nutricional e sem dietas impossíveis de seguir no dia a dia.
          </p>
          <p className="text-base md:text-lg text-muted-foreground">
            Combinamos tecnologia e acompanhamento diário para que você tenha clareza do que fazer
            hoje: como organizar suas refeições, como ajustar sua rotina e como construir hábitos
            sustentáveis ao longo do tempo.
          </p>
          <p className="text-base md:text-lg text-muted-foreground">
            Nosso foco é constância, não perfeição. Pequenos passos diários geram grandes mudanças
            ao longo dos meses.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Sobre;
