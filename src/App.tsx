import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Track from "./pages/Track";
import NotFound from "./pages/NotFound";
import Workouts from "./pages/Workouts";
import WorkoutDetail from "./pages/WorkoutDetail";
import WorkoutHistory from "./pages/WorkoutHistory";
import Chat from "./pages/Chat";
import Pricing from "./pages/Pricing";
import Upgrade from "./pages/Upgrade";
import Diet from "./pages/Diet";
import ProgressPage from "./pages/Progress";
import Profile from "./pages/Profile";
import VitaNutriPage from "./pages/VitaNutri";
import ReceitasFit from "./pages/ReceitasFit";
import AdminPanel from "./pages/AdminPanel";
import Sobre from "./pages/Sobre";
import Privacidade from "./pages/Privacidade";
import Contato from "./pages/Contato";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/track" element={<Track />} />
          <Route path="/workouts" element={<Workouts />} />
          <Route path="/workouts/:id" element={<WorkoutDetail />} />
          <Route path="/treinos/:id" element={<WorkoutDetail />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/upgrade" element={<Upgrade />} />
          <Route path="/dieta" element={<Diet />} />
          <Route path="/receitas-fit" element={<ReceitasFit />} />
          <Route path="/treinos" element={<Workouts />} />
          <Route path="/treinos/historico" element={<WorkoutHistory />} />
          <Route path="/progresso" element={<ProgressPage />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/vita-nutri" element={<VitaNutriPage />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="/privacidade" element={<Privacidade />} />
          <Route path="/contato" element={<Contato />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
