// Codemix Skill — judge-ready 25-slide deck, themed rebuild with diagrams.
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa6");

const OUT = process.argv[2] || "Codemix_Skill_Judge_Ready.pptx";
const C = {
  navy: "14213D", navy2: "1F3057", ink: "1F2937", muted: "5B6475", ice: "CADCFC",
  amber: "F4A300", amberLt: "FFF4DA", amberDk: "7A5000", red: "C8283C", redLt: "FBE4E7",
  green: "1F8A63", greenLt: "E1F3EC", slate: "E9EDF3", line: "B8C2D0", white: "FFFFFF",
  blue: "2A5C8A", blueLt: "E4EDF6", fresh: "12AF97", freshLt: "DDF5F1", panel: "F4F6F9",
};
const HF = "Cambria", BF = "Calibri";

async function icon(name, color, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(fa[name], { color: "#" + color, size: String(size) }));
  return "image/png;base64," + (await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64");
}

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.title = "Codemix Skill — Judge-Ready Business Case";
pres.author = "Team Ramanathan & Sadhana";
let N = 0;

// ---------- helpers ----------
const T = (s, text, o) => s.addText(text, Object.assign({ fontFace: BF, margin: 0, isTextBox: true, valign: "top", color: C.ink }, o));
const SECTIONS = ["", "Initiative Overview", "Problem Statement", "Why Now", "Competitive Landscape", "Proposed Solution · MVP · Freshworks · AI design", "Target Customers", "Value Proposition", "Pricing & Packaging", "Go-to-Market Plan", "Costs & Resources", "Benefits & Success Metrics", "Risks & Assumptions"];
let SEC5 = "Proposed Solution";
function header(s, num, title, sub, subSize = 13.5) {
  T(s, `SECTION ${num} OF 12  ·  ${(num === 5 ? SEC5 : SECTIONS[num]).toUpperCase()}`, { x: 6.3, y: 0.12, w: 6.45, h: 0.28, fontSize: 9, bold: true, color: "8A93A3", align: "right", charSpacing: 1 });
  s.addShape(pres.shapes.OVAL, { x: 0.6, y: 0.48, w: 0.62, h: 0.62, fill: { color: C.amber }, line: { color: C.amber } });
  T(s, String(num), { x: 0.6, y: 0.48, w: 0.62, h: 0.62, align: "center", valign: "middle", fontSize: 15, bold: true, color: C.navy });
  T(s, title, { x: 1.4, y: 0.4, w: 11.4, h: 0.78, fontFace: HF, fontSize: 30, bold: true, color: C.navy, valign: "middle" });
  if (sub) T(s, sub, { x: 1.4, y: 1.13, w: 11.4, h: 0.4, fontSize: subSize, color: C.muted, italic: true });
}
function footer(s, dark = false) {
  N++;
  T(s, `Codemix Skill  •  The Great Agent Hackathon 2026  •  ${N}`, { x: 0.6, y: 7.05, w: 8, h: 0.28, fontSize: 9, color: dark ? "8FA0BF" : "8A93A3" });
}
function slide(dark = false) { const s = pres.addSlide(); s.background = { color: dark ? C.navy : C.white }; return s; }
function box(s, x, y, w, h, text, o = {}) {
  s.addText(text, {
    x, y, w, h, shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: o.r ?? 0.08,
    fill: { color: o.fill || C.slate }, line: { color: o.line || o.fill || C.slate, width: o.lw || 1 },
    fontFace: BF, fontSize: o.size || 13, color: o.color || C.ink, bold: o.bold !== false,
    align: o.align || "center", valign: o.valign || "middle", margin: o.margin ?? 6, isTextBox: true,
    shadow: o.shadow ? shadow() : undefined,
  });
}
function rich(s, x, y, w, h, head, body, o = {}) {
  // titled box: bold heading line + body line(s)
  s.addText([
    { text: head, options: { bold: true, color: o.hc || C.navy, fontSize: o.hs || 13, breakLine: true } },
    { text: body, options: { color: o.bc || C.ink, fontSize: o.bs || 11 } },
  ], {
    x, y, w, h, shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.08, fill: { color: o.fill || C.slate },
    line: { color: o.line || o.fill || C.slate, width: o.lw || 1 }, fontFace: BF, align: o.align || "center",
    valign: "middle", margin: o.margin ?? 6, isTextBox: true, shadow: o.shadow ? shadow() : undefined,
  });
}
function diamond(s, x, y, w, h, text, o = {}) {
  s.addText(text, { x, y, w, h, shape: pres.shapes.DIAMOND, fill: { color: o.fill || C.navy }, line: { color: o.fill || C.navy },
    fontFace: BF, fontSize: o.size || 12, bold: true, color: o.color || C.white, align: "center", valign: "middle", margin: 2, isTextBox: true });
}
function arrow(s, x1, y1, x2, y2, color = C.muted, w = 2, dash) {
  s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001,
    flipH: x2 < x1, flipV: y2 < y1, line: { color, width: w, endArrowType: "triangle", dashType: dash } });
}
function lbl(s, x, y, w, text, color = C.muted, size = 10.5) { T(s, text, { x, y, w, h: 0.28, fontSize: size, bold: true, color, align: "center" }); }
function shadow() { return { type: "outer", color: "000000", blur: 6, offset: 2, angle: 90, opacity: 0.12 }; }
function card(s, x, y, w, h, fill = C.white) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.1, fill: { color: fill }, line: { color: "DDE3EB", width: 0.75 }, shadow: shadow() });
}
function iconCircle(s, data, x, y, d, fill) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill } });
  const p = d * 0.24; s.addImage({ data, x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p });
}
function banner(s, x, y, w, h, head, body, o = {}) {
  card(s, x, y, w, h, o.fill || C.navy);
  T(s, [{ text: head + "  ", options: { bold: true, color: o.hc || C.amber } }, { text: body, options: { color: o.bc || C.white } }],
    { x: x + 0.25, y, w: w - 0.5, h, fontSize: o.size || 13.5, valign: "middle" });
}
function bullets(s, items, x, y, w, h, size = 12.5, color = C.ink) {
  s.addText(items.map((t, i) => ({ text: t, options: { bullet: { indent: 14 }, breakLine: i < items.length - 1, paraSpaceAfter: 4 } })),
    { x, y, w, h, fontFace: BF, fontSize: size, color, valign: "top", margin: 0, isTextBox: true });
}
function chevrons(s, items, x, y, w, h, o = {}) {
  const n = items.length, cw = (w + (n - 1) * 0.12) / n;
  items.forEach((t, i) => {
    const hi = o.hi && o.hi.includes(i);
    s.addText(t, { x: x + i * (cw - 0.12), y, w: cw, h, shape: i === 0 ? pres.shapes.PENTAGON : pres.shapes.CHEVRON,
      fill: { color: hi ? C.amber : (o.fill || C.navy) }, line: { color: C.white, width: 1.5 }, fontFace: BF, fontSize: o.size || 11.5, bold: true,
      color: hi ? C.navy : (o.color || C.white), align: "center", valign: "middle", margin: 2, isTextBox: true });
  });
}
function tag(s, x, y, text, fill, color) { box(s, x, y, Math.max(0.9, text.length * 0.085 + 0.3), 0.3, text, { fill, color, size: 9.5, margin: 2, r: 0.15 }); }

(async () => {
  const I = {};
  for (const [k, n, c] of [["bolt", "FaBolt", C.navy], ["lang", "FaLanguage", C.navy], ["langW", "FaLanguage", C.white], ["wave", "FaWaveSquare", C.navy], ["store", "FaStore", C.white],
    ["headset", "FaHeadset", C.white], ["shield", "FaShieldHalved", C.white], ["money", "FaMoneyBillWave", C.white], ["code", "FaCode", C.white],
    ["user", "FaUserTie", C.white], ["mic", "FaMicrophoneLines", C.white], ["phone", "FaPhone", C.white], ["angry", "FaFaceAngry", C.white],
    ["voice", "FaVolumeHigh", C.white], ["hand", "FaHand", C.white], ["ban", "FaBan", C.white], ["keys", "FaTableCells", C.white],
    ["check", "FaCircleCheck", C.green], ["xmark", "FaCircleXmark", C.red], ["ticket", "FaTicket", C.white], ["robot", "FaRobot", C.white],
    ["plug", "FaPlug", C.white], ["gauge", "FaGaugeHigh", C.white], ["layers", "FaLayerGroup", C.white], ["undo", "FaRotateLeft", C.white],
    ["list", "FaListCheck", C.white], ["search", "FaMagnifyingGlass", C.white], ["file", "FaFileLines", C.white], ["target", "FaBullseye", C.white]])
    I[k] = await icon(n, c);

  // ===== 1. Title =====
  let s = slide(true);
  T(s, "THE GREAT AGENT HACKATHON 2026  ·  ROUND 2 BUSINESS CASE", { x: 0.8, y: 0.9, w: 11, h: 0.4, fontSize: 13, bold: true, color: C.amber, charSpacing: 2 });
  T(s, "CODEMIX SKILL", { x: 0.8, y: 1.4, w: 11.5, h: 1.1, fontFace: HF, fontSize: 54, bold: true, color: C.white });
  T(s, "The safety + decision layer between AI agents and their actions", { x: 0.8, y: 2.5, w: 11.5, h: 0.6, fontSize: 24, color: C.ice });
  T(s, [{ text: "“Order cancel ", options: { color: C.ice } }, { text: "mat", options: { color: C.amber, bold: true } }, { text: " karo, bas address change karna hai.”", options: { color: C.ice } }],
    { x: 0.8, y: 3.45, w: 11.5, h: 0.55, fontFace: HF, fontSize: 22, italic: true });
  chevrons(s, ["Understand", "Decide", "Act", "Audit"], 0.8, 4.55, 8.4, 0.75, { fill: C.navy2, size: 16, hi: [1] });
  T(s, "We put an intent-validation safety gate between what the voice agent hears and what the agent is allowed to do.", { x: 0.8, y: 5.55, w: 11.8, h: 0.5, fontSize: 16, color: C.white, bold: true });
  T(s, "Team Ramanathan & Sadhana  •  Track 1: Customer & Employee Experience", { x: 0.8, y: 6.4, w: 11.5, h: 0.4, fontSize: 14, color: C.white });
  N++;


  // ===== 2. Initiative Overview =====
  s = slide();
  header(s, 1, "Initiative Overview", "Initiative: Codemix Skill  ·  Owner: Team Ramanathan & Sadhana  ·  a plug-in that makes tool-using AI agents safe", 13);
  [["The gap", "Voice agents can understand a request and immediately call a refund, cancellation or replacement API. A small missed negation can turn the right conversation into the wrong transaction.", C.red],
   ["Our product", "Codemix Skill sits between the AI agent and its API/tool calls. It validates intent, negation, confidence, sentiment and SOP rules before execution.", C.navy],
   ["Freshworks extension", "Unsafe, uncertain or emotionally escalated calls become Freshdesk tickets with transcript, decision context and action details for a human agent.", C.fresh]].forEach(([h, b, c], i) => {
    const y = 1.75 + i * 1.72;
    card(s, 0.6, y, 6.0, 1.55);
    s.addShape(pres.shapes.OVAL, { x: 0.85, y: y + 0.2, w: 0.28, h: 0.28, fill: { color: c }, line: { color: c } });
    T(s, h, { x: 1.25, y: y + 0.14, w: 5.1, h: 0.4, fontFace: HF, fontSize: 16, bold: true, color: C.navy, valign: "middle" });
    T(s, b, { x: 0.85, y: y + 0.58, w: 5.55, h: 0.95, fontSize: 12 });
  });
  // diagram
  card(s, 7.0, 1.75, 5.75, 4.99, C.panel);
  T(s, "WHERE IT SITS", { x: 7.25, y: 1.9, w: 3, h: 0.3, fontSize: 11, bold: true, color: C.amber, charSpacing: 1 });
  rich(s, 7.3, 2.5, 1.55, 1.2, "Company AI Agent", "existing agent", { fill: C.blueLt, hc: C.blue, hs: 12 });
  rich(s, 9.2, 2.3, 1.75, 1.6, "CODEMIX SKILL", "Understand • Decide • Audit", { fill: C.navy, hc: C.amber, bc: C.white, hs: 12.5, line: C.amber, lw: 2 });
  rich(s, 11.3, 2.5, 1.2, 1.2, "Company APIs", "tools / actions", { fill: C.greenLt, hc: C.green, hs: 12 });
  arrow(s, 8.85, 3.1, 9.2, 3.1, C.navy); arrow(s, 10.95, 3.1, 11.3, 3.1, C.green);
  arrow(s, 10.075, 3.9, 10.075, 4.75, C.fresh);
  rich(s, 9.0, 4.75, 2.15, 1.05, "Freshworks", "human handoff", { fill: C.freshLt, hc: C.fresh, line: C.fresh });
  lbl(s, 10.15, 4.2, 1.6, "unsafe / unsure", C.fresh, 10);
  lbl(s, 10.8, 2.72, 0.7, "safe", C.green, 10);
  T(s, "The agent proposes an action. Codemix Skill decides whether it runs, needs confirmation, or goes to a human.", { x: 7.3, y: 6.0, w: 5.2, h: 0.6, fontSize: 11.5, italic: true, color: C.muted });
  footer(s);


  // ===== 3. Problem Statement =====
  s = slide();
  header(s, 2, "Problem Statement", "In code-mixed voice, one short word can reverse the meaning of an API action");
  [["HINDI EXAMPLE", ["Order cancel ", "mat", " karo, bas address change karna hai."], "Correct intent: do NOT cancel → update address."],
   ["TAMIL EXAMPLE", ["Refund ", "vendam", ", replacement anuppunga."], "Correct intent: do NOT refund → request replacement."]].forEach(([h, q, c], i) => {
    const x = 0.6 + i * 6.2;
    card(s, x, 1.75, 5.95, 1.85);
    T(s, h, { x: x + 0.3, y: 1.9, w: 5, h: 0.3, fontSize: 11, bold: true, color: C.amber, charSpacing: 1 });
    T(s, [{ text: "Caller: “", options: { color: C.muted } }, { text: q[0], options: { color: C.navy } }, { text: q[1], options: { color: C.red, bold: true, underline: { style: "sng" } } }, { text: q[2] + "”", options: { color: C.navy } }],
      { x: x + 0.3, y: 2.25, w: 5.4, h: 0.7, fontFace: HF, fontSize: 17, italic: true, valign: "middle" });
    T(s, c, { x: x + 0.3, y: 3.0, w: 5.4, h: 0.45, fontSize: 13, bold: true, color: C.green, valign: "middle" });
  });
  card(s, 0.6, 3.85, 12.15, 1.15, C.panel);
  T(s, [{ text: "Why this matters  ", options: { bold: true, color: C.navy } }, { text: "Speech-to-text can drop a negation on a noisy line, or an intent model can focus on words like “cancel” or “refund” and ignore the negation. With tool calling, that misunderstanding becomes a real transaction.", options: {} }],
    { x: 0.85, y: 3.85, w: 11.7, h: 1.15, fontSize: 13.5, valign: "middle" });
  [["Risk", "Wrong refund / cancellation", C.red, C.redLt], ["Business impact", "Money, reshipping, trust", C.amberDk, C.amberLt], ["Need", "A decision layer before action", C.green, C.greenLt]].forEach(([h, b, c, f], i) => {
    const x = 0.6 + i * 4.2;
    rich(s, x, 5.3, 3.75, 1.3, h.toUpperCase(), b, { fill: f, line: c, hc: c, hs: 12, bs: 15, bc: C.navy });
    if (i < 2) arrow(s, x + 3.75, 5.95, x + 4.2, 5.95, C.navy, 2.5);
  });
  footer(s);


  // ===== 4. Why Now =====
  s = slide();
  header(s, 3, "Why Now", "AI agents have write access, so misunderstanding is no longer just a bad answer");
  [[I.bolt, "AI agents can act", "Tool calling and MCP let agents trigger refunds, cancellations, returns and other business actions directly."],
   [I.lang, "Code-mixing is normal", "Indian callers switch between languages inside a sentence. The risk is concentrated around small intent-flipping words."],
   [I.wave, "Voice stack is ready", "VoBiz provides phone access + DTMF, Sarvam handles Indian speech-to-text, Claude validates intent, and ElevenLabs returns the response."]].forEach(([ic, h, b], i) => {
    const x = 0.6 + i * 4.1;
    card(s, x, 1.75, 3.85, 3.4);
    iconCircle(s, ic, x + 0.3, 2.0, 0.85, C.amberLt);
    T(s, h, { x: x + 0.3, y: 3.0, w: 3.3, h: 0.45, fontFace: HF, fontSize: 18, bold: true, color: C.navy });
    T(s, b, { x: x + 0.3, y: 3.5, w: 3.3, h: 1.55, fontSize: 13 });
  });
  banner(s, 0.6, 5.45, 12.1, 1.25, "Our timing", "The missing layer is not another voice bot. It is a safety and decision layer that controls when an existing AI agent is allowed to call an API.", { size: 15 });
  footer(s);


  // ===== 5. Competitive Landscape =====
  s = slide();
  header(s, 4, "Competitive Landscape", "We focus specifically on the gap between language understanding and action execution");
  const comp = [
    ["Do nothing", "Zero integration effort.", "Risky actions can execute on the agent's first interpretation.", false],
    ["Confirm-everything IVR", "Safe confirmation.", "Adds friction to every action, even low-risk requests.", false],
    ["Generic LLM guardrails", "Useful for policy, toxicity and PII.", "Not designed as an action gate for code-mixed negation + speech confidence.", false],
    ["Codemix Skill", "Understands code-mixed intent → checks action risk → ALLOW / CONFIRM / BLOCK → routes unsafe cases to Freshworks.", "", true],
  ];
  comp.forEach(([n, st, gap, us], i) => {
    const x = 0.6 + i * 3.08, w = 2.9;
    card(s, x, 1.75, w, 3.55, us ? C.navy : C.white);
    T(s, n, { x: x + 0.22, y: 1.9, w: w - 0.44, h: 0.6, fontFace: HF, fontSize: 16, bold: true, color: us ? C.amber : C.navy, valign: "middle" });
    if (!us) {
      s.addImage({ data: I.check, x: x + 0.22, y: 2.65, w: 0.3, h: 0.3 });
      T(s, st, { x: x + 0.62, y: 2.6, w: w - 0.84, h: 0.8, fontSize: 12 });
      s.addImage({ data: I.xmark, x: x + 0.22, y: 3.55, w: 0.3, h: 0.3 });
      T(s, gap, { x: x + 0.62, y: 3.5, w: w - 0.84, h: 1.6, fontSize: 12 });
    } else {
      ["Understands code-mixed intent", "Checks action risk", "ALLOW / CONFIRM / BLOCK", "Routes unsafe cases to Freshworks"].forEach((t, j) => {
        box(s, x + 0.22, 2.6 + j * 0.66, w - 0.44, 0.48, t, { fill: j === 3 ? C.fresh : C.navy2, color: C.white, size: 11 });
        if (j < 3) arrow(s, x + w / 2, 3.08 + j * 0.66, x + w / 2, 3.26 + j * 0.66, C.amber, 1.5);
      });
    }
  });
  // mini spectrum
  T(s, "Friction on every action", { x: 0.6, y: 5.5, w: 3, h: 0.3, fontSize: 10.5, bold: true, color: C.muted });
  T(s, "Risk-based: only risky actions get a check", { x: 8.7, y: 5.5, w: 4, h: 0.3, fontSize: 10.5, bold: true, color: C.green, align: "right" });
  banner(s, 0.6, 5.85, 12.1, 0.9, "Our edge", "A policy-aware action gate with human escalation and an auditable record of what the caller said, what the agent decided, and what API was called.", { size: 13 });
  footer(s);


  // ===== 6. Solution Architecture =====
  s = slide();
  header(s, 5, "Solution Architecture", "Codemix Skill is the control point between an existing AI agent and its tools");
  const arch = [["Customer", "speaks", C.slate, C.navy], ["VoBiz AI", "receives the call", C.blueLt, C.blue], ["Sarvam AI", "speech → text", C.blueLt, C.blue],
    ["Claude API", "intent + negation check", C.navy, C.amber]];
  arch.forEach(([h, b, f, c], i) => {
    const x = 0.6 + i * 2.3, w = 1.95;
    rich(s, x, 1.8, w, 1.05, h, b, { fill: f, hc: c, bc: f === C.navy ? C.white : C.ink, hs: 14, bs: 11.5 });
    arrow(s, x + w, 2.325, x + 2.3, 2.325, C.navy, 2);
  });
  diamond(s, 9.8, 1.55, 2.95, 1.55, "SAFETY GATE\nCodemix Skill\nsafe to act?", { fill: C.amber, color: C.navy, size: 11.5 });
  const outs6 = [
    ["YES", "Dodo Payments", "refund / return / replacement runs", C.green, C.greenLt, 9.05],
    ["UNCLEAR", "Confirm with caller", "transparent read-back, voice or DTMF", C.amberDk, C.amberLt, 5.55],
    ["NO / angry", "Freshworks ticket", "Freshdesk case for a human agent", C.red, C.redLt, 2.05],
  ];
  outs6.forEach(([lb, h, b, c, f, x]) => {
    const lc = c === C.amberDk ? C.amber : c;
    arrow(s, 11.275, 3.1, x + 1.6, 3.75, lc, 2);
    rich(s, x, 3.75, 3.2, 1.0, h, b, { fill: f, line: lc, hc: c, hs: 14, bs: 11.5 });
    lbl(s, x + 1.6 + (x > 8 ? 0.2 : 0), 3.4, 1.3, lb, c, 10.5);
    arrow(s, x + 1.6, 4.75, x + 1.6, 5.1, C.muted, 1.5);
  });
  box(s, 2.05, 5.1, 10.2, 0.6, "ElevenLabs speaks the reply in the caller's own language mix", { fill: C.blueLt, color: C.blue, size: 13 });
  banner(s, 0.6, 5.95, 12.15, 0.8, "Our innovation", "We put an intent-validation safety gate between what the voice agent hears and what the agent is allowed to do.", { size: 14 });
  footer(s);


  // ===== 7. Sponsor & Integration Stack =====
  s = slide();
  header(s, 5, "Sponsor & Integration Stack", "Each sponsor/API has one clear job; Codemix Skill coordinates the handoff and controls action execution");
  const layers = [
    ["CHANNEL", "VoBiz AI", "PHONE + DTMF", "The number customers call. Keypad (DTMF) gives a confirmation that needs no speech recognition.", C.blue, C.blueLt],
    ["LISTEN", "Sarvam AI", "SPEECH → TEXT", "Transcribes code-mixed Hindi + English and Tamil + English, so the negation reaches the intent check.", C.blue, C.blueLt],
    ["VALIDATE", "Claude API", "INTENT + SAFETY", "Before any sensitive action: finds the real intent. “Refund vendam” = NO refund, YES replacement.", C.navy, C.slate],
    ["CONTROL", "Codemix Skill", "ORCHESTRATION + SAFETY", "The safety gate between what the voice agent hears and what it is allowed to do.", C.amber, C.navy],
    ["ACT", "Dodo Payments", "ACTION API", "Runs refunds, returns and replacements, but only after the safety gate says YES.", C.green, C.greenLt],
    ["ESCALATE", "Freshworks / Freshdesk", "HUMAN WORKFLOW", "If it can't be resolved safely, a Freshdesk ticket hands the case to a human agent.", C.fresh, C.freshLt],
    ["RESPOND", "ElevenLabs", "VOICE OUTPUT", "Speaks the reply in the caller's own language mix and reads back what it understood.", C.amberDk, C.amberLt],
  ];
  layers.forEach(([stage, n, role, d, c, f], i) => {
    const y = 1.72 + i * 0.72, dark = f === C.navy;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y, w: 12.15, h: 0.62, rectRadius: 0.08, fill: { color: f }, line: { color: dark ? C.amber : f, width: dark ? 2 : 1 } });
    box(s, 0.75, y + 0.12, 1.3, 0.38, stage, { fill: dark ? C.amber : c, color: dark ? C.navy : C.white, size: 10, margin: 2, r: 0.15 });
    T(s, n, { x: 2.25, y, w: 2.6, h: 0.62, fontFace: HF, fontSize: 15, bold: true, color: dark ? C.white : C.navy, valign: "middle" });
    T(s, role, { x: 4.85, y, w: 2.3, h: 0.62, fontSize: 10.5, bold: true, color: dark ? C.amber : c === C.amberDk ? C.amberDk : c, valign: "middle", charSpacing: 1 });
    T(s, d, { x: 7.2, y, w: 5.4, h: 0.62, fontSize: 11.5, color: dark ? C.white : C.ink, valign: "middle" });
  });
  footer(s);


  // ===== 11. The Safety Decision =====
  s = slide();
  header(s, 5, "The Safety Decision", "The agent never silently guesses on an irreversible action");
  box(s, 0.6, 1.95, 2.3, 1.1, "AI proposes\nrefund(order)", { fill: C.blueLt, color: C.blue, size: 13 });
  arrow(s, 2.9, 2.5, 3.35, 2.5, C.navy);
  diamond(s, 3.35, 1.7, 2.7, 1.6, "Risk check\nmoney /\nirreversible?", { size: 12 });
  arrow(s, 6.05, 2.5, 6.5, 2.5, C.navy);
  diamond(s, 6.5, 1.7, 2.7, 1.6, "Claude check\nnegation +\nconfidence", { size: 12 });
  arrow(s, 9.2, 2.5, 9.65, 2.5, C.navy);
  box(s, 9.65, 1.95, 3.1, 1.1, "Decision\nALLOW / CONFIRM / BLOCK", { fill: C.amber, color: C.navy, size: 13 });
  const out11 = [["ALLOW", "High confidence + safe action → execute and log.", C.green, C.greenLt], ["CONFIRM", "Uncertain meaning on a risky action → explain uncertainty → voice / DTMF confirmation.", C.amberDk, C.amberLt], ["BLOCK / ROUTE", "Negation conflicts with action, confirmation fails, or human handoff is needed → stop API call + Freshdesk.", C.red, C.redLt]];
  out11.forEach(([h, b, c, f], i) => {
    const x = 0.6 + i * 4.1;
    arrow(s, 11.2, 3.05, x + 1.9, 3.75, c === C.amberDk ? C.amber : c, 1.75);
    rich(s, x, 3.75, 3.85, 1.55, h, b, { fill: f, line: c === C.amberDk ? C.amber : c, hc: c, hs: 15, bs: 12.5 });
  });
  card(s, 0.6, 5.6, 12.15, 1.1, C.navy);
  T(s, "EXAMPLE", { x: 0.85, y: 5.7, w: 2, h: 0.3, fontSize: 11, bold: true, color: C.amber, charSpacing: 1 });
  chevrons(s, ["“Refund vendam, replacement anuppunga.”", "BLOCK refund", "Confirm replacement", "If needed: Freshdesk ticket"], 0.85, 6.02, 11.7, 0.55, { fill: C.navy2, hi: [1], size: 11.5 });
  footer(s);


  // ===== 9. Feature Set =====
  s = slide();
  header(s, 5, "The Feature Set", "The product combines understanding, decisioning, conversation control and auditability");
  const groups = [
    ["UNDERSTAND", C.slate, C.navy, [["Mixed-language understanding", "Hinglish / Tanglish, including mid-sentence switching."], ["Intent + negation", "Maps what the caller actually wants; catches mat / nahi / vendam / vaddu."]]],
    ["DECIDE", C.amberLt, C.amberDk, [["Decision layer", "ALLOW, CONFIRM or BLOCK for each API action."], ["Transparent uncertainty", "States what is uncertain and asks before acting."], ["Sentiment → human", "Angry or distressed callers are routed to Freshdesk."]]],
    ["CONVERSE", C.blueLt, C.blue, [["Low latency", "Fast path for routine requests; deeper validation only when sensitive."], ["DTMF + IVR", "Press 1 / 2 confirmation fallback on any phone."], ["Interrupt handling", "Caller can cut in; agent stops speaking and listens."]]],
    ["AUDIT", C.greenLt, C.green, [["SOP-based auditing", "Checks every call against company rules."], ["Full audit trail", "Transcript + decisions + API calls + SOP result."]]],
  ];
  groups.forEach(([g, f, c, feats], i) => {
    const x = 0.6 + i * 3.08;
    card(s, x, 1.75, 2.9, 5.0, f);
    box(s, x + 0.2, 1.92, 2.5, 0.45, g, { fill: c, color: C.white, size: 13, r: 0.15 });
    feats.forEach(([h, b], j) => {
      const y = 2.6 + j * 1.35;
      card(s, x + 0.15, y, 2.6, 1.2, C.white);
      T(s, h, { x: x + 0.3, y: y + 0.08, w: 2.35, h: 0.45, fontSize: 12, bold: true, color: C.navy, valign: "bottom" });
      T(s, b, { x: x + 0.3, y: y + 0.56, w: 2.35, h: 0.62, fontSize: 10.5 });
    });
  });
  footer(s);


  // ===== 10. One Call End to End =====
  s = slide();
  header(s, 5, "One Call — End to End", "Every feature appears only where it adds value");
  const G = { conv: [C.blueLt, C.blue], und: [C.slate, C.navy], dec: [C.amberLt, C.amberDk], act: [C.navy, C.white], aud: [C.greenLt, C.green] };
  const life = [["Caller speaks", "VoBiz phone line", "conv"], ["Speech → text", "Sarvam AI", "conv"], ["Language + intent", "Codemix engine + Claude", "und"], ["Negation check", "mat / vendam / nahi", "und"], ["Sentiment check", "human route if needed", "dec"],
    ["Decision", "ALLOW / CONFIRM / BLOCK", "dec"], ["Transparent confirmation", "ElevenLabs voice or DTMF", "dec"], ["Action", "Company API / Dodo", "act"], ["SOP audit", "company rules", "aud"], ["Audit trail", "transcript + decisions + API", "aud"]];
  life.forEach(([h, b, g], i) => {
    const row = i < 5 ? 0 : 1, col = row ? 9 - i : i, x = 0.6 + col * 2.5, y = row ? 3.95 : 1.85, [f, c] = G[g];
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 2.1, h: 1.45, rectRadius: 0.08, fill: { color: f }, line: { color: f }, shadow: shadow() });
    s.addShape(pres.shapes.OVAL, { x: x + 0.15, y: y + 0.15, w: 0.42, h: 0.42, fill: { color: g === "act" ? C.amber : c }, line: { color: C.white, width: 1 } });
    T(s, String(i + 1), { x: x + 0.15, y: y + 0.15, w: 0.42, h: 0.42, fontSize: 12, bold: true, color: g === "act" ? C.navy : C.white, align: "center", valign: "middle" });
    T(s, h, { x: x + 0.15, y: y + 0.6, w: 1.85, h: 0.42, fontSize: 12, bold: true, color: g === "act" ? C.white : c, valign: "bottom" });
    T(s, b, { x: x + 0.15, y: y + 1.04, w: 1.85, h: 0.38, fontSize: 10, color: g === "act" ? C.ice : C.ink });
    if (i < 4) arrow(s, x + 2.1, y + 0.65, x + 2.5, y + 0.65, C.amber, 2.5);
    if (i === 4) arrow(s, x + 1.05, y + 1.45, x + 1.05, 3.95, C.amber, 2.5);
    if (i > 4 && i < 9) arrow(s, x, y + 0.65, x - 0.4, y + 0.65, C.amber, 2.5);
  });
  banner(s, 0.6, 5.7, 12.1, 1.0, "Core principle", "Most routine calls take the fast path. Confirmation and Freshworks handoff activate only when risk or uncertainty requires them.");
  footer(s);


  // ===== Confirming before acting (uncertainty + DTMF + interrupts) =====
  s = slide();
  header(s, 5, "Confirming Before Acting", "Transparent uncertainty, DTMF / IVR confirmation and interrupt handling in one call");
  card(s, 0.6, 1.75, 6.3, 4.0, C.panel);
  const chat = [
    ["CALLER · speaks", "“Refund… vendam… maybe replacement.”", "R", C.white, C.ink, 0.5],
    ["AGENT · ElevenLabs, in the caller's mix", "“I'm not fully sure whether you want a refund or a replacement. Press 1 for replacement, 2 for a human agent.”", "L", C.navy, C.white, 0.85],
    ["CALLER · keypad via VoBiz", "presses 1  →  no speech-to-text ambiguity", "R", C.amberLt, C.amberDk, 0.45],
    ["INTERRUPT", "Caller can cut in at any time: the agent stops speaking and treats it as the latest input.", "L", C.blueLt, C.blue, 0.55],
  ];
  let cy = 1.9;
  chat.forEach(([who, t, side, f, c, h]) => {
    const w = 4.9, x = side === "L" ? 0.8 : 6.7 - w;
    T(s, who, { x, y: cy, w, h: 0.25, fontSize: 9.5, bold: true, color: C.muted, align: side === "L" ? "left" : "right" });
    box(s, x, cy + 0.26, w, h, t, { fill: f, color: c, size: 12, align: "left", margin: 8, bold: false, r: 0.12 });
    cy += h + 0.33;
  });
  arrow(s, 6.9, 3.75, 7.25, 3.75, C.navy, 2.5);
  diamond(s, 7.25, 2.95, 1.85, 1.6, "Caller\nresponse?", { fill: C.amber, color: C.navy, size: 12 });
  [["CONFIRM  (voice or press 1)", "Action may proceed through the company API.", C.green, C.greenLt, 1.75],
   ["DECLINE / NO  (press 2)", "No action → offer human help via Freshdesk.", C.fresh, C.freshLt, 3.13],
   ["NO RESPONSE / STILL RISKY", "Do not execute → escalate to a human.", C.red, C.redLt, 4.51]].forEach(([h, b, c, f, y]) => {
    arrow(s, 9.1, 3.75, 9.35, y + 0.6, c, 2);
    rich(s, 9.35, y, 3.4, 1.2, h, b, { fill: f, line: c, hc: c, hs: 12.5, bs: 11.5 });
  });
  banner(s, 0.6, 6.0, 12.15, 0.75, "Principle", "Uncertainty becomes a visible decision point, not a hidden model guess. DTMF gives the safety layer a deterministic input.", { size: 13 });
  footer(s);


  // ===== 22. SOP Auditing =====
  s = slide();
  header(s, 5, "SOP-Based Auditing & Full Audit Trail", "Every sensitive action can be reconstructed after the call");
  [["Captured", ["Full transcript", "Detected intent", "Negation result", "Confidence", "Sentiment / handoff", "Confirmation", "API action"], C.blue, I.file],
   ["Checked", ["Company SOP", "Action authorization", "Required confirmation", "Escalation policy", "Sensitive-action rules"], C.navy, I.search],
   ["Produced", ["PASS / VIOLATION", "Audit reference", "Supervisor flag", "Freshdesk context", "Post-call trace"], C.green, I.list]].forEach(([h, items, c, ic], i) => {
    const x = 0.6 + i * 4.2;
    card(s, x, 1.75, 3.7, 3.95);
    iconCircle(s, ic, x + 0.25, 1.95, 0.6, c);
    T(s, h, { x: x + 1.0, y: 1.95, w: 2.5, h: 0.6, fontFace: HF, fontSize: 18, bold: true, color: C.navy, valign: "middle" });
    items.forEach((t, j) => box(s, x + 0.25, 2.75 + j * 0.42, 3.2, 0.36, t, { fill: j === 0 && i === 2 ? C.greenLt : C.panel, color: C.ink, size: 11.5, align: "left", margin: 8, bold: j === 0 && i === 2 }));
    if (i < 2) arrow(s, x + 3.7, 3.7, x + 4.2, 3.7, C.amber, 3);
  });
  T(s, "EXAMPLE AUDIT CHAIN", { x: 0.6, y: 5.85, w: 4, h: 0.28, fontSize: 10.5, bold: true, color: C.amber, charSpacing: 1 });
  chevrons(s, ["Transcript", "Intent", "Safety decision", "Confirmation", "API call", "SOP result", "Freshdesk case"], 0.6, 6.15, 12.15, 0.6, { size: 11, hi: [2] });
  footer(s);


  // ===== Freshworks integration (merged) =====
  s = slide();
  SEC5 = "Freshworks Integration"; header(s, 5, "Freshworks Integration — Human-in-the-Loop", "Freshdesk is where the AI hands over when it should not act alone");
  rich(s, 0.6, 1.8, 1.9, 1.05, "AI Agent", "proposes action", { fill: C.blueLt, hc: C.blue, hs: 13.5 });
  arrow(s, 2.5, 2.325, 2.85, 2.325, C.navy, 2.5);
  rich(s, 2.85, 1.8, 2.2, 1.05, "Codemix Skill", "safety gate", { fill: C.navy, hc: C.amber, bc: C.white, hs: 13.5, line: C.amber, lw: 2 });
  arrow(s, 5.05, 2.325, 5.4, 2.325, C.navy, 2.5);
  diamond(s, 5.4, 1.6, 2.0, 1.45, "Safe to\nact?", { fill: C.amber, color: C.navy, size: 12.5 });
  arrow(s, 7.4, 2.1, 7.85, 1.95, C.green, 2); lbl(s, 7.3, 1.6, 0.6, "YES", C.green);
  arrow(s, 7.4, 2.55, 7.85, 2.75, C.red, 2); lbl(s, 7.3, 2.8, 0.6, "NO", C.red);
  rich(s, 7.85, 1.6, 4.9, 0.7, "Company API executes", "Transcript, decision and API call are logged", { fill: C.greenLt, line: C.green, hc: C.green, hs: 12.5, bs: 11 });
  box(s, 7.85, 2.45, 4.9, 0.7, "Freshdesk REST API  →  POST /api/v2/tickets  →  human agent", { fill: C.fresh, color: C.white, size: 12 });
  const fc = [
    [I.hand, "When a ticket is created", ["Unsafe or unclear action", "Caller does not confirm", "Caller is angry / distressed", "AI should not guess"], C.red],
    [I.layers, "What we add to Freshdesk", ["Code-mixed intent validation", "Action gating (ALLOW / CONFIRM / BLOCK)", "Transparent confirmation", "Structured escalation on top of ticketing, agent workspace and history"], C.navy],
    [I.user, "What the human agent gets", ["English summary + full transcript", "Intent, confidence, safety verdict", "Attempted API action + reason", "A ready-to-handle case, not a blind escalation"], C.fresh],
  ];
  fc.forEach(([ic, h, items, c], i) => {
    const x = 0.6 + i * 4.1;
    card(s, x, 3.35, 3.85, 2.45);
    iconCircle(s, ic, x + 0.22, 3.5, 0.5, c);
    T(s, h, { x: x + 0.85, y: 3.5, w: 2.9, h: 0.5, fontFace: HF, fontSize: 14.5, bold: true, color: C.navy, valign: "middle" });
    bullets(s, items, x + 0.25, 4.1, 3.4, 1.65, 11.5);
  });
  banner(s, 0.6, 6.0, 12.15, 0.75, "Live today", "api/create-ticket.js already creates real Freshdesk tickets. We extend Freshworks at the AI-action boundary; we don't replace Freshdesk or the company's APIs.", { fill: C.fresh, hc: C.navy, size: 12.5 });
  footer(s);


  // ===== 16. Ticket payload =====
  s = slide();
  SEC5 = "Freshworks Integration"; header(s, 5, "Freshdesk Ticket Payload", "The handoff preserves the evidence a human needs to continue the conversation");
  card(s, 0.6, 1.75, 12.15, 3.95);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 1.75, w: 12.15, h: 0.55, rectRadius: 0.1, fill: { color: C.fresh }, line: { color: C.fresh } });
  T(s, "Freshdesk ticket  ·  created by Codemix Skill  ·  POST /api/v2/tickets", { x: 0.85, y: 1.75, w: 11, h: 0.55, fontSize: 13, bold: true, color: C.white, valign: "middle" });
  [["Conversation context", ["Customer / call ID", "Original transcript", "Detected language / code-mix", "English summary", "Timestamp", "Voice / DTMF source"], C.blue, I.file],
   ["Decision context", ["Detected intent", "Confidence", "Negation detected", "Safety verdict", "Requested API action", "Confirmation status"], C.amberDk, I.shield],
   ["Operational context", ["Priority / tags", "SOP result", "Reason for escalation", "Attempted API call", "Human handoff reason", "Audit reference"], C.green, I.list]].forEach(([h, fields, c, ic], i) => {
    const x = 0.85 + i * 4.0;
    iconCircle(s, ic, x, 2.5, 0.5, c);
    T(s, h, { x: x + 0.62, y: 2.5, w: 3.1, h: 0.5, fontFace: HF, fontSize: 15, bold: true, color: C.navy, valign: "middle" });
    fields.forEach((t, j) => {
      s.addShape(pres.shapes.RECTANGLE, { x, y: 3.15 + j * 0.41, w: 3.65, h: 0.36, fill: { color: j % 2 ? C.white : C.panel }, line: { color: j % 2 ? C.white : C.panel } });
      T(s, t, { x: x + 0.12, y: 3.15 + j * 0.41, w: 3.5, h: 0.36, fontSize: 12, valign: "middle" });
    });
  });
  banner(s, 0.6, 5.95, 12.15, 0.8, "Judge takeaway", "Freshdesk is the system where uncertainty becomes a human workflow, with the evidence needed to act quickly.");
  footer(s);


  // ===== 18. Agentic integration =====
  s = slide();
  SEC5 = "Agentic / AI Design"; header(s, 5, "Agentic Integration — The Plugin Control Point", "Codemix Skill is middleware, not a replacement AI agent. It intercepts the proposed action before the company API is called", 12);
  const ag = [["1  EXISTING AI AGENT", "Understands the conversation and proposes a tool/API action.", C.blueLt, C.blue],
    ["2  CODEMIX SKILL", "Receives transcript + proposed action → Claude checks intent and negation; the gate checks risk, SOP and confidence.", C.navy, C.amber],
    ["3  DECISION GATE", "ALLOW → API call  ·  CONFIRM → customer confirmation  ·  BLOCK → stop action + Freshdesk handoff", C.amberLt, C.amberDk],
    ["4  COMPANY SYSTEMS", "Existing APIs execute only after the gate. Freshdesk receives structured human handoffs.", C.greenLt, C.green]];
  ag.forEach(([h, b, f, c], i) => {
    const y = 1.75 + i * 1.15;
    rich(s, 0.6, y, 7.0, 0.92, h, b, { fill: f, hc: c, bc: f === C.navy ? C.white : C.ink, hs: 13, bs: 11.5, align: "left", margin: 12, line: i === 1 ? C.amber : f, lw: 2 });
    if (i < 3) arrow(s, 4.1, y + 0.92, 4.1, y + 1.15, C.amber, 2.5);
  });
  box(s, 7.72, 3.02, 1.1, 0.5, "intercept", { fill: C.amber, color: C.navy, size: 10.5, r: 0.2, margin: 2 });
  rich(s, 8.95, 1.75, 3.8, 2.1, "Integration interfaces", "MCP / REST adapter around the agent's tool calls. The company keeps its existing agent and business APIs.", { fill: C.white, line: "DDE3EB", hs: 15, bs: 12.5, align: "left", margin: 14, shadow: true });
  rich(s, 8.95, 4.05, 3.8, 1.95, "Why this matters", "One safety + policy layer can sit in front of multiple action APIs without rebuilding the voice agent.", { fill: C.white, line: "DDE3EB", hs: 15, bs: 12.5, align: "left", margin: 14, shadow: true });
  banner(s, 0.6, 6.4 - 0.1, 12.15, 0.6, "Core positioning", "Plugin between the AI agent and its action tools.", { size: 13 });
  footer(s);


  // ===== 12. MVP Scope =====
  s = slide();
  SEC5 = "MVP Scope"; header(s, 5, "MVP Scope & What Is Already Built", "Separate what is demonstrated today from the intended MVP and future extension");
  const ph = [["DEMONSTRATED TODAY", ["Round-1 code-mix tagging engine", "Intent scoring", "MCP server", "Live Freshdesk ticket API", "Vercel demo", "Freshdesk ticket creation flow"], C.green, C.greenLt],
    ["MVP SCOPE", ["VoBiz + Sarvam + ElevenLabs voice path", "Claude safety gate", "Dodo action path", "Freshdesk escalation", "Hindi + Tamil + English", "Transcript + audit trail"], C.navy, C.slate],
    ["NEXT PHASE", ["Sentiment handoff tuning", "Interrupt handling tuning", "SOP rule editor + audit reports", "More Indian languages", "Freshworks Marketplace app", "Plug-in via MCP / REST"], C.blue, C.blueLt]];
  ph.forEach(([h, items, c, f], i) => {
    const x = 0.6 + i * 4.1;
    s.addText(h, { x, y: 1.75, w: 3.95, h: 0.7, shape: i === 0 ? pres.shapes.PENTAGON : pres.shapes.CHEVRON, fill: { color: c }, line: { color: C.white, width: 1.5 },
      fontFace: BF, fontSize: 14, bold: true, color: C.white, align: "center", valign: "middle", margin: 0, isTextBox: true });
    card(s, x, 2.65, 3.8, 3.0, f);
    items.forEach((t, j) => {
      s.addShape(pres.shapes.OVAL, { x: x + 0.25, y: 2.87 + j * 0.44, w: 0.16, h: 0.16, fill: { color: c }, line: { color: c } });
      T(s, t, { x: x + 0.55, y: 2.78 + j * 0.44, w: 3.1, h: 0.36, fontSize: 12.5, valign: "middle" });
    });
  });
  banner(s, 0.6, 5.9, 12.15, 0.85, "Credibility rule", "Any latency, accuracy or adoption number that has not been measured in the demo is presented as a target, not a result.", { fill: C.amberLt, hc: C.amberDk, bc: C.ink, size: 13 });
  footer(s);


  // ===== Target customers =====
  s = slide();
  header(s, 6, "Target Customers", "Start where AI agents already have permission to take customer actions");
  [[I.store, "Primary customers", "D2C, e-commerce and fintech brands using Freshdesk and deploying AI voice agents for Indian customers.", C.navy],
   [I.headset, "Secondary customers", "BPOs and support outsourcers that need one safety / policy layer across multiple client accounts.", C.blue],
   [I.shield, "Protected actions", "Refunds • returns • replacements • cancellations • other company APIs exposed to the AI agent.", C.red]].forEach(([ic, h, b, c], i) => {
    const y = 1.75 + i * 1.7;
    card(s, 0.6, y, 6.4, 1.5);
    iconCircle(s, ic, 0.85, y + 0.3, 0.9, c);
    T(s, h, { x: 1.95, y: y + 0.15, w: 4.9, h: 0.42, fontFace: HF, fontSize: 16, bold: true, color: C.navy });
    T(s, b, { x: 1.95, y: y + 0.58, w: 4.9, h: 0.85, fontSize: 12.5 });
  });
  T(s, "WHO WE START WITH", { x: 7.4, y: 1.8, w: 5, h: 0.3, fontSize: 11, bold: true, color: C.amber, charSpacing: 1 });
  [["Freshdesk customers", 5.3, C.slate, C.navy], ["…running AI voice agents", 4.5, C.blueLt, C.blue], ["…with Indian, code-mixed callers", 3.7, C.amberLt, C.amberDk], ["…whose agent can refund / return / replace", 2.9, C.navy, C.white]].forEach(([t, w, f, c], j) => {
    const x = 7.4 + (5.3 - w) / 2;
    box(s, x, 2.25 + j * 1.05, w, 0.85, t, { fill: f, color: c, size: 12.5 });
  });
  T(s, "The narrower the funnel, the higher the cost of a wrong action.", { x: 7.4, y: 6.35, w: 5.3, h: 0.4, fontSize: 11.5, italic: true, color: C.muted, align: "center" });
  footer(s);


  // ===== Value proposition =====
  s = slide();
  header(s, 7, "Value Proposition", "Why a customer would choose this over doing nothing or a generic guardrail");
  banner(s, 0.6, 1.75, 12.15, 1.1, "Plug it in once:", "the existing AI agent handles mixed-language customers, and nothing irreversible happens on a misheard word.", { size: 17 });
  [["Without Codemix Skill", I.xmark, C.red, C.redLt, ["Agent acts on its first interpretation", "A dropped “mat” or “vendam” becomes a wrong refund or cancellation", "Blind escalation: humans start from zero", "No record of what the caller said vs. what the agent did"]],
   ["With Codemix Skill", I.check, C.green, C.greenLt, ["Validates intent and negation before any sensitive action", "Confirms when uncertain (voice or DTMF)", "Routes people to Freshworks with full context", "Records the full audit trail: transcript, decision, API call, SOP result"]]].forEach(([h, ic, c, f, items], i) => {
    const x = 0.6 + i * 6.2;
    card(s, x, 3.1, 5.95, 3.6, f);
    s.addImage({ data: ic, x: x + 0.3, y: 3.3, w: 0.45, h: 0.45 });
    T(s, h, { x: x + 0.9, y: 3.28, w: 4.8, h: 0.5, fontFace: HF, fontSize: 19, bold: true, color: c, valign: "middle" });
    bullets(s, items, x + 0.35, 3.95, 5.3, 2.65, 14);
  });
  footer(s);


  // ===== Pricing =====
  s = slide();
  header(s, 8, "Pricing & Packaging", "Proposed pricing, validated in the pilot. Only guarded (sensitive) actions are metered");
  [["Free", "Monitor mode", "for every Freshdesk customer", ["Flags risky actions, never blocks", "Weekly wrong-action report", "Shows the value before paying"], C.slate, C.navy, false],
   ["$5", "Codemix Skill add-on", "per 1,000 guarded actions", ["Full safety gate: ALLOW / CONFIRM / BLOCK", "DTMF confirmation + interrupts", "Freshdesk escalation + audit trail", "First 30 days free"], C.navy, C.white, true],
   ["Custom", "Enterprise", "annual contract", ["Custom SOP rule packs", "Transcript retention + data residency in India", "SLA"], C.slate, C.navy, false]].forEach(([p, n, u, items, f, c, hi], i) => {
    const x = 0.9 + i * 4.0, y = hi ? 1.7 : 1.95, h = hi ? 4.55 : 4.1;
    card(s, x, y, 3.6, h, f);
    T(s, n, { x: x + 0.3, y: y + 0.25, w: 3.0, h: 0.4, fontSize: 15, bold: true, color: hi ? C.amber : C.muted });
    T(s, p, { x: x + 0.3, y: y + 0.65, w: 3.0, h: 0.85, fontFace: HF, fontSize: 40, bold: true, color: c });
    T(s, u, { x: x + 0.3, y: y + 1.5, w: 3.0, h: 0.35, fontSize: 12, color: hi ? C.ice : C.muted });
    bullets(s, items, x + 0.3, y + 2.0, 3.05, h - 2.1, 12.5, c);
  });
  T(s, "Price tracks the risk removed: routine requests are free; only refunds, returns, replacements and cancellations count.", { x: 0.9, y: 6.4, w: 11.6, h: 0.4, fontSize: 12.5, italic: true, color: C.muted, align: "center" });
  footer(s);


  // ===== Go-to-market =====
  s = slide();
  header(s, 9, "Go-to-Market Plan", "A simple commercial path: pilot → measurable proof → Freshworks distribution");
  const gt = [["3 Indian D2C design partners", "Brands already on Freshdesk with AI voice agents"], ["Free monitor-mode pilot", "Measure wrong actions without blocking anything"], ["Publish wrong-action proof", "Case study + Hinglish / Tanglish demo video"], ["Freshworks Marketplace listing", "One-click install for Freshdesk admins"], ["Scale via Freshdesk + BPO partners", "Sold alongside Freshdesk deals in India / SEA"]];
  s.addShape(pres.shapes.LINE, { x: 1.0, y: 2.35, w: 11.3, h: 0, line: { color: C.line, width: 3 } });
  gt.forEach(([h, b], i) => {
    const x = 0.6 + i * 2.45;
    s.addShape(pres.shapes.OVAL, { x: x + 0.1, y: 2.0, w: 0.7, h: 0.7, fill: { color: i === 3 ? C.fresh : C.navy }, line: { color: C.white, width: 3 } });
    T(s, String(i + 1), { x: x + 0.1, y: 2.0, w: 0.7, h: 0.7, fontSize: 18, bold: true, color: C.white, align: "center", valign: "middle" });
    card(s, x, 3.0, 2.25, 2.4);
    T(s, h, { x: x + 0.18, y: 3.15, w: 1.95, h: 0.85, fontFace: HF, fontSize: 14, bold: true, color: C.navy });
    T(s, b, { x: x + 0.18, y: 4.05, w: 1.95, h: 1.25, fontSize: 12 });
  });
  banner(s, 0.6, 5.8, 12.15, 0.9, "Why Freshworks matters", "Freshdesk converts an unsafe/uncertain AI decision into an actionable, context-rich human support case, which is what makes the add-on sellable.", { fill: C.fresh, hc: C.navy, size: 13 });
  footer(s);


  // ===== Costs & resources =====
  s = slide();
  header(s, 10, "Costs & Resources Needed", "Proposed budget for a 3-month MVP");
  [[I.code, "3 engineers", "voice path, safety gate, Freshworks app"], [I.mic, "1 linguist / data annotator", "Hindi + Tamil negation set"], [I.user, "Part-time PM", "pilots + pricing"]].forEach(([ic, h, b], i) => {
    const y = 1.8 + i * 1.0;
    iconCircle(s, ic, 0.6, y, 0.72, C.navy);
    T(s, h, { x: 1.5, y: y + 0.02, w: 3.7, h: 0.38, fontSize: 15, bold: true, color: C.navy });
    T(s, b, { x: 1.5, y: y + 0.38, w: 3.7, h: 0.34, fontSize: 12, color: C.muted });
  });
  card(s, 0.6, 4.95, 4.6, 1.8, C.navy);
  T(s, "~$90K", { x: 0.85, y: 5.0, w: 4.1, h: 0.8, fontFace: HF, fontSize: 40, bold: true, color: C.amber });
  T(s, "proposed MVP budget: salaries, Sarvam / Claude / ElevenLabs / VoBiz usage, negation data labelling", { x: 0.85, y: 5.8, w: 4.1, h: 0.85, fontSize: 11.5, color: C.white });
  const gx = 5.7, gw = 7.05, lw = 2.65, cwid = (gw - lw) / 3;
  T(s, "3-month MVP timeline", { x: gx, y: 1.75, w: 5, h: 0.4, fontFace: HF, fontSize: 17, bold: true, color: C.navy });
  ["Month 1", "Month 2", "Month 3"].forEach((m, i) => T(s, m, { x: gx + lw + i * cwid, y: 2.2, w: cwid, h: 0.3, fontSize: 11, bold: true, color: C.muted, align: "center" }));
  [["Negation dataset + lexicon", 0, 1.2, C.amber], ["Claude safety gate + Dodo", 0.5, 1.5, C.navy], ["VoBiz + Sarvam + ElevenLabs", 1.0, 1.2, C.blue], ["Freshdesk escalation + audit", 1.3, 1.5, C.fresh], ["Design-partner pilot", 2.0, 1.0, C.green]].forEach(([t, st, du, c], i) => {
    const y = 2.6 + i * 0.5;
    s.addShape(pres.shapes.RECTANGLE, { x: gx, y: y - 0.03, w: gw, h: 0.46, fill: { color: i % 2 ? C.white : C.panel }, line: { color: i % 2 ? C.white : C.panel } });
    T(s, t, { x: gx + 0.1, y, w: lw - 0.15, h: 0.4, fontSize: 11.5, valign: "middle" });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: gx + lw + st * cwid, y: y + 0.06, w: du * cwid, h: 0.28, rectRadius: 0.08, fill: { color: c }, line: { color: c } });
  });
  card(s, gx, 5.3, gw, 1.45, C.panel);
  T(s, [{ text: "Optional: revenue estimate (assumption-based)  ", options: { bold: true, color: C.navy, breakLine: true } },
    { text: "100 paying customers × 20,000 guarded actions / month × $5 per 1,000 ≈ ", options: {} }, { text: "$120K ARR in Year 1", options: { bold: true, color: C.green } },
    { text: ". Every input is an assumption to test in the pilot.", options: { color: C.muted } }], { x: gx + 0.25, y: 5.3, w: gw - 0.5, h: 1.45, fontSize: 12.5, valign: "middle" });
  footer(s);


  // ===== Success metrics + performance =====
  s = slide();
  header(s, 11, "Expected Benefits & Success Metrics", "Targets to validate in the pilot, not measured results");
  [["< 0.5%", "Wrong actions", "on negated Hindi + Tamil requests", C.red], ["< 900 ms", "p95 reply time", "on the sensitive-action path", C.navy], ["≤ 15%", "Confirmation rate", "friction budget", C.amberDk],
   ["100%", "Audit coverage", "transcript + decision + API + SOP", C.green], ["−30%", "Reversal tickets", "at pilot customers", C.green], ["15%", "Adoption", "of eligible customers in 2 quarters", C.blue]].forEach(([n, h, d, c], j) => {
    const x = 0.6 + (j % 2) * 3.4, y = 1.75 + Math.floor(j / 2) * 1.65;
    card(s, x, y, 3.2, 1.5);
    T(s, n, { x: x + 0.2, y: y + 0.1, w: 2.8, h: 0.6, fontFace: HF, fontSize: 26, bold: true, color: c, valign: "middle" });
    T(s, h, { x: x + 0.2, y: y + 0.7, w: 2.8, h: 0.32, fontSize: 13, bold: true, color: C.navy });
    T(s, d, { x: x + 0.2, y: y + 1.02, w: 2.8, h: 0.4, fontSize: 10.5, color: C.muted });
  });
  card(s, 7.55, 1.75, 5.2, 4.8, C.panel);
  T(s, "HOW LOW LATENCY IS KEPT", { x: 7.8, y: 1.9, w: 4.7, h: 0.3, fontSize: 11, bold: true, color: C.amber, charSpacing: 1 });
  box(s, 7.8, 2.4, 1.35, 0.8, "Request", { fill: C.slate, color: C.navy, size: 12.5 });
  arrow(s, 9.15, 2.8, 9.35, 2.8, C.navy, 2);
  diamond(s, 9.35, 2.15, 1.95, 1.3, "Sensitive\naction?", { size: 10.5 });
  arrow(s, 10.325, 3.45, 10.325, 3.75, C.amber, 2); lbl(s, 10.4, 3.42, 0.6, "Yes", C.amberDk);
  arrow(s, 11.3, 2.8, 11.5, 2.8, C.green, 2); lbl(s, 11.15, 2.42, 0.5, "No", C.green);
  box(s, 11.5, 2.3, 1.05, 1.0, "Fast path", { fill: C.greenLt, color: C.green, line: C.green, size: 12 });
  rich(s, 7.8, 3.75, 4.75, 1.05, "Risk-based depth", "Claude intent + negation + confirmation only for sensitive / irreversible actions", { fill: C.amberLt, line: C.amber, hc: C.amberDk, hs: 12.5, bs: 11 });
  rich(s, 7.8, 5.0, 4.75, 1.35, "Fallbacks", "DTMF for confirmation · Freshdesk for human handling · transcript retained for audit", { fill: C.freshLt, line: C.fresh, hc: C.fresh, hs: 12.5, bs: 11 });
  footer(s);


  // ===== Risks & assumptions + ask =====
  s = slide();
  header(s, 12, "Risks & Assumptions", "What could go wrong, how we reduce it, and what we're assuming");
  T(s, "KEY RISKS  →  MITIGATION", { x: 0.6, y: 1.75, w: 7, h: 0.3, fontSize: 11, bold: true, color: C.amber, charSpacing: 1 });
  [["Speech-to-text drops the negation", "Confirm every risky action (voice or DTMF)"], ["Safety check adds latency", "Deeper checks only for sensitive actions"], ["Dialect / spelling variation", "Lexicon + model fallback, learn from human overrides"], ["Read-back feels like friction", "≤ 15% confirmation budget, tuned in pilot"]].forEach(([r, m], j) => {
    const y = 2.1 + j * 0.68;
    box(s, 0.6, y, 3.3, 0.56, r, { fill: C.redLt, color: C.red, size: 12, line: C.red });
    arrow(s, 3.9, y + 0.28, 4.3, y + 0.28, C.navy, 2);
    box(s, 4.3, y, 3.35, 0.56, m, { fill: C.greenLt, color: C.green, size: 11.5, line: C.green });
  });
  T(s, "ASSUMPTIONS", { x: 0.6, y: 4.95, w: 7, h: 0.3, fontSize: 11, bold: true, color: C.amber, charSpacing: 1 });
  bullets(s, ["Pilot brands expose refund / return APIs to their AI agent", "Callers accept a short confirmation on risky actions", "Sarvam accuracy on phone audio is good enough with the confirmation fallback"], 0.6, 5.3, 7.05, 1.4, 12.5);
  card(s, 7.95, 1.75, 4.8, 3.2, C.navy);
  T(s, "OUR ASK", { x: 8.25, y: 1.9, w: 3, h: 0.3, fontSize: 11, bold: true, color: C.amber, charSpacing: 1 });
  T(s, "Freshdesk sandbox + Marketplace listing path for a 3-brand pilot.", { x: 8.25, y: 2.25, w: 4.25, h: 1.0, fontFace: HF, fontSize: 18, bold: true, color: C.white });
  T(s, "Use the pilot to measure wrong-action reduction, confirmation rate, latency and adoption.", { x: 8.25, y: 3.4, w: 4.25, h: 1.0, fontSize: 12.5, color: C.ice });
  card(s, 7.95, 5.2, 4.8, 1.5, C.amberLt);
  T(s, [{ text: "Decision principle  ", options: { bold: true, color: C.amberDk, breakLine: true } }, { text: "Do not silently guess on a sensitive action; expose uncertainty, confirm or route to a human.", options: {} }], { x: 8.2, y: 5.2, w: 4.35, h: 1.5, fontSize: 13, valign: "middle" });
  footer(s);

  // ===== 25. Final pitch =====
  s = slide(true);
  T(s, "★", { x: 0.6, y: 0.48, w: 0.62, h: 0.62, align: "center", valign: "middle", fontSize: 15, bold: true, color: C.navy, shape: pres.shapes.OVAL, fill: { color: C.amber } });
  T(s, "Final Pitch — Why This Is a Freshworks Extension", { x: 1.4, y: 0.4, w: 11.4, h: 0.78, fontFace: HF, fontSize: 27, bold: true, color: C.white, valign: "middle" });
  T(s, "A concise closing story for the judges", { x: 1.4, y: 1.13, w: 11, h: 0.4, fontSize: 14, italic: true, color: C.ice });
  [["THE PROBLEM", "Code-mixed voice + negation can cause an AI agent to misunderstand an action.", C.red],
   ["THE PRODUCT", "An intent-validation safety gate between what the voice agent hears and what it is allowed to do: Understand → Decide → Act → Audit.", C.amber],
   ["THE FRESHWORKS VALUE", "When the AI should not act, Freshdesk turns uncertainty into a structured human workflow with transcript + decision context.", C.fresh]].forEach(([h, b, c], i) => {
    const x = 0.6 + i * 4.1;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.8, w: 3.85, h: 1.95, rectRadius: 0.1, fill: { color: C.navy2 }, line: { color: C.navy2 } });
    s.addShape(pres.shapes.OVAL, { x: x + 0.25, y: 2.0, w: 0.25, h: 0.25, fill: { color: c }, line: { color: c } });
    T(s, h, { x: x + 0.6, y: 1.95, w: 3.1, h: 0.35, fontSize: 11.5, bold: true, color: c, charSpacing: 1, valign: "middle" });
    T(s, b, { x: x + 0.25, y: 2.4, w: 3.4, h: 1.25, fontSize: 13, color: C.white });
  });
  T(s, "THE DEMO", { x: 0.6, y: 4.0, w: 3, h: 0.3, fontSize: 11.5, bold: true, color: C.amber, charSpacing: 1 });
  chevrons(s, ["VoBiz", "Sarvam", "Claude", "Codemix decision", "Dodo action OR Freshdesk ticket", "ElevenLabs", "Audit trail"], 0.6, 4.35, 12.15, 0.75, { fill: C.navy2, hi: [3], size: 11 });
  T(s, [{ text: "“Don't cancel” should mean don't cancel", options: { color: C.white, bold: true } }, { text: " — and Freshworks should know exactly what happened when the AI chooses not to act.", options: { color: C.ice } }],
    { x: 0.6, y: 5.45, w: 12.15, h: 0.9, fontFace: HF, fontSize: 21, valign: "middle" });
  T(s, "Codemix Skill  •  Understand → Decide → Act → Audit  •  Thank you", { x: 0.6, y: 6.5, w: 12, h: 0.35, fontSize: 13, color: "8FA0BF" });
  footer(s, true);


  await pres.writeFile({ fileName: OUT });
  console.log("wrote", OUT, N);
})();
