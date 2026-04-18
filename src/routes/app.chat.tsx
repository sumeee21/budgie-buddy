import { createFileRoute } from "@tanstack/react-router";
import { useFinanceData } from "@/hooks/useFinanceData";
import { BottomNav } from "@/components/BottomNav";
import { MicChat } from "@/components/MicChat";

export const Route = createFileRoute("/app/chat")({
  component: ChatPage,
});

function ChatPage() {
  const { profile, remaining, spentToday } = useFinanceData();
  const dailyLimit = profile?.daily_limit ? Number(profile.daily_limit) : null;

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
          context={{ remaining, daily_limit: dailyLimit, spent_today: spentToday }}
        />
      </div>

      <BottomNav />
    </div>
  );
}
