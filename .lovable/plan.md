## Goal
Add an "Expense Tracking Mode" alongside the existing Budget Mode, plus a new "Spending Insights" analytics dashboard with a daily-spend bar chart and a date-range spend calculator that supports natural-language queries.

## 1. Database
Add a `mode` column to `profiles`:
- `mode` text NOT NULL DEFAULT `'budget'` with CHECK in (`'budget'`, `'tracking'`).
- In tracking mode, `total_budget` and `daily_limit` are ignored (we won't enforce schema changes on those — keep nullable budget tolerated by setting `total_budget` to 0 when switching to tracking).

## 2. Onboarding — mode selection
Update `src/routes/app.onboarding.tsx`:
- Step 1: ask user to pick **Budget Mode** vs **Expense Tracking Mode** (two big cards).
- If Budget Mode → show budget + daily limit inputs (existing flow).
- If Tracking Mode → skip budget entirely, just save `mode='tracking'` and continue.
- Update `src/routes/app.tsx` to only force onboarding if `mode` is unset (treat budget=0 as valid for tracking mode).

## 3. Profile / Settings — switch mode anytime
In `src/routes/app.profile.tsx` add a "Mode" section with a toggle/segmented control to switch between modes. Switching to Budget prompts for budget if missing.

## 4. Dashboard (`app.index.tsx`) — conditional UI
- **Budget Mode**: unchanged (remaining balance, daily limit card, AI nudges).
- **Tracking Mode**:
  - Hero shows "Total spent this month" instead of "Remaining".
  - Hide budget progress bar and daily-limit card.
  - Show "Today's spend" simple counter (no limit).
  - Show "View insights →" link to new analytics page.
  - Mic chat still works for logging.

## 5. New route: `/app/insights` — Spending Insights dashboard
Create `src/routes/app.insights.tsx`:
- **Date range picker** (From / To, restricted between signup date and today; default = last 30 days).
- **Summary cards**: Total spent, Highest spending day (date + amount), Top category (name + amount).
- **Bar chart**: daily spend over the selected range. Use `recharts` (already in deps via shadcn chart) with `BarChart`.
- **Category pie chart**: optional second chart showing category breakdown for the period.
- Add Insights tab to `BottomNav` (replace or add alongside Stats).

## 6. AI prompt — date-range queries + tracking mode
Update `supabase/functions/parse-expense/index.ts`:
- Accept new context fields: `mode` ('budget' | 'tracking'), `transactions_summary` (last N grouped by date) so AI can answer "How much did I spend from April 18 to April 25?".
- Add a new tool action `"range"` that returns `{ from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }` so the client computes the total locally and the AI's `reply` is formatted with the result. Simpler approach: pass full txns date+amount list in context and let AI compute, then reply naturally.
- In tracking mode, the AI must NOT mention budget/remaining/daily-limit. Just confirm logging or answer range questions.
- In budget mode, keep existing budget-enforcement behavior.

We'll send the transactions list (date+amount only, capped at ~200) so the AI can answer date-range questions accurately. Client passes `mode` so the system prompt branches.

## 7. MicChat — pass mode + transactions to context
Update `src/components/MicChat.tsx` and callers (`app.index.tsx`, `app.chat.tsx`) to pass:
- `mode`, plus a compact `txns` array `[{date, amount, category}]` for AI context.

## Technical notes
- Migration: `ALTER TABLE profiles ADD COLUMN mode text NOT NULL DEFAULT 'budget' CHECK (mode IN ('budget','tracking'));`
- Charts: use `recharts` directly (`BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`). Already a transitive dep via shadcn `chart.tsx`. If missing, `bun add recharts`.
- Hook update: extend `useFinanceData` to expose `mode` from profile and a memoized `dailySeries(from, to)` helper.
- Keep all existing budget logic intact; only conditionally render in dashboard.

## Files to create
- `src/routes/app.insights.tsx`

## Files to edit
- `supabase/functions/parse-expense/index.ts`
- `src/routes/app.onboarding.tsx`
- `src/routes/app.tsx`
- `src/routes/app.index.tsx`
- `src/routes/app.profile.tsx`
- `src/components/BottomNav.tsx`
- `src/components/MicChat.tsx`
- `src/hooks/useFinanceData.ts`

## Migration (will run after approval)
```sql
ALTER TABLE public.profiles
  ADD COLUMN mode text NOT NULL DEFAULT 'budget'
  CHECK (mode IN ('budget','tracking'));
```
