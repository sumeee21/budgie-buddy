import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { localDateKey } from "@/lib/finance";

export type Profile = {
  id: string;
  user_id: string;
  display_name: string | null;
  total_budget: number;
  daily_limit: number | null;
};

export type Transaction = {
  id: string;
  amount: number;
  category: string;
  item: string | null;
  created_at: string;
};

export function useFinanceData() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setTxns([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const [{ data: p }, { data: t }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    if (p) setProfile(p as any);
    if (t) setTxns(t as any);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  // Realtime updates
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("finance-" + user.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${user.id}` },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, refresh]);

  const spent = txns.reduce((s, t) => s + Number(t.amount), 0);
  const remaining = (profile?.total_budget ?? 0) - spent;
  const today = localDateKey();
  const spentToday = txns
    .filter((t) => localDateKey(t.created_at) === today)
    .reduce((s, t) => s + Number(t.amount), 0);

  return { profile, txns, loading, refresh, spent, remaining, spentToday };
}
