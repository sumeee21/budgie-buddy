import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const [profileChecked, setProfileChecked] = useState(false);
  const [needsBudget, setNeedsBudget] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function ensureProfile() {
      if (loading) return;

      if (!user) {
        window.location.replace("/auth");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, total_budget")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (!data) {
        await supabase.from("profiles").insert({
          user_id: user.id,
          display_name: user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "Student",
        });

        if (cancelled) return;

        setNeedsBudget(true);
        setProfileChecked(true);
        return;
      }

      setNeedsBudget(Number(data.total_budget) <= 0);
      setProfileChecked(true);
    }

    void ensureProfile();

    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  if (loading || !user || !profileChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (needsBudget && typeof window !== "undefined" && !window.location.pathname.includes("/onboarding")) {
    window.location.replace("/app/onboarding");
    return null;
  }

  return <Outlet />;
}
