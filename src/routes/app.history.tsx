import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { BottomNav } from "@/components/BottomNav";
import { CATEGORY_META, formatINR, localDateKey, type Category } from "@/lib/finance";
import { Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
