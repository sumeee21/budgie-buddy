import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
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
    if (loading) return;
    if (!user) {
      window.location.href = "/auth";
      return;
    }
    supabase
      .from("profiles")
      .select("total_budget")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setNeedsBudget(!data || Number(data.total_budget) <= 0);
        setProfileChecked(true);
      });
  }, [user, loading]);

  if (loading || !user || !profileChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (needsBudget && typeof window !== "undefined" && !window.location.pathname.includes("/onboarding")) {
    window.location.href = "/app/onboarding";
    return null;
  }

  return <Outlet />;
}
