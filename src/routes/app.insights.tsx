import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import {
  CATEGORY_META,
  formatINR,
  localDateKey,
  type Category,
} from "@/lib/finance";
import {
  Loader2,
  CalendarIcon,
  TrendingUp,
  Award,
  Receipt,
  Sparkles,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/insights")({
  component: InsightsPage,
});

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

function shortDate(key: string) {
  // key is YYYY-MM-DD
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function InsightsPage() {
  const { txns, loading, profile } = useFinanceData();
  const { user } = useAuth();

  const signupDate = useMemo(() => {
    const iso = user?.created_at;
    if (!iso) return new Date(2000, 0, 1);
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [user?.created_at]);

  // Default range: last 30 days (or signup → today, whichever is shorter)
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const defaultFrom = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 29);
    return d < signupDate ? signupDate : d;
  }, [today, signupDate]);

  const [from, setFrom] = useState<Date | undefined>(defaultFrom);
  const [to, setTo] = useState<Date | undefined>(today);

  const result = useMemo(() => {
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

    // Build daily series across the full range (zero-filled)
    const series: { date: string; key: string; amount: number }[] = [];
    const cursor = new Date(a);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= b) {
      const k = localDateKey(cursor);
      series.push({ key: k, date: shortDate(k), amount: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    const idx = new Map(series.map((s, i) => [s.key, i]));
    for (const t of items) {
      const k = localDateKey(t.created_at);
      const i = idx.get(k);
      if (i !== undefined) series[i].amount += Number(t.amount);
    }

    // Highest day
    let highest = series[0];
    for (const s of series) if (s.amount > (highest?.amount ?? 0)) highest = s;

    // Category breakdown
    const catMap = new Map<string, number>();
    for (const t of items) {
      catMap.set(t.category, (catMap.get(t.category) ?? 0) + Number(t.amount));
    }
    const categories = Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const topCategory = categories[0];

    const days = series.length;
    return { items, total, series, highest, categories, topCategory, days };
  }, [from, to, txns]);

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const isTracking = profile.mode === "tracking";

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 px-5 py-4 backdrop-blur-lg">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-blaze text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">Spending Insights</h1>
            <p className="text-[11px] text-muted-foreground">
              {isTracking ? "Tracking mode" : "Budget mode"} · analyze your spending
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        {/* Range selector */}
        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <h2 className="font-display text-sm font-semibold">Spending summary</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Pick a date range to analyze
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <DateField label="From" value={from} onChange={setFrom} min={signupDate} />
            <DateField label="To" value={to} onChange={setTo} min={signupDate} />
          </div>

          {result && (
            <div className="mt-3 rounded-xl bg-gradient-warm p-4 text-primary-foreground">
              <p className="text-[11px] uppercase tracking-wider opacity-90">
                Total spent · {result.days} {result.days === 1 ? "day" : "days"}
              </p>
              <p className="mt-1 font-display text-3xl font-bold">
                {formatINR(result.total)}
              </p>
              <p className="mt-1 text-xs opacity-90">
                {result.items.length}{" "}
                {result.items.length === 1 ? "expense" : "expenses"} · avg{" "}
                {formatINR(result.total / Math.max(1, result.days))}/day
              </p>
            </div>
          )}
        </section>

        {/* Insight cards */}
        {result && result.items.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <InsightCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Highest day"
              value={result.highest ? formatINR(result.highest.amount) : "—"}
              sub={result.highest?.date ?? ""}
            />
            <InsightCard
              icon={<Award className="h-4 w-4" />}
              label="Top category"
              value={result.topCategory?.name ?? "—"}
              sub={result.topCategory ? formatINR(result.topCategory.value) : ""}
            />
          </div>
        )}

        {/* Bar chart */}
        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-sm font-semibold">Daily spending</h2>
              <p className="text-[11px] text-muted-foreground">
                Bar chart of spend per day in the selected range
              </p>
            </div>
          </div>

          {!result || result.items.length === 0 ? (
            <p className="mt-6 py-10 text-center text-sm text-muted-foreground">
              No expenses in this range. Log some via Chat 🎤
            </p>
          ) : (
            <div className="mt-4 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={result.series} margin={{ top: 10, right: 6, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    interval="preserveStartEnd"
                    minTickGap={20}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                  />
                  <Tooltip
                    cursor={{ fill: "oklch(from var(--primary) l c h / 0.08)" }}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [formatINR(v), "Spent"]}
                  />
                  <Bar
                    dataKey="amount"
                    fill="oklch(0.74 0.17 60)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Category pie */}
        {result && result.categories.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <h2 className="font-display text-sm font-semibold">By category</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Where your money went
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-40 w-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={result.categories}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={36}
                      outerRadius={70}
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                    >
                      {result.categories.map((c) => {
                        const meta = CATEGORY_META[c.name as Category] ?? CATEGORY_META.Other;
                        return <Cell key={c.name} fill={meta.color} />;
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: number, n: string) => [formatINR(v), n]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex-1 space-y-1.5 text-xs">
                {result.categories.slice(0, 6).map((c) => {
                  const meta = CATEGORY_META[c.name as Category] ?? CATEGORY_META.Other;
                  const pct = (c.value / result.total) * 100;
                  return (
                    <li key={c.name} className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: meta.color }}
                      />
                      <span className="flex-1 truncate font-medium">
                        {meta.emoji} {c.name}
                      </span>
                      <span className="text-muted-foreground">
                        {formatINR(c.value)} · {pct.toFixed(0)}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function InsightCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-[10px] font-medium uppercase tracking-wider">{label}</p>
      </div>
      <p className="mt-2 font-display text-lg font-bold capitalize">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}