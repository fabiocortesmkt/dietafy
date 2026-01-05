import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import {
  Home,
  UtensilsCrossed,
  Dumbbell,
  LineChart,
  User as UserIcon,
  MessageCircle,
} from "lucide-react";

interface BottomNavItemProps {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const BottomNavItem = ({ to, label, icon: Icon }: BottomNavItemProps) => (
  <NavLink
    to={to}
    className={cn(
      "flex flex-col items-center justify-center gap-0.5",
      "min-w-[48px] min-h-[48px] px-1 py-1.5",
      "text-muted-foreground transition-colors duration-200",
      "active:scale-95"
    )}
    activeClassName="text-primary"
  >
    <Icon className="h-5 w-5 shrink-0" />
    <span className="text-[10px] font-medium truncate max-w-[48px] leading-tight">{label}</span>
  </NavLink>
);

export const BottomNavMobile = () => {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/50 bg-background/95 backdrop-blur-lg md:hidden safe-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        <BottomNavItem to="/dashboard" label="Home" icon={Home} />
        <BottomNavItem to="/dieta" label="Dieta" icon={UtensilsCrossed} />
        <BottomNavItem to="/treinos" label="Treinos" icon={Dumbbell} />
        <BottomNavItem to="/vita-nutri" label="Vita" icon={MessageCircle} />
        <BottomNavItem to="/progresso" label="Progresso" icon={LineChart} />
        <BottomNavItem to="/perfil" label="Perfil" icon={UserIcon} />
      </div>
    </nav>
  );
};
