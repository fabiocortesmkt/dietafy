import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface HeaderProfile {
  fullName: string | null;
  avatarUrl: string | null;
}

export function useCurrentUserProfile() {
  const [profile, setProfile] = useState<HeaderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        if (mounted) setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("user_profiles")
        .select("full_name, avatar_url")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!mounted) return;

      setProfile({
        fullName: data?.full_name ?? null,
        avatarUrl: data?.avatar_url ?? null,
      });
      setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return { profile, loading };
}
