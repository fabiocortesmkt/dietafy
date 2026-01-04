import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Privacidade = () => {
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
            <span>🛡️</span>{" "}
            <span className="text-gradient">Privacidade dos seus dados</span>
          </motion.h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            Levamos a sério a segurança das suas informações de saúde, peso, rotina e objetivos.
          </p>
          <ul className="space-y-2 text-base md:text-lg text-muted-foreground">
            <li>• Utilizamos seus dados apenas para personalizar sua experiência no DietaFY.</li>
            <li>• Você pode encerrar sua conta a qualquer momento.</li>
            <li>• Não vendemos seus dados pessoais para terceiros.</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Este material tem caráter informativo e não substitui avaliação individualizada com
            profissionais de saúde.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Privacidade;
