import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { BottomNav } from "@/components/BottomNav";
import { MicChat } from "@/components/MicChat";
import { localDateKey } from "@/lib/finance";

export const Route = createFileRoute("/app/chat")({
  component: ChatPage,
});

function ChatPage() {
  const { profile, txns, remaining, spentToday } = useFinanceData();
  const dailyLimit = profile?.daily_limit ? Number(profile.daily_limit) : null;
  const txnContext = useMemo(
    () =>
      txns.slice(0, 200).map((t) => ({
        date: localDateKey(t.created_at),
        amount: Number(t.amount),
        category: t.category,
        item: t.item,
      })),
    [txns]
  );

  return (
    <div className="flex min-h-screen flex-col pb-16">
      <header className="border-b border-border bg-card/95 px-5 py-4 backdrop-blur-lg">
        <h1 className="font-display text-xl font-bold">Chat with Paisa</h1>
        <p className="text-xs text-muted-foreground">
          Voice or type — I'll log expenses and chat back
        </p>
      </header>

      <div className="flex-1 overflow-hidden">
        <MicChat
          variant="full"
          context={{
            remaining,
            daily_limit: dailyLimit,
            spent_today: spentToday,
            mode: profile?.mode ?? "budget",
            transactions: txnContext,
          }}
        />
      </div>

      <BottomNav />
    </div>
  );
}
