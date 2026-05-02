import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { CATEGORY_META, formatINR, localDateKey, type Category } from "@/lib/finance";
import { Loader2, Trash2, Calculator, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function DateField({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
  min: Date;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 text-left text-sm transition hover:bg-muted/50",
            !value && "text-muted-foreground"
          )}
        >
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            {value
              ? value.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "2-digit",
                })
              : "Pick"}
            <CalendarIcon className="h-3.5 w-3.5 opacity-60" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          disabled={(d) => {
            const x = new Date(d);
            x.setHours(0, 0, 0, 0);
            const t = new Date();
            t.setHours(0, 0, 0, 0);
            return x > t || x < min;
          }}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

export const Route = createFileRoute("/app/history")({
  component: HistoryPage,
});

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const k = d.toDateString();
  if (k === today.toDateString()) return "Today";
  if (k === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function HistoryPage() {
  const { txns, loading, refresh } = useFinanceData();
  const { user } = useAuth();
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();

  const signupDate = useMemo(() => {
    const iso = user?.created_at;
    if (!iso) return new Date(2000, 0, 1);
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [user?.created_at]);

  const rangeResult = useMemo(() => {
    if (!from || !to) return null;
    const a = from <= to ? from : to;
    const b = from <= to ? to : from;
    const aKey = localDateKey(a);
    const bKey = localDateKey(b);
    const items = txns.filter((t) => {
      const k = localDateKey(t.created_at);
      return k >= aKey && k <= bKey;
    });
    const total = items.reduce((s, t) => s + Number(t.amount), 0);
    const days = Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
    return { items, total, days };
  }, [from, to, txns]);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: typeof txns; total: number }>();
    for (const t of txns) {
      const key = localDateKey(t.created_at);
      const g = map.get(key) ?? { label: dayLabel(t.created_at), items: [], total: 0 };
      g.items.push(t);
      g.total += Number(t.amount);
      map.set(key, g);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, g]) => ({ date, ...g }));
  }, [txns]);

  async function remove(id: string) {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) {
      toast.error("Couldn't delete");
      return;
    }
    toast.success("Deleted");
    void refresh();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 px-5 py-4 backdrop-blur-lg">
        <h1 className="font-display text-xl font-bold">History</h1>
        <p className="text-xs text-muted-foreground">
          {txns.length} {txns.length === 1 ? "expense" : "expenses"} · grouped by day
        </p>
      </header>

      <div className="mx-auto max-w-lg space-y-5 px-4 pt-4">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-blaze text-primary-foreground">
              <Calculator className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-sm font-semibold">Spend calculator</h2>
              <p className="text-[11px] text-muted-foreground">
                Pick any date range to see your total
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <DateField label="From" value={from} onChange={setFrom} min={signupDate} />
            <DateField label="To" value={to} onChange={setTo} min={signupDate} />
          </div>

          {rangeResult && (
            <div className="mt-3 rounded-xl bg-gradient-warm p-4 text-primary-foreground">
              <p className="text-[11px] uppercase tracking-wider opacity-90">
                Total spent · {rangeResult.days} {rangeResult.days === 1 ? "day" : "days"}
              </p>
              <p className="mt-1 font-display text-3xl font-bold">
                {formatINR(rangeResult.total)}
              </p>
              <p className="mt-1 text-xs opacity-90">
                {rangeResult.items.length}{" "}
                {rangeResult.items.length === 1 ? "expense" : "expenses"} · avg{" "}
                {formatINR(rangeResult.total / Math.max(1, rangeResult.days))}/day
              </p>
            </div>
          )}
          {(from || to) && (
            <button
              onClick={() => {
                setFrom(undefined);
                setTo(undefined);
              }}
              className="mt-2 text-xs text-muted-foreground underline"
            >
              Clear range
            </button>
          )}
        </section>

        {groups.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Nothing logged yet. Head to Chat and say what you spent 🎤
          </div>
        )}

        {groups.map((g) => (
          <section key={g.date}>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {g.label}
              </h2>
              <span className="text-xs font-medium text-foreground/80">
                {formatINR(g.total)}
              </span>
            </div>
            <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
              {g.items.map((t, i) => {
                const meta =
                  CATEGORY_META[t.category as Category] ?? CATEGORY_META.Other;
                return (
                  <li
                    key={t.id}
                    className={`group flex items-center gap-3 px-4 py-3 ${
                      i !== 0 ? "border-t border-border" : ""
                    }`}
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                      style={{ backgroundColor: `${meta.color}25` }}
                    >
                      {meta.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium capitalize">
                        {t.item ?? t.category}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.category} ·{" "}
                        {new Date(t.created_at).toLocaleTimeString("en-IN", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <p className="font-display font-semibold">
                      −{formatINR(Number(t.amount))}
                    </p>
                    <button
                      onClick={() => remove(t.id)}
                      className="ml-1 rounded-lg p-1.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
