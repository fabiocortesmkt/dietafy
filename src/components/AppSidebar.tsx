import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  UtensilsCrossed,
  Dumbbell,
  LineChart,
  MessageCircle,
  Activity,
  User as UserIcon,
  Menu,
  LogOut,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import dietafyLogo from "@/assets/dietafy-logo-v2.png";
import dietafyWatermelon from "@/assets/dietafy-logo-watermelon.png";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Dieta", href: "/dieta", icon: UtensilsCrossed },
  { label: "Treinos", href: "/treinos", icon: Dumbbell },
  { label: "Progresso", href: "/progresso", icon: LineChart },
  { label: "Registro diário", href: "/track", icon: Activity },
  { label: "Vita Nutri IA", href: "/vita-nutri", icon: MessageCircle },
  { label: "Perfil", href: "/perfil", icon: UserIcon },
] as const;

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, isMobile } = useSidebar();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const activePath = useMemo(() => location.pathname, [location.pathname]);

  const isItemActive = (href: string) => {
    if (href === "/dashboard") return activePath === "/dashboard";
    if (href === "/treinos") return activePath.startsWith("/treinos");
    if (href === "/dieta") return activePath === "/dieta" || activePath === "/receitas-fit";
    return activePath.startsWith(href);
  };

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        "bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
        "md:top-16 lg:top-20",
        state === "collapsed" && !isMobile ? "w-16" : "w-64",
      )}
    >
      <SidebarContent className="flex flex-col">
        <SidebarHeader className="px-4 py-3 md:px-5 md:py-4 border-b border-sidebar-border/60">
          <div className="flex h-10 md:h-11 items-center justify-start group-data-[collapsible=icon]:justify-center">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className={cn(
                "flex items-center justify-start gap-2 md:gap-2.5 focus:outline-none hover-scale",
                state === "collapsed" && !isMobile
                  ? "justify-center gap-0 rounded-xl"
                  : "rounded-full",
              )}
              aria-label="Voltar para o dashboard"
            >
              {state === "collapsed" && !isMobile ? (
                <img
                  src={dietafyWatermelon}
                  alt="Dietafy"
                  className="h-6 w-6 md:h-6 md:w-6 lg:h-7 lg:w-7"
                />
              ) : (
                <img
                  src={dietafyLogo}
                  alt="Dietafy"
                  className="h-8 w-auto sm:h-9 md:h-9 lg:h-9 max-w-[210px]"
                />
              )}
            </button>
          </div>
        </SidebarHeader>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.3em] text-sidebar-foreground/55">
            Navegação
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-1">
            <SidebarMenu className="gap-1.5 md:gap-2">
              {navItems.map((item) => {
                const active = isItemActive(item.href);

                return (
                  <SidebarMenuItem
                    key={item.href}
                    className="group group-data-[collapsible=icon]:my-0.5 md:my-0.5"
                  >
                    <SidebarMenuButton
                      asChild
                      size="lg"
                      isActive={active}
                      className={cn(
                        "bg-transparent data-[active=true]:bg-muted data-[active=true]:text-primary",
                        "hover:bg-muted/60 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                        "h-12 md:h-11 rounded-xl group-data-[collapsible=icon]:h-12",
                      )}
                    >
                      <NavLink
                        to={item.href}
                        className="flex items-center gap-2.5 md:gap-3 text-sm md:text-[13px] leading-snug tracking-tight group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
                        activeClassName=""
                      >
                        <item.icon
                          className={cn(
                            "shrink-0 transition-[width,height,transform] duration-150",
                            state === "collapsed"
                              ? "h-6 w-6 md:h-5 md:w-5"
                              : "h-5 w-5 md:h-5.5 md:w-5.5 lg:h-6 lg:w-6",
                          )}
                        />
                        {(state === "expanded" || isMobile) && (
                          <span className="truncate font-medium">{item.label}</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              <SidebarMenuItem className="group group-data-[collapsible=icon]:my-0.5 mt-2 pt-2 border-t border-sidebar-border/60">
                <SidebarMenuButton
                  size="lg"
                  onClick={handleLogout}
                  className={cn(
                    "bg-transparent text-destructive hover:bg-destructive/10 hover:text-destructive",
                    "group-data-[collapsible=icon]:justify-center",
                    "h-11 rounded-xl group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:h-12",
                  )}
                >
                  <LogOut className="h-4 w-4" />
                  {(state === "expanded" || isMobile) && (
                    <span className="truncate font-medium">Sair</span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarFooter className="mt-auto pt-4 pb-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-2xl bg-background/40 border border-sidebar-border flex items-center justify-center text-primary text-[11px] font-semibold">
                <span className="tracking-tight leading-none">DF</span>
              </div>
              {state === "expanded" && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-semibold tracking-tight leading-snug">DietaFY</span>
                  <span className="text-[10px] uppercase tracking-[0.22em] text-sidebar-foreground/60">
                    Hub metabólico
                  </span>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-sidebar-border bg-background/60 px-3.5 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                VC
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-tight truncate">Seu plano metabólico</p>
                <p className="text-[11px] text-sidebar-foreground/65 truncate">
                  Acesse upgrade e configurações
                </p>
              </div>
              <Button
                size="icon"
                variant="outline"
                className="h-7 w-7 rounded-full"
                onClick={() => navigate("/pricing")}
                aria-label="Ver planos"
              >
                <LineChart className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Button
              className="mt-1 w-full h-9 text-xs font-semibold tracking-tight"
              onClick={() => navigate("/pricing")}
            >
              Acessar Premium
            </Button>
          </div>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}
