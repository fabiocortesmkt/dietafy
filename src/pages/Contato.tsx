import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Contato = () => {
  return (
    <div className="min-h-screen bg-background">
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl space-y-6">
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
            <span>📬</span>{" "}
            <span className="text-gradient">Fale com a gente</span>
          </motion.h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            Tem dúvidas sobre o DietaFY, planos ou quer falar com nosso time?
          </p>
          <div className="space-y-2 text-base md:text-lg text-muted-foreground">
            <p>
              Envie um e-mail para:{" "}
              <a
                href="mailto:contato@dietafy.app"
                className="text-primary underline underline-offset-2"
              >
                contato@dietafy.app
              </a>
            </p>
            <p>
              Responderemos o mais rápido possível com orientações e próximos passos para você
              começar ou continuar sua jornada.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contato;
