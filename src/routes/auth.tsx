import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Wallet, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Paisa" },
      { name: "description", content: "Sign in to your Paisa finance companion." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function waitForSessionUser() {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) return session.user;

      await new Promise((resolve) => window.setTimeout(resolve, 150));
    }

    return null;
  }

  async function redirectToMainPanel(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("total_budget")
      .eq("user_id", userId)
      .maybeSingle();

    const nextPath = !data || Number(data.total_budget) <= 0 ? "/app/onboarding" : "/app";
    window.location.replace(nextPath);
  }

  useEffect(() => {
    if (authLoading || !user) return;
    void redirectToMainPanel(user.id);
  }, [authLoading, user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        const signedInUser = data.user ?? (await waitForSessionUser());
        toast.success("Welcome to Paisa! 🎉");
        if (signedInUser) {
          await redirectToMainPanel(signedInUser.id);
          return;
        }
        window.location.replace("/app/onboarding");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const signedInUser = data.user ?? (await waitForSessionUser());
        toast.success("Welcome back! 👋");
        if (signedInUser) {
          await redirectToMainPanel(signedInUser.id);
          return;
        }
        window.location.replace("/app");
      }
    } catch (err: any) {
      if (err?.message?.includes("User already registered")) {
        setMode("signin");
        toast.error("This email already has an account. Please sign in.");
      } else {
        toast.error(err.message ?? "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-blaze opacity-15 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-blaze shadow-glow">
            <Wallet className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-bold">Paisa</span>
        </div>

        <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
          <h1 className="font-display text-2xl font-bold">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Start tracking expenses with your voice."
              : "Sign in to continue your journey."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aarav" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
            </div>

            <Button type="submit" disabled={loading} className="h-11 w-full bg-gradient-blaze shadow-glow hover:opacity-95">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="mt-5 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
          </button>
        </div>
      </div>
    </div>
  );
}
