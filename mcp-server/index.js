#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CodemixSkill } from "./codemix.js";

const skill = new CodemixSkill({
  locales: ["hi-IN", "ta-IN", "bn-IN", "en-IN"],
  reply_in: "caller_mix",
  record_in: "en"
});

const server = new McpServer({
  name: "codemix-skill",
  version: "1.0.0"
});

server.registerTool(
  "analyse_codemixed_call",
  {
    title: "Analyse a code-mixed support call",
    description:
      "Reads a code-mixed Indian support utterance (Hinglish, Tanglish, Benglish, etc.), " +
      "tags each word's language, finds intra-sentential switch points, resolves one intent, " +
      "and drafts an English ticket. Use this before replying to a caller who mixes languages " +
      "mid-sentence.",
    inputSchema: {
      utterance: z.string().describe("The caller's raw transcript, in whatever language mix they used.")
    }
  },
  async ({ utterance }) => {
    if (!utterance || !utterance.trim()) {
      return {
        isError: true,
        content: [{ type: "text", text: "utterance is required" }]
      };
    }

    const result = skill.analyseOffline(utterance);

    const payload = {
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
    };

    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }]
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
