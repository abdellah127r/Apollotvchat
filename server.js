require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization"] }));
app.use(express.json());

const KNOWLEDGE_BASE = `
Apollo TV Canada — apollotv.ca — Canada's #1 Legal IPTV Service

PLANS (USD): 1 Month $19.99 | 3 Months $27.99 | 6 Months $49.99 | 1 Year $79.99 (save 49%)
CONTENT: 33,139+ live channels | 199,695+ movies & series | 4K/UHD quality | Anti-freeze tech
FREE TRIAL: 6-hour free trial via WhatsApp +34613741082 | 1-day trial at apollotv.ca
DEVICES: Fire Stick, MAG Box, Android, PC, VLC, Kodi, Smart TV, Xbox, PlayStation, Roku
DELIVERY: Login sent 2min-1hr after payment via email/WhatsApp (check spam!)
REFUND: 7-day full money-back guarantee
SPORTS: 12,000+ channels — UEFA, NFL, NBA, NHL and more
CONTACT: WhatsApp +34613741082 (24/7) | apollotv.ca | apollotv.ca/contact-us/

COMMON ISSUES:
- Didn't receive login? Check spam folder, then WhatsApp us
- Buffering? Check internet speed (need 10+ Mbps for 4K), restart device, try different server
- App not working? Clear cache, restart router, contact support
- Refund? Contact WhatsApp within 7 days for full refund
`;

function buildSystemPrompt() {
  return `You are Apollo, the friendly AI support agent for Apollo TV Canada (apollotv.ca).
Be warm, concise, and helpful. Respond in the same language the customer uses (English, French, or Arabic).

KNOWLEDGE:
${KNOWLEDGE_BASE}

RULES:
- For subscriptions → apollotv.ca/our-plans/
- For free trial → WhatsApp +34613741082
- For technical help → ask for details, give step-by-step solution
- For refunds → reassure them, guide to WhatsApp
- Never invent information not listed above
- If unsure → offer WhatsApp +34613741082`;
}

const LOGS_FILE = path.join(__dirname, "logs.json");
function loadLogs() { try { return JSON.parse(fs.readFileSync(LOGS_FILE,"utf8")); } catch { return []; } }
function saveLogs(l) { try { fs.writeFileSync(LOGS_FILE, JSON.stringify(l.slice(-500), null, 2)); } catch {} }

app.options("*", cors());

app.get("/", (req, res) => res.json({ status: "✅ Apollo TV Smart Agent is running!", version: "2.0" }));

app.post("/api/chat", async (req, res) => {
  const { messages, sessionId } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "messages array required" });

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
        system: buildSystemPrompt(),
        messages,
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const reply = data.content?.[0]?.text || "Please contact us on WhatsApp: +34613741082";

    const logs = loadLogs();
    logs.push({ sessionId, messages, reply, timestamp: new Date().toISOString() });
    saveLogs(logs);

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error. Please try again." });
  }
});

app.get("/api/logs", (req, res) => {
  const logs = loadLogs();
  res.json({ total: logs.length, recent: logs.slice(-10) });
});

app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Apollo TV Agent running on port ${PORT}`));
