const { CodemixSkill } = require("../codemix.js");

const skill = new CodemixSkill({
  locales: ["hi-IN", "ta-IN", "bn-IN", "en-IN"],
  reply_in: "caller_mix",
  record_in: "en"
});

const FRESHDESK_DOMAIN = "citchennai-assist.freshdesk.com";
const PRIORITY_MAP = { P1: 3, P2: 2, P3: 1 }; // Freshdesk: 1 Low, 2 Medium, 3 High, 4 Urgent
const SOURCE_PHONE = 3;
const STATUS_OPEN = 2;

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const apiKey = process.env.FRESHDESK_API_KEY;
  if (!apiKey) {
    return res.status(501).json({
      status: "error",
      message: "FRESHDESK_API_KEY is not configured on the server. Add it in Vercel → Project Settings → Environment Variables and redeploy."
    });
  }

  try {
    const utterance = (req.body && (req.body.utterance || req.body.text)) || "";
    if (!utterance.trim()) return res.status(400).json({ status: "error", message: "utterance is required" });

    const result = skill.analyseOffline(utterance);
    const orderId = result.entities.order_id;

    const ticketBody = {
      subject: result.ticket_en.subject,
      description:
        `${result.ticket_en.summary}\n\n` +
        `Recommended action: ${result.ticket_en.action}\n` +
        `Agent reply (caller's mix): ${result.reply_mixed}\n\n` +
        `--- Original mixed-language transcript ---\n${utterance}`,
      email: orderId ? `caller-${orderId}@codemix-skill.demo` : "caller@codemix-skill.demo",
      priority: PRIORITY_MAP[result.ticket_en.priority] || 2,
      status: STATUS_OPEN,
      source: SOURCE_PHONE,
      tags: ["codemix-skill", ...(result.languages || []).map(l => l.toLowerCase())]
    };

    const fdRes = await fetch(`https://${FRESHDESK_DOMAIN}/api/v2/tickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + Buffer.from(`${apiKey}:X`).toString("base64")
      },
      body: JSON.stringify(ticketBody)
    });

    const fdJson = await fdRes.json();
    if (!fdRes.ok) {
      return res.status(fdRes.status).json({ status: "error", message: "Freshdesk rejected the ticket", freshdesk: fdJson });
    }

    return res.status(200).json({
      status: "success",
      ticket_id: fdJson.id,
      ticket_url: `https://${FRESHDESK_DOMAIN}/a/tickets/${fdJson.id}`,
      raw: result
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message || "Failed to create Freshdesk ticket" });
  }
};
