# Devpost submission 

Fill in the bracketed bits. Everything else is ready.

\---

## Project name

Codemix Skill

## Tagline

The caller switches language mid-sentence. The ticket stays in English.

## Track

Track 2 — Platform Agent Skills & Knowledge

## Video Demo Link

[https://youtu.be/aGfRv_katxU](https://youtu.be/aGfRv_katxU)

## Live Demo URL

[https://codemix-skill.vercel.app/](https://codemix-skill.vercel.app/)

---

## Problem

Indian customers don't speak one language on a support call. They start a sentence in
Tamil and finish it in English. They switch to Hindi when they get frustrated. They drop
English product names into an Indic sentence.

Voice agents today advertise 70+ languages. But language support means picking one
language per call. The moment a caller switches mid-sentence, the agent mishears the
intent or asks the customer to repeat. That is where support calls die.

This hits Indian SMBs hardest. Their customers are the least likely to stick to one
language, and they are the least able to staff a large support team.

## Solution

We built a code-mixing skill for support agents. It sits between speech and intent.

* The caller speaks naturally, mixing languages
* The skill detects switch points inside a single sentence, not just the call language
* It builds one intent from the mixed speech
* The agent takes the action and replies in the caller's mix
* The ticket record is written in English, so the support team can read and audit it

The key idea: the customer speaks how they speak, and the company's records stay in
one language.

It ships as a reusable skill, not a single bot. Any agent on the platform can call it —
support, sales, HR — and stops breaking when the customer switches language.

## How we built it

* ElevenLabs Scribe v2 for listening, because it doesn't force a single language up front
* Gemini 3.7 Flash for the understanding layer — token-level language tagging, intent,
and the English ticket
* ElevenLabs Multilingual v2 for the spoken reply
* Freshworks Agent Studio as the agent surface
* A deterministic fallback engine running in the browser

## Challenges

Two real ones, both fixed:

Our first tokenizer used a standard word pattern, which only covers Latin characters. It
shredded Tamil script into single characters and reported zero language switches. We
rewrote it to be Unicode-aware and detect the actual script block of each character.

We also had the language detection backwards. We listed Indic words and defaulted
everything else to English, so any Tamil word we hadn't listed got tagged English. Support
English is a small, predictable vocabulary and Indian languages are not — so we made
English the closed list and default everything else to Indic.

## What we learned

We hit a Gemini 503 mid-build and the demo went blank. So every step now degrades instead
of failing: the model retries, then falls back to a deterministic engine in the browser;
ElevenLabs falls back to the browser voice; an incomplete model response fills its gaps
from the built-in result. A demo that dies on venue wifi is not a demo.

## What's next

* Measure accuracy on a labelled code-mixed set. We haven't done this yet.
* Move both API keys to a backend before any public deployment.
* Connect a real order system instead of the fixture.
* Extend coverage beyond the language pairs we've tested.

\---

## Why should we select you

We are two engineers who build for callers like our own families.

Before we wrote any code, we checked whether this already existed. Warm-transfer briefings,
AI roleplay trainers, stale-knowledge detectors — we found shipped products for each of the
obvious ideas and dropped them. What we could not find was an agent that handles a language
switch *inside* a sentence and still keeps a clean English record. That gap is what we built.

We shipped a working demo, not a mockup. In one day it went from idea to a live console that
records real speech through ElevenLabs Scribe, tags every word by language, resolves one
intent, acts on it, replies in the caller's own mix, and writes an English ticket.

Building it taught us the problem is harder than it looks. Our first tokenizer used a standard
word pattern and shredded Tamil script into single characters — it reported zero language
switches on a sentence with four. We also had the detection backwards: we listed Indic words
and defaulted the rest to English, so any Tamil word we had not listed came out English. Support
English is a small closed vocabulary and Indian languages are not, so we inverted it. Both bugs
are the kind a judge testing Tamil would have hit in ten seconds. We found them first.

We also hit a Gemini 503 mid-build and watched the demo go blank. Every step now degrades
instead of failing — the model retries, then falls back to a deterministic engine running in
the browser; ElevenLabs falls back to the browser voice. A demo that dies on venue wifi is not
a demo, and we would rather learn that today than on stage.

What we have not done: measured accuracy on a labelled set. We would rather tell you that than
invent a number.


\---

## Team

* Ramanathan 
* Sadhana 

## Links

* Demo video: https://youtu.be/aGfRv\_katxU

