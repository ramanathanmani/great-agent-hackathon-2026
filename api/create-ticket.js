import { CodemixSkill } from "../codemix.js";

const skill = new CodemixSkill({
  locales: ["hi-IN", "ta-IN", "bn-IN", "en-IN"],
  reply_in: "caller_mix",
  record_in: "en"
});

const DEFAULT_DOMAIN = "citchennai-assist.freshdesk.com";
const PRIORITY_MAP = { P1: 3, P2: 2, P3: 1 }; // Freshdesk: 1 Low, 2 Medium, 3 High, 4 Urgent
const SOURCE_PHONE = 3;
const STATUS_OPEN = 2;

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 
    (process.env.NODE_ENV === "production" ? "https://codemix-skill.vercel.app" : "*");

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Method guard: POST only
  if (req.method !== "POST") {
    return res.status(405).json({
      status: "error",
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Only POST requests are supported."
      },
      message: "Method Not Allowed. Use POST."
    });
  }

  // Check required credentials without leaking key details
  const apiKey = process.env.FRESHDESK_API_KEY;
  if (!apiKey) {
    return res.status(501).json({
      status: "error",
      error: {
        code: "CONFIGURATION_ERROR",
        message: "Freshdesk API credentials are not configured on the server."
      },
      message: "FRESHDESK_API_KEY is not configured on the server."
    });
  }

  // Validate request body
  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({
      status: "error",
      error: {
        code: "INVALID_PAYLOAD",
        message: "Request body must be a valid JSON object."
      },
      message: "Request body must be a valid JSON object."
    });
  }

  const utterance = (typeof body.utterance === "string" ? body.utterance :
                     typeof body.text === "string" ? body.text : "").trim();

  if (!utterance) {
    return res.status(400).json({
      status: "error",
      error: {
        code: "MISSING_UTTERANCE",
        message: "The 'utterance' parameter is required and cannot be empty."
      },
      message: "utterance is required"
    });
  }

  const freshdeskDomain = process.env.FRESHDESK_DOMAIN || DEFAULT_DOMAIN;

  try {
    const result = skill.analyseOffline(utterance);
    const orderId = result.entities.order_id;

    // Use caller-provided email if available, otherwise generate ticket identifier email
    const callerEmail = (typeof body.email === "string" && body.email.includes("@"))
      ? body.email
      : (orderId ? `caller-${orderId}@codemix-skill.demo` : "caller@codemix-skill.demo");

    const ticketBody = {
      subject: result.ticket_en.subject,
      description:
        `${result.ticket_en.summary}\n\n` +
        `Recommended action: ${result.ticket_en.action}\n` +
        `Agent reply (caller's mix): ${result.reply_mixed}\n\n` +
        `--- Original mixed-language transcript ---\n${utterance}`,
      email: callerEmail,
      priority: PRIORITY_MAP[result.ticket_en.priority] || 2,
      status: STATUS_OPEN,
      source: SOURCE_PHONE,
      tags: ["codemix-skill", ...(result.languages || []).map(l => l.toLowerCase())]
    };

    const fdRes = await fetch(`https://${freshdeskDomain}/api/v2/tickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + Buffer.from(`${apiKey}:X`).toString("base64")
      },
      body: JSON.stringify(ticketBody)
    });

    const fdJson = await fdRes.json();
    if (!fdRes.ok) {
      // Return structured error without leaking auth credentials or internal trace
      return res.status(fdRes.status).json({
        status: "error",
        error: {
          code: "PROVIDER_REJECTED",
          message: "Freshdesk rejected the ticket creation request."
        },
        message: "Freshdesk rejected the ticket: " + (fdJson.description || `HTTP ${fdRes.status}`)
      });
    }

    return res.status(200).json({
      status: "success",
      ticket_id: fdJson.id,
      ticket_url: `https://${freshdeskDomain}/a/tickets/${fdJson.id}`,
      raw: result
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      error: {
        code: "SERVER_ERROR",
        message: "An internal server error occurred while creating the ticket."
      },
      message: error.message || "Failed to create Freshdesk ticket"
    });
  }
}
