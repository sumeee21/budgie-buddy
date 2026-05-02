import { Link, useLocation } from "@tanstack/react-router";
import { Home, MessageCircle, BarChart3, User, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/app", label: "Home", icon: Home },
  { to: "/app/chat", label: "Chat", icon: MessageCircle },
  { to: "/app/history", label: "History", icon: Clock },
  { to: "/app/insights", label: "Insights", icon: BarChart3 },
  { to: "/app/profile", label: "You", icon: User },
];

export function BottomNav() {
  const loc = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur-lg">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
        {items.map((it) => {
          const active = loc.pathname === it.to;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <it.icon className={cn("h-5 w-5", active && "scale-110")} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
