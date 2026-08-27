const { CodemixSkill } = require("./codemix.js");

const skill = new CodemixSkill({
  locales: ["hi-IN", "ta-IN", "bn-IN", "en-IN"],
  reply_in: "caller_mix",
  record_in: "en"
});

exports = {
  analyseCodemixedCall: async function (payload) {
    try {
      const utterance = payload && payload.utterance;
      if (!utterance || !utterance.trim()) {
        return renderData({ status: 400, message: "utterance is required" });
      }

      const result = skill.analyseOffline(utterance);

      renderData(null, {
        intent: result.intent,
        confidence: result.confidence,
        languages: result.languages,
        switch_points: result.switch_points,
        order_id: result.entities.order_id,
        sentiment: result.entities.sentiment,
        urgency: result.entities.urgency,
        reply_mixed: result.reply_mixed,
        ticket_subject: result.ticket_en.subject,
        ticket_summary: result.ticket_en.summary,
        ticket_action: result.ticket_en.action,
        ticket_priority: result.ticket_en.priority
      });
    } catch (error) {
      renderData({ status: 500, message: error.message || "Failed to analyse the call" });
    }
  }
};
