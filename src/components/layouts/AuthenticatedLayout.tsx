import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DietafyHeader } from "@/components/DietafyHeader";
import { BottomNavMobile } from "@/components/BottomNavMobile";

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen w-full bg-background flex flex-col">
        {/* Header global Dietafy ocupando toda a largura */}
        <DietafyHeader />

        {/* Área principal com sidebar à esquerda e conteúdo à direita */}
        <div className="flex flex-1 w-full min-h-0">
          <AppSidebar />
          <main className="relative flex-1 min-h-0 flex flex-col pt-3 md:pt-4 overflow-x-hidden overflow-y-auto">
            <div className="flex-1 flex flex-col pb-16 md:pb-0">{children}</div>
            <BottomNavMobile />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
