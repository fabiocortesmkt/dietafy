import { Bell, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { useCurrentUserRoles } from "@/hooks/useCurrentUserRoles";
import { cn } from "@/lib/utils";
import dietafyLogo from "@/assets/dietafy-logo-v2.png";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

function getInitials(name?: string | null) {
  if (!name) return "DF";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "DF";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function DietafyHeader() {
  const { profile } = useCurrentUserProfile();
  const { isAdmin } = useCurrentUserRoles();
  const initials = getInitials(profile?.fullName);
  const displayName = profile?.fullName ?? "Usuário";
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-20 w-full border-b border-border bg-background transition-colors duration-300",
        isAdmin &&
          "bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.2),_transparent_55%)]",
      )}
    >
      <div className="flex h-16 items-center justify-between pr-4 md:h-18 lg:h-20 md:pr-8">
        {/* Left: menu trigger */}
        <div className="flex items-center pl-2 md:pl-3">
          <SidebarTrigger className="shadow-sm" />
        </div>

        {/* Center: logo bem grande */}
        <div className="flex flex-1 justify-center pointer-events-none">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="pointer-events-auto focus:outline-none hover-scale rounded-full"
            aria-label="Voltar para o dashboard"
          >
            <img
              src={dietafyLogo}
              alt="Dietafy"
              className="h-10 w-auto sm:h-11 md:h-12 lg:h-14 max-w-[280px] md:max-w-[320px]"
            />
          </button>
        </div>

        {/* Right: notifications + profile */}
        <div className="flex items-center gap-2.5 md:gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="relative inline-flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Notificações"
              >
                <Bell className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Notificações
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs text-muted-foreground py-2">
                Você ainda não tem notificações.
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 md:gap-2.5 rounded-full px-1.5 py-0.5 md:px-2.5 hover:bg-muted transition-colors"
                aria-label="Menu da conta"
              >
                <Avatar className="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 border border-border shadow-sm">
                  {profile?.avatarUrl && (
                    <AvatarImage src={profile.avatarUrl} alt={displayName} />
                  )}
                  <AvatarFallback className="bg-muted text-[0.7rem] sm:text-xs font-semibold text-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start gap-0.5 max-w-[160px]">
                  <span className="text-[13px] font-medium leading-tight tracking-tight text-foreground truncate">
                    {displayName}
                  </span>
                  {isAdmin && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/30 px-1.5 py-[1px] text-[10px] font-semibold uppercase tracking-[0.16em]">
                      <Shield className="h-3 w-3" />
                      Admin
                    </span>
                  )}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">Logado como</span>
                <span className="text-sm font-medium truncate">{displayName}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  navigate("/perfil");
                }}
                className="text-sm"
              >
                Perfil
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    navigate("/admin");
                  }}
                  className="text-sm"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Painel de Admin
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={async (e) => {
                  e.preventDefault();
                  await handleLogout();
                }}
                className="text-sm text-destructive focus:bg-destructive/10"
              >
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>
    </header>
  );
}

