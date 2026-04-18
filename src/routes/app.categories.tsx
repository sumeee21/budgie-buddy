import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { BottomNav } from "@/components/BottomNav";
import { CATEGORY_META, CATEGORIES, formatINR, type Category } from "@/lib/finance";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/categories")({
  component: CategoriesPage,
});

function CategoriesPage() {
  const { txns, spent } = useFinanceData();
  const [selected, setSelected] = useState<Category | null>(null);

  const byCat = CATEGORIES.map((cat) => {
    const items = txns.filter((t) => t.category === cat);
    const total = items.reduce((s, t) => s + Number(t.amount), 0);
    return { cat, total, count: items.length, items };
  })
    .filter((g) => g.count > 0)
    .sort((a, b) => b.total - a.total);

  if (selected) {
    const group = byCat.find((g) => g.cat === selected);
    const meta = CATEGORY_META[selected];
    return (
      <div className="min-h-screen pb-24">
        <header className="sticky top-0 z-10 border-b border-border bg-card/95 px-5 py-4 backdrop-blur-lg">
          <button
            onClick={() => setSelected(null)}
            className="mb-2 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
              style={{ backgroundColor: `${meta.color}25` }}
            >
              {meta.emoji}
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">{selected}</h1>
              <p className="text-sm text-muted-foreground">
                {group?.count} items · {formatINR(group?.total ?? 0)}
              </p>
            </div>
          </div>
        </header>

        <ul className="mx-auto max-w-lg divide-y divide-border px-5">
          {group?.items.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium capitalize">{t.item ?? selected}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleString("en-IN", {
                    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
                  })}
                </p>
              </div>
              <p className="font-display font-semibold">−{formatINR(Number(t.amount))}</p>
            </li>
          ))}
        </ul>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="border-b border-border bg-card/95 px-5 py-4 backdrop-blur-lg">
        <h1 className="font-display text-xl font-bold">Where it goes</h1>
        <p className="text-xs text-muted-foreground">Total spent: {formatINR(spent)}</p>
      </header>

      <div className="mx-auto max-w-lg space-y-2 px-4 pt-4">
        {byCat.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Nothing logged yet. Start by saying an expense in the chat tab.
          </div>
        ) : (
          byCat.map((g) => {
            const meta = CATEGORY_META[g.cat];
            const pct = spent > 0 ? (g.total / spent) * 100 : 0;
            return (
              <button
                key={g.cat}
                onClick={() => setSelected(g.cat)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-card transition",
                  "hover:-translate-y-0.5 hover:shadow-glow"
                )}
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-xl"
                  style={{ backgroundColor: `${meta.color}25` }}
                >
                  {meta.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between">
                    <p className="font-display font-semibold">{g.cat}</p>
                    <p className="font-display font-semibold">{formatINR(g.total)}</p>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: meta.color }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {g.count} {g.count === 1 ? "item" : "items"} · {pct.toFixed(0)}%
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
              </button>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
}
