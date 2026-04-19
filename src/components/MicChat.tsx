import { useState, useRef, useEffect } from "react";
import { Mic, Send, Loader2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useSpeech } from "@/hooks/useSpeech";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/finance";

export type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  meta?: { logged?: { amount: number; category: string; item: string }[] };
};

type Props = {
  context: { remaining: number; daily_limit: number | null; spent_today: number };
  onLogged?: () => void;
  variant?: "compact" | "full";
};

export function MicChat({ context, onLogged, variant = "full" }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    {
      id: "welcome",
      role: "assistant",
      text: "Hey! 👋 Tap the mic and tell me what you spent — like 'spent 100 on biryani'.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const speech = useSpeech();

  const { listening, supported, start, stop } = useVoiceInput((text) => {
    setInput(text);
    void send(text);
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !user) return;
    setInput("");
    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setBusy(true);

    try {
      const { data, error } = await supabase.functions.invoke("parse-expense", {
        body: { message: trimmed, context },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const action = data.action as "log" | "ask" | "chat";
      let extra: ChatMsg["meta"] = undefined;

      if (action === "log" && Array.isArray(data.expenses) && data.expenses.length > 0) {
        const rows = data.expenses.map((e: any) => ({
          user_id: user.id,
          amount: Number(e.amount),
          category: e.category,
          item: e.item ?? null,
          raw_input: trimmed,
        }));
        const { error: insErr } = await supabase.from("transactions").insert(rows);
        if (insErr) throw insErr;
        extra = { logged: data.expenses };
        onLogged?.();

        // Daily limit nudge
        const totalToday = context.spent_today + rows.reduce((s: number, r: { amount: number }) => s + r.amount, 0);
        if (context.daily_limit && totalToday > context.daily_limit) {
          toast.warning(
            `You're ${formatINR(totalToday - context.daily_limit)} over your daily limit. Tomorrow's a fresh start 💪`
          );
        }
      }

      const replyText = data.reply ?? "Got it!";
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", text: replyText, meta: extra },
      ]);
      speech.speak(replyText);
    } catch (e: any) {
      toast.error(e.message ?? "AI hiccup, try again");
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", text: "Hmm, I couldn't process that. Try again? 🙏" },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex flex-col", variant === "full" ? "h-full" : "")}>
      {variant === "full" && (
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex animate-float-up",
                m.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-card",
                  m.role === "user"
                    ? "bg-gradient-blaze text-primary-foreground rounded-br-md"
                    : "bg-card text-card-foreground rounded-bl-md border border-border"
                )}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.meta?.logged && (
                  <div className="mt-2 space-y-1">
                    {m.meta.logged.map((l, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-3 rounded-lg bg-background/15 px-2 py-1 text-xs"
                      >
                        <span className="font-medium">{l.item}</span>
                        <span className="opacity-80">
                          {l.category} · {formatINR(l.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          "border-t border-border bg-card/95 backdrop-blur-lg p-3",
          variant === "full" ? "" : "rounded-2xl border shadow-card"
        )}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) void send(input);
          }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            onClick={() => (listening ? stop() : start())}
            disabled={!supported || busy}
            className={cn(
              "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition",
              listening
                ? "bg-accent text-accent-foreground animate-pulse-ring"
                : "bg-gradient-blaze text-primary-foreground shadow-glow hover:scale-105 disabled:opacity-50"
            )}
            aria-label={listening ? "Stop listening" : "Start voice input"}
            title={!supported ? "Voice not supported on this browser" : undefined}
          >
            <Mic className="h-5 w-5" />
          </button>

          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={listening ? "Listening…" : "Type or tap mic…"}
            disabled={busy}
            className="h-12 rounded-full border-border bg-background px-4"
          />

          <Button
            type="submit"
            size="icon"
            disabled={busy || !input.trim()}
            className="h-12 w-12 shrink-0 rounded-full bg-foreground text-background hover:opacity-90"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
