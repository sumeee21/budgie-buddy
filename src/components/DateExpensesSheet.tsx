import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CATEGORY_META, formatINR, type Category } from "@/lib/finance";
import type { Transaction } from "@/hooks/useFinanceData";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date: Date | null;
  txns: Transaction[];
  dailyLimit: number | null;
};

export function DateExpensesSheet({ open, onOpenChange, date, txns, dailyLimit }: Props) {
  if (!date) return null;
  const key = date.toISOString().slice(0, 10);
  const dayTxns = txns.filter((t) => t.created_at.slice(0, 10) === key);
  const total = dayTxns.reduce((s, t) => s + Number(t.amount), 0);
  const overLimit = dailyLimit ? total > dailyLimit : false;

  const label = date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">{label}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 rounded-2xl bg-gradient-blaze p-5 text-primary-foreground shadow-card">
          <p className="text-xs uppercase tracking-wider opacity-90">Spent on this day</p>
          <p className="mt-1 font-display text-3xl font-bold">{formatINR(total)}</p>
          {dailyLimit && (
            <p className="mt-2 text-xs opacity-90">
              {overLimit
                ? `Over daily limit by ${formatINR(total - dailyLimit)}`
                : `${formatINR(Math.max(0, dailyLimit - total))} under daily limit`}
            </p>
          )}
        </div>

        <div className="mt-5">
          {dayTxns.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No expenses logged on this day 🌿
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {dayTxns.map((t) => {
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
                        {new Date(t.created_at).toLocaleTimeString("en-IN", {
                          hour: "numeric",
                          minute: "2-digit",
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
      </SheetContent>
    </Sheet>
  );
}
