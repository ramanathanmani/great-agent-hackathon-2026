import { CodemixSkill } from "../codemix.js";

const skill = new CodemixSkill({
  locales: ["hi-IN", "ta-IN", "bn-IN", "en-IN"],
  reply_in: "caller_mix",
  record_in: "en"
});

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 
    (process.env.NODE_ENV === "production" ? "https://codemix-skill.vercel.app" : "*");

  // Enable CORS for Freshworks Agent Studio, Web Console, and Allowed Origins
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Method guard: POST only
  if (req.method !== "POST") {
    return res.status(405).json({
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Only POST requests are supported."
      }
    });
  }

  // Payload validation
  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({
      error: {
        code: "INVALID_PAYLOAD",
        message: "Request body must be a valid JSON object."
      }
    });
  }

  const utterance = (typeof body.utterance === "string" ? body.utterance :
                     typeof body.text === "string" ? body.text :
                     typeof body.message === "string" ? body.message : "").trim();

  if (!utterance) {
    return res.status(400).json({
      error: {
        code: "MISSING_UTTERANCE",
        message: "The 'utterance' field is required and cannot be empty."
      }
    });
  }

  try {
    const result = skill.analyseOffline(utterance);

    // Format output specifically tailored for Freshworks Freddy AI Agent & Freshdesk Tickets
    return res.status(200).json({
      status: "success",
      freshworks_payload: {
        agent_reply: result.reply_mixed,
        detected_intent: result.intent,
        intent_confidence: result.confidence,
        ticket: {
          subject: result.ticket_en.subject || `Support Request: ${result.intent}`,
          priority: result.ticket_en.priority || "P2",
          body: result.ticket_en.summary,
          tags: ["codemix-skill", "indic-voice", ...(result.languages || [])],
          detected_order_id: result.entities.order_id || null
        },
        language_metrics: {
          switch_points: result.switch_points,
          languages: result.languages,
          token_tags: result.tokens
        }
      },
      raw: result
    });
  } catch (err) {
    return res.status(500).json({
      error: {
        code: "ANALYSIS_FAILED",
        message: "Failed to process code-mixed utterance."
      }
    });
  }
}
