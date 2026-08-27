// Standalone sanity check: spins up the MCP server as a real subprocess,
// connects a real MCP client over stdio, lists tools, and calls one.
// Run with: npm run verify
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["index.js"]
});

const client = new Client({ name: "codemix-skill-verify", version: "1.0.0" });
await client.connect(transport);

const tools = await client.listTools();
console.log(`Found ${tools.tools.length} tool(s):`, tools.tools.map(t => t.name).join(", "));

const result = await client.callTool({
  name: "analyse_codemixed_call",
  arguments: {
    utterance: "Bhaiya mera order abhi tak deliver nahi hua, tracking bhi update nahi ho raha hai. Order number 48211 hai."
  }
});

console.log("\nSample call result:");
console.log(result.content[0].text);

await client.close();
process.exit(0);
