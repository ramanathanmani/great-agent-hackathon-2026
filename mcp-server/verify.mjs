// Standalone sanity check: spins up the MCP server as a real subprocess,
// connects a real MCP client over stdio, lists tools, and calls one.
// Run with: npm run verify:mcp
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(__dirname, "index.js");

// Safety timeout: abort if execution takes longer than 15s to prevent CI hanging
const timeout = setTimeout(() => {
  console.error("[verify:mcp ERROR] MCP server verification timed out after 15s");
  process.exit(1);
}, 15000);

try {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath]
  });

  const client = new Client({ name: "codemix-skill-verify", version: "1.0.0" });
  await client.connect(transport);

  // 1. Verify Tool Registration
  const tools = await client.listTools();
  const toolNames = tools.tools.map(t => t.name);
  console.log(`Found ${tools.tools.length} tool(s):`, toolNames.join(", "));

  if (!toolNames.includes("analyse_codemixed_call")) {
    throw new Error("Required tool 'analyse_codemixed_call' was not registered by the server");
  }

  // 2. Verify Tool Invocation
  const result = await client.callTool({
    name: "analyse_codemixed_call",
    arguments: {
      utterance: "Bhaiya mera order abhi tak deliver nahi hua, tracking bhi update nahi ho raha hai. Order number 48211 hai."
    }
  });

  if (!result || !result.content || !result.content[0] || !result.content[0].text) {
    throw new Error("Tool invocation did not return expected content");
  }

  const parsed = JSON.parse(result.content[0].text);
  if (!parsed.intent || !parsed.order_id) {
    throw new Error("Tool response payload is missing required intent or entity fields");
  }

  console.log("\nSample call result:");
  console.log(result.content[0].text);
  console.log("\n[verify:mcp] MCP tool verification succeeded.");

  await client.close();
  await transport.close();
  clearTimeout(timeout);
  process.exit(0);
} catch (err) {
  clearTimeout(timeout);
  console.error("[verify:mcp FAILED]:", err.message);
  process.exit(1);
}
