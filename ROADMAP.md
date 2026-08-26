# Roadmap — Codemix Skill

## Current state

Working modular application with:
- ✅ Standalone `codemix.js` skill module (importable in any agent or browser)
- ✅ Score-based weighted intent classification engine
- ✅ Automated 20-sentence benchmark evaluation suite
- ✅ Token-level language tagging (9 Indic scripts + romanized)
- ✅ Code-mixed voice reply synthesis + clean English CRM ticket creation
- ✅ Three-layer fallback (Gemini → offline, ElevenLabs → browser, partial → merge)
- ✅ Live audio recording via ElevenLabs Scribe v2 + Multilingual v2 TTS

---

## Phase 1 — Production readiness

| Item | Why | Effort |
|-|-|-|
| **Backend proxy for API keys** | Keys are currently in the browser. ElevenLabs docs explicitly say don't ship keys to the client. A Cloudflare Worker or Express proxy would handle this. | 2–4 hours |
| **Proper HTML5 structure** | ~~Missing `<!DOCTYPE html>`, `<head>`, `<body>`~~ ✅ Fixed | Done |
| **Browser TTS language matching** | Currently hardcoded to `ta-IN`. Should match detected language. | 30 min |

## Phase 2 — Accuracy & validation

| Item | Why | Effort |
|-|-|-|
| **Benchmark on labelled dataset** | We have not measured accuracy. This is the honest gap. Datasets like GLUECoS, LinCE, or SAIL exist for code-mixed NLP. | 1–2 days |
| **Expand English vocabulary** | Mine a real support transcript corpus for missing English words in the offline engine. | 2 hours |
| **Multi-intent handling** | Currently resolves one intent per utterance. Real callers often have compound complaints. | 1 day |

## Phase 3 — Integration

| Item | Why | Effort |
|-|-|-|
| **Real order/CRM API** | Replace the 3-order fixture with live Freshworks/Shopify/WooCommerce lookup. | 1 day |
| **Freshworks Agent Studio deployment** | Package as an installable skill in the Freshworks marketplace. | 2–3 days |
| **Webhook for ticket creation** | Push the English ticket to Freshdesk/Zendesk via API instead of just rendering it. | 4 hours |

## Phase 4 — Scale

| Item | Why | Effort |
|-|-|-|
| **Wider Indic language testing** | Validated: Hindi, Tamil, Bengali. Untested: Telugu, Kannada, Malayalam, Gujarati, Punjabi, Odia. | 1 week |
| **Streaming STT** | Replace batch recording with streaming transcription for real-time tagging. | 2–3 days |
| **Analytics dashboard** | Track language mix distribution, switch frequency, intent accuracy over time. | 3–5 days |
