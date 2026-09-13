# Codemix Skill — Model Context Protocol (MCP) Server

A standard [Model Context Protocol](https://modelcontextprotocol.io) server that exposes the Codemix Skill engine as a tool — `analyse_codemixed_call` — callable by any MCP-compatible agent (Claude Desktop, Claude Code, Cursor, or custom multi-agent swarms).

---

## Overview

Indian customer support calls routinely switch languages mid-sentence (Hinglish, Tanglish, Benglish). This server provides an open stdio-based MCP interface allowing any AI agent to:
1. Detect intra-sentential language switches.
2. Resolve a single unified intent using a weighted classification algorithm.
3. Extract critical entities (order ID, sentiment, urgency).
4. Mirror the caller's dialect in an agent reply.
5. Draft an English-only ticket for Freshdesk or CRM systems.

The server imports its core engine directly from `../codemix.js`, preserving a strict **Single Source of Truth (SSOT)** with zero duplicated code.

---

## Tool Schema: `analyse_codemixed_call`

### Input Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `utterance` | `string` | **Yes** | The raw customer transcript, in whatever code-mixed language combination they spoke. |

### Return Payload (`content[0].text` JSON)
```json
{
  "intent": "Order not delivered, tracking stale",
  "confidence": "high",
  "languages": ["Hindi", "English"],
  "switch_points": 10,
  "order_id": "48211",
  "sentiment": "concerned",
  "urgency": "medium",
  "reply_mixed": "Sorry hua bhaiya. Maine check kiya — order 48211 stuck at Bhiwandi hub...",
  "ticket_subject": "Delivery delay reported by customer",
  "ticket_summary": "Customer reported: order not delivered, tracking stale...",
  "ticket_action": "Check carrier, offer reship or refund",
  "ticket_priority": "P2"
}
```

---

## Setup & Verification

### 1. Install Dependencies
From the repository root:
```bash
npm run setup
```
Or directly inside `mcp-server/`:
```bash
cd mcp-server
npm install
```

### 2. Verify Over stdio
Run the automated client-server end-to-end test from root:
```bash
npm run verify:mcp
```
This boots `index.js` as an isolated subprocess, connects an MCP client over stdio, verifies tool registration, calls `analyse_codemixed_call` with a sample utterance, and confirms JSON payload schema integrity.

---

## Agent Client Configuration

### Claude Desktop
Add to your `claude_desktop_config.json`:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "codemix-skill": {
      "command": "node",
      "args": [
        "d:/Antigravity_Proj/codemix-skill/mcp-server/index.js"
      ]
    }
  }
}
```

### Cursor IDE
In Cursor **Settings > Features > MCP Servers > Add New MCP Server**:
- **Name**: `codemix-skill`
- **Type**: `command`
- **Command**: `node d:/Antigravity_Proj/codemix-skill/mcp-server/index.js`

---

## Architecture

```
mcp-server/
├── index.js       # MCP Server: registers analyse_codemixed_call, connects stdio (imports ../codemix.js)
├── verify.mjs     # E2E test: boots server subprocess, connects client, tests tool call
├── package.json   # MCP package manifest (@modelcontextprotocol/sdk, zod)
└── README.md      # This document
```
