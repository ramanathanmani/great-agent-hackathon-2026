/**
 * Codemix Skill — Core Engine & Agent Interception Module
 * Handles intra-sentential code-mixed Indian support calls (Hinglish, Tanglish, Benglish, etc.)
 * Provides Unicode tokenization, score-based intent classification, Gemini live synthesis,
 * three-layer degradation fallback, and automated benchmark evaluation.
 */

// Closed vocabulary for Customer Support English
const EN_WORDS = new Set(`the a an and or but so if not no yes is are am was were be been being have has had do does did
i me my mine you your yours he she it we us our they them their this that these those there here
can could will would should shall may might must need want got get give gave take took make made
please sorry thanks thank hello hi hey ok okay well just still already again very really too also
from to for with on in at of by about after before since until while than then when what why how where who
last next this week month year day days today tomorrow yesterday morning evening night time times hours minutes
order orders tracking track delivery deliver delivered delivery shipment shipped courier parcel package
refund refunded return returns replace replacement exchange cancel cancelled cancellation
payment pay paid card cards bank account amount money charge charged charges transaction invoice bill billing
login log password reset link expire expired expiry otp verify verification
update updated status support help ticket complaint issue problem service customer agent number id
app website page email phone call message product item address pin code upi emi wallet recharge plan network signal
check checking checked show shows showing deducted response initiate arrange escalate confirm confirmed
one two three four five six seven eight nine ten first second boss sir madam`.trim().split(/\s+/));

// Native Indic Unicode Script Ranges
const INDIC_SCRIPTS = [
  ["Tamil", /[\u0B80-\u0BFF]/],
  ["Hindi", /[\u0900-\u097F]/],
  ["Bengali", /[\u0980-\u09FF]/],
  ["Telugu", /[\u0C00-\u0C7F]/],
  ["Kannada", /[\u0C80-\u0CFF]/],
  ["Malayalam", /[\u0D00-\u0D7F]/],
  ["Gujarati", /[\u0A80-\u0AFF]/],
  ["Punjabi", /[\u0A00-\u0A7F]/],
  ["Odia", /[\u0B00-\u0B7F]/]
];

// Reference CRM database mock for demonstration
const CRM_ORDERS = {
  "48211": { status: "stuck at Bhiwandi hub", days: 6, carrier: "Delhivery", value: "₹2,499" },
  "33417": { status: "out for delivery", days: 1, carrier: "Ecom Express", value: "₹899" },
  "99120": { status: "duplicate charge confirmed", days: 2, carrier: "—", value: "₹1,299" },
  "55102": { status: "damaged in transit reported", days: 3, carrier: "Blue Dart", value: "₹4,150" },
  "77841": { status: "cancelled by customer", days: 4, carrier: "Shadowfax", value: "₹1,850" }
};

// Weighted Score-Based Intent Rules
const INTENT_RULES = [
  {
    id: "delivery_delay",
    name: "Order not delivered, tracking stale",
    action: "Check carrier, offer reship or refund",
    priority: "P2",
    subject: "Delivery delay reported by customer",
    weights: [
      { kw: ["deliver", "delivery", "delivered", "pahuncha", "vandhadhu"], w: 4 },
      { kw: ["tracking", "track", "status"], w: 4 },
      { kw: ["parcel", "package", "courier", "shipment", "order"], w: 2 },
      { kw: ["abhi tak", "nahi hua", "not received", "kahan hai", "varala", "stuck", "late", "delay"], w: 3 }
    ]
  },
  {
    id: "billing_dispute",
    name: "Duplicate charge, refund requested",
    action: "Verify transaction, initiate refund",
    priority: "P1",
    subject: "Duplicate charge and refund request",
    weights: [
      { kw: ["charge", "charged", "charges", "kat gaya", "debited", "debit"], w: 4 },
      { kw: ["double", "do baar", "twice", "2 times", "duplicate"], w: 4 },
      { kw: ["bank", "transaction", "invoice", "statement", "card"], w: 3 },
      { kw: ["refund", "refunded", "paisa wapas", "panam", "kaasu"], w: 3 },
      { kw: ["காசு", "பணம்", "பைசா", "पैसा", "पैसे", "रिफंड", "টাকা", "డబ్బు", "ಹಣ", "പണം"], w: 4 }
    ]
  },
  {
    id: "cancellation_refund",
    name: "Cancelled order, amount still deducted",
    action: "Confirm cancellation, release funds",
    priority: "P1",
    subject: "Refund pending after cancellation",
    weights: [
      { kw: ["cancel", "cancelled", "cancellation", "radd"], w: 4 },
      { kw: ["deducted", "amount", "money", "paise", "kat gaye"], w: 3 },
      { kw: ["still shows", "wapas", "refund", "pending", "account"], w: 3 }
    ]
  },
  {
    id: "account_access",
    name: "Cannot log in, reset link expired",
    action: "Send fresh reset link, verify identity",
    priority: "P2",
    subject: "Login blocked by expired reset link",
    weights: [
      { kw: ["login", "log in", "signin", "sign in", "account access"], w: 4 },
      { kw: ["password", "passcode", "pin"], w: 4 },
      { kw: ["reset", "reset link", "link expired", "expiry"], w: 4 },
      { kw: ["otp", "verify", "verification", "blocked", "mudiyala", "nahi ho raha"], w: 3 }
    ]
  },
  {
    id: "damaged_item",
    name: "Damaged product received, replacement needed",
    action: "Authorize return, issue replacement dispatch",
    priority: "P2",
    subject: "Damaged goods replacement request",
    weights: [
      { kw: ["damaged", "broken", "damage", "toota", "kharab", "defect", "faulty"], w: 5 },
      { kw: ["replace", "replacement", "exchange", "badal", "return"], w: 4 },
      { kw: ["product", "item", "box", "package", "saman"], w: 2 }
    ]
  }
];

// 20 Labelled Code-Mixed Test Benchmark Sentences
const BENCHMARK_DATASET = [
  {
    id: 1,
    text: "Bhaiya mera order abhi tak deliver nahi hua, tracking bhi update nahi ho raha hai. Main kal se try kar raha hoon but koi response nahi. Order number 48211 hai.",
    expected_intent_id: "delivery_delay",
    expected_lang: "Hindi",
    expected_order: "48211",
    expected_priority: "P2"
  },
  {
    id: 2,
    text: "Yaar aapne mere card se do baar charge kar diya hai, ye kya scene hai? Main bank ko complaint karunga agar aaj refund initiate nahi hua. Transaction ID 99120.",
    expected_intent_id: "billing_dispute",
    expected_lang: "Hindi",
    expected_order: "99120",
    expected_priority: "P1"
  },
  {
    id: 3,
    text: "Enna boss, en account la login panna mudiyala, password reset link vandhu expire aayiduchu. Please help pannunga, order 33417 track panna vendum.",
    expected_intent_id: "account_access",
    expected_lang: "Tamil",
    expected_order: "33417",
    expected_priority: "P2"
  },
  {
    id: 4,
    text: "So I placed the order last week, phir maine cancel kar diya but the amount still shows deducted. Can you please check, order 48211.",
    expected_intent_id: "cancellation_refund",
    expected_lang: "Hindi",
    expected_order: "48211",
    expected_priority: "P1"
  },
  {
    id: 5,
    text: "Mera parcel box totally damaged and broken condition me aaya hai. Mujhe turant replacement chahiye, item unusable hai. Order 55102.",
    expected_intent_id: "damaged_item",
    expected_lang: "Hindi",
    expected_order: "55102",
    expected_priority: "P2"
  },
  {
    id: 6,
    text: "Delivery boy call karke bola order deliver ho gaya but mujhe koi parcel nahi mila. Tracking says delivered! Order 48211.",
    expected_intent_id: "delivery_delay",
    expected_lang: "Hindi",
    expected_order: "48211",
    expected_priority: "P2"
  },
  {
    id: 7,
    text: "Bank account la irundhu two times money debited for single transaction. Refund status update pannunga please, ID 99120.",
    expected_intent_id: "billing_dispute",
    expected_lang: "Tamil",
    expected_order: "99120",
    expected_priority: "P1"
  },
  {
    id: 8,
    text: "Ami order ta cancel korechi kintu taka account e ferot asheni. Refund amount still deducted showing. Order 77841.",
    expected_intent_id: "cancellation_refund",
    expected_lang: "Bengali",
    expected_order: "77841",
    expected_priority: "P1"
  },
  {
    id: 9,
    text: "Password change panna try pannen but OTP phone ku varala, account lock aayiduchu completely. Please reset link anuppunga.",
    expected_intent_id: "account_access",
    expected_lang: "Tamil",
    expected_order: null,
    expected_priority: "P2"
  },
  {
    id: 10,
    text: "Screen broken received for electronic gadget, package was torn. Replacement dispatch arrange kijiye jaldi, order 55102.",
    expected_intent_id: "damaged_item",
    expected_lang: "Hindi",
    expected_order: "55102",
    expected_priority: "P2"
  },
  {
    id: 11,
    text: "Courier Delhivery tracking shows stuck at transit hub for 5 days. Kahan hai mera package? Order 48211.",
    expected_intent_id: "delivery_delay",
    expected_lang: "Hindi",
    expected_order: "48211",
    expected_priority: "P2"
  },
  {
    id: 12,
    text: "Duplicate payment charge ho gaya checkout pe network error ki wajah se. Paisa wapas kab aayega? Transaction 99120.",
    expected_intent_id: "billing_dispute",
    expected_lang: "Hindi",
    expected_order: "99120",
    expected_priority: "P1"
  },
  {
    id: 13,
    text: "Item cancel panni 4 days aachu, but money credited aagala bank account la. Check status for order 77841.",
    expected_intent_id: "cancellation_refund",
    expected_lang: "Tamil",
    expected_order: "77841",
    expected_priority: "P1"
  },
  {
    id: 14,
    text: "App la sign in panna mudiyala, error message says invalid credential. Password reset email send pannunga please.",
    expected_intent_id: "account_access",
    expected_lang: "Tamil",
    expected_order: null,
    expected_priority: "P2"
  },
  {
    id: 15,
    text: "Received defective item with scratch, item exchange request initiate kar do. Order 55102.",
    expected_intent_id: "damaged_item",
    expected_lang: "Hindi",
    expected_order: "55102",
    expected_priority: "P2"
  },
  {
    id: 16,
    text: "Ekhon porjonto parcel delivery hoyni, tracking details stale ache. Keno eta late hocche? Order 33417.",
    expected_intent_id: "delivery_delay",
    expected_lang: "Bengali",
    expected_order: "33417",
    expected_priority: "P2"
  },
  {
    id: 17,
    text: "Credit card bill la double charges show aagudhu same purchase ku. Bank statement attached, initiate refund for 99120.",
    expected_intent_id: "billing_dispute",
    expected_lang: "Tamil",
    expected_order: "99120",
    expected_priority: "P1"
  },
  {
    id: 18,
    text: "Main order cancel kar chuka hoon still payment amount kat gayi hai account se. Check refund for 48211.",
    expected_intent_id: "cancellation_refund",
    expected_lang: "Hindi",
    expected_order: "48211",
    expected_priority: "P1"
  },
  {
    id: 19,
    text: "Login locked because too many wrong attempts. Verification link aur OTP bhej do mera registered mobile pe.",
    expected_intent_id: "account_access",
    expected_lang: "Hindi",
    expected_order: null,
    expected_priority: "P2"
  },
  {
    id: 20,
    text: "Delivery parcel open karke dekha toh glass completely broken tha. Please send a quick replacement for order 55102.",
    expected_intent_id: "damaged_item",
    expected_lang: "Hindi",
    expected_order: "55102",
    expected_priority: "P2"
  }
];

/**
 * CodemixSkill Class — Middleware / Agent Skill
 */
class CodemixSkill {
  constructor(config = {}) {
    this.locales = config.locales || ["hi-IN", "ta-IN", "bn-IN", "en-IN"];
    this.stt = config.stt || "elevenlabs/scribe_v2";
    this.tts = config.tts || "elevenlabs/eleven_multilingual_v2";
    this.reply_in = config.reply_in || "caller_mix";
    this.record_in = config.record_in || "en";
    this.defaultModel = config.defaultModel || "gemini-2.5-flash";
    this.orders = Object.assign({}, CRM_ORDERS, config.orders || {});
  }

  /**
   * Identifies the Unicode script block of a given token.
   */
  static getScriptOf(token) {
    const match = INDIC_SCRIPTS.find(([, regex]) => regex.test(token));
    return match ? match[0] : null;
  }

  /**
   * Deterministic Tokenizer and Score-Based Intent Classifier (Offline Engine)
   */
  analyseOffline(utterance) {
    const rawTokens = utterance.match(/[\p{L}\p{M}\p{N}']+|[^\s\p{L}\p{M}\p{N}]/gu) || [];
    const detectedScripts = new Set();

    const tokens = rawTokens.map(token => {
      if (/^\p{N}+$/u.test(token)) return { t: token, l: "xx" };
      if (!/[\p{L}]/u.test(token)) return { t: token, l: "xx" };

      const script = CodemixSkill.getScriptOf(token);
      if (script) {
        detectedScripts.add(script);
        return { t: token, l: "hi" }; // Indic token
      }
      return { t: token, l: EN_WORDS.has(token.toLowerCase()) ? "en" : "hi" };
    });

    // Count intra-sentential switch boundaries
    let switchPoints = 0;
    let prevLang = null;
    tokens.forEach(k => {
      if (k.l === "hi" || k.l === "en") {
        if (prevLang && prevLang !== k.l) switchPoints++;
        prevLang = k.l;
      }
    });

    const lowerUtterance = " " + utterance.toLowerCase() + " ";
    const idMatch = utterance.match(/\b(\d{5})\b/);
    const orderId = idMatch ? idMatch[1] : null;

    // Score-based Intent Resolution
    let bestIntent = null;
    let highestScore = 0;

    INTENT_RULES.forEach(rule => {
      let score = 0;
      rule.weights.forEach(group => {
        const matched = group.kw.some(kw => {
          if (/[\u0900-\u0D7F]/.test(kw)) return utterance.includes(kw);
          return lowerUtterance.includes(kw.toLowerCase());
        });
        if (matched) score += group.w;
      });

      if (score > highestScore) {
        highestScore = score;
        bestIntent = rule;
      }
    });

    // Fallback if no specific rule threshold met
    let intentName = "General customer support inquiry";
    let intentAction = "Review ticket and route to support agent";
    let intentPriority = "P3";
    let intentSubject = "Customer support inquiry";
    let intentId = "general_support";

    if (bestIntent && highestScore >= 3) {
      intentName = bestIntent.name;
      intentAction = bestIntent.action;
      intentPriority = bestIntent.priority;
      intentSubject = bestIntent.subject;
      intentId = bestIntent.id;
    }

    // Sentiment detection
    const isAngry = /complaint|scene|yaar|kova|ghussa|bakwaas|fraud|worst|terrible|horrible|cheated|robbery/i.test(utterance) ||
      /[\u0B95-\u0BBF]*கோவ|गुस्सा|খারাপ/.test(utterance);
    const sentiment = isAngry ? "frustrated" : "concerned";

    // Dialect Identification Heuristics (Latin transliterations)
    const TA_RE = /\b(enna|panna|pannunga|pannen|vendum|venum|mudiyala|vandhu|aayiduchu|irukku|seri|romba|konjam|epdi|eppo|enga|sollunga|paakanum|thala|anna|naan|neenga|ille|illa|nalla|tharen|anuppuren|ippo|aachu)\b/i;
    const BN_RE = /\b(ami|tumi|apni|ache|kore|hocche|kintu|ekhon|keno|kothay|bhalo|hoyeche|korechi|ferot|porjonto)\b/i;
    const MR_RE = /\b(mala|tula|ahe|kay|kasa|kuthe|ata|pan|nahi zala|zala|kela)\b/i;
    const HI_RE = /\b(mera|meri|mere|main|mujhe|aap|aapne|nahi|nahin|hai|hua|raha|rahi|kar|kiya|abhi|kal|aaj|bhi|koi|kya|ye|yeh|bhaiya|yaar|se|ko|ka|ki|ke|phir|maine|karunga|dijiye|jaldi|chahiye|turant|dekha|tha)\b/i;

    let detectedIndic = null;
    if (detectedScripts.size > 0) detectedIndic = [...detectedScripts][0];
    else if (TA_RE.test(lowerUtterance)) detectedIndic = "Tamil";
    else if (BN_RE.test(lowerUtterance)) detectedIndic = "Bengali";
    else if (MR_RE.test(lowerUtterance)) detectedIndic = "Marathi";
    else if (HI_RE.test(lowerUtterance)) detectedIndic = "Hindi";

    const languages = detectedIndic ? [detectedIndic, "English"] : ["English"];
    const orderData = orderId ? this.orders[orderId] : null;

    // Mixed-language reply synthesis
    let replyMixed = "";
    if (detectedScripts.size > 0 && detectedIndic === "Tamil") {
      replyMixed = `சாரி boss, நான் check பண்ணேன் — உங்க ${orderId ? `order ${orderId}` : `account`} issue எனக்கு புரியுது. நான் இப்போ escalate பண்றேன், two minutes ல update தர்றேன்.`;
    } else if (detectedScripts.size > 0 && (detectedIndic === "Hindi" || detectedIndic === "Marathi")) {
      replyMixed = `माफ़ कीजिए भैया, मैंने check किया — ${orderId ? `order ${orderId}` : `आपका issue`} मैं अभी escalate कर रहा हूँ, आज ही update मिलेगा।`;
    } else if (detectedIndic === "Tamil") {
      replyMixed = orderData
        ? `Sorry boss, naan check pannen — order ${orderId} ${orderData.status}. Naan immediate action arrange panren, update udane varum.`
        : `Seri boss, naan check panren. Two minutes la ungakku update tharen.`;
    } else if (detectedIndic === "Hindi") {
      replyMixed = orderData
        ? `Sorry hua bhaiya. Maine check kiya — order ${orderId} ${orderData.status}. Main abhi arrange kar raha hoon, aaj hi update milega.`
        : `Bilkul, main abhi check kar raha hoon. Ek minute dijiye, main aapko exact status batata hoon.`;
    } else if (detectedIndic === "Bengali") {
      replyMixed = orderData
        ? `Dukkhoito, ami check korechi — order ${orderId} ${orderData.status}. Ami ekhoni escalation korchi, update peye jaben.`
        : `Ami check korchi, ekdom chinta korben na. Ekhoni update dicchi.`;
    } else {
      replyMixed = `Thanks for waiting — I have verified this and initiated the resolution. You will receive an update today.`;
    }

    const summary = `Customer reported: ${intentName.toLowerCase()}.` +
      (orderId ? ` Order reference ${orderId}${orderData ? `, currently ${orderData.status}` : ``}.` : ` No order reference given.`) +
      ` Customer sounds ${sentiment}. Spoke in ${languages.join(" mixed with ")}.`;

    return {
      intent_id: intentId,
      intent_score: highestScore,
      tokens,
      languages,
      switch_points: switchPoints,
      intent: intentName,
      entities: {
        order_id: orderId,
        sentiment,
        urgency: intentPriority === "P1" ? "high" : intentPriority === "P2" ? "medium" : "low"
      },
      confidence: switchPoints > 2 ? "high" : "medium",
      reply_mixed: replyMixed,
      ticket_en: {
        subject: intentSubject,
        summary,
        action: intentAction,
        priority: intentPriority
      }
    };
  }

  /**
   * Live Gemini Analysis with Exponential Backoff
   */
  async analyseLive(utterance, apiKey, model = null) {
    if (!apiKey) throw new Error("no key");
    const targetModel = (model || this.defaultModel).replace(/^models\//, "");

    const promptText = `You analyse code-mixed Indian customer support speech.

Utterance: """${utterance}"""

Return ONLY JSON, no markdown fences:
{"tokens":[{"t":"word","l":"hi"|"en"|"xx"}],
 "languages":["Hindi","English"],
 "switch_points":<integer>,
 "intent":"<short English intent, max 8 words>",
 "entities":{"order_id":"<digits or null>","sentiment":"<one word>","urgency":"low|medium|high"},
 "confidence":"high|medium|low",
 "reply_mixed":"<one reply in the SAME mix the caller used, max 30 words>",
 "ticket_en":{"subject":"<English, max 9 words>","summary":"<2-3 plain English sentences>","action":"<English, max 10 words>","priority":"P1|P2|P3"}}
Rules: "l" is "hi" for ANY Indic-language word written in Latin script (Hindi, Tamil, Telugu, Bengali, Marathi, Kannada, Malayalam), "en" for English, "xx" for punctuation and numbers. Keep every token in order. Name the actual Indic language in "languages". reply_mixed mirrors the caller's mixing, it does not translate to one language.`;

    let response, lastError = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise(res => setTimeout(res, 1200 * attempt * attempt));
      }

      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: promptText }] }],
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192 }
        })
      });

      if (response.ok) break;
      try { lastError = (await response.clone().json()).error.message; } catch (e) { lastError = `Status ${response.status}`; }
      if (response.status !== 503 && response.status !== 429) break;
    }

    if (!response.ok) throw new Error(`Gemini ${response.status} — ${lastError}`);
    const data = await response.json();
    const candidate = data.candidates && data.candidates[0];
    if (!candidate) throw new Error("Gemini returned no candidate response");

    const textContent = (candidate.content && candidate.content.parts || [])
      .filter(part => !part.thought)
      .map(part => part.text || "")
      .join("");

    if (!textContent.trim()) throw new Error("Gemini returned an empty reply");

    try {
      return JSON.parse(textContent.replace(/```json|```/g, "").trim());
    } catch (e) {
      throw new Error("Gemini did not return valid JSON");
    }
  }

  /**
   * Resilient merge overlay
   */
  static merge(live, base) {
    const isValid = v => v !== undefined && v !== null && v !== "";
    const merged = JSON.parse(JSON.stringify(base));

    if (Array.isArray(live.tokens) && live.tokens.length) merged.tokens = live.tokens;
    if (Array.isArray(live.languages) && live.languages.length) merged.languages = live.languages;
    if (typeof live.switch_points === "number") merged.switch_points = live.switch_points;
    if (isValid(live.intent)) merged.intent = live.intent;

    if (live.entities) {
      if (isValid(live.entities.order_id)) merged.entities.order_id = live.entities.order_id;
      if (isValid(live.entities.sentiment)) merged.entities.sentiment = live.entities.sentiment;
      if (isValid(live.entities.urgency)) merged.entities.urgency = live.entities.urgency;
    }
    if (isValid(live.confidence)) merged.confidence = live.confidence;
    if (isValid(live.reply_mixed)) merged.reply_mixed = live.reply_mixed;

    if (live.ticket_en) {
      if (isValid(live.ticket_en.subject)) merged.ticket_en.subject = live.ticket_en.subject;
      if (isValid(live.ticket_en.summary)) merged.ticket_en.summary = live.ticket_en.summary;
      if (isValid(live.ticket_en.action)) merged.ticket_en.action = live.ticket_en.action;
      if (isValid(live.ticket_en.priority)) merged.ticket_en.priority = live.ticket_en.priority;
    }
    return merged;
  }

  /**
   * Runs the 20-Sentence Benchmark Suite and computes accuracy scores
   */
  runBenchmark(customDataset = null) {
    const dataset = customDataset || BENCHMARK_DATASET;
    let intentMatches = 0;
    let entityMatches = 0;
    let totalLatencyMs = 0;

    const detailedResults = dataset.map(item => {
      const startTime = performance.now();
      const result = this.analyseOffline(item.text);
      const latency = performance.now() - startTime;
      totalLatencyMs += latency;

      const intentPassed = result.intent_id === item.expected_intent_id;
      const orderPassed = (result.entities.order_id || null) === (item.expected_order || null);

      if (intentPassed) intentMatches++;
      if (orderPassed) entityMatches++;

      return {
        id: item.id,
        utterance: item.text,
        expectedIntent: item.expected_intent_id,
        predictedIntent: result.intent_id,
        intentPassed,
        expectedOrder: item.expected_order,
        predictedOrder: result.entities.order_id,
        orderPassed,
        languages: result.languages,
        switchPoints: result.switch_points,
        latencyMs: Math.round(latency * 100) / 100
      };
    });

    const intentAccuracy = Math.round((intentMatches / dataset.length) * 100);
    const entityAccuracy = Math.round((entityMatches / dataset.length) * 100);
    const avgLatency = Math.round((totalLatencyMs / dataset.length) * 100) / 100;

    return {
      total: dataset.length,
      intentMatches,
      intentAccuracy: `${intentAccuracy}%`,
      entityMatches,
      entityAccuracy: `${entityAccuracy}%`,
      avgLatencyMs: avgLatency,
      results: detailedResults
    };
  }
}

// Universal Module Definition (Browser Global + CommonJS + ES Module)
if (typeof window !== "undefined") {
  window.CodemixSkill = CodemixSkill;
  window.CRM_ORDERS = CRM_ORDERS;
  window.BENCHMARK_DATASET = BENCHMARK_DATASET;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CodemixSkill, CRM_ORDERS, BENCHMARK_DATASET, EN_WORDS, INTENT_RULES };
}
