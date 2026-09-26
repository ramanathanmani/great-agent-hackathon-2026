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
  T(s, String(num), { x: 0.6, y: 0.48, w: 0.62, h: 0.62, align: "center", valign: "middle", fontSize: String(num).length > 3 ? 9 : String(num).length > 2 ? 11 : 15, bold: true, color: C.navy });
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

  // ===== 1. Title + Initiative overview =====
  let s = slide(true);
  T(s, "SECTION 1 OF 12  ·  INITIATIVE OVERVIEW", { x: 6.3, y: 0.12, w: 6.45, h: 0.28, fontSize: 9, bold: true, color: "8FA0BF", align: "right", charSpacing: 1 });
  T(s, "THE GREAT AGENT HACKATHON 2026  ·  FINAL ROUND", { x: 0.7, y: 0.55, w: 9, h: 0.35, fontSize: 12.5, bold: true, color: C.amber, charSpacing: 2 });
  T(s, "CODEMIX SKILL", { x: 0.7, y: 0.9, w: 11.5, h: 0.95, fontFace: HF, fontSize: 48, bold: true, color: C.white });
  T(s, "The safety + decision layer between AI agents and their actions", { x: 0.7, y: 1.85, w: 11.8, h: 0.5, fontSize: 21, color: C.ice });
  T(s, "We put an intent-validation safety gate between what the voice agent hears and what the agent is allowed to do.", { x: 0.7, y: 2.35, w: 11.9, h: 0.62, fontSize: 15.5, bold: true, color: C.white, valign: "top" });
  T(s, "Initiative: Codemix Skill   ·   Owner: Team Ramanathan & Sadhana   ·   Track 1: Customer & Employee Experience", { x: 0.7, y: 3.02, w: 11.9, h: 0.32, fontSize: 12.5, color: "8FA0BF" });
  [["THE GAP", "Voice agents can immediately call a refund, cancellation or replacement API. One missed negation turns the right conversation into the wrong transaction.", C.red],
   ["OUR PRODUCT", "A plug-in between the AI agent and its API/tool calls. It validates intent, negation, confidence, sentiment and SOP rules before execution.", C.amber],
   ["FRESHWORKS EXTENSION", "Unsafe, uncertain or escalated calls become Freshdesk tickets with transcript, decision context and action details for a human agent.", C.fresh]].forEach(([h, b, c], i) => {
    const x = 0.7 + i * 4.05;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 3.55, w: 3.8, h: 2.1, rectRadius: 0.1, fill: { color: C.navy2 }, line: { color: C.navy2 } });
    s.addShape(pres.shapes.OVAL, { x: x + 0.22, y: 3.73, w: 0.24, h: 0.24, fill: { color: c }, line: { color: c } });
    T(s, h, { x: x + 0.56, y: 3.68, w: 3.1, h: 0.34, fontSize: 11.5, bold: true, color: c, charSpacing: 1, valign: "middle" });
    T(s, b, { x: x + 0.22, y: 4.12, w: 3.4, h: 1.45, fontSize: 12.5, color: C.white });
  });
  chevrons(s, ["Understand", "Decide", "Act", "Audit"], 0.7, 6.0, 5.6, 0.62, { fill: C.navy2, size: 13.5, hi: [1] });
  T(s, [{ text: "“Order cancel ", options: { color: C.ice } }, { text: "mat", options: { color: C.amber, bold: true } }, { text: " karo, bas address change karna hai.”", options: { color: C.ice } }],
    { x: 6.55, y: 6.0, w: 6.2, h: 0.62, fontFace: HF, fontSize: 14, italic: true, valign: "middle" });
  footer(s, true);


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
   ["26%", "of cash-on-delivery orders in India return to origin, so refund / cancel / return calls are high-volume", "Source: Shipway ShipNotes report, FY25 (Jul 2025)", C.navy]].forEach(([n, d, src, c], i) => {
    const x = 0.6 + i * 6.2;
    card(s, x, 5.0, 5.95, 1.75);
    T(s, n, { x: x + 0.25, y: 5.1, w: 1.6, h: 1.2, fontFace: HF, fontSize: 34, bold: true, color: c, valign: "middle" });
    T(s, d, { x: x + 1.95, y: 5.12, w: 3.8, h: 1.15, fontSize: 13, color: C.ink, valign: "middle" });
    T(s, src, { x: x + 0.25, y: 6.3, w: 3.4, h: 0.4, fontSize: 9, italic: true, color: C.muted });
  });
  footer(s);
  s.addNotes("The 48% is reproducible: node decision-policy/negation-benchmark.mjs. It is a small team-written set, so present it as evidence the problem is real, not as a production accuracy figure.");



  // ===== 3. Why now + competitive =====
  s = slide();
  header(s, "3·4", "Why Now & Competitive Landscape", "AI agents have write access, and nobody gates what they are allowed to do on a misheard word", 13.5, "SECTIONS 3 & 4 OF 12  ·  WHY NOW  ·  COMPETITIVE LANDSCAPE");
  T(s, "WHY NOW", { x: 0.6, y: 1.72, w: 4, h: 0.28, fontSize: 10.5, bold: true, color: C.amber, charSpacing: 1 });
  [[I.bolt, "AI agents can act", "Tool calling and MCP let agents trigger refunds, cancellations and returns directly."],
   [I.lang, "Code-mixing is normal", "Indian callers switch language mid-sentence; the risk sits in small intent-flipping words."],
   [I.wave, "The voice stack is ready", "VoBiz, Sarvam, Claude and ElevenLabs make a checked, real-time voice agent possible now."]].forEach(([ic, h, b], i) => {
    const y = 2.07 + i * 0.86;
    iconCircle(s, ic, 0.6, y + 0.05, 0.6, C.amberLt);
    T(s, h, { x: 1.35, y, w: 4.9, h: 0.32, fontSize: 13.5, bold: true, color: C.navy });
    T(s, b, { x: 1.35, y: y + 0.32, w: 4.9, h: 0.46, fontSize: 11.5 });
  });
  card(s, 0.6, 4.72, 5.8, 1.1, C.amberLt);
  T(s, "27–70%", { x: 0.8, y: 4.72, w: 1.75, h: 1.1, fontFace: HF, fontSize: 26, bold: true, color: C.amberDk, valign: "middle" });
  T(s, [{ text: "Hinglish word error rate across speech-to-text models. ", options: { bold: true, color: C.navy } }, { text: "Speech recognition alone can't be trusted with irreversible actions.", options: {} }, { text: "  Deepgram", options: { italic: true, color: C.muted, fontSize: 9 } }],
    { x: 2.55, y: 4.72, w: 3.75, h: 1.1, fontSize: 11, valign: "middle" });
  // competitive table
  T(s, "COMPETITIVE LANDSCAPE", { x: 6.75, y: 1.72, w: 5, h: 0.28, fontSize: 10.5, bold: true, color: C.amber, charSpacing: 1 });
  [["Alternative", 6.85, 1.75], ["Strength", 8.65, 1.75], ["Gap", 10.45, 2.2]].forEach(([t, x, w]) => T(s, t, { x, y: 2.05, w, h: 0.28, fontSize: 10, bold: true, color: C.muted }));
  [["Do nothing", "Zero effort", "Risky actions run on the first interpretation"],
   ["Confirm-everything IVR", "Safe confirmation", "Friction on every action, even low-risk ones"],
   ["Generic LLM guardrails", "Policy, toxicity, PII", "Not an action gate for code-mixed negation + speech confidence"],
   ["Codemix Skill", "Code-mixed intent → risk check → ALLOW / CONFIRM / BLOCK", "Unsafe cases go to Freshworks with full context"]].forEach(([n, st, g], i) => {
    const y = 2.38 + i * 0.86, us = i === 3;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.75, y, w: 6.0, h: 0.78, rectRadius: 0.06, fill: { color: us ? C.navy : (i % 2 ? C.white : C.panel) }, line: { color: us ? C.amber : C.panel, width: us ? 1.5 : 0.75 } });
    T(s, n, { x: 6.85, y, w: 1.75, h: 0.78, fontSize: 11.5, bold: true, color: us ? C.amber : C.navy, valign: "middle" });
    T(s, st, { x: 8.65, y, w: 1.75, h: 0.78, fontSize: 10.5, color: us ? C.white : C.ink, valign: "middle" });
    T(s, g, { x: 10.45, y, w: 2.2, h: 0.78, fontSize: 10.5, color: us ? C.ice : C.ink, valign: "middle" });
  });
  banner(s, 0.6, 6.0, 5.8, 0.75, "Our timing", "Not another voice bot: the layer that decides when an agent may call an API.", { size: 11.5 });
  banner(s, 6.75, 6.0, 6.0, 0.75, "Our edge", "Risk-based action gate + human escalation + a full audit record.", { size: 11.5 });
  footer(s);


  // ===== 4. Architecture + tool roles =====
  s = slide();
  header(s, 5, "Solution: the Intent-Validation Safety Gate", "Between what the voice agent hears and what it is allowed to do; each part has one job in preventing a wrong action", 12.5, "SECTION 5 OF 12  ·  PROPOSED SOLUTION");
  const ar = [["Customer", "speaks", C.slate, C.navy], ["VoBiz AI", "receives the call", C.blueLt, C.blue], ["Sarvam AI", "speech → text", C.blueLt, C.blue], ["Claude API", "intent + negation", C.navy, C.amber]];
  ar.forEach(([h, b, f, c], i) => {
    const x = 0.6 + i * 2.3;
    rich(s, x, 1.75, 1.95, 0.85, h, b, { fill: f, hc: c, bc: f === C.navy ? C.white : C.ink, hs: 13, bs: 10.5 });
    arrow(s, x + 1.95, 2.175, x + 2.3, 2.175, C.navy, 2);
  });
  diamond(s, 9.8, 1.6, 2.95, 1.15, "SAFETY GATE · Codemix Skill\nsafe to act?", { fill: C.amber, color: C.navy, size: 10.5 });
  [["NO / angry", "Freshworks ticket → human agent", C.red, C.redLt, 2.05], ["UNCLEAR", "Confirm: read-back, voice or DTMF", C.amberDk, C.amberLt, 5.55], ["YES", "Dodo Payments: refund / return / replace", C.green, C.greenLt, 9.05]].forEach(([lb, t, c, f, x]) => {
    const lc = c === C.amberDk ? C.amber : c;
    arrow(s, 11.275, 2.75, x + 1.6, 3.2, lc, 1.75);
    box(s, x, 3.2, 3.2, 0.62, t, { fill: f, line: lc, color: c, size: 11.5 });
    lbl(s, x + 1.65 + (x > 8 ? 0.2 : 0), 2.9, 1.2, lb, c, 9.5);
    arrow(s, x + 1.6, 3.82, x + 1.6, 4.0, C.muted, 1.25);
  });
  box(s, 2.05, 4.0, 10.2, 0.4, "ElevenLabs speaks every reply in the caller's own language mix", { fill: C.blueLt, color: C.blue, size: 11.5 });
  T(s, "HOW EACH PART PREVENTS A WRONG ACTION", { x: 0.6, y: 4.58, w: 8, h: 0.28, fontSize: 10.5, bold: true, color: C.amber, charSpacing: 1 });
  [["VoBiz AI", "Phone + DTMF", "Keypad confirmation needs no speech recognition", C.blue],
   ["Sarvam AI", "Speech → text", "Hindi + English and Tamil + English transcribed, so the negation reaches the check", C.blue],
   ["Claude API", "Intent + safety", "“Refund vendam” = NO refund, YES replacement", C.navy],
   ["Dodo Payments", "Action API", "Refund / return / replace only after the gate says YES", C.green],
   ["Freshworks", "Human workflow", "Can't be resolved safely → Freshdesk ticket", C.fresh],
   ["ElevenLabs", "Voice reply", "Reads back what it understood in the caller's mix", C.amberDk]].forEach(([n, r, p, c], i) => {
    const x = 0.6 + i * 2.04;
    card(s, x, 4.92, 1.92, 1.8);
    s.addShape(pres.shapes.OVAL, { x: x + 0.15, y: 5.1, w: 0.14, h: 0.14, fill: { color: c }, line: { color: c } });
    T(s, n, { x: x + 0.35, y: 5.02, w: 1.55, h: 0.3, fontSize: 12, bold: true, color: C.navy });
    T(s, r.toUpperCase(), { x: x + 0.3, y: 5.3, w: 1.55, h: 0.25, fontSize: 8.5, bold: true, color: c === C.amberDk ? C.amberDk : c, charSpacing: 1 });
    T(s, p, { x: x + 0.15, y: 5.62, w: 1.68, h: 1.05, fontSize: 10, color: C.ink });
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
    ["Confirm if unsure", "ElevenLabs / keypad", ["Transparent uncertainty", "DTMF + IVR"], "dec"], ["Action", "Dodo / company API", [], "act"],
    ["SOP audit", "company rules", ["SOP auditing"], "aud"], ["Audit trail", "transcript + API log", ["Full audit trail"], "aud"]];
  life2.forEach(([h, b, feats, g], i) => {
    const row = i < 5 ? 0 : 1, col = row ? 9 - i : i, x = 0.6 + col * 2.5, y = row ? 3.8 : 1.72, [f, c] = G2[g];
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 2.1, h: 1.82, rectRadius: 0.08, fill: { color: f }, line: { color: f }, shadow: shadow() });
    s.addShape(pres.shapes.OVAL, { x: x + 0.12, y: y + 0.12, w: 0.4, h: 0.4, fill: { color: g === "act" ? C.amber : c }, line: { color: C.white, width: 1 } });
    T(s, String(i + 1), { x: x + 0.12, y: y + 0.12, w: 0.4, h: 0.4, fontSize: 11.5, bold: true, color: g === "act" ? C.navy : C.white, align: "center", valign: "middle" });
    T(s, h, { x: x + 0.12, y: y + 0.58, w: 1.9, h: 0.32, fontSize: 12.5, bold: true, color: g === "act" ? C.white : c });
    T(s, b, { x: x + 0.12, y: y + 0.9, w: 1.9, h: 0.35, fontSize: 10, color: g === "act" ? C.ice : C.ink });
    feats.forEach((ft, j) => box(s, x + 0.12, y + 1.22 + j * 0.29, 1.86, 0.26, ft, { fill: C.white, color: c === C.white ? C.navy : c, size: 9, margin: 1, r: 0.13, line: c === C.white ? C.navy : c }));
    if (i < 4) arrow(s, x + 2.1, y + 0.97, x + 2.5, y + 0.97, C.amber, 2.5);
    if (i === 4) arrow(s, x + 1.05, y + 1.82, x + 1.05, 3.8, C.amber, 2.5);
    if (i > 4 && i < 9) arrow(s, x, y + 0.97, x - 0.4, y + 0.97, C.amber, 2.5);
  });
  T(s, [{ text: "Sentiment: ", options: { bold: true, color: C.amberDk } }, { text: "Claude scores caller sentiment every turn; two negative turns or an explicit request for a human → Freshdesk ticket.", options: { breakLine: true } }, { text: "Low latency: ", options: { bold: true, color: C.blue } }, { text: "fast offline checks first (1.87 ms measured); Claude runs only before sensitive actions.", options: { breakLine: true } }, { text: "SOP audit: ", options: { bold: true, color: C.green } }, { text: "every call is checked against company rules (authorisation, required confirmation, escalation) → PASS / VIOLATION + audit reference; transcript, decisions and API calls are stored.", options: {} }], { x: 0.6, y: 5.78, w: 12.15, h: 0.95, fontSize: 11, color: C.muted, valign: "middle" });
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
  T(s, "Interrupts: VoBiz voice-activity detection stops ElevenLabs playback the moment the caller speaks; the new words become the latest input.", { x: 0.85, y: 6.18, w: 6.7, h: 0.5, fontSize: 10.5, italic: true, color: C.blue, valign: "middle" });
  card(s, 8.0, 4.6, 4.75, 2.15, C.navy);
  T(s, [{ text: "EXAMPLE OUTCOME", options: { bold: true, color: C.amber, fontSize: 10.5, breakLine: true } },
    { text: "“Refund vendam, replacement anuppunga.”", options: { color: C.white, italic: true, fontSize: 12.5, breakLine: true } },
    { text: "BLOCK refund  →  confirm replacement  →  if unclear, Freshdesk ticket", options: { color: C.ice, fontSize: 12, bold: true } }],
    { x: 8.25, y: 4.6, w: 4.3, h: 2.15, valign: "middle", paraSpaceAfter: 6 });
  footer(s);



  // ===== Freshworks integration =====
  s = slide();
  header(s, 5, "Freshworks Integration — Human-in-the-Loop", "Freshdesk takes the handoff; also works with Freshcaller as the voice channel and alongside Freddy AI Agent", 13, "SECTION 5 OF 12  ·  FRESHWORKS INTEGRATION");
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



  // ===== 8. Agentic design + MVP + proof =====
  s = slide();
  header(s, 5, "Agentic Design, MVP Scope & Early Proof", "A plug-in control point that intercepts the proposed action before the company API is called", 13.5, "SECTION 5 OF 12  ·  AGENTIC / AI DESIGN  ·  MVP SCOPE");
  T(s, "AGENTIC DESIGN: THE PLUG-IN CONTROL POINT", { x: 0.6, y: 1.72, w: 8, h: 0.28, fontSize: 10.5, bold: true, color: C.amber, charSpacing: 1 });
  chevrons(s, ["1  Existing AI agent (Freddy or own) proposes a tool call", "2  Codemix Skill intercepts via MCP / REST", "3  Claude + gate: ALLOW / CONFIRM / BLOCK", "4  Dodo / company API runs, or Freshdesk handoff"], 0.6, 2.05, 12.15, 0.78, { hi: [1], size: 10.5 });
  const ph3 = [["BUILT TODAY", "Code-mix engine + intent scoring · MCP server · live Freshdesk ticket API · negation gate v0 + benchmark · Vercel demo", C.green, C.greenLt],
    ["MVP (3 MONTHS)", "VoBiz + Sarvam + ElevenLabs voice path · Claude safety gate · Dodo action path · Freshdesk escalation · Hindi + Tamil + English · audit trail", C.navy, C.slate],
    ["NEXT", "Sentiment + interrupt tuning · SOP rule editor + reports · more Indian languages · Freshworks Marketplace app", C.blue, C.blueLt]];
  ph3.forEach(([h, b, c, f], i) => {
    const y = 3.1 + i * 1.2;
    s.addText(h, { x: 0.6, y, w: 1.75, h: 1.05, shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.08, fill: { color: c }, line: { color: c }, fontFace: BF, fontSize: 11.5, bold: true, color: C.white, align: "center", valign: "middle", margin: 4, isTextBox: true });
    card(s, 2.45, y, 4.55, 1.05, f);
    T(s, b, { x: 2.62, y, w: 4.25, h: 1.05, fontSize: 11, valign: "middle" });
  });
  card(s, 7.3, 3.1, 5.45, 3.6);
  T(s, "EARLY PROOF (MEASURED)", { x: 7.55, y: 3.2, w: 5, h: 0.28, fontSize: 10.5, bold: true, color: C.amber, charSpacing: 1 });
  s.addChart(pres.charts.BAR, [{ name: "Round-1 engine alone", labels: ["Negated requests"], values: [47.8] }, { name: "With negation gate v0", labels: ["Negated requests"], values: [0] }], {
    x: 7.45, y: 3.45, w: 5.15, h: 2.15, barDir: "col", chartColors: [C.red, C.green], barGapWidthPct: 60,
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.0\"%\"", dataLabelColor: C.ink, dataLabelFontSize: 11, dataLabelFontBold: true,
    catAxisLabelColor: C.ink, catAxisLabelFontSize: 10, valAxisHidden: true, valAxisMaxVal: 60, valAxisMinVal: 0, valGridLine: { style: "none" }, showLegend: true, legendPos: "b", legendFontSize: 10,
    showTitle: true, title: "Wrong refund / cancel on negated requests", titleFontSize: 11, titleColor: C.navy,
  });
  T(s, [{ text: "11 of 23 → 0 of 23 ", options: { bold: true, color: C.navy } }, { text: "wrong actions; 0 of 20 genuine requests blocked. 43 team-written sentences in 6 languages; the pilot measures real calls.", options: {} }], { x: 7.55, y: 5.65, w: 5.0, h: 0.95, fontSize: 10.5 });
  footer(s);
  s.addNotes("Reproduce: node decision-policy/negation-benchmark.mjs. The same run shows the Round-1 keyword engine recognised only 7 of 20 genuine requests, which is why the MVP uses Claude for intent.");


  // ===== 9. Sections 6-9 =====
  s = slide();
  header(s, "6–9", "Customers, Value, Pricing & Go-to-Market", "Start where AI agents already have permission to act; pilot → proof → Freshworks distribution", 13.5, "SECTIONS 6–9 OF 12  ·  CUSTOMERS  ·  VALUE  ·  PRICING  ·  GO-TO-MARKET");
  const quad = (x, y, n, t) => { card(s, x, y, 5.98, 2.42); box(s, x + 0.18, y + 0.14, 0.42, 0.34, String(n), { fill: C.amber, color: C.navy, size: 11, margin: 0, r: 0.1 }); T(s, t, { x: x + 0.7, y: y + 0.12, w: 5, h: 0.38, fontFace: HF, fontSize: 14.5, bold: true, color: C.navy, valign: "middle" }); };
  quad(0.6, 1.72, 6, "Target Customers");
  T(s, [{ text: "Primary: ", options: { bold: true, color: C.navy } }, { text: "D2C, e-commerce and fintech brands on Freshdesk deploying AI voice agents for Indian customers.", options: { breakLine: true } },
    { text: "Secondary: ", options: { bold: true, color: C.navy } }, { text: "BPOs needing one safety / policy layer across many clients.", options: { breakLine: true } },
    { text: "Protected actions: ", options: { bold: true, color: C.navy } }, { text: "refunds, returns, replacements, cancellations.", options: { breakLine: true } },
    { text: "Why now: ~26% of COD orders return to origin (Shipway FY25), so these calls are high-volume.", options: { italic: true, color: C.muted } }],
    { x: 0.8, y: 2.25, w: 5.6, h: 1.82, fontSize: 11, paraSpaceAfter: 3 });
  quad(6.77, 1.72, 7, "Value Proposition");
  T(s, "Plug it in once: the existing agent serves mixed-language callers, and nothing irreversible happens on a misheard word.", { x: 6.95, y: 2.22, w: 5.65, h: 0.55, fontSize: 11, bold: true, color: C.navy });
  [["Without", C.red, ["Acts on first guess", "Dropped “mat” = wrong refund", "Blind escalation, no record"]], ["With Codemix Skill", C.green, ["Checks intent + negation first", "Confirms when unsure", "Freshdesk handoff + audit trail"]]].forEach(([h, c, it], i) => {
    const x = 6.95 + i * 2.85;
    T(s, h, { x, y: 2.8, w: 2.7, h: 0.28, fontSize: 11, bold: true, color: c });
    bullets(s, it, x, 3.08, 2.75, 1.0, 10.5);
  });
  quad(0.6, 4.3, 8, "Pricing & Packaging (proposed)");
  [["Free", "Monitor mode: flags risky actions, never blocks"], ["$0.03", "per guarded action: plug-in on the customer's own agent"], ["₹8 / min", "full voice agent: VoBiz + Sarvam + Claude + ElevenLabs + Freshdesk"], ["Custom", "Enterprise: SOP rule packs, India data residency, SLA"]].forEach(([p, d], j) => {
    const y = 4.78 + j * 0.36;
    T(s, p, { x: 0.8, y, w: 1.3, h: 0.34, fontFace: HF, fontSize: 13, bold: true, color: j === 1 || j === 2 ? C.amberDk : C.navy, valign: "middle" });
    T(s, d, { x: 2.1, y, w: 4.35, h: 0.34, fontSize: 10, valign: "middle" });
  });
  T(s, "Priced above run cost (~55% gross margin, slide 10). One prevented ₹1,000 wrong refund pays for ~390 guarded actions.", { x: 0.8, y: 6.22, w: 5.6, h: 0.45, fontSize: 9.5, italic: true, color: C.muted });
  quad(6.77, 4.3, 9, "Go-to-Market Plan");
  ["3 Indian D2C design partners on Freshdesk", "Free monitor-mode pilot", "Publish wrong-action proof + demo video", "Freshworks Marketplace listing", "Scale via Freshdesk deals + BPO partners"].forEach((t, j) => {
    const y = 4.83 + j * 0.36;
    s.addShape(pres.shapes.OVAL, { x: 6.97, y: y + 0.03, w: 0.27, h: 0.27, fill: { color: j === 3 ? C.fresh : C.navy }, line: { color: C.white } });
    T(s, String(j + 1), { x: 6.97, y: y + 0.03, w: 0.27, h: 0.27, fontSize: 9, bold: true, color: C.white, align: "center", valign: "middle" });
    T(s, t, { x: 7.35, y, w: 5.2, h: 0.33, fontSize: 11, valign: "middle" });
  });
  footer(s);


  // ===== 10. Sections 10-12 + ask =====
  s = slide();
  header(s, "10–12", "Costs, ROI, Success Metrics & Risks", "What it costs to build and run, what it returns, how we measure it, and what could go wrong", 13.5, "SECTIONS 10–12 OF 12  ·  COSTS & ROI  ·  METRICS  ·  RISKS & ASSUMPTIONS");
  const col = (x, n, t) => { card(s, x, 1.72, 3.9, 3.78); box(s, x + 0.18, 1.86, 0.5, 0.34, String(n), { fill: C.amber, color: C.navy, size: 11, margin: 0, r: 0.1 }); T(s, t, { x: x + 0.78, y: 1.84, w: 3.1, h: 0.38, fontFace: HF, fontSize: 14, bold: true, color: C.navy, valign: "middle" }); };
  col(0.6, 10, "Costs & Unit Economics");
  T(s, "~$90K", { x: 0.8, y: 2.28, w: 1.75, h: 0.5, fontFace: HF, fontSize: 24, bold: true, color: C.navy, valign: "middle" });
  T(s, "3-month MVP build: M1 data · M2 gate + voice · M3 Freshdesk + pilot", { x: 2.5, y: 2.28, w: 2.0, h: 0.5, fontSize: 8.5, color: C.muted, valign: "middle" });
  T(s, "Engineers $60K · linguist $10K · PM $8K · APIs $7K · buffer $5K", { x: 0.8, y: 2.78, w: 3.65, h: 0.36, fontSize: 8.5, color: C.ink, valign: "middle" });
  T(s, "RUN COST PER 3-MIN VOICE CALL", { x: 0.8, y: 3.18, w: 3.6, h: 0.25, fontSize: 9, bold: true, color: C.amber, charSpacing: 1 });
  [["VoBiz telephony (₹0.45/min)", "₹1.35"], ["Sarvam STT (₹30/hr)", "₹1.50"], ["ElevenLabs Flash ($0.05/1K chars)", "₹6.40"], ["Claude checks (Haiku 4.5 / Sonnet 5)", "₹0.71"], ["Hosting + transcript storage", "₹0.43"], ["Total ≈ ₹3.5/min vs ₹8 price", "₹10.4"]].forEach(([t, v], j) => {
    const y = 3.44 + j * 0.26, tot = j === 5;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.72, y, w: 3.7, h: 0.25, fill: { color: tot ? C.greenLt : j % 2 ? C.white : C.panel }, line: { color: tot ? C.greenLt : j % 2 ? C.white : C.panel } });
    T(s, t, { x: 0.8, y, w: 2.9, h: 0.25, fontSize: 9, bold: tot, color: tot ? C.green : C.ink, valign: "middle" });
    T(s, v, { x: 3.65, y, w: 0.72, h: 0.25, fontSize: 9, bold: true, color: tot ? C.green : C.navy, align: "right", valign: "middle" });
  });
  T(s, "Plug-in only: ₹1.1 cost vs ₹2.55 price per action. Dodo and Freshdesk fees stay on the customer's own plans.", { x: 0.8, y: 5.05, w: 3.65, h: 0.43, fontSize: 8.5, italic: true, color: C.muted });
  col(4.77, 11, "Success Metrics");
  T(s, "TODAY", { x: 6.95, y: 2.28, w: 0.8, h: 0.25, fontSize: 9, bold: true, color: C.amber, align: "center" });
  T(s, "TARGET", { x: 7.72, y: 2.28, w: 0.8, h: 0.25, fontSize: 9, bold: true, color: C.amber, align: "center" });
  [["Wrong actions on negation", "48%*", "<0.5%"], ["Engine latency", "1.87ms†", "<5ms"], ["p95 reply (sensitive)", "—", "<900ms"], ["Confirmation rate", "—", "≤15%"], ["Audit coverage", "—", "100%"], ["Reversal tickets", "—", "−30%"], ["Adoption (2 qtrs)", "—", "15%"]].forEach(([m, now, tg], j) => {
    const y = 2.52 + j * 0.37;
    s.addShape(pres.shapes.RECTANGLE, { x: 4.87, y, w: 3.65, h: 0.34, fill: { color: j % 2 ? C.white : C.panel }, line: { color: j % 2 ? C.white : C.panel } });
    T(s, m, { x: 4.95, y, w: 2.0, h: 0.34, fontSize: 10.5, bold: true, color: C.navy, valign: "middle" });
    T(s, now, { x: 6.95, y, w: 0.8, h: 0.34, fontSize: 10, bold: true, color: now === "—" ? C.line : now.startsWith("1.87") ? C.green : C.red, align: "center", valign: "middle" });
    T(s, tg, { x: 7.72, y, w: 0.8, h: 0.34, fontSize: 10.5, bold: true, color: C.green, align: "center", valign: "middle" });
  });
  T(s, "* Round-1 engine, no gate, 23-sentence test set   † npm test average", { x: 4.92, y: 5.1, w: 3.6, h: 0.35, fontSize: 8.5, italic: true, color: C.muted });
  col(8.85, 12, "Risks & Assumptions");
  [["STT drops the negation", "confirm every risky action"], ["Safety check adds latency", "deep checks only when sensitive"], ["Dialect / spelling variation", "lexicon + model fallback"], ["Read-back friction", "≤15% confirmation budget"]].forEach(([r, m], j) => {
    const y = 2.3 + j * 0.47;
    T(s, [{ text: r, options: { bold: true, color: C.red, breakLine: true } }, { text: "→ " + m, options: { color: C.green } }], { x: 9.02, y, w: 3.6, h: 0.5, fontSize: 10.5 });
  });
  T(s, "ASSUMPTIONS", { x: 9.02, y: 4.2, w: 3, h: 0.25, fontSize: 9, bold: true, color: C.amber, charSpacing: 1 });
  bullets(s, ["Pilot brands expose refund / return APIs", "Callers accept a short confirmation", "Sarvam is accurate enough with the fallback"], 9.02, 4.45, 3.6, 1.0, 10);
  // ROI strip
  card(s, 0.6, 5.65, 12.15, 1.15, C.navy);
  T(s, "RETURN ON INVESTMENT", { x: 0.85, y: 5.72, w: 3, h: 0.26, fontSize: 10.5, bold: true, color: C.amber, charSpacing: 1 });
  T(s, "illustrative · full assumptions in speaker notes · validated in the pilot", { x: 3.6, y: 5.72, w: 8.9, h: 0.26, fontSize: 9, italic: true, color: "8FA0BF", align: "right" });
  [["~3.8×", "Customer ROI", "₹1.9L saved vs ₹51K fee / month"],
   ["0.26%", "Break-even", "of guarded actions going wrong"],
   ["$349K", "Year-1 revenue", "vs $90K build · ~$195K gross profit"],
   ["~8 mo", "Payback", "after launch, on gross profit"]].forEach(([n, h, d], i) => {
    const x = 0.85 + i * 3.0;
    T(s, n, { x, y: 6.0, w: 1.35, h: 0.72, fontFace: HF, fontSize: 22, bold: true, color: C.amber, valign: "middle" });
    T(s, [{ text: h, options: { bold: true, color: C.white, breakLine: true } }, { text: d, options: { color: C.ice } }], { x: x + 1.38, y: 6.0, w: 1.55, h: 0.72, fontSize: 9.5, valign: "middle" });
  });
  footer(s);
  s.addNotes("ROI assumptions. Unit costs (Sep 2026 list prices, ₹85/$): VoBiz ₹0.45/min; Sarvam STT ₹30/hr; ElevenLabs Flash $0.05 per 1K chars (~1,500 agent chars per 3-min call); Claude checks ~2 per call, Haiku 4.5 ($1/$5 per M tokens) for routine and Sonnet 5 ($2/$10) for ~20% ambiguous cases, ~2K in / 300 out tokens each; hosting + storage ~$0.005. Voice call cost ~₹10.4 per 3 min (~₹3.5/min) vs ₹8/min price (~56% margin). Plug-in cost ~₹1.1 per guarded action vs $0.03 (₹2.55) price (~55% margin). Dodo Payments fees (4% + $0.15 per INR transaction, $1 per refund) and Freshdesk plans are paid by the customer on their own accounts. Year 1: plug-in ramps to 50 customers (avg 25) at 20K guarded actions/month = $180K; voice ramps to 10 brands (avg 5) at 30K minutes/month = $169K; total $349K revenue, ~$195K gross profit; cumulative gross profit passes the $90K build around month 8. Customer ROI: brand with 20K guarded actions pays $600 (₹51K)/month; if 2% of requests contain a negation and 48% of those misfire (our measured rate), ~192 wrong ₹1,000 actions are prevented = ₹1.92L/month, ~3.8x; break-even at 51 prevented actions = 0.26%.");

  await pres.writeFile({ fileName: OUT });
  console.log("wrote", OUT, N);
})();
