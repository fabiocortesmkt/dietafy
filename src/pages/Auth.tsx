import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Declaração para evitar erros TypeScript com Meta Pixel
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fluxo de recuperação de senha
  const [isRecoverMode, setIsRecoverMode] = useState(false);
  const [isResetStage, setIsResetStage] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const handlePostLoginRedirect = async (userId: string, userEmail?: string | null, userMetadata?: Record<string, unknown>) => {
    try {
      // Conta master admin sempre vai direto para o painel administrativo
      if (userEmail && userEmail.toLowerCase() === "admin@dev.local") {
        navigate("/admin");
        return;
      }

      // Verifica se usuário é admin pelo papel cadastrado
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (rolesError) {
        console.error("Erro ao buscar roles do usuário:", rolesError);
      }

      const isAdmin = rolesData?.some((role) => role.role === "admin") ?? false;

      if (isAdmin) {
        // Admin sempre vai direto para o painel de administração
        navigate("/admin");
        return;
      }

      // Check if stripe checkout is pending from user metadata
      if (userMetadata?.stripe_checkout_pending === true) {
        // Check if user has completed stripe checkout by looking at profile
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("stripe_checkout_pending, plan_type")
          .eq("user_id", userId)
          .maybeSingle();

        // If profile exists and checkout is not pending, or plan is premium, proceed
        if (profile && (profile.stripe_checkout_pending === false || profile.plan_type === "premium")) {
          // Update user metadata to remove pending flag
          await supabase.auth.updateUser({
            data: { stripe_checkout_pending: false }
          });
        } else {
          // Redirect back to Stripe
          const stripeUrl = `https://buy.stripe.com/3cI5kD7NbeuH1yQ6kJ7bW01?prefilled_email=${encodeURIComponent(userEmail || "")}`;
          window.location.href = stripeUrl;
          return;
        }
      }

      // Fluxo normal para usuários finais
      const { data, error } = await supabase
        .from("user_profiles")
        .select("onboarding_completed")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Erro ao verificar perfil do usuário:", error);
        navigate("/onboarding");
        return;
      }

      if (data?.onboarding_completed) {
        navigate("/dashboard");
      } else {
        navigate("/onboarding");
      }
    } catch (err) {
      console.error("Erro inesperado ao redirecionar após login:", err);
      navigate("/onboarding");
    }
  };
  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "signup") {
      setIsLogin(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session?.user) {
        // Usuário acessou o link de recuperação de senha
        setIsRecoverMode(true);
        setIsResetStage(true);
        setResetEmail(session.user.email ?? "");
        return;
      }

      if (session?.user) {
        setTimeout(() => {
          handlePostLoginRedirect(session.user.id, session.user.email, session.user.user_metadata);
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handlePostLoginRedirect(session.user.id, session.user.email, session.user.user_metadata);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!email.trim() || !password.trim()) {
        toast({
          title: "Dados incompletos",
          description: "Preencha email e senha para continuar.",
          variant: "destructive",
        });
        return;
      }

      if (!isLogin) {
        if (!fullName.trim()) {
          toast({
            title: "Nome obrigatório",
            description: "Informe seu nome para criar sua conta.",
            variant: "destructive",
          });
          return;
        }

        if (password.length < 8) {
          toast({
            title: "Senha fraca",
            description: "Use pelo menos 8 caracteres na sua senha.",
            variant: "destructive",
          });
          return;
        }
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast({
          title: "Login realizado!",
          description: "Bem-vindo de volta ao DietaFY",
        });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/welcome`,
            data: {
              full_name: fullName.trim(),
              stripe_checkout_pending: true,
            },
          },
        });
        if (error) throw error;

        // Dispara evento InitiateCheckout no Meta Pixel
        if (typeof window !== 'undefined' && window.fbq) {
          window.fbq('track', 'InitiateCheckout', {
            value: 29.90,
            currency: 'BRL',
            content_name: 'Dietafy Premium Trial',
            content_type: 'subscription',
          });
          console.log('Meta Pixel: InitiateCheckout event fired');
        }

        toast({
          title: "Conta criada!",
          description: "Redirecionando para o checkout...",
        });

        // Redirect to Stripe checkout with prefilled email
        const stripeUrl = `https://buy.stripe.com/3cI5kD7NbeuH1yQ6kJ7bW01?prefilled_email=${encodeURIComponent(email)}`;
        window.location.href = stripeUrl;
        return;
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/onboarding`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível conectar com o Google",
        variant: "destructive",
      });
    }
  };

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetEmail.trim()) {
      toast({
        title: "Informe seu email",
        description: "Digite o email que você usou para criar a conta.",
        variant: "destructive",
      });
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;

      toast({
        title: "Email enviado",
        description:
          "Se existir uma conta com esse email, você receberá um link para redefinir sua senha.",
      });
      setIsRecoverMode(false);
      setIsResetStage(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar o email de recuperação.",
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetPassword || resetPassword.length < 8) {
      toast({
        title: "Senha inválida",
        description: "Use pelo menos 8 caracteres na nova senha.",
        variant: "destructive",
      });
      return;
    }

    if (resetPassword !== resetPasswordConfirm) {
      toast({
        title: "Senhas não conferem",
        description: "A confirmação de senha precisa ser igual à senha.",
        variant: "destructive",
      });
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: resetPassword,
      });
      if (error) throw error;

      toast({
        title: "Senha atualizada",
        description: "Sua senha foi redefinida com sucesso. Você já pode entrar normalmente.",
      });

      setIsRecoverMode(false);
      setIsResetStage(false);
      setResetPassword("");
      setResetPasswordConfirm("");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar a senha.",
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

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
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border border-border/80 shadow-sm rounded-2xl bg-background/95">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl md:text-3xl font-bold text-center text-gradient">
              {isRecoverMode
                ? isResetStage
                  ? "Definir nova senha"
                  : "Recuperar acesso"
                : isLogin
                  ? "Bem-vindo(a) de volta ao DietaFY"
                  : "Comece sua jornada com o DietaFY"}
            </CardTitle>
            <CardDescription className="text-center text-sm text-muted-foreground">
              {isRecoverMode
                ? isResetStage
                  ? "Crie uma nova senha forte para proteger sua conta."
                  : "Informe o email cadastrado para enviarmos o link de redefinição."
                : isLogin
                  ? "Entre para continuar sua evolução com treinos, dieta e acompanhamento."
                  : "Crie sua conta em poucos segundos e receba planos personalizados para você."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isRecoverMode ? (
              isResetStage ? (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword">Nova senha</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={resetPasswordConfirm}
                      onChange={(e) => setResetPasswordConfirm(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={resetLoading}>
                    {resetLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar nova senha"
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleRequestPasswordReset} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="resetEmail">Email cadastrado</Label>
                    <Input
                      id="resetEmail"
                      type="email"
                      placeholder="voce@exemplo.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={resetLoading}>
                    {resetLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar link de recuperação"
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecoverMode(false);
                      setIsResetStage(false);
                    }}
                    className="w-full text-xs text-muted-foreground hover:text-foreground mt-1"
                  >
                    Voltar para login
                  </button>
                </form>
              )
            ) : (
              <>
                <form onSubmit={handleAuth} className="space-y-4">
                  {!isLogin && (
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName">Nome completo</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Como você gostaria de ser chamado(a)?"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        autoComplete="name"
                        required={!isLogin}
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={
                        isLogin ? "Digite seu email cadastrado" : "Digite seu melhor email"
                      }
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={
                          isLogin
                            ? "Digite sua senha"
                            : "Senha (mín. 8 caracteres)"
                        }
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={isLogin ? "current-password" : "new-password"}
                        className="pr-16"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-2 flex items-center text-xs font-medium text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? "Ocultar" : "Mostrar"}
                      </button>
                    </div>
                  </div>

                  {isLogin && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={() => {
                          setIsRecoverMode(true);
                          setIsResetStage(false);
                          setResetEmail(email);
                        }}
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isLogin ? "Entrando..." : "Criando sua conta..."}
                      </>
                    ) : isLogin ? (
                      "Entrar agora"
                    ) : (
                      "Criar minha conta"
                    )}
                  </Button>
                </form>

            <div className="mt-4 text-center text-sm">
              {isLogin ? (
                <>
                  Não tem uma conta?{" "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className="text-primary hover:underline font-medium"
                  >
                    Criar conta
                  </button>
                </>
              ) : (
                <>
                  Já tem uma conta?{" "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className="text-primary hover:underline font-medium"
                  >
                    Entrar
                  </button>
                </>
              )}
            </div>

            <div className="mt-2 text-center text-xs text-muted-foreground space-y-2">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="hover:text-foreground underline-offset-4 hover:underline"
              >
                Voltar para página inicial
              </button>
              
              {/* Botão para criar conta admin master - apenas em desenvolvimento */}
              {window.location.hostname === 'localhost' && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setLoading(true);
                        const response = await fetch(
                          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-admin`,
                          {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                          }
                        );
                        
                        const data = await response.json();
                        
                        if (response.ok) {
                          toast({
                            title: "Conta admin criada!",
                            description: "Use admin@dev.local / admin@dev.local para entrar",
                          });
                        } else {
                          toast({
                            title: "Erro",
                            description: data.error || "Não foi possível criar a conta admin",
                            variant: "destructive",
                          });
                        }
                      } catch (error) {
                        toast({
                          title: "Erro",
                          description: "Erro ao chamar função de criação do admin",
                          variant: "destructive",
                        });
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="text-xs text-muted-foreground/60 hover:text-foreground/80 font-mono"
                    disabled={loading}
                  >
                    {loading ? "Criando..." : "🔧 Criar conta admin master"}
                  </button>
                </div>
              )}
            </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
