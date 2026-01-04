import { NavLink } from "@/components/NavLink";
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
    className="flex flex-col items-center gap-1 px-2 py-1 text-[11px] text-muted-foreground"
    activeClassName="text-foreground"
  >
    <Icon className="h-4 w-4" />
    <span>{label}</span>
  </NavLink>
);

export const BottomNavMobile = () => {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/90 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2 text-[11px]">
        <BottomNavItem to="/dashboard" label="Dashboard" icon={Home} />
        <BottomNavItem to="/dieta" label="Dieta" icon={UtensilsCrossed} />
        <BottomNavItem to="/treinos" label="Treinos" icon={Dumbbell} />
        <BottomNavItem to="/vita-nutri" label="Vita Nutri" icon={MessageCircle} />
        <BottomNavItem to="/progresso" label="Progresso" icon={LineChart} />
        <BottomNavItem to="/perfil" label="Perfil" icon={UserIcon} />
      </div>
    </nav>
  );
};
