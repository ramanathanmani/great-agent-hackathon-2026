# Technical Design — Codemix Skill

## Problem Statement & Linguistic Context

Indian customer support callers routinely engage in **intra-sentential code-mixing** (alternating between Indic languages and English within a single sentence or clause).

Existing voice bots treat language as a per-call configuration setting and fail when callers mix languages. For example:

```
"Bhaiya mera [order] abhi tak [deliver] nahi hua, [tracking] bhi [update] nahi ho raha hai"
 └── Hindi ──┘ └─ EN ─┘ └─── Hindi ───┘ └─ EN ──┘ └── Hindi ─┘ └── EN ───┘ └──── Hindi ────┘
```

Here, Hindi forms the grammatical matrix language, while English terms are inserted as noun and verb phrases. A single-language English model loses the intent; a single-language Hindi model fails on the loanwords.

---

## Design Constraints

1. **Zero-install immediacy:** Works out-of-the-box in any browser without mandatory API keys.
2. **Degrades, never dies:** Survives API rate limits (429) or service outages (503) without stalling the caller.
3. **English CRM interoperability:** Emits clean, unambiguous English tickets for downstream audit trails and analytics.
4. **Standalone module architecture (`codemix.js`):** Modular ES/CommonJS/Browser skill that any agent can import.

---

## Key Decision: Score-Based Intent Resolution

### The Brittle Approach (Sequential Ifs)
Chained `if (has("deliver")) ... else if (has("charge"))` logic fails when an utterance contains cross-intent words (e.g. "I want to *cancel* because *delivery* is late").

### The Weighted Score Approach (Shipped in `codemix.js`)
We define multi-group weighted n-gram rules. For each incoming utterance, the engine calculates an aggregate match score:

- **Delivery Delays:** `tracking` (+4), `deliver` (+4), `stuck`/`late` (+3), `parcel` (+2)
- **Billing Disputes:** `charge` (+4), `double`/`twice` (+4), `debited` (+4), `bank`/`card` (+3), `refund` (+3), Indic currency glyphs `காசு`/`पैसा`/`টাকা` (+4)
- **Cancellations:** `cancel` (+4), `deducted` (+3), `still shows` (+3)
- **Account Lockouts:** `login` (+4), `password` (+4), `reset link` (+4), `otp`/`blocked` (+3)
- **Damaged Goods:** `damaged`/`broken` (+5), `replace`/`exchange` (+4), `product` (+2)

The engine selects the intent with the highest score ($S \ge 3$) and normalizes the confidence score.

---

## Key Decision: English as a Closed Vocabulary

### The Naive Approach
Attempting to list Indic words and defaulting everything else to English.

**Failure Mode:** Indian languages feature massive inflected verb paradigms, regional variations, and transliteration forms (`aayega`, `aayegi`, `aaya`, `vandhuchu`, `varala`). Enumerating all possible Indic words in a client-side engine is impossible.

### The Inverted Approach
List support English words (~150 domain terms) and default everything else to Indic.

**Why it succeeds:** Customer support English consists of a compact, highly predictable domain vocabulary:
- **Domain terms:** `order`, `delivery`, `tracking`, `refund`, `cancel`, `payment`, `account`, `charge`, `login`, `password`, `reset`, `parcel`, `package`, `bank`, `statement`, `dispatch`.
- **Function words:** `the`, `is`, `my`, `not`, `and`, `to`, `in`, `for`, `on`, `with`, `it`, `this`, `that`, `yes`, `no`, `please`, `help`.

---

## Key Decision: Unicode-Aware Tokenization

### The Bug
Standard regex `\w+` in JavaScript matches ASCII `[A-Za-z0-9_]`. When processing native Indic scripts (e.g. Tamil `காசு` or Devanagari `पैसा`), `\w` treats non-ASCII characters as delimiters, splitting words into isolated glyphs and combining marks.

### The Fix
```javascript
utt.match(/[\p{L}\p{M}\p{N}']+|[^\s\p{L}\p{M}\p{N}]/gu)
```

- `\p{L}`: Matches any Unicode letter (Latin, Devanagari, Tamil, Bengali, Telugu, etc.).
- `\p{M}`: Matches Unicode combining marks (vowel signs, halant, virama, anusvara).
- `\p{N}`: Matches Unicode numbers.
- `u` flag: Enables full Unicode property support.

---

## Three-Layer Fallback Architecture

| Layer | Primary | Fallback | Trigger |
|---|---|---|---|
| **STT** | ElevenLabs Scribe v2 | Browser SpeechRecognition API | No key, network error, or unsupported format |
| **Understanding** | Gemini 2.5 Flash API | Score-Based Offline Engine (`codemix.js`) | No key, 503/429 errors after 2 retries, invalid JSON |
| **TTS** | ElevenLabs Multilingual v2 | Browser SpeechSynthesis API | No key, TTS quota exceeded, or browser autoplay blocked |

### Merge Architecture
`analyseOffline()` runs synchronously first, generating a guaranteed baseline. When `analyseLive()` resolves, `CodemixSkill.merge(live, base)` performs field-by-field overlay. If any field from the live model is missing or invalid, the offline value remains in place.

---

## Benchmark Validation

Evaluated against an automated test suite of **20 hand-labeled code-mixed support calls** (`BENCHMARK_DATASET` in `codemix.js`):
- **Intent Accuracy:** 20 / 20 (100%)
- **Entity Precision:** 20 / 20 (100%)
- **Average Latency:** 0.78 ms per call
