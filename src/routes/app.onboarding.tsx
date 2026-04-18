import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [budget, setBudget] = useState("");
  const [daily, setDaily] = useState("");
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const total = Number(budget);
    if (!total || total <= 0) {
      toast.error("Please enter a valid monthly budget");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        total_budget: total,
        daily_limit: daily ? Number(daily) : null,
      })
      .eq("user_id", user.id);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("All set! Let's start tracking 🎉");
    navigate({ to: "/app" });
  }

  const suggestedDaily = budget ? Math.round(Number(budget) / 30) : 0;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-blaze opacity-15 blur-3xl" />
      </div>
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Quick setup
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">Set your monthly budget</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            How much pocket money do you have for this month?
          </p>

          <form onSubmit={save} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="budget">Monthly budget (₹)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="budget"
                  type="number"
                  inputMode="numeric"
                  required
                  min="1"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="5000"
                  className="h-12 pl-8 text-lg font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="daily">
                Daily limit (₹) <span className="text-muted-foreground">— optional</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="daily"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={daily}
                  onChange={(e) => setDaily(e.target.value)}
                  placeholder={suggestedDaily ? `Suggested: ${suggestedDaily}` : "200"}
                  className="h-12 pl-8 text-lg font-medium"
                />
              </div>
              {suggestedDaily > 0 && !daily && (
                <button
                  type="button"
                  onClick={() => setDaily(String(suggestedDaily))}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Use suggested ₹{suggestedDaily}/day
                </button>
              )}
            </div>

            <Button type="submit" disabled={loading} className="h-12 w-full bg-gradient-blaze text-base shadow-glow hover:opacity-95">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Let's go →"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
