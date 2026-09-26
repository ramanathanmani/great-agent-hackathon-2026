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
function header(s, num, title, sub, subSize = 13.5, eyebrow) {
  T(s, eyebrow || `SECTION ${num} OF 12  ·  ${(num === 5 ? SEC5 : SECTIONS[num]).toUpperCase()}`, { x: 6.3, y: 0.12, w: 6.45, h: 0.28, fontSize: 9, bold: true, color: "8A93A3", align: "right", charSpacing: 1 });
  s.addShape(pres.shapes.OVAL, { x: 0.6, y: 0.48, w: 0.62, h: 0.62, fill: { color: C.amber }, line: { color: C.amber } });
  T(s, String(num), { x: 0.6, y: 0.48, w: 0.62, h: 0.62, align: "center", valign: "middle", fontSize: String(num).length > 2 ? 11 : 15, bold: true, color: C.navy });
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



  // ===== Problem =====
  s = slide();
  header(s, 2, "Problem Statement", "In code-mixed voice, one short word can reverse the meaning of an API action");
  [["HINDI", ["Order cancel ", "mat", " karo, bas address change karna hai."], "do NOT cancel → update address"],
   ["TAMIL", ["Refund ", "vendam", ", replacement anuppunga."], "do NOT refund → send replacement"]].forEach(([h, q, c], i) => {
    const x = 0.6 + i * 6.2;
    card(s, x, 1.75, 5.95, 1.5);
    T(s, h + " EXAMPLE", { x: x + 0.3, y: 1.87, w: 5, h: 0.28, fontSize: 10.5, bold: true, color: C.amber, charSpacing: 1 });
    T(s, [{ text: "“" + q[0], options: { color: C.navy } }, { text: q[1], options: { color: C.red, bold: true, underline: { style: "sng" } } }, { text: q[2] + "”", options: { color: C.navy } }],
      { x: x + 0.3, y: 2.17, w: 5.4, h: 0.55, fontFace: HF, fontSize: 16.5, italic: true, valign: "middle" });
    T(s, "Correct intent: " + c, { x: x + 0.3, y: 2.75, w: 5.4, h: 0.38, fontSize: 12.5, bold: true, color: C.green, valign: "middle" });
  });
  // how it breaks
  T(s, "HOW IT BREAKS TODAY", { x: 0.6, y: 3.45, w: 5, h: 0.28, fontSize: 10.5, bold: true, color: C.amber, charSpacing: 1 });
  [["Caller says “don't cancel”", C.slate, C.navy], ["Speech-to-text drops “mat”, or the intent model ignores it", C.amberLt, C.amberDk], ["Agent calls cancel_order()", C.slate, C.navy], ["Order cancelled: money, reshipping, trust lost", C.redLt, C.red]].forEach(([t, f, c], i) => {
    const x = 0.6 + i * 3.08;
    box(s, x, 3.8, 2.75, 0.95, t, { fill: f, color: c, size: 12, line: i === 3 ? C.red : f });
    if (i < 3) arrow(s, x + 2.75, 4.275, x + 3.08, 4.275, C.navy, 2.5);
  });
  // evidence
  [["48%", "of negated requests would still trigger a refund / cancel in our own Round-1 engine", "Measured: 11 of 23 team-written test sentences (Hindi, Tamil, English, Telugu, Kannada, Bengali)", C.red],
   ["27–70%", "word error rate on Hinglish across speech-to-text models, on identical audio", "Source: Deepgram, “Hinglish Voice AI: Why ASR Fails”", C.amberDk],
   ["26%", "of cash-on-delivery orders in India return to origin, so refund / cancel / return calls are high-volume", "Source: Shipway ShipNotes report, FY25 (Jul 2025)", C.navy]].forEach(([n, d, src, c], i) => {
    const x = 0.6 + i * 4.1;
    card(s, x, 5.0, 3.85, 1.75);
    T(s, n, { x: x + 0.25, y: 5.08, w: 3.4, h: 0.6, fontFace: HF, fontSize: 28, bold: true, color: c, valign: "middle" });
    T(s, d, { x: x + 0.25, y: 5.66, w: 3.4, h: 0.62, fontSize: 11.5, color: C.ink });
    T(s, src, { x: x + 0.25, y: 6.3, w: 3.4, h: 0.4, fontSize: 9, italic: true, color: C.muted });
  });
  footer(s);
  s.addNotes("The 48% is reproducible: node decision-policy/negation-benchmark.mjs. It is a small team-written set, so present it as evidence the problem is real, not as a production accuracy figure.");


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
  SEC5 = "Proposed Solution"; header(s, 5, "Solution Architecture", "Codemix Skill is the control point between an existing AI agent and its tools");
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



  // ===== One call, all features =====
  s = slide();
  header(s, 5, "One Call, End to End — All 11 Features", "Every feature appears only where it adds value; routine calls take the fast path");
  const G2 = { conv: [C.blueLt, C.blue], und: [C.slate, C.navy], dec: [C.amberLt, C.amberDk], act: [C.navy, C.white], aud: [C.greenLt, C.green] };
  const life2 = [
    ["Caller speaks", "VoBiz phone line", ["Interrupt handling"], "conv"], ["Speech → text", "Sarvam AI", ["Low latency"], "conv"],
    ["Language + intent", "Codemix engine + Claude", ["Mixed-language", "Intent"], "und"], ["Negation check", "mat / vendam / nahi", ["Negation"], "und"],
    ["Sentiment check", "angry → human", ["Sentiment → human"], "dec"], ["Decision", "ALLOW / CONFIRM / BLOCK", ["Decision layer"], "dec"],
    ["Confirm if unsure", "ElevenLabs voice or keypad", ["Transparent uncertainty", "DTMF + IVR"], "dec"], ["Action", "Dodo / company API", [], "act"],
    ["SOP audit", "company rules", ["SOP auditing"], "aud"], ["Audit trail", "transcript + decisions + API", ["Full audit trail"], "aud"]];
  life2.forEach(([h, b, feats, g], i) => {
    const row = i < 5 ? 0 : 1, col = row ? 9 - i : i, x = 0.6 + col * 2.5, y = row ? 4.05 : 1.75, [f, c] = G2[g];
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 2.1, h: 1.95, rectRadius: 0.08, fill: { color: f }, line: { color: f }, shadow: shadow() });
    s.addShape(pres.shapes.OVAL, { x: x + 0.12, y: y + 0.12, w: 0.4, h: 0.4, fill: { color: g === "act" ? C.amber : c }, line: { color: C.white, width: 1 } });
    T(s, String(i + 1), { x: x + 0.12, y: y + 0.12, w: 0.4, h: 0.4, fontSize: 11.5, bold: true, color: g === "act" ? C.navy : C.white, align: "center", valign: "middle" });
    T(s, h, { x: x + 0.12, y: y + 0.58, w: 1.9, h: 0.32, fontSize: 12.5, bold: true, color: g === "act" ? C.white : c });
    T(s, b, { x: x + 0.12, y: y + 0.9, w: 1.9, h: 0.35, fontSize: 10, color: g === "act" ? C.ice : C.ink });
    feats.forEach((ft, j) => box(s, x + 0.12, y + 1.28 + j * 0.3, 1.86, 0.26, ft, { fill: C.white, color: c === C.white ? C.navy : c, size: 9, margin: 1, r: 0.13, line: c === C.white ? C.navy : c }));
    if (i < 4) arrow(s, x + 2.1, y + 0.97, x + 2.5, y + 0.97, C.amber, 2.5);
    if (i === 4) arrow(s, x + 1.05, y + 1.95, x + 1.05, 4.05, C.amber, 2.5);
    if (i > 4 && i < 9) arrow(s, x, y + 0.97, x - 0.4, y + 0.97, C.amber, 2.5);
  });
  T(s, "White tags = the 11 product features. Low latency: fast offline checks first; Claude runs only before sensitive actions.", { x: 0.6, y: 6.2, w: 12.15, h: 0.5, fontSize: 12, italic: true, color: C.muted, valign: "middle" });
  footer(s);


  // ===== Safety decision + transparent confirmation =====
  s = slide();
  header(s, 5, "The Safety Decision & Transparent Confirmation", "The agent never silently guesses on an irreversible action");
  box(s, 0.6, 1.85, 1.9, 0.95, "AI proposes\nrefund(order)", { fill: C.blueLt, color: C.blue, size: 12.5 });
  arrow(s, 2.5, 2.325, 2.8, 2.325, C.navy);
  diamond(s, 2.8, 1.65, 2.3, 1.35, "Risk check\nmoney /\nirreversible?", { size: 11 });
  arrow(s, 5.1, 2.325, 5.4, 2.325, C.navy);
  diamond(s, 5.4, 1.65, 2.3, 1.35, "Claude check\nnegation +\nconfidence", { size: 11 });
  arrow(s, 7.7, 2.325, 8.0, 2.325, C.navy);
  const oc = [["ALLOW", "High confidence + safe → execute and log.", C.green, C.greenLt], ["CONFIRM", "Uncertain on a risky action → say what's unsure → voice or DTMF.", C.amberDk, C.amberLt], ["BLOCK / ROUTE", "Negation conflicts with the action, or confirmation fails → stop API + Freshdesk.", C.red, C.redLt]];
  oc.forEach(([h, b, c, f], i) => {
    rich(s, 8.0, 1.6 + i * 0.98, 4.75, 0.88, h, b, { fill: f, line: c === C.amberDk ? C.amber : c, hc: c, hs: 12.5, bs: 10.5, align: "left", margin: 10 });
  });
  // conversation
  card(s, 0.6, 3.35, 7.1, 3.4, C.panel);
  T(s, "TRANSPARENT CONFIRMATION IN PRACTICE", { x: 0.85, y: 3.45, w: 6, h: 0.28, fontSize: 10.5, bold: true, color: C.amber, charSpacing: 1 });
  const cv = [["CALLER", "“Refund… vendam… maybe replacement.”", "R", C.white, C.ink, 0.4],
    ["AGENT · ElevenLabs, caller's mix", "“I'm not fully sure whether you want a refund or a replacement. Press 1 for replacement, 2 for a human agent.”", "L", C.navy, C.white, 0.68],
    ["CALLER · keypad via VoBiz", "presses 1  →  no speech-to-text ambiguity", "R", C.amberLt, C.amberDk, 0.38]];
  let yy = 3.78;
  cv.forEach(([who, t, side, f, c, h]) => {
    const w = 5.2, x = side === "L" ? 0.85 : 7.45 - w;
    T(s, who, { x, y: yy, w, h: 0.24, fontSize: 9, bold: true, color: C.muted, align: side === "L" ? "left" : "right" });
    box(s, x, yy + 0.25, w, h, t, { fill: f, color: c, size: 11.5, align: "left", margin: 8, bold: false, r: 0.12 });
    yy += h + 0.3;
  });
  T(s, "Interrupts: the caller can cut in at any time; the agent stops and treats it as the latest input.", { x: 0.85, y: 6.18, w: 6.7, h: 0.5, fontSize: 10.5, italic: true, color: C.blue, valign: "middle" });
  card(s, 8.0, 4.6, 4.75, 2.15, C.navy);
  T(s, [{ text: "EXAMPLE OUTCOME", options: { bold: true, color: C.amber, fontSize: 10.5, breakLine: true } },
    { text: "“Refund vendam, replacement anuppunga.”", options: { color: C.white, italic: true, fontSize: 12.5, breakLine: true } },
    { text: "BLOCK refund  →  confirm replacement  →  if unclear, Freshdesk ticket", options: { color: C.ice, fontSize: 12, bold: true } }],
    { x: 8.25, y: 4.6, w: 4.3, h: 2.15, valign: "middle", paraSpaceAfter: 6 });
  footer(s);


  // ===== Freshworks integration =====
  s = slide();
  header(s, 5, "Freshworks Integration — Human-in-the-Loop", "Freshdesk is where the AI hands over when it should not act alone", 13.5, "SECTION 5 OF 12  ·  FRESHWORKS INTEGRATION");
  rich(s, 0.6, 1.8, 1.8, 1.0, "AI Agent", "proposes action", { fill: C.blueLt, hc: C.blue, hs: 13 });
  arrow(s, 2.4, 2.3, 2.7, 2.3, C.navy, 2.5);
  rich(s, 2.7, 1.8, 2.0, 1.0, "Codemix Skill", "safety gate", { fill: C.navy, hc: C.amber, bc: C.white, hs: 13, line: C.amber, lw: 2 });
  arrow(s, 4.7, 2.3, 5.0, 2.3, C.navy, 2.5);
  diamond(s, 5.0, 1.62, 1.8, 1.36, "Safe to\nact?", { fill: C.amber, color: C.navy, size: 12 });
  arrow(s, 6.8, 2.05, 7.1, 1.95, C.green, 2); arrow(s, 6.8, 2.55, 7.1, 2.75, C.red, 2);
  rich(s, 7.1, 1.6, 5.65, 0.65, "YES → company API executes", "transcript, decision and API call are logged", { fill: C.greenLt, line: C.green, hc: C.green, hs: 12, bs: 10.5 });
  box(s, 7.1, 2.45, 5.65, 0.65, "NO → Freshdesk REST API  ·  POST /api/v2/tickets  →  human agent", { fill: C.fresh, color: C.white, size: 12 });
  // left: when + what we add
  card(s, 0.6, 3.35, 5.1, 3.35);
  iconCircle(s, I.hand, 0.8, 3.5, 0.48, C.red);
  T(s, "A ticket is created when…", { x: 1.4, y: 3.5, w: 4.2, h: 0.48, fontFace: HF, fontSize: 14, bold: true, color: C.navy, valign: "middle" });
  bullets(s, ["the action is unsafe or unclear", "the caller doesn't confirm", "the caller is angry / distressed", "the AI should not guess"], 0.85, 4.05, 4.7, 1.2, 11.5);
  iconCircle(s, I.layers, 0.8, 5.3, 0.48, C.navy);
  T(s, "What we add to Freshdesk", { x: 1.4, y: 5.3, w: 4.2, h: 0.48, fontFace: HF, fontSize: 14, bold: true, color: C.navy, valign: "middle" });
  T(s, "Code-mixed intent validation, action gating, transparent confirmation and structured escalation, on top of ticketing, agent workspace and customer history.", { x: 0.85, y: 5.82, w: 4.7, h: 0.85, fontSize: 11 });
  // right: ticket mock
  card(s, 5.95, 3.35, 6.8, 3.35);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 5.95, y: 3.35, w: 6.8, h: 0.45, rectRadius: 0.1, fill: { color: C.fresh }, line: { color: C.fresh } });
  T(s, "What the human agent receives in the Freshdesk ticket", { x: 6.15, y: 3.35, w: 6.4, h: 0.45, fontSize: 12, bold: true, color: C.white, valign: "middle" });
  [["Conversation", ["Call ID + timestamp", "Original code-mixed transcript", "Detected languages", "English summary", "Voice / DTMF source"], C.blue],
   ["Decision", ["Intent + confidence", "Negation detected", "Safety verdict", "Requested API action", "Confirmation status"], C.amberDk],
   ["Operational", ["Priority / tags", "SOP result", "Reason for escalation", "Attempted API call", "Audit reference"], C.green]].forEach(([h, fs, c], i) => {
    const x = 6.1 + i * 2.2;
    T(s, h.toUpperCase(), { x, y: 3.92, w: 2.1, h: 0.28, fontSize: 10, bold: true, color: c, charSpacing: 1 });
    fs.forEach((t, j) => box(s, x, 4.24 + j * 0.47, 2.08, 0.4, t, { fill: j % 2 ? C.white : C.panel, color: C.ink, size: 10, align: "left", margin: 5, bold: false, line: C.panel }));
  });
  footer(s);


  // ===== Agentic design + SOP audit =====
  s = slide();
  header(s, 5, "Agentic AI Design & SOP Audit Trail", "A plug-in control point: it intercepts the proposed action before the company API is called", 13.5, "SECTION 5 OF 12  ·  AGENTIC / AI DESIGN");
  const ag2 = [["1  EXISTING AI AGENT", "Understands the conversation and proposes a tool / API action.", C.blueLt, C.blue],
    ["2  CODEMIX SKILL (plug-in)", "Claude checks intent + negation; the gate checks risk, sentiment, SOP and confidence.", C.navy, C.amber],
    ["3  DECISION GATE", "ALLOW → API  ·  CONFIRM → caller  ·  BLOCK → stop + Freshdesk", C.amberLt, C.amberDk],
    ["4  COMPANY SYSTEMS", "Dodo / company APIs run only after the gate; Freshdesk gets the handoff.", C.greenLt, C.green]];
  ag2.forEach(([h, b, f, c], i) => {
    const y = 1.75 + i * 1.02;
    rich(s, 0.6, y, 6.0, 0.84, h, b, { fill: f, hc: c, bc: f === C.navy ? C.white : C.ink, hs: 12.5, bs: 11, align: "left", margin: 12, line: i === 1 ? C.amber : f, lw: 2 });
    if (i < 3) arrow(s, 3.6, y + 0.84, 3.6, y + 1.02, C.amber, 2.5);
  });
  T(s, "Plugs in via an MCP / REST adapter around the agent's tool calls. The company keeps its existing agent and APIs.", { x: 0.6, y: 5.9, w: 6.0, h: 0.8, fontSize: 12, italic: true, color: C.muted, valign: "middle" });
  // SOP audit
  card(s, 6.95, 1.75, 5.8, 4.95, C.panel);
  T(s, "SOP-BASED AUDITING", { x: 7.2, y: 1.88, w: 5, h: 0.28, fontSize: 10.5, bold: true, color: C.amber, charSpacing: 1 });
  [["Captured", "transcript · intent · negation · confidence · sentiment · confirmation · API action", C.blue],
   ["Checked", "company SOP · action authorisation · required confirmation · escalation policy", C.navy],
   ["Produced", "PASS / VIOLATION · audit reference · supervisor flag · Freshdesk context", C.green]].forEach(([h, b, c], i) => {
    const y = 2.28 + i * 1.12;
    rich(s, 7.2, y, 5.3, 0.9, h, b, { fill: C.white, line: c, hc: c, hs: 13, bs: 10.5, align: "left", margin: 10 });
    if (i < 2) arrow(s, 9.85, y + 0.9, 9.85, y + 1.12, C.amber, 2);
  });
  T(s, "Every sensitive action can be reconstructed after the call:", { x: 7.2, y: 5.7, w: 5.3, h: 0.3, fontSize: 11, bold: true, color: C.navy });
  T(s, "transcript → intent → decision → confirmation → API call → SOP result → Freshdesk case", { x: 7.2, y: 6.0, w: 5.3, h: 0.55, fontSize: 11, color: C.ink });
  footer(s);


  // ===== MVP scope + proof =====
  s = slide();
  header(s, 5, "MVP Scope, What Is Built & Early Proof", "What's demonstrated today, what the MVP adds, and what we've measured so far", 13.5, "SECTION 5 OF 12  ·  MVP SCOPE");
  const ph2 = [["BUILT TODAY", ["Code-mix tagging engine + intent scoring", "MCP server", "Live Freshdesk ticket API", "Negation gate v0 + benchmark", "Live demo on Vercel"], C.green, C.greenLt],
    ["MVP (3 months)", ["VoBiz + Sarvam + ElevenLabs voice path", "Claude safety gate", "Dodo action path", "Freshdesk escalation", "Hindi + Tamil + English, audit trail"], C.navy, C.slate],
    ["NEXT", ["Sentiment + interrupt tuning", "SOP rule editor + reports", "More Indian languages", "Freshworks Marketplace app", "Plug-in via MCP / REST"], C.blue, C.blueLt]];
  ph2.forEach(([h, items, c, f], i) => {
    const y = 1.75 + i * 1.65;
    s.addText(h, { x: 0.6, y, w: 1.9, h: 1.5, shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.08, fill: { color: c }, line: { color: c }, fontFace: BF, fontSize: 13, bold: true, color: C.white, align: "center", valign: "middle", margin: 4, isTextBox: true });
    card(s, 2.6, y, 4.4, 1.5, f);
    items.forEach((t, j) => T(s, "•  " + t, { x: 2.8, y: y + 0.1 + j * 0.265, w: 4.1, h: 0.26, fontSize: 11 }));
  });
  card(s, 7.3, 1.75, 5.45, 4.95);
  T(s, "EARLY PROOF (MEASURED)", { x: 7.55, y: 1.88, w: 5, h: 0.28, fontSize: 10.5, bold: true, color: C.amber, charSpacing: 1 });
  s.addChart(pres.charts.BAR, [{ name: "Round-1 engine alone", labels: ["Negated requests"], values: [47.8] }, { name: "With negation gate v0", labels: ["Negated requests"], values: [0] }], {
    x: 7.45, y: 2.15, w: 5.15, h: 2.85, barDir: "col", chartColors: [C.red, C.green], barGapWidthPct: 60,
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.0\"%\"", dataLabelColor: C.ink, dataLabelFontSize: 12, dataLabelFontBold: true,
    catAxisLabelColor: C.ink, catAxisLabelFontSize: 11, valAxisHidden: true, valAxisMaxVal: 60, valAxisMinVal: 0, valGridLine: { style: "none" }, showLegend: true, legendPos: "b", legendFontSize: 11,
    showTitle: true, title: "Wrong refund / cancel on negated requests", titleFontSize: 12, titleColor: C.navy,
  });
  T(s, [{ text: "11 of 23 → 0 of 23 ", options: { bold: true, color: C.navy } }, { text: "wrong actions, with 0 of 20 genuine requests wrongly blocked.", options: {} }], { x: 7.55, y: 5.05, w: 5.0, h: 0.6, fontSize: 12 });
  T(s, "43 team-written sentences (Hindi, Tamil, English, Telugu, Kannada, Bengali). A small, self-authored set: the pilot measures real calls. Reproduce: node decision-policy/negation-benchmark.mjs", { x: 7.55, y: 5.7, w: 5.0, h: 0.9, fontSize: 9.5, italic: true, color: C.muted });
  footer(s);
  s.addNotes("The same run shows the Round-1 keyword engine recognised only 7 of 20 genuine refund/cancel requests, which is why the MVP uses Claude for intent detection.");


  // ===== Target customers + value proposition =====
  s = slide();
  header(s, "6·7", "Target Customers & Value Proposition", "Start where AI agents already have permission to take customer actions", 13.5, "SECTIONS 6 & 7 OF 12  ·  TARGET CUSTOMERS  ·  VALUE PROPOSITION");
  [[I.store, "Primary", "D2C, e-commerce and fintech brands using Freshdesk and deploying AI voice agents for Indian customers.", C.navy],
   [I.headset, "Secondary", "BPOs and support outsourcers that need one safety / policy layer across many client accounts.", C.blue],
   [I.shield, "Protected actions", "Refunds • returns • replacements • cancellations • any company API exposed to the AI agent.", C.red]].forEach(([ic, h, b, c], i) => {
    const y = 1.75 + i * 1.2;
    card(s, 0.6, y, 5.6, 1.05);
    iconCircle(s, ic, 0.8, y + 0.2, 0.65, c);
    T(s, h, { x: 1.6, y: y + 0.1, w: 4.4, h: 0.35, fontFace: HF, fontSize: 14, bold: true, color: C.navy });
    T(s, b, { x: 1.6, y: y + 0.45, w: 4.45, h: 0.58, fontSize: 11 });
  });
  T(s, "Why they buy: with ~26% of COD orders returning to origin, refund / return / cancel calls are a large share of support volume, and each wrong action costs real money.", { x: 0.6, y: 5.4, w: 5.6, h: 1.3, fontSize: 12, italic: true, color: C.muted });
  card(s, 6.5, 1.75, 6.25, 1.05, C.navy);
  T(s, [{ text: "Plug it in once: ", options: { bold: true, color: C.amber } }, { text: "the existing AI agent serves mixed-language callers, and nothing irreversible happens on a misheard word.", options: { color: C.white } }], { x: 6.75, y: 1.75, w: 5.8, h: 1.05, fontSize: 13.5, valign: "middle" });
  [["Without", I.xmark, C.red, C.redLt, ["Acts on its first interpretation", "A dropped “mat” = a wrong refund", "Blind escalation to humans", "No record of what happened"]],
   ["With Codemix Skill", I.check, C.green, C.greenLt, ["Validates intent + negation first", "Confirms when unsure (voice / DTMF)", "Freshdesk handoff with full context", "Full, SOP-checked audit trail"]]].forEach(([h, ic, c, f, items], i) => {
    const x = 6.5 + i * 3.18;
    card(s, x, 3.0, 3.07, 3.7, f);
    s.addImage({ data: ic, x: x + 0.2, y: 3.15, w: 0.38, h: 0.38 });
    T(s, h, { x: x + 0.65, y: 3.12, w: 2.35, h: 0.45, fontFace: HF, fontSize: 14, bold: true, color: c, valign: "middle" });
    bullets(s, items, x + 0.25, 3.75, 2.7, 2.85, 13.5);
  });
  footer(s);


  // ===== Pricing + GTM =====
  s = slide();
  header(s, "8·9", "Pricing & Packaging · Go-to-Market Plan", "Pilot → measurable proof → Freshworks distribution", 13.5, "SECTIONS 8 & 9 OF 12  ·  PRICING & PACKAGING  ·  GO-TO-MARKET");
  [["Free", "Monitor mode", "Flags risky actions, never blocks · weekly wrong-action report", C.slate, C.navy],
   ["$5", "per 1,000 guarded actions", "Full safety gate, DTMF confirm, Freshdesk escalation, audit trail · 30 days free", C.navy, C.white],
   ["Custom", "Enterprise", "Custom SOP rule packs · transcript retention + India data residency · SLA", C.slate, C.navy]].forEach(([p, n, d, f, c], i) => {
    const y = 1.75 + i * 1.18;
    card(s, 0.6, y, 5.9, 1.05, f);
    T(s, p, { x: 0.8, y, w: 1.55, h: 1.05, fontFace: HF, fontSize: 22, bold: true, color: f === C.navy ? C.amber : c, valign: "middle" });
    T(s, n, { x: 2.4, y: y + 0.1, w: 3.95, h: 0.3, fontSize: 12.5, bold: true, color: c });
    T(s, d, { x: 2.4, y: y + 0.4, w: 3.95, h: 0.6, fontSize: 10.5, color: f === C.navy ? C.ice : C.ink });
  });
  card(s, 0.6, 5.35, 5.9, 1.35, C.amberLt);
  T(s, [{ text: "Why the price works  ", options: { bold: true, color: C.amberDk, breakLine: true } }, { text: "Only sensitive actions are metered. One prevented wrong refund of ₹1,000 (~$11) pays for over 2,000 guarded actions. Proposed; validated in the pilot.", options: {} }], { x: 0.85, y: 5.35, w: 5.45, h: 1.35, fontSize: 11.5, valign: "middle" });
  // GTM vertical timeline
  card(s, 6.8, 1.75, 5.95, 4.95);
  T(s, "GO-TO-MARKET", { x: 7.05, y: 1.88, w: 3, h: 0.28, fontSize: 10.5, bold: true, color: C.amber, charSpacing: 1 });
  s.addShape(pres.shapes.LINE, { x: 7.27, y: 2.45, w: 0, h: 3.35, line: { color: C.line, width: 2 } });
  [["3 Indian D2C design partners", "already on Freshdesk with AI voice agents"], ["Free monitor-mode pilot", "measure wrong actions without blocking"], ["Publish wrong-action proof", "case study + Hinglish / Tanglish demo"], ["Freshworks Marketplace listing", "one-click install for Freshdesk admins"], ["Scale via Freshdesk + BPO partners", "sold alongside Freshdesk deals, India / SEA"]].forEach(([h, b], j) => {
    const y = 2.3 + j * 0.78;
    s.addShape(pres.shapes.OVAL, { x: 7.08, y, w: 0.38, h: 0.38, fill: { color: j === 3 ? C.fresh : C.navy }, line: { color: C.white, width: 1.5 } });
    T(s, String(j + 1), { x: 7.08, y, w: 0.38, h: 0.38, fontSize: 11, bold: true, color: C.white, align: "center", valign: "middle" });
    T(s, h, { x: 7.65, y: y - 0.05, w: 4.9, h: 0.3, fontSize: 12.5, bold: true, color: C.navy });
    T(s, b, { x: 7.65, y: y + 0.25, w: 4.9, h: 0.3, fontSize: 11, color: C.muted });
  });
  T(s, "Why Freshworks: Freshdesk turns an unsafe AI decision into an actionable human case.", { x: 7.05, y: 6.2, w: 5.5, h: 0.4, fontSize: 11, bold: true, color: C.fresh });
  footer(s);


  // ===== Costs =====
  s = slide();
  header(s, 10, "Costs & Resources Needed", "~$90K proposed budget for a 3-month MVP (estimates)");
  T(s, "BUDGET BREAKDOWN (ESTIMATE)", { x: 0.6, y: 1.75, w: 5, h: 0.28, fontSize: 10.5, bold: true, color: C.amber, charSpacing: 1 });
  [["3 engineers × 3 months", "voice path, safety gate, Freshworks app", 60], ["Linguist + data labelling", "~5,000 Hindi + Tamil utterances", 10], ["Part-time PM", "pilots + pricing", 8], ["API + telephony usage", "Sarvam, Claude, ElevenLabs, VoBiz, Dodo", 7], ["Contingency", "", 5]].forEach(([h, b, v], j) => {
    const y = 2.1 + j * 0.66;
    T(s, h, { x: 0.6, y, w: 3.0, h: 0.3, fontSize: 12, bold: true, color: C.navy });
    T(s, b, { x: 0.6, y: y + 0.28, w: 3.0, h: 0.28, fontSize: 9.5, color: C.muted });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 3.7, y: y + 0.08, w: 2.2 * v / 60, h: 0.36, rectRadius: 0.06, fill: { color: j === 0 ? C.navy : C.blue }, line: { color: j === 0 ? C.navy : C.blue } });
    T(s, `$${v}K`, { x: 3.75 + 2.2 * v / 60, y: y + 0.08, w: 0.8, h: 0.36, fontSize: 12, bold: true, color: C.navy, valign: "middle" });
  });
  card(s, 0.6, 5.5, 5.8, 1.2, C.navy);
  T(s, [{ text: "~$90K total", options: { bold: true, color: C.amber, fontSize: 24, breakLine: true } }, { text: "3 engineers · 1 linguist · part-time PM · 3 months", options: { color: C.white, fontSize: 13 } }], { x: 0.85, y: 5.5, w: 5.4, h: 1.2, valign: "middle" });
  const gx2 = 6.75, gw2 = 6.0, lw2 = 2.4, cw2 = (gw2 - lw2) / 3;
  T(s, "3-MONTH MVP TIMELINE", { x: gx2, y: 1.75, w: 5, h: 0.28, fontSize: 10.5, bold: true, color: C.amber, charSpacing: 1 });
  ["Month 1", "Month 2", "Month 3"].forEach((m, i) => T(s, m, { x: gx2 + lw2 + i * cw2, y: 2.1, w: cw2, h: 0.28, fontSize: 10.5, bold: true, color: C.muted, align: "center" }));
  [["Negation dataset + lexicon", 0, 1.2, C.amber], ["Claude gate + Dodo", 0.5, 1.5, C.navy], ["VoBiz + Sarvam + ElevenLabs", 1.0, 1.2, C.blue], ["Freshdesk + audit", 1.3, 1.5, C.fresh], ["Design-partner pilot", 2.0, 1.0, C.green]].forEach(([t, st, du, c], i) => {
    const y = 2.45 + i * 0.5;
    s.addShape(pres.shapes.RECTANGLE, { x: gx2, y: y - 0.03, w: gw2, h: 0.46, fill: { color: i % 2 ? C.white : C.panel }, line: { color: i % 2 ? C.white : C.panel } });
    T(s, t, { x: gx2 + 0.1, y, w: lw2 - 0.15, h: 0.4, fontSize: 11, valign: "middle" });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: gx2 + lw2 + st * cw2, y: y + 0.06, w: du * cw2, h: 0.28, rectRadius: 0.08, fill: { color: c }, line: { color: c } });
  });
  card(s, gx2, 5.1, gw2, 1.6, C.panel);
  T(s, [{ text: "Optional revenue estimate (assumption-based)", options: { bold: true, color: C.navy, breakLine: true } },
    { text: "100 customers × 20,000 guarded actions / month × $5 per 1,000 ≈ ", options: {} }, { text: "$120K ARR in Year 1", options: { bold: true, color: C.green } },
    { text: ". Every input is tested in the pilot.", options: { color: C.muted } }], { x: gx2 + 0.25, y: 5.1, w: gw2 - 0.5, h: 1.6, fontSize: 12, valign: "middle" });
  footer(s);


  // ===== Metrics =====
  s = slide();
  header(s, 11, "Expected Benefits & Success Metrics", "Baseline where we have one; everything else is a pilot target");
  T(s, "METRIC", { x: 0.6, y: 1.75, w: 3, h: 0.28, fontSize: 10.5, bold: true, color: C.amber, charSpacing: 1 });
  T(s, "TODAY", { x: 4.1, y: 1.75, w: 1.6, h: 0.28, fontSize: 10.5, bold: true, color: C.amber, charSpacing: 1, align: "center" });
  T(s, "PILOT TARGET", { x: 5.8, y: 1.75, w: 1.6, h: 0.28, fontSize: 10.5, bold: true, color: C.amber, charSpacing: 1, align: "center" });
  [["Wrong actions on negated requests", "48%*", "< 0.5%", C.red], ["p95 reply time (sensitive path)", "—", "< 900 ms", C.navy], ["Confirmation rate (friction budget)", "—", "≤ 15%", C.amberDk], ["Audit coverage", "—", "100%", C.green], ["Refund / cancel reversal tickets", "—", "−30%", C.green], ["Adoption (eligible customers, 2 quarters)", "—", "15%", C.blue]].forEach(([m, now, tgt, c], j) => {
    const y = 2.1 + j * 0.68;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y, w: 6.9, h: 0.58, rectRadius: 0.06, fill: { color: j % 2 ? C.white : C.panel }, line: { color: C.panel } });
    T(s, m, { x: 0.8, y, w: 3.3, h: 0.58, fontSize: 12.5, bold: true, color: C.navy, valign: "middle" });
    T(s, now, { x: 4.1, y, w: 1.6, h: 0.58, fontSize: 15, bold: true, color: now === "—" ? C.line : C.red, align: "center", valign: "middle" });
    T(s, tgt, { x: 5.8, y, w: 1.6, h: 0.58, fontFace: HF, fontSize: 16, bold: true, color: c, align: "center", valign: "middle" });
  });
  T(s, "* Round-1 engine without the gate, on the 23-sentence negation test set.", { x: 0.6, y: 6.25, w: 6.9, h: 0.4, fontSize: 10, italic: true, color: C.muted });
  card(s, 7.85, 1.75, 4.9, 4.95, C.panel);
  T(s, "HOW LOW LATENCY IS KEPT", { x: 8.1, y: 1.88, w: 4.5, h: 0.28, fontSize: 10.5, bold: true, color: C.amber, charSpacing: 1 });
  box(s, 8.1, 2.4, 1.25, 0.8, "Request", { fill: C.slate, color: C.navy, size: 12 });
  arrow(s, 9.35, 2.8, 9.55, 2.8, C.navy, 2);
  diamond(s, 9.55, 2.15, 1.85, 1.3, "Sensitive\naction?", { size: 10.5 });
  arrow(s, 10.475, 3.45, 10.475, 3.75, C.amber, 2); lbl(s, 10.55, 3.42, 0.6, "Yes", C.amberDk);
  arrow(s, 11.4, 2.8, 11.55, 2.8, C.green, 2); lbl(s, 11.2, 2.42, 0.5, "No", C.green);
  box(s, 11.55, 2.3, 1.0, 1.0, "Fast path", { fill: C.greenLt, color: C.green, line: C.green, size: 11.5 });
  rich(s, 8.1, 3.75, 4.45, 1.1, "Risk-based depth", "Claude intent + negation + confirmation only for sensitive / irreversible actions", { fill: C.amberLt, line: C.amber, hc: C.amberDk, hs: 12.5, bs: 11 });
  rich(s, 8.1, 5.05, 4.45, 1.4, "Fallbacks", "DTMF for confirmation · Freshdesk for human handling · transcript retained for audit", { fill: C.freshLt, line: C.fresh, hc: C.fresh, hs: 12.5, bs: 11 });
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
