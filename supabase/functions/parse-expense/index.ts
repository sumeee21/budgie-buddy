// Edge function: parse student expense input via Lovable AI
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a friendly, supportive AI finance companion for college students. You help them log expenses naturally and stay on budget. Currency is INR (₹). Be warm, encouraging, never judgmental. Use light emojis sparingly.

Your job: parse the user's message and decide one of:
1. "log" — there is enough info to log one or more expenses (amount + what it was spent on).
2. "ask" — amount is given but the user did NOT say what it was for, so ask a short friendly clarifying question.
3. "chat" — general chat / question about budget / greeting; just reply conversationally.

Categories you must use (pick best fit): Food, Transport, Education, Entertainment, Shopping, Health, Bills, Other.

Examples:
- "I spent 200" → ask: "Sure! What did you spend ₹200 on?"
- "spent 200 on food" → log: [{amount:200, category:"Food", item:"food"}]
- "100 on biryani and 100 on hackathon" → log: [{amount:100, category:"Food", item:"biryani"},{amount:100, category:"Education", item:"hackathon"}]
- "uber 80" → log: [{amount:80, category:"Transport", item:"uber"}]
- "how much do I have left" → chat: answer using the context provided.

Always call the tool. Keep "reply" under 140 chars, friendly, supportive.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const userContext = `Context — remaining balance: ₹${context?.remaining ?? "unknown"}, daily limit: ${context?.daily_limit ? "₹" + context.daily_limit : "none"}, spent today: ₹${context?.spent_today ?? 0}.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: userContext },
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
