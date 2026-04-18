import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Mic, Sparkles, TrendingUp, Wallet } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 h-96 w-96 rounded-full bg-gradient-blaze opacity-20 blur-3xl" />
        <div className="absolute top-1/3 -left-32 h-96 w-96 rounded-full bg-gradient-cool opacity-20 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-blaze shadow-glow">
            <Wallet className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">Paisa</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <Button asChild size="sm" className="bg-gradient-blaze shadow-glow hover:opacity-90">
            <Link to="/auth">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-12 pb-20 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-card">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Built for college students
          </div>
          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            Just <span className="text-gradient-blaze">talk</span> to your
            <br />money.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Paisa is your voice-first AI finance companion. Say{" "}
            <span className="font-medium text-foreground">"100 on biryani"</span> and we'll
            log it, categorize it, and keep you on budget — like talking to a friend.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 bg-gradient-blaze px-8 text-base shadow-glow hover:opacity-95"
            >
              <Link to="/auth">
                <Mic className="mr-2 h-5 w-5" /> Start tracking free
              </Link>
            </Button>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mx-auto mt-20 grid max-w-5xl gap-4 md:grid-cols-3">
          {[
            {
              icon: Mic,
              title: "Voice-first",
              body: "Tap, speak, done. We understand natural language like 'spent 200 on uber'.",
            },
            {
              icon: Sparkles,
              title: "Smart AI",
              body: "Auto-categorizes every expense and chats back like a supportive friend.",
            },
            {
              icon: TrendingUp,
              title: "Daily limits",
              body: "Set a daily cap. Get gentle nudges, never guilt trips. Celebrate no-spend days.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-1 hover:shadow-glow"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-warm">
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
