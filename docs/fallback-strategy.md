# Fallback Strategy — Codemix Skill

## Principle

**Every step degrades instead of failing.** The demo must work on venue wifi, with or without API keys, with or without a stable connection to external services.

## Layer 1: Speech-to-Text

| Mode | Technology | Trigger |
|-|-|-|
| **Live** | ElevenLabs Scribe v2 | ElevenLabs API key present |
| **Fallback** | Browser SpeechRecognition API | No key, or Scribe error |
| **Manual** | Text input in textarea | Always available |

**Scribe advantages:** Doesn't force a single language. Handles code-mixed audio natively. Returns clean text with non-speech tags (`[music]`, `[laughter]`) that we strip.

**Browser fallback limitations:** `SpeechRecognition.lang` must be set to one language (we use `hi-IN`). It will miss Tamil/Bengali words. But it's better than nothing.

## Layer 2: Understanding

| Mode | Technology | Trigger |
|-|-|-|
| **Live** | Gemini 3.6 Flash API | Gemini key present and API responding |
| **Retry** | Same, with exponential backoff | 503 or 429 response |
| **Fallback** | Deterministic offline engine | No key, 3 failed retries, or invalid JSON |
| **Merge** | `merge(live, base)` | Always runs — fills gaps in live result |

### Retry logic
```
Attempt 0 → immediate
Attempt 1 → wait 1,200ms
Attempt 2 → wait 4,800ms
After 3 failures → use offline result
```

Only 503 (overloaded) and 429 (rate limited) trigger retries. Other errors (401, 400, etc.) fail immediately.

### Merge logic
The offline engine always runs first, producing a guaranteed-complete result. If Gemini succeeds, `merge()` overlays every non-empty field from the live result onto the base. If Gemini returns a partial result (e.g., missing `ticket_en.action`), the offline value fills the gap.

**Result:** The screen is never blank. The worst case is the offline result, which is deterministic and always correct for its keyword patterns.

## Layer 3: Text-to-Speech

| Mode | Technology | Trigger |
|-|-|-|
| **Live** | ElevenLabs Multilingual v2 | ElevenLabs key present |
| **Fallback** | Browser `speechSynthesis` API | No key, TTS error, or autoplay blocked |
| **Silent** | Audio player shown for manual play | Browser blocks autoplay |

**ElevenLabs advantages:** Natural voice quality across code-mixed text. Handles Tamil + English in the same utterance.

**Browser fallback limitations:** Quality is poor. Language is currently hardcoded to `ta-IN` (to be fixed — should match detected language).

## What this means for judging

A judge can test the demo in four modes:

| Keys provided | What works |
|-|-|
| None | Offline engine + browser voice — fully functional |
| Gemini only | Live understanding + browser voice |
| ElevenLabs only | Offline engine + live voice + live recording |
| Both | Full pipeline — live everything |

All four modes produce the same output structure: tagged utterance, intent, reply, English ticket.
