# Codemix Skill — MCP Server

A standard [Model Context Protocol](https://modelcontextprotocol.io) server that exposes
the codemix engine as a tool — `analyse_codemixed_call` — callable by any MCP-compatible
agent (Claude Desktop, Claude Code, or any other MCP client).

Given a raw caller utterance, it returns one resolved intent, the language mix, switch
points, extracted entities (order ID, sentiment, urgency), a suggested reply in the
caller's own mix, and a drafted English ticket — the same engine behind the web console
(`../index.html`) and the Freshdesk ticket API (`../api/create-ticket.js`), just callable
as a tool over the open MCP standard instead of only rendered on a page.

**Scope note:** this is a generic MCP server, not a Freshworks-specific one. It doesn't
go through Freshworks' own Freddy MCP Client / Marketplace MCP Gateway — that path
requires publishing through the Freshworks Marketplace App Platform, which is a separate,
heavier integration (see `../freshworks-app` history in git for the Agent Studio AI
Action attempt, currently blocked on FDK 10.x availability). This server is immediately
usable by any standard MCP client today.

## Run it

```bash
cd mcp-server
npm install
npm start
```

It speaks MCP over stdio — it won't print anything and will look like it's hanging.
That's normal; it's waiting for a client to connect on stdin/stdout.

## Verify it actually works

```bash
npm run verify
```

This spins the server up as a real subprocess, connects a real MCP client to it, lists
its tools, and calls `analyse_codemixed_call` with a sample utterance — printing the
resolved intent, entities, reply, and ticket draft.

## Use it from an MCP client

For Claude Desktop, add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "codemix-skill": {
      "command": "node",
      "args": ["/absolute/path/to/codemix-skill/mcp-server/index.js"]
    }
  }
}
```

Restart the client, and `analyse_codemixed_call` becomes available as a tool.

## Structure

```
mcp-server/
├── index.js       # The MCP server: registers analyse_codemixed_call, connects stdio
├── codemix.js      # Copy of the root skill engine (self-contained, no relative import outside this dir)
├── verify.mjs      # Real end-to-end check: spawns the server, calls the tool, prints the result
└── package.json
```

`codemix.js` is a copy, not a symlink, so this directory can be run or packaged on its
own. If the root `codemix.js` changes, copy it in again:

```bash
cp ../codemix.js codemix.js
```
