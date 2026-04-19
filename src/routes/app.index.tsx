import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { MicChat } from "@/components/MicChat";
import { DateExpensesSheet } from "@/components/DateExpensesSheet";
import { CATEGORY_META, formatINR, type Category } from "@/lib/finance";
import { Loader2, TrendingDown, TrendingUp, Sparkles, CalendarDays } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { profile, txns, loading, remaining, spent, spentToday } = useFinanceData();
  const { user } = useAuth();
  const [pickedDate, setPickedDate] = useState<Date | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const signupDate = useMemo(() => {
    const iso = user?.created_at;
    if (!iso) return new Date();
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [user?.created_at]);

  const today = new Date();
  const todayLabel = today.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const total = Number(profile.total_budget);
  const dailyLimit = profile.daily_limit ? Number(profile.daily_limit) : null;
  const pctUsed = total > 0 ? Math.min(100, (spent / total) * 100) : 0;
  const dailyPct = dailyLimit ? Math.min(100, (spentToday / dailyLimit) * 100) : 0;
  const overDaily = dailyLimit ? spentToday > dailyLimit : false;
  const recent = txns.slice(0, 5);

  return (
    <div className="min-h-screen pb-32">
      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-blaze px-5 pt-10 pb-20 text-primary-foreground">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="relative mx-auto max-w-lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm opacity-90">
                Hey {profile.display_name ?? "there"} 👋
              </p>
              <p className="mt-0.5 text-xs opacity-80">{todayLabel}</p>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="flex h-10 items-center gap-2 rounded-full bg-white/15 px-3 text-xs font-medium backdrop-blur transition hover:bg-white/25"
                  aria-label="Open calendar"
                >
                  <CalendarDays className="h-4 w-4" />
                  Calendar
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={pickedDate ?? undefined}
                  onSelect={(d) => {
                    if (!d) return;
                    setPickedDate(d);
                    setSheetOpen(true);
                  }}
                  disabled={(date) => {
                    const d = new Date(date);
                    d.setHours(0, 0, 0, 0);
                    const t = new Date();
                    t.setHours(0, 0, 0, 0);
                    return d > t || d < signupDate;
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <p className="mt-6 text-xs uppercase tracking-wider opacity-80">Remaining this month</p>
          <h1 className="mt-1 font-display text-5xl font-bold tracking-tight">
            {formatINR(Math.max(0, remaining))}
          </h1>
          <div className="mt-4 space-y-1.5">
            <Progress value={pctUsed} className="h-1.5 bg-white/20 [&>*]:bg-white" />
            <div className="flex justify-between text-xs opacity-90">
              <span>Spent {formatINR(spent)}</span>
              <span>Budget {formatINR(total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-12 max-w-lg space-y-4 px-4">
        {/* Daily limit card */}
        {dailyLimit && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Today's spend
                </p>
                <p className="mt-1 font-display text-2xl font-bold">
                  {formatINR(spentToday)}{" "}
                  <span className="text-sm font-medium text-muted-foreground">
                    / {formatINR(dailyLimit)}
                  </span>
                </p>
              </div>
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  overDaily ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                }`}
              >
                {overDaily ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              </div>
            </div>
            <Progress
              value={dailyPct}
              className={`mt-3 h-1.5 ${overDaily ? "[&>*]:bg-destructive" : "[&>*]:bg-success"}`}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {overDaily
                ? `Over by ${formatINR(spentToday - dailyLimit)} — try to slow down tomorrow 💪`
                : spentToday === 0
                ? `No spends yet — keep it up to save ${formatINR(dailyLimit)} today! 🎉`
                : `${formatINR(dailyLimit - spentToday)} left for today`}
            </p>
          </div>
        )}

        {/* Mic prompt card */}
        <div className="rounded-2xl border border-border bg-gradient-warm p-5 text-primary-foreground shadow-card">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <p className="text-xs font-medium uppercase tracking-wider opacity-90">
              Quick log
            </p>
          </div>
          <p className="mt-1 text-sm opacity-95">
            Tap the mic and say what you spent — I'll handle the rest.
          </p>
          <div className="mt-3">
            <MicChat
              variant="compact"
              context={{ remaining, daily_limit: dailyLimit, spent_today: spentToday }}
            />
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent</h2>
            <span className="text-xs text-muted-foreground">{txns.length} total</span>
          </div>
          {recent.length === 0 ? (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              No expenses yet. Try saying "100 on coffee" 🎤
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {recent.map((t) => {
                const meta = CATEGORY_META[t.category as Category] ?? CATEGORY_META.Other;
                return (
                  <li key={t.id} className="flex items-center gap-3 py-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                      style={{ backgroundColor: `${meta.color}20` }}
                    >
                      {meta.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium capitalize">
                        {t.item ?? t.category}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.category} ·{" "}
                        {new Date(t.created_at).toLocaleString("en-IN", {
                          hour: "numeric",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <p className="font-display font-semibold">−{formatINR(Number(t.amount))}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <DateExpensesSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        date={pickedDate}
        txns={txns}
        dailyLimit={dailyLimit}
      />

      <BottomNav />
    </div>
  );
}
