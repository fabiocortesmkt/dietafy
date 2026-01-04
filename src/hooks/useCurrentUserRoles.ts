import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "moderator" | "user";

interface UseCurrentUserRolesResult {
  roles: AppRole[];
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export function useCurrentUserRoles(): UseCurrentUserRolesResult {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;

        if (!session) {
          if (mounted) {
            setRoles([]);
            setLoading(false);
          }
          return;
        }

        const email = session.user.email?.toLowerCase() ?? null;
        const isMasterAdmin = email === "admin@dev.local";

        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);

        if (!mounted) return;

        if (error) {
          console.error("Erro ao carregar roles do usuário:", error);
          setError("Não foi possível carregar as permissões do usuário.");
          setRoles([]);
        } else {
          let mappedRoles = (data ?? []).map((r) => r.role as AppRole);

          // Garante que a conta master admin@dev.local seja tratada como admin
          if (isMasterAdmin && !mappedRoles.includes("admin")) {
            mappedRoles = [...mappedRoles, "admin"];
          }

          setRoles(mappedRoles);
          setError(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const isAdmin = roles.includes("admin");

  return { roles, isAdmin, loading, error };
}
