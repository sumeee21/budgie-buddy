// Edge function: parse expense input via Lovable AI (budget + tracking modes)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUDGET_PROMPT = `You are a friendly, supportive AI finance companion for college students in BUDGET MODE. You help them log expenses naturally and stay on budget. Currency is INR (₹). Be warm, encouraging, never judgmental. Use light emojis sparingly.

Your job: parse the user's message and decide one of:
1. "log" — there is enough info to log one or more expenses (amount + what it was spent on).
2. "ask" — amount is given but the user did NOT say what it was for, so ask a short friendly clarifying question.
3. "chat" — general chat / question about budget / greeting; just reply conversationally.

Categories you must use (pick best fit): Food, Transport, Education, Entertainment, Shopping, Health, Bills, Other.

CRITICAL — spending guidance in your "reply":
- If after this expense the user is OVER their daily limit (spent_today + new amount > daily_limit): clearly tell them to STOP spending today and start saving. Example: "Whoa, you're ₹X over today's limit — please pause spending and save the rest 💪". Be firm but kind.
- If still UNDER the daily limit: tell them how much they have LEFT for today AND mention the overall remaining monthly balance. Example: "Logged! ₹X left for today, ₹Y left this month 🎉".
- If no daily limit set, just mention monthly remaining.
- For "chat" action questions about money, always include both today's and monthly remaining when relevant.

If the user asks about spending in a date range (e.g. "how much did I spend from April 18 to 25"), use the transactions list provided in context to compute and answer with exact totals.

Always call the tool. Keep "reply" under 200 chars, friendly, supportive.`;

const TRACKING_PROMPT = `You are a friendly AI expense tracker in TRACKING MODE (no budget). The user just wants to record spending and analyze it. Currency is INR (₹). Be warm and concise. Use light emojis sparingly.

Your job: parse the user's message and decide one of:
1. "log" — there is enough info to log one or more expenses (amount + what it was spent on).
2. "ask" — amount is given but the user did NOT say what it was for, ask a short clarifying question.
3. "chat" — greeting or analytical question (e.g. date-range totals, "how much did I spend this week").

Categories: Food, Transport, Education, Entertainment, Shopping, Health, Bills, Other.

CRITICAL — DO NOT mention budget, remaining balance, daily limits, or saving advice. The user has no budget. Just confirm what was logged with the total spent today, e.g. "Logged ₹100 for biryani 🍔. You've spent ₹350 today.".

For date-range questions (e.g. "how much did I spend from April 18 to April 25", "spending between 1 May and 10 May", "this week's total"), use the transactions list in context to compute an EXACT total. Reply like: "You spent ₹3,450 between 18 Apr and 25 Apr across 12 expenses. Top category: Food (₹1,200). Highest day: 22 Apr (₹820)."

Always call the tool. Keep "reply" under 240 chars.`;

function buildContext(ctx: any): { mode: "budget" | "tracking"; text: string } {
  const mode: "budget" | "tracking" = ctx?.mode === "tracking" ? "tracking" : "budget";
  const today = new Date().toISOString().slice(0, 10);
  const txns = Array.isArray(ctx?.transactions) ? ctx.transactions.slice(0, 200) : [];
  const lines: string[] = [
    `Mode: ${mode}.`,
    `Today's date: ${today}.`,
    `Spent today: ₹${ctx?.spent_today ?? 0}.`,
  ];
  if (mode === "budget") {
    lines.push(
      `Remaining monthly balance: ₹${ctx?.remaining ?? "unknown"}.`,
      `Daily limit: ${ctx?.daily_limit ? "₹" + ctx.daily_limit : "none"}.`,
    );
  }
  if (txns.length) {
    lines.push(
      `Recent transactions (date | amount | category | item), most recent first:`,
      ...txns.map(
        (t: any) => `- ${t.date} | ₹${t.amount} | ${t.category} | ${t.item ?? ""}`,
      ),
    );
  }
  return { mode, text: lines.join("\n") };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const built = buildContext(context);
    const systemPrompt = built.mode === "tracking" ? TRACKING_PROMPT : BUDGET_PROMPT;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "system", content: built.text },
          { role: "user", content: message },
        ],
        tools: [{
          type: "function",
          function: {
            name: "respond",
            description: "Respond to the user with action and reply",
            parameters: {
              type: "object",
              properties: {
                action: { type: "string", enum: ["log", "ask", "chat"] },
                reply: { type: "string", description: "Friendly conversational reply (<140 chars)" },
                expenses: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      amount: { type: "number" },
                      category: { type: "string", enum: ["Food", "Transport", "Education", "Entertainment", "Shopping", "Health", "Bills", "Other"] },
                      item: { type: "string" },
                    },
                    required: ["amount", "category", "item"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["action", "reply"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "respond" } },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (res.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await res.text();
      console.error("AI error", res.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await res.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ action: "chat", reply: data.choices?.[0]?.message?.content ?? "Sorry, I didn't catch that." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("parse-expense error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
