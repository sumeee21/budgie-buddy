import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Loader2, Wallet, LineChart, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"mode" | "budget">("mode");
  const [mode, setMode] = useState<"budget" | "tracking" | null>(null);
  const [budget, setBudget] = useState("");
  const [daily, setDaily] = useState("");
  const [loading, setLoading] = useState(false);

  async function pickMode(m: "budget" | "tracking") {
    setMode(m);
    if (m === "tracking") {
      if (!user) return;
      setLoading(true);
      const { error } = await supabase
        .from("profiles")
        .update({ mode: "tracking", total_budget: 0, daily_limit: null })
        .eq("user_id", user.id);
      setLoading(false);
      if (error) return toast.error(error.message);
      toast.success("Tracking mode on! Just log expenses and I'll analyze them 📊");
      navigate({ to: "/app" });
      return;
    }
    setStep("budget");
  }

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
        mode: "budget",
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
          {step === "mode" && (
            <>
              <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Choose your mode
              </div>
              <h1 className="mt-4 font-display text-2xl font-bold">How do you want to use Paisa?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick the mode that fits you. You can switch anytime in settings.
              </p>

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => pickMode("budget")}
                  className={cn(
                    "group flex w-full items-start gap-4 rounded-2xl border-2 border-border bg-background p-4 text-left transition hover:border-primary hover:bg-primary/5",
                    mode === "budget" && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-blaze text-primary-foreground">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-semibold">Budget Mode</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Set monthly pocket money. Track savings, daily limits, and remaining balance. Best for students.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => pickMode("tracking")}
                  className={cn(
                    "group flex w-full items-start gap-4 rounded-2xl border-2 border-border bg-background p-4 text-left transition hover:border-primary hover:bg-primary/5",
                    mode === "tracking" && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-warm text-primary-foreground">
                    <LineChart className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-semibold">Expense Tracking Mode</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      No budget. Just record daily spending and analyze trends with date-range insights and charts.
                    </p>
                  </div>
                </button>

                {loading && (
                  <div className="flex items-center justify-center pt-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                )}
              </div>
            </>
          )}

          {step === "budget" && (
            <>
              <button
                type="button"
                onClick={() => setStep("mode")}
                className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
