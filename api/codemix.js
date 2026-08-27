const { CodemixSkill } = require("../codemix.js");

const skill = new CodemixSkill({
  locales: ["hi-IN", "ta-IN", "bn-IN", "en-IN"],
  reply_in: "caller_mix",
  record_in: "en"
});

module.exports = async (req, res) => {
  // Enable CORS for Freshworks Agent Studio & external requests
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const utterance = (req.body && (req.body.utterance || req.body.text || req.body.message)) ||
                      (req.query && (req.query.utterance || req.query.text || req.query.message)) ||
                      "Bhaiya mera order abhi tak deliver nahi hua, tracking update nahi ho raha";

    // Run Codemix Skill Analysis
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
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message || "Failed to process code-mixed utterance"
    });
  }
};
