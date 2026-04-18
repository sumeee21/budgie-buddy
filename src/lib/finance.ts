export const CATEGORIES = [
  "Food",
  "Transport",
  "Education",
  "Entertainment",
  "Shopping",
  "Health",
  "Bills",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_META: Record<Category, { emoji: string; color: string }> = {
  Food: { emoji: "🍔", color: "oklch(0.74 0.17 60)" },
  Transport: { emoji: "🚗", color: "oklch(0.6 0.18 250)" },
  Education: { emoji: "🎓", color: "oklch(0.55 0.22 295)" },
  Entertainment: { emoji: "🎬", color: "oklch(0.65 0.24 0)" },
  Shopping: { emoji: "🛍️", color: "oklch(0.7 0.17 160)" },
  Health: { emoji: "💊", color: "oklch(0.62 0.24 27)" },
  Bills: { emoji: "📄", color: "oklch(0.5 0.03 40)" },
  Other: { emoji: "✨", color: "oklch(0.69 0.19 38)" },
};

export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function todayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}
