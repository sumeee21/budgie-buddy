import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFinanceData } from "@/hooks/useFinanceData";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogOut, Loader2, Wallet } from "lucide-react";
import { formatINR } from "@/lib/finance";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const { profile, refresh, spent, txns } = useFinanceData();
  const navigate = useNavigate();
  const [budget, setBudget] = useState("");
  const [daily, setDaily] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setBudget(String(profile.total_budget));
      setDaily(profile.daily_limit ? String(profile.daily_limit) : "");
    }
  }, [profile]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        total_budget: Number(budget) || 0,
        daily_limit: daily ? Number(daily) : null,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved!");
    refresh();
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="border-b border-border bg-card/95 px-5 py-4 backdrop-blur-lg">
        <h1 className="font-display text-xl font-bold">You</h1>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-blaze text-primary-foreground">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display font-semibold">{profile?.display_name ?? "Student"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Stat label="Total spent" value={formatINR(spent)} />
            <Stat label="Transactions" value={String(txns.length)} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-lg font-semibold">Budget settings</h2>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="b">Monthly budget (₹)</Label>
              <Input id="b" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d">Daily limit (₹)</Label>
              <Input
                id="d"
                type="number"
                value={daily}
                onChange={(e) => setDaily(e.target.value)}
                placeholder="Leave empty to disable"
              />
            </div>
            <Button onClick={save} disabled={saving} className="w-full bg-gradient-blaze shadow-glow hover:opacity-95">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </div>
        </div>

        <button
          onClick={signOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm font-medium text-muted-foreground shadow-card transition hover:text-destructive"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-lg font-bold">{value}</p>
    </div>
  );
}
