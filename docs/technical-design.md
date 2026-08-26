# Technical Design — Codemix Skill

## Problem statement

Indian support callers switch languages *inside* a sentence. Existing voice agents treat language as a per-call setting and break when the caller switches mid-thought.

## Design constraints

1. **Must work with zero setup** — a judge opens `index.html` and it works
2. **Must degrade, never die** — venue wifi is unreliable
3. **Must produce English records** — downstream systems read one language
4. **Must be a skill, not a bot** — reusable by any agent on the platform

## Key decision: English as a closed vocabulary

### The wrong approach (what we tried first)
List Indic words → default everything else to English.

**Why it failed:** Any Tamil/Hindi word we hadn't listed got tagged as English. The Indic vocabulary is effectively infinite due to inflection, transliteration variants, and loanwords.

### The right approach (what we shipped)
List English words (~150 support vocabulary) → default everything else to Indic.

**Why it works:** Support English is small and predictable. The words a customer uses when talking to support — `order`, `delivery`, `refund`, `tracking`, `cancel`, `payment`, `account` — plus function words (`the`, `is`, `my`, `not`) — cover 95%+ of English in a support call.

**Trade-off:** Rare English words not in the list get tagged Indic. This only affects the offline engine. The Gemini live path doesn't have this limitation.

## Key decision: Unicode-aware tokenization

### The bug
Our first tokenizer used `\w+` to split words. `\w` in JavaScript matches `[A-Za-z0-9_]` — it's ASCII-only.

Tamil text like `காசு` (money) got split into individual characters: `க`, `ா`, `சு` — each tagged separately. The system reported zero language switches on a sentence that had four.

### The fix
```javascript
utt.match(/[\p{L}\p{M}\p{N}']+|[^\s\p{L}\p{M}\p{N}]/gu)
```

- `\p{L}` — any Unicode letter (Latin, Tamil, Devanagari, etc.)
- `\p{M}` — combining marks (vowel signs, nasalization)
- `\p{N}` — any Unicode digit
- The `u` flag enables Unicode mode

This keeps Tamil words intact and correctly counts switch points.

## Key decision: Three-layer fallback

### The incident
During development, Gemini returned a 503 (model overloaded). The demo screen went blank. One bad wifi connection at the hackathon venue would have killed the demo on stage.

### The design
Every layer has an independent fallback:

| Layer | Primary | Fallback |
|-|-|-|
| STT | ElevenLabs Scribe v2 | Browser SpeechRecognition API |
| Understanding | Gemini 3.7 Flash | Deterministic offline engine |
| TTS | ElevenLabs Multilingual v2 | Browser speechSynthesis API |

The `merge()` function is the critical piece: it takes a potentially incomplete live result and fills any missing fields from the guaranteed-complete offline result. The screen never goes blank.

## Gemini prompt engineering

The prompt requests structured JSON with specific constraints:
- **Token-level tagging** with `hi`/`en`/`xx` labels
- **Language identification** naming the actual Indic language
- **Reply must mirror the caller's mix** — not translate to one language
- **Ticket must be pure English** — for downstream systems
- **Max token limits** on each field to prevent verbose output

The `responseMimeType: "application/json"` parameter forces Gemini to return valid JSON, avoiding regex-based parsing of freeform text.
