# Codemix Skill — Freshworks Agent Studio AI Action

A Platform 3.0 custom app that exposes `codemix.js` as an **AI Action** —
`analyseCodemixedCall` — so an agent built in Freddy AI Agent Studio can call the
skill directly during a live conversation, instead of only seeing it rendered in
the demo console (`index.html`).

## What it does

Given a raw caller utterance, it returns one resolved intent, the language mix,
switch points, extracted entities (order ID, sentiment, urgency), a suggested
reply in the caller's own mix, and a drafted English ticket (subject, summary,
action, priority) — the exact same engine behind the web console, just callable
as a tool.

## Structure

```
freshworks-app/
├── manifest.json              # Platform 3.0 app manifest
├── actions.json                # Declares the analyseCodemixedCall AI Action
└── server/
    ├── server.js                # Callback implementation
    ├── codemix.js                # Copy of the root skill engine (self-contained for packaging)
    └── test_data/
        └── analyseCodemixedCall.json   # Sample input for local Simulate testing
```

`server/codemix.js` is a copy, not a symlink — `fdk pack` only bundles files inside
this directory, so the engine has to live here too. If you change the root
`codemix.js`, copy it in again before packing:

```bash
cp ../codemix.js server/codemix.js
```

## Install it in your own Freshworks account (no Marketplace review needed)

1. **Install the CLI** (Node.js 18.13+ required):
   ```bash
   npm install https://cdn.freshdev.io/fdk/latest.tgz -g
   fdk
   ```
2. **Run it locally** from this directory:
   ```bash
   cd freshworks-app
   fdk run
   ```
3. Open `https://localhost:10001/web/test`, select **actions** from the dropdown,
   choose `analyseCodemixedCall`, and click **Simulate** — it uses
   `server/test_data/analyseCodemixedCall.json` as input. Check the terminal for
   errors; the button shows **Success** or **Failed**.
4. **Validate**:
   ```bash
   fdk validate
   ```
5. **Package**:
   ```bash
   fdk pack
   ```
6. **Upload** the generated zip in the [Freshworks Developer
   Portal](https://developers.freshworks.com/) as a **Custom app** (not a public
   Marketplace submission). When asked *"Where can this app's actions be
   used?"*, choose **AI Agent Studio**.
7. Finish the install flow into your own account (`citchennai-assist`). The
   action then appears as a callable step when you build or edit an agent flow
   in Agent Studio.

No OAuth or installation parameters are needed — the action is pure computation,
it doesn't call any external API itself.
