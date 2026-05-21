require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "*" }));
app.use(express.json());

// ─────────────────────────────────────────────────────────
// 📚 KNOWLEDGE BASE — Apollo TV Full Info
// ─────────────────────────────────────────────────────────
const KNOWLEDGE_BASE = `
## COMPANY
Name: Apollo TV Canada | Website: apollotv.ca | Category: #1 Legal IPTV Service in Canada

## CONTENT
- 33,139+ live TV channels worldwide
- 199,695+ movies & TV series (VOD)
- 4K / Ultra HD / Full HD quality
- Anti-freeze technology — zero buffering
- 99.9% server uptime
- Free channel & VOD updates always

## PLANS & PRICING (USD)
| Plan       | Price   | Best For          |
|------------|---------|-------------------|
| 1 Month    | $19.99  | Try it out        |
| 3 Months   | $27.99  | Short term        |
| 6 Months   | $49.99  | Great value       |
| 1 Year     | $79.99  | BEST DEAL -49%    |
All plans include EVERYTHING: all channels, all VOD, 4K, all devices, 24/7 support.
Subscribe at: https://apollotv.ca/our-plans/

## FREE TRIAL
- 6-hour FREE trial available
- Contact WhatsApp: +34613741082 to get it
- OR get 1-day trial at: https://apollotv.ca/our-plans/1-day-trail/

## COMPATIBLE DEVICES
Fire Stick, MAG Box, Android Phone, Android Box, Android TV, Windows PC, Mac, VLC Player,
Kodi/XBMC, Smart TV (Samsung/LG/Sony), Xbox, PlayStation, Roku, Enigma2, DreamBox, Vu+

## HOW IT WORKS (3 steps)
1. Choose plan → pay at apollotv.ca/our-plans/
2. Receive login via WhatsApp/email in 2 minutes to 1 hour (check spam folder!)
3. Install using provided guide → enjoy instantly

## INSTALLATION HELP
- Fire Stick: Go to Settings → My Fire TV → Developer Options → turn on "Apps from Unknown Sources" → install Downloader app → enter Apollo TV URL
- Android: Download APK from the link provided after purchase
- Smart TV: Use built-in browser or Downloader app
- PC/Mac: Use VLC player with the M3U link provided
- Full guides sent with every purchase

## SPORTS
- 12,000+ sports channels
- UEFA Champions League, Premier League, La Liga, Serie A
- NFL, NBA, NHL, MLB
- MLS, F1, UFC, Boxing, Tennis
- Canadian, US, UK, European, Middle Eastern sports

## REFUND POLICY
- Full refund: within 7 days of purchase, no questions asked
- After 7 days: partial refund based on unused period — ONLY if technical issue from our side not fixed within 72 hours
- How to refund: Contact support → quick process

## CONTACT & SUPPORT
- WhatsApp: +34613741082 (24/7 — fastest response)
- Website: https://apollotv.ca
- Contact form: https://apollotv.ca/contact-us/
- Response time: Usually within minutes on WhatsApp

## COMMON ISSUES & SOLUTIONS
Q: I didn't receive my login credentials
A: Check your spam/junk folder. If not there, contact WhatsApp +34613741082 — we resend within minutes.

Q: My stream is buffering or freezing
A: 1) Check your internet speed (need 10+ Mbps for 4K, 5+ for HD) 2) Restart your device 3) Try a different server in the app 4) Contact support if persists.

Q: How do I install on Fire Stick?
A: Enable Developer Options → install Downloader → enter the URL we send you → install Apollo TV app.

Q: Can I use on multiple devices at the same time?
A: Depends on your plan. Check your plan details or contact support for simultaneous connections info.

Q: App is not working after it was working before
A: 1) Clear app cache 2) Restart router 3) Update the app 4) Contact WhatsApp support for quick fix.

Q: Can I get a refund?
A: Yes! Within 7 days full refund. Contact us on WhatsApp and it's processed quickly.

Q: What internet speed do I need?
A: Minimum 5 Mbps for HD, 10+ Mbps for 4K/Ultra HD. Wired connection recommended for best quality.

Q: Do you offer reseller plans?
A: Yes! Reseller plans available at: https://apollotv.ca/reseller-plans/

Q: Is this legal?
A: Yes — Apollo TV is a fully legal IPTV service in Canada.
`;

// ─────────────────────────────────────────────────────────
// 🧠 SMART SYSTEM PROMPT
// ─────────────────────────────────────────────────────────
function buildSystemPrompt(extraKnowledge = "") {
  return `You are Apollo, the AI customer support agent for Apollo TV Canada (apollotv.ca).

## YOUR PERSONALITY
- Warm, friendly, and enthusiastic about the service
- Professional but conversational — not robotic
- Always positive, never dismissive
- If a customer is frustrated, be extra empathetic first
- Respond in the same language the customer uses (English, French, or Arabic)
- Keep answers concise — 2-4 sentences max unless they need step-by-step help

## YOUR KNOWLEDGE
${KNOWLEDGE_BASE}

${extraKnowledge ? `## ADDITIONAL LEARNED KNOWLEDGE\n${extraKnowledge}` : ""}

## YOUR BEHAVIOR RULES
1. ALWAYS greet new customers warmly
2. For subscription questions → direct to: https://apollotv.ca/our-plans/
3. For free trial → send to WhatsApp: +34613741082
4. For technical issues → ask them to describe the problem, then give step-by-step help
5. For billing/refund → reassure them, guide to WhatsApp for fastest resolution
6. If a customer is angry → empathize first ("I completely understand your frustration"), then solve
7. If you don't know something → say "Let me connect you with our team" + give WhatsApp number
8. NEVER make up pricing, features, or policies not listed above
9. End responses with a helpful follow-up question when appropriate
10. For technical steps → use numbered lists for clarity

## ESCALATION
If issue is complex or customer is very unhappy → always offer:
"For the fastest resolution, our team is available 24/7 on WhatsApp: +34613741082"`;
}

// ─────────────────────────────────────────────────────────
// 💾 CONVERSATION STORAGE (learns from chats)
// ─────────────────────────────────────────────────────────
const LOGS_FILE = path.join(__dirname, "conversation_logs.json");
const LEARNED_FILE = path.join(__dirname, "learned_knowledge.json");

function loadLogs() {
  try { return JSON.parse(fs.readFileSync(LOGS_FILE, "utf8")); }
  catch { return []; }
}

function saveLogs(logs) {
  fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
}

function loadLearnedKnowledge() {
  try { return JSON.parse(fs.readFileSync(LEARNED_FILE, "utf8")); }
  catch { return { faqs: [], insights: [] }; }
}

function saveLearnedKnowledge(data) {
  fs.writeFileSync(LEARNED_FILE, JSON.stringify(data, null, 2));
}

// Auto-analyze conversations to extract new FAQs
async function analyzeAndLearn(conversation) {
  try {
    const learned = loadLearnedKnowledge();
    const existing = learned.faqs.map(f => f.question).join(", ");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: `You analyze customer support conversations and extract new FAQ insights.
Extract any new question+answer pair that is NOT already covered by: ${existing || "nothing yet"}.
Respond ONLY with valid JSON: {"new_faq": {"question": "...", "answer": "..."}} or {"new_faq": null} if nothing new.`,
        messages: [{ role: "user", content: `Conversation:\n${JSON.stringify(conversation)}` }],
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text || "{}";
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}");

    if (parsed.new_faq) {
      learned.faqs.push({ ...parsed.new_faq, timestamp: new Date().toISOString() });
      saveLearnedKnowledge(learned);
      console.log("✅ Learned new FAQ:", parsed.new_faq.question);
    }
  } catch (e) {
    console.log("Learning skipped:", e.message);
  }
}

// ─────────────────────────────────────────────────────────
// 💬 MAIN CHAT ENDPOINT
// ─────────────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  const { messages, sessionId } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }

  // Build extra knowledge from learned FAQs
  const learned = loadLearnedKnowledge();
  let extraKnowledge = "";
  if (learned.faqs.length > 0) {
    extraKnowledge = learned.faqs
      .slice(-20) // use latest 20 learned FAQs
      .map(f => `Q: ${f.question}\nA: ${f.answer}`)
      .join("\n\n");
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: buildSystemPrompt(extraKnowledge),
        messages,
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const reply = data.content?.[0]?.text || "Sorry, please contact us on WhatsApp: +34613741082";

    // Save conversation log
    const logs = loadLogs();
    const session = { sessionId: sessionId || Date.now(), messages, reply, timestamp: new Date().toISOString() };
    logs.push(session);
    if (logs.length > 500) logs.splice(0, logs.length - 500); // keep last 500
    saveLogs(logs);

    // Learn from this conversation asynchronously (don't wait)
    if (messages.length >= 2) {
      analyzeAndLearn([...messages, { role: "assistant", content: reply }]);
    }

    res.json({ reply });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────────────────
// 📊 ANALYTICS ENDPOINT — see what customers ask
// ─────────────────────────────────────────────────────────
app.get("/api/analytics", async (req, res) => {
  const key = req.headers["x-admin-key"];
  if (key !== process.env.ADMIN_KEY && process.env.ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const logs = loadLogs();
  const learned = loadLearnedKnowledge();
  res.json({
    total_conversations: logs.length,
    learned_faqs: learned.faqs.length,
    recent_questions: logs.slice(-10).map(l => l.messages[l.messages.length-1]?.content).filter(Boolean),
    learned_faqs_list: learned.faqs.slice(-10),
  });
});

// ─────────────────────────────────────────────────────────
// 📖 ADD MANUAL KNOWLEDGE ENDPOINT
// ─────────────────────────────────────────────────────────
app.post("/api/learn", async (req, res) => {
  const key = req.headers["x-admin-key"];
  if (key !== process.env.ADMIN_KEY && process.env.ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { question, answer } = req.body;
  if (!question || !answer) return res.status(400).json({ error: "question and answer required" });

  const learned = loadLearnedKnowledge();
  learned.faqs.push({ question, answer, timestamp: new Date().toISOString(), manual: true });
  saveLearnedKnowledge(learned);
  res.json({ success: true, message: "Knowledge added!" });
});

// Health check
app.get("/", (req, res) => res.json({ status: "✅ Apollo TV Smart Agent running!" }));

app.listen(PORT, () => console.log(`🚀 Apollo TV Smart Agent on http://localhost:${PORT}`));
