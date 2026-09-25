// Builds the ActionGuard business-case deck (TGAH Round 2 presentation format).
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa6");

const OUT = process.argv[2] || "ActionGuard-Business-Case.pptx";

const C = {
  navy: "14213D", navy2: "1F3057", ink: "1F2937", muted: "5B6475", ice: "CADCFC",
  amber: "F4A300", amberLt: "FFF4DA", red: "C8283C", redLt: "FBE4E7",
  green: "1F8A63", greenLt: "E1F3EC", slate: "E9EDF3", line: "B8C2D0", white: "FFFFFF",
  blue: "2A5C8A", blueLt: "E4EDF6",
};
const HF = "Cambria", BF = "Calibri";
const W = 13.333;

async function icon(name, color, size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(
    React.createElement(fa[name], { color: "#" + color, size: String(size) })
  );
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.title = "FreshVoice ActionGuard — Business Case";
pres.author = "Team Ramanathan & Sadhana";

// ---------- helpers ----------
function header(s, num, title, sub) {
  s.addShape(pres.shapes.OVAL, { x: 0.6, y: 0.5, w: 0.62, h: 0.62, fill: { color: C.amber }, line: { color: C.amber } });
  s.addText(num, { x: 0.6, y: 0.5, w: 0.62, h: 0.62, align: "center", valign: "middle", fontFace: BF, fontSize: 15, bold: true, color: C.navy, margin: 0, isTextBox: true });
  s.addText(title, { x: 1.4, y: 0.42, w: 11.3, h: 0.78, fontFace: HF, fontSize: 32, bold: true, color: C.navy, valign: "middle", margin: 0, isTextBox: true });
  if (sub) s.addText(sub, { x: 1.4, y: 1.14, w: 11.3, h: 0.4, fontFace: BF, fontSize: 15, color: C.muted, italic: true, margin: 0, isTextBox: true });
}
function box(s, x, y, w, h, text, o = {}) {
  s.addText(text, {
    x, y, w, h, shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: o.r ?? 0.08,
    fill: { color: o.fill || C.slate }, line: { color: o.line || o.fill || C.slate, width: o.lw || 1 },
    fontFace: o.font || BF, fontSize: o.size || 13, color: o.color || C.ink, bold: !!o.bold,
    align: o.align || "center", valign: o.valign || "middle", margin: o.margin ?? 6, isTextBox: true,
  });
}
function diamond(s, x, y, w, h, text, o = {}) {
  s.addText(text, {
    x, y, w, h, shape: pres.shapes.DIAMOND, fill: { color: o.fill || C.navy }, line: { color: o.fill || C.navy },
    fontFace: BF, fontSize: o.size || 12, bold: true, color: o.color || C.white, align: "center", valign: "middle", margin: 2, isTextBox: true,
  });
}
function arrow(s, x1, y1, x2, y2, color = C.muted, w = 2) {
  s.addShape(pres.shapes.LINE, {
    x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001,
    flipH: x2 < x1, flipV: y2 < y1, line: { color, width: w, endArrowType: "triangle" },
  });
}
function label(s, x, y, w, text, color = C.muted, size = 11, bold = true) {
  s.addText(text, { x, y, w, h: 0.3, fontFace: BF, fontSize: size, bold, color, align: "center", margin: 0, isTextBox: true });
}
function shadow() { return { type: "outer", color: "000000", blur: 6, offset: 2, angle: 90, opacity: 0.12 }; }
function card(s, x, y, w, h, fill = C.white) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.1, fill: { color: fill }, line: { color: "DDE3EB", width: 0.75 }, shadow: shadow() });
}
function iconCircle(s, data, x, y, d, fill) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill } });
  const p = d * 0.25;
  s.addImage({ data, x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p });
}
function footer(s, dark = false) {
  s.addText("FreshVoice ActionGuard · The Great Agent Hackathon 2026", { x: 0.6, y: 7.02, w: 8, h: 0.3, fontFace: BF, fontSize: 9, color: dark ? "8FA0BF" : "8A93A3", margin: 0, isTextBox: true });
}
function bullets(s, items, x, y, w, h, size = 14, color = C.ink) {
  s.addText(items.map((t, i) => {
    const runs = Array.isArray(t) ? t : [{ text: t }];
    return runs.map((r, j) => ({ text: r.text, options: { bold: r.bold, color: r.color || color, bullet: j === 0 ? true : undefined, breakLine: j === runs.length - 1 && i < items.length - 1, paraSpaceAfter: 6 } }));
  }).flat(), { x, y, w, h, fontFace: BF, fontSize: size, color, valign: "top", margin: 2, isTextBox: true });
}

(async () => {
  const I = {
    shield: await icon("FaShieldHalved", C.navy), bolt: await icon("FaBolt", C.navy), lang: await icon("FaLanguage", C.navy),
    wave: await icon("FaWaveSquare", C.navy), store: await icon("FaStore", C.white), headset: await icon("FaHeadset", C.white),
    ban: await icon("FaBan", C.white), money: await icon("FaMoneyBillWave", C.white), truck: await icon("FaTruck", C.white),
    user: await icon("FaUserTie", C.white), code: await icon("FaCode", C.white), mic: await icon("FaMicrophoneLines", C.white),
    shieldW: await icon("FaShieldHalved", C.white), check: await icon("FaCircleCheck", C.green), xmark: await icon("FaCircleXmark", C.red),
  };

  // ===== 1. Title =====
  let s = pres.addSlide(); s.background = { color: C.navy };
  s.addText("THE GREAT AGENT HACKATHON 2026  ·  ROUND 2 BUSINESS CASE", { x: 0.8, y: 1.0, w: 11, h: 0.4, fontFace: BF, fontSize: 13, bold: true, color: C.amber, charSpacing: 2, margin: 0, isTextBox: true });
  s.addText("FreshVoice ActionGuard", { x: 0.8, y: 1.5, w: 11.5, h: 1.1, fontFace: HF, fontSize: 54, bold: true, color: C.white, margin: 0, isTextBox: true });
  s.addText("A negation-aware safety gate for AI agents that take real actions", { x: 0.8, y: 2.6, w: 11.5, h: 0.6, fontFace: BF, fontSize: 24, color: C.ice, margin: 0, isTextBox: true });
  [["ALLOW", C.green], ["CONFIRM", C.amber], ["BLOCK", C.red]].forEach(([t, c], i) => {
    s.addShape(pres.shapes.OVAL, { x: 0.8 + i * 2.3, y: 3.75, w: 0.42, h: 0.42, fill: { color: c }, line: { color: c } });
    s.addText(t, { x: 1.32 + i * 2.3, y: 3.75, w: 1.7, h: 0.42, fontFace: BF, fontSize: 16, bold: true, color: C.white, valign: "middle", margin: 0, isTextBox: true });
  });
  s.addText([
    { text: "“Order cancel ", options: { color: C.ice } }, { text: "mat", options: { color: C.amber, bold: true } },
    { text: " karo, bas address change karna hai.”", options: { color: C.ice } },
  ], { x: 0.8, y: 4.75, w: 11.5, h: 0.5, fontFace: HF, fontSize: 22, italic: true, margin: 0, isTextBox: true });
  s.addText("One small word. One irreversible action. We check it before the agent acts.", { x: 0.8, y: 5.25, w: 11.5, h: 0.4, fontFace: BF, fontSize: 16, color: "8FA0BF", margin: 0, isTextBox: true });
  s.addText("Team Ramanathan & Sadhana  ·  Track 1: Customer & Employee Experience", { x: 0.8, y: 6.5, w: 11.5, h: 0.4, fontFace: BF, fontSize: 14, color: C.white, margin: 0, isTextBox: true });
  s.addNotes("Open with the sentence. It means 'don't cancel the order, just change the address'. Today an AI agent can hear 'cancel' and do it.");

  // ===== 2. Initiative overview =====
  s = pres.addSlide(); s.background = { color: C.white };
  header(s, "01", "Initiative Overview");
  const ov = [
    ["Initiative", "FreshVoice ActionGuard: a safety gate that sits between an AI support agent and its irreversible tools."],
    ["Owner", "Team Ramanathan & Sadhana, builders of FreshVoice (Round 1)"],
    ["Builds on", "FreshVoice code-mix engine + MCP server, live at codemix-skill.vercel.app"],
  ];
  ov.forEach(([k, v], i) => {
    card(s, 0.6, 1.6 + i * 1.6, 5.6, 1.35);
    s.addText(k.toUpperCase(), { x: 0.85, y: 1.72 + i * 1.6, w: 5.1, h: 0.3, fontFace: BF, fontSize: 11, bold: true, color: C.amber, charSpacing: 1, margin: 0, isTextBox: true });
    s.addText(v, { x: 0.85, y: 2.02 + i * 1.6, w: 5.1, h: 0.85, fontFace: BF, fontSize: 15, color: C.ink, valign: "top", margin: 0, isTextBox: true });
  });
  // mini flow
  s.addText("How it works", { x: 6.9, y: 1.6, w: 5.8, h: 0.4, fontFace: HF, fontSize: 20, bold: true, color: C.navy, margin: 0, isTextBox: true });
  box(s, 6.9, 2.25, 2.3, 1.0, "AI agent wants to call a tool\ncancel_order(48211)", { fill: C.slate, size: 12 });
  arrow(s, 9.2, 2.75, 9.75, 2.75);
  box(s, 9.75, 2.1, 2.9, 1.3, "ActionGuard\nchecks negation, confidence\nand action risk", { fill: C.navy, color: C.white, size: 13, bold: true });
  const outs = [["ALLOW", "Execute and log", C.green, C.greenLt], ["CONFIRM", "Read back in caller's language", C.amber, C.amberLt], ["BLOCK", "Stop and re-route / hand off", C.red, C.redLt]];
  outs.forEach(([t, d, c, lt], i) => {
    const x = 6.9 + i * 2.0;
    arrow(s, 11.2, 3.4, x + 0.9, 4.25, C.line, 1.5);
    box(s, x, 4.3, 1.8, 1.3, "", { fill: lt, line: c });
    s.addText([{ text: t, options: { bold: true, color: c, fontSize: 15, breakLine: true } }, { text: d, options: { color: C.ink, fontSize: 11 } }],
      { x: x + 0.05, y: 4.35, w: 1.7, h: 1.2, fontFace: BF, align: "center", valign: "middle", margin: 2, isTextBox: true });
  });
  s.addText("Most actions go straight through. We only ask a question when the action is irreversible and we aren't sure.", { x: 6.9, y: 5.85, w: 5.8, h: 0.7, fontFace: BF, fontSize: 13, italic: true, color: C.muted, margin: 0, isTextBox: true });
  footer(s);
  s.addNotes("Name, owner, and the core idea: every irreversible tool call passes through a gate with three outcomes.");

  // ===== 3. Problem statement =====
  s = pres.addSlide(); s.background = { color: C.white };
  header(s, "02", "Problem Statement", "AI support agents now do things, and code-mixed speech is where they will get it wrong");
  bullets(s, [
    "AI support agents no longer just answer questions. They cancel orders, issue refunds and change addresses on their own.",
    "Indian callers mix languages mid-sentence, and the meaning often hangs on one small negation word: mat, nahi, vendam, vaddu.",
    "On phone audio, that short word is exactly what speech-to-text mishears or drops.",
    "The agent then takes the opposite action. It can't be undone, and it costs refunds, reshipping and customer trust.",
  ], 0.6, 1.75, 5.7, 4.6, 15);
  const ex = [
    ["HINDI NEGATION", [["Order cancel "], ["mat", 1], [" karo, bas address change karna hai"]], "Meaning: don't cancel, just change the address", "Risk: order cancelled"],
    ["TAMIL NEGATION", [["Refund "], ["vendam", 1], [", replacement anuppunga"]], "Meaning: I don't want a refund, send a replacement", "Risk: refund issued, no replacement"],
    ["SPEECH-TO-TEXT DROP", [["Heard: “Order cancel "], ["___", 1], [" karo…”"]], "The negation is lost on a noisy line, so the sentence now means the opposite", "Risk: confident wrong action"],
  ];
  ex.forEach(([tag, runs, mean, risk], i) => {
    const y = 1.75 + i * 1.62;
    card(s, 6.8, y, 5.95, 1.45);
    s.addText(tag, { x: 7.05, y: y + 0.1, w: 3, h: 0.28, fontFace: BF, fontSize: 10, bold: true, color: C.amber, charSpacing: 1, margin: 0, isTextBox: true });
    s.addText(risk, { x: 9.8, y: y + 0.1, w: 2.75, h: 0.28, fontFace: BF, fontSize: 10, bold: true, color: C.red, align: "right", margin: 0, isTextBox: true });
    s.addText(runs.map(([t, neg]) => ({ text: t, options: { bold: !!neg, color: neg ? C.red : C.navy, underline: neg ? { style: "sng" } : undefined } })),
      { x: 7.05, y: y + 0.4, w: 5.5, h: 0.5, fontFace: HF, fontSize: 17, italic: true, margin: 0, valign: "middle", isTextBox: true });
    s.addText(mean, { x: 7.05, y: y + 0.92, w: 5.5, h: 0.4, fontFace: BF, fontSize: 12, color: C.muted, margin: 0, isTextBox: true });
  });
  footer(s);
  s.addNotes("Who has it: every brand putting an AI agent with write-access in front of Indian callers. Why it hurts: the mistake is a transaction, not a bad answer.");

  // ===== 4. Where it breaks (flowchart) =====
  s = pres.addSlide(); s.background = { color: C.white };
  header(s, "02", "Where It Breaks Today", "Two ways the same sentence becomes the wrong action");
  const bw = 2.05, gap = 0.46, x0 = 0.65;
  const rows = [
    ["PATH A: speech-to-text drops the negation", [
      "Caller says\n“Order cancel mat karo, bas address change karna hai”",
      "Speech-to-text\n“Order cancel ___ karo, bas address change…”",
      "Intent model\ncancel_order\n(high confidence)",
      "Agent calls tool\ncancel_order(48211)",
      "Order cancelled\ncan't be undone",
    ], 1.95],
    ["PATH B: transcript is right, but the model ignores “mat”", [
      "Caller says\n“Order cancel mat karo, bas address change karna hai”",
      "Speech-to-text\ncorrect transcript",
      "Keyword intent model\nsees “order” + “cancel”\n→ cancellation_refund",
      "Agent calls tool\ncancel_order(48211)",
      "Order cancelled\ncan't be undone",
    ], 4.15],
  ];
  rows.forEach(([ttl, steps, y]) => {
    s.addText(ttl, { x: x0, y: y - 0.42, w: 10, h: 0.32, fontFace: BF, fontSize: 13, bold: true, color: C.navy, margin: 0, isTextBox: true });
    steps.forEach((t, i) => {
      const x = x0 + i * (bw + gap);
      const last = i === steps.length - 1;
      box(s, x, y, bw, 1.35, t, { fill: last ? C.redLt : (i === 1 && y < 3 ? C.amberLt : C.slate), line: last ? C.red : (i === 1 && y < 3 ? C.amber : C.slate), size: 11.5, color: last ? C.red : C.ink, bold: last });
      if (!last) arrow(s, x + bw, y + 0.675, x + bw + gap, y + 0.675);
    });
  });
  card(s, 0.65, 5.95, 12.05, 0.8, C.navy);
  s.addText([
    { text: "Measured, not hypothetical:  ", options: { bold: true, color: C.amber } },
    { text: "our own Round-1 FreshVoice engine classifies “Order cancel mat karo, bas address change karna hai” as cancellation_refund.", options: { color: C.white } },
  ], { x: 0.9, y: 5.95, w: 11.6, h: 0.8, fontFace: BF, fontSize: 14, valign: "middle", margin: 0, isTextBox: true });
  footer(s);
  s.addNotes("Path B is reproducible today: run analyseOffline() on the Hindi sentence in codemix.js and it returns cancellation_refund. The Tamil sentence comes back as damaged_item, which also ignores 'vendam'.");

  // ===== 5. Why now =====
  s = pres.addSlide(); s.background = { color: C.white };
  header(s, "03", "Why Now");
  const why = [
    [I.bolt, "Agents now have write access", "AI agents, tool calling and MCP let a bot cancel, refund or re-address an order directly. A misunderstanding used to produce a bad answer. Now it produces a bad transaction."],
    [I.lang, "Code-mixed voice is normal in India", "Hinglish and Tanglish callers switch language inside a sentence. FreshVoice already handles the switching, and negation is the gap we measured in our own engine."],
    [I.wave, "The signals are finally cheap", "Speech-to-text now returns word-level confidence (ElevenLabs Scribe), and fast LLMs (Gemini Flash) can check one action inside a live call. Checking every action is now affordable."],
  ];
  why.forEach(([ic, h, b], i) => {
    const x = 0.6 + i * 4.1;
    card(s, x, 1.65, 3.8, 4.7);
    iconCircle(s, ic, x + 0.3, 1.95, 0.9, C.amberLt);
    s.addText(h, { x: x + 0.3, y: 3.05, w: 3.2, h: 0.8, fontFace: HF, fontSize: 19, bold: true, color: C.navy, valign: "top", margin: 0, isTextBox: true });
    s.addText(b, { x: x + 0.3, y: 3.9, w: 3.2, h: 2.3, fontFace: BF, fontSize: 14, color: C.ink, valign: "top", margin: 0, isTextBox: true });
  });
  footer(s);

  // ===== 6. Competitive landscape =====
  s = pres.addSlide(); s.background = { color: C.white };
  header(s, "04", "Competitive Landscape");
  // quadrant
  const qx = 1.15, qy = 1.7, qs = 4.6;
  s.addShape(pres.shapes.RECTANGLE, { x: qx, y: qy, w: qs, h: qs, fill: { color: "F7F9FB" }, line: { color: C.line, width: 1 } });
  s.addShape(pres.shapes.RECTANGLE, { x: qx + qs / 2, y: qy, w: qs / 2, h: qs / 2, fill: { color: C.greenLt }, line: { color: C.line, width: 1 } });
  s.addShape(pres.shapes.LINE, { x: qx, y: qy + qs / 2, w: qs, h: 0, line: { color: C.line, width: 1, dashType: "dash" } });
  s.addShape(pres.shapes.LINE, { x: qx + qs / 2, y: qy, w: 0, h: qs, line: { color: C.line, width: 1, dashType: "dash" } });
  s.addText("Understands code-mixed negation →", { x: qx, y: qy + qs + 0.08, w: qs, h: 0.3, fontFace: BF, fontSize: 11, bold: true, color: C.muted, align: "center", margin: 0, isTextBox: true });
  s.addText("Scales checks to action risk →", { x: qx - 0.3 - qs / 2, y: qy + qs / 2 - 0.15, w: qs, h: 0.3, fontFace: BF, fontSize: 11, bold: true, color: C.muted, align: "center", rotate: 270, margin: 0, isTextBox: true, });
  // correct the rotated label position: rotation is about center; place center at x = qx-0.3
  const pts = [
    ["Do nothing", 0.12, 0.12, C.muted], ["Confirm-everything IVR", 0.14, 0.53, C.blue], ["Generic LLM guardrails", 0.28, 0.7, C.blue],
    ["Indic voice bots", 0.78, 0.2, C.blue], ["ActionGuard", 0.8, 0.84, C.amber],
  ];
  pts.forEach(([n, px, py, c]) => {
    const cx = qx + px * qs, cy = qy + (1 - py) * qs, d = n === "ActionGuard" ? 0.34 : 0.24;
    s.addShape(pres.shapes.OVAL, { x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: { color: c }, line: { color: c === C.amber ? C.navy : c, width: c === C.amber ? 2 : 1 } });
    const lx = px > 0.6 ? cx - 1.9 - d / 2 : cx + d / 2 + 0.08;
    s.addText(n, { x: lx, y: cy - 0.16, w: 1.85, h: 0.32, fontFace: BF, fontSize: n === "ActionGuard" ? 13 : 11, bold: n === "ActionGuard", color: C.ink, align: px > 0.6 ? "right" : "left", margin: 0, isTextBox: true });
  });
  // table
  const comp = [
    ["Generic LLM guardrails", "Good at policy, toxicity and PII filters", "Can't tell that “mat” flips “cancel”, and ignores speech-to-text confidence"],
    ["Confirm-everything IVR", "Safe: “press 1 to confirm”", "Adds friction to every action, so callers drop off"],
    ["Indic voice-bot platforms", "Strong Indian-language speech recognition", "Action safety isn't their layer. Tool calls fire unchecked"],
    ["Do nothing", "Zero effort and zero latency", "Wrong refunds and cancellations, and customers lose trust"],
  ];
  const tx = 6.45;
  s.addText([{ text: "Alternative", options: {} }], { x: tx, y: 1.6, w: 2.0, h: 0.35, fontFace: BF, fontSize: 11, bold: true, color: C.muted, margin: 0, isTextBox: true });
  s.addText("Strength", { x: tx + 2.1, y: 1.6, w: 1.95, h: 0.35, fontFace: BF, fontSize: 11, bold: true, color: C.green, margin: 0, isTextBox: true });
  s.addText("Gap", { x: tx + 4.15, y: 1.6, w: 2.2, h: 0.35, fontFace: BF, fontSize: 11, bold: true, color: C.red, margin: 0, isTextBox: true });
  comp.forEach(([n, st, g], i) => {
    const y = 2.0 + i * 0.93;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: tx - 0.1, y, w: 6.45, h: 0.83, rectRadius: 0.06, fill: { color: i % 2 ? C.white : "F4F6F9" }, line: { color: "F4F6F9" } });
    s.addText(n, { x: tx, y, w: 2.0, h: 0.83, fontFace: BF, fontSize: 12.5, bold: true, color: C.navy, valign: "middle", margin: 0, isTextBox: true });
    s.addText(st, { x: tx + 2.1, y, w: 1.95, h: 0.83, fontFace: BF, fontSize: 11, color: C.ink, valign: "middle", margin: 0, isTextBox: true });
    s.addText(g, { x: tx + 4.15, y, w: 2.2, h: 0.83, fontFace: BF, fontSize: 11, color: C.ink, valign: "middle", margin: 0, isTextBox: true });
  });
  card(s, tx - 0.1, 5.8, 6.45, 0.85, C.navy);
  s.addText([{ text: "Our edge  ", options: { bold: true, color: C.amber } }, { text: "We understand negation in each language, and only irreversible, uncertain actions get a question. It runs natively in Freshworks' own agent tool path.", options: { color: C.white } }],
    { x: tx + 0.1, y: 5.8, w: 6.1, h: 0.85, fontFace: BF, fontSize: 12.5, valign: "middle", margin: 0, isTextBox: true });
  footer(s);

  // ===== 7. Proposed solution: pipeline =====
  s = pres.addSlide(); s.background = { color: C.white };
  header(s, "05", "Proposed Solution: the ActionGuard Pipeline", "Before an agent does something it can't undo, we double-check what the caller said");
  const pw = 3.6, ph = 1.35;
  const pipe = [
    ["1  LISTEN", "Speech-to-text returns the transcript with a confidence score for each word"],
    ["2  TAG", "FreshVoice labels each word's language and finds where the caller switches"],
    ["3  FIND POLARITY", "Spots negation words for each language and which verb each one applies to"],
    ["6  ACT & LOG", "Runs the Freshdesk tool call and writes an English audit note on the ticket"],
    ["5  GATE", "Decides ALLOW, CONFIRM or BLOCK. Blocked requests go to the intent the caller actually stated"],
    ["4  SCORE RISK", "Irreversible? Moves money? Low confidence on the negation word?"],
  ];
  const pos = [[0.6, 1.9], [4.85, 1.9], [9.1, 1.9], [0.6, 4.0], [4.85, 4.0], [9.1, 4.0]];
  pipe.forEach(([h, b], i) => {
    const [x, y] = pos[i];
    const gate = h.includes("GATE");
    card(s, x, y, pw, ph, gate ? C.navy : C.white);
    s.addText(h, { x: x + 0.25, y: y + 0.12, w: pw - 0.5, h: 0.35, fontFace: BF, fontSize: 13, bold: true, color: gate ? C.amber : C.navy, charSpacing: 1, margin: 0, isTextBox: true });
    s.addText(b, { x: x + 0.25, y: y + 0.48, w: pw - 0.5, h: 0.8, fontFace: BF, fontSize: 12.5, color: gate ? C.white : C.ink, valign: "top", margin: 0, isTextBox: true });
  });
  arrow(s, 4.2, 2.575, 4.85, 2.575, C.amber, 2.5);
  arrow(s, 8.45, 2.575, 9.1, 2.575, C.amber, 2.5);
  arrow(s, 10.9, 3.25, 10.9, 4.0, C.amber, 2.5);
  arrow(s, 9.1, 4.675, 8.45, 4.675, C.amber, 2.5);
  arrow(s, 4.85, 4.675, 4.2, 4.675, C.amber, 2.5);
  s.addText("NEGATION LEXICON (MVP → PHASE 2)", { x: 0.6, y: 5.65, w: 6, h: 0.3, fontFace: BF, fontSize: 11, bold: true, color: C.muted, charSpacing: 1, margin: 0, isTextBox: true });
  const lex = [["Hindi", "mat · nahi · na"], ["Tamil", "vendam · venaam · illa"], ["Telugu", "vaddu · ledu"], ["Kannada", "beda · illa"], ["Bengali", "na · korben na"], ["Marathi", "nako · nahi"]];
  lex.forEach(([l, w], i) => {
    const x = 0.6 + i * 2.05;
    box(s, x, 6.0, 1.9, 0.7, "", { fill: i < 2 ? C.amberLt : C.slate, line: i < 2 ? C.amber : C.slate });
    s.addText([{ text: l, options: { bold: true, color: C.navy, breakLine: true } }, { text: w, options: { color: C.ink, fontSize: 10.5 } }],
      { x, y: 6.0, w: 1.9, h: 0.7, fontFace: BF, fontSize: 12, align: "center", valign: "middle", margin: 2, isTextBox: true });
  });
  footer(s);
  s.addNotes("Steps 1-2 already exist in FreshVoice Round 1. Steps 3-6 are new. Highlighted lexicon chips (Hindi, Tamil) are MVP scope.");

  // ===== 8. Decision gate flowchart =====
  s = pres.addSlide(); s.background = { color: C.white };
  header(s, "05", "How the Gate Decides", "Only the risky, uncertain branch adds friction for the caller");
  const cy = 2.55;
  box(s, 0.5, cy - 0.55, 2.2, 1.1, "Agent proposes an action\ne.g. cancel_order(48211)", { fill: C.slate, size: 12, bold: true, color: C.navy });
  arrow(s, 2.7, cy, 3.1, cy);
  diamond(s, 3.1, cy - 0.8, 2.5, 1.6, "Irreversible or\nmoves money?");
  arrow(s, 5.6, cy, 6.05, cy); label(s, 5.55, cy - 0.35, 0.55, "Yes", C.navy);
  diamond(s, 6.05, cy - 0.8, 2.5, 1.6, "Negation applies\nto the action verb?");
  arrow(s, 8.55, cy, 9.0, cy); label(s, 8.5, cy - 0.35, 0.55, "No", C.navy);
  diamond(s, 9.0, cy - 0.8, 2.5, 1.6, "Confident about\nthe words that set\nyes or no?", { size: 11 });
  arrow(s, 11.5, cy, 11.85, cy); label(s, 11.45, cy - 0.35, 0.45, "Yes", C.navy);
  box(s, 11.85, cy - 0.5, 1.0, 1.0, "ALLOW", { fill: C.green, color: C.white, bold: true, size: 13 });
  // down branches
  const oy = 4.05, oh = 1.1;
  arrow(s, 4.35, cy + 0.8, 4.35, oy); label(s, 4.4, cy + 0.95, 0.5, "No", C.navy);
  box(s, 3.1, oy, 2.5, oh, "ALLOW\nrun it and log it\n(e.g. track order)", { fill: C.greenLt, line: C.green, size: 12, color: C.green, bold: true });
  arrow(s, 7.3, cy + 0.8, 7.3, oy); label(s, 7.35, cy + 0.95, 0.5, "Yes", C.navy);
  box(s, 6.05, oy, 2.5, oh, "BLOCK\ndon't run it; switch to\nupdate_address", { fill: C.redLt, line: C.red, size: 12, color: C.red, bold: true });
  arrow(s, 10.25, cy + 0.8, 10.25, oy); label(s, 10.3, cy + 0.95, 0.5, "No", C.navy);
  box(s, 9.0, oy, 2.5, oh, "CONFIRM\nread it back in the\ncaller's language", { fill: C.amberLt, line: C.amber, size: 12, color: "9A6400", bold: true });
  arrow(s, 9.8, oy + oh, 9.3, 5.65); arrow(s, 10.7, oy + oh, 11.3, 5.65);
  box(s, 8.35, 5.65, 1.9, 0.95, "“Haan” / “Aamaa”\n→ run it", { fill: C.greenLt, line: C.green, size: 11.5, color: C.green, bold: true });
  box(s, 10.4, 5.65, 2.45, 0.95, "“Nahi” / silence\n→ hand to a person with\na Freshdesk note", { fill: C.slate, size: 11, color: C.ink, bold: true });
  card(s, 0.5, 5.45, 5.1, 1.2, C.navy);
  s.addText([
    { text: "Read-back example (Hindi)", options: { bold: true, color: C.amber, breakLine: true } },
    { text: "“Aap order cancel karna chahte hain, ya sirf address change? Haan ya nahi?”", options: { color: C.white, italic: true } },
  ], { x: 0.75, y: 5.45, w: 4.7, h: 1.2, fontFace: BF, fontSize: 13, valign: "middle", margin: 0, isTextBox: true });
  footer(s);
  s.addNotes("Three checks, in order: how risky the action is, whether the caller negated it, and how confident we are in the transcript. Only the last branch adds a question.");

  // ===== 9. Worked examples =====
  s = pres.addSlide(); s.background = { color: C.white };
  header(s, "05", "Two Calls Traced Through the Gate");
  const traces = [
    ["Hindi call", [["Order", "EN"], ["cancel", "EN"], ["mat", "NEG"], ["karo,", "HI"], ["bas", "HI"], ["address", "EN"], ["change", "EN"], ["karna hai", "HI"]],
      "“mat” applies to “cancel karo”", "cancel_order: irreversible", "BLOCK cancel_order → run update_address instead (reversible → ALLOW)", C.red],
    ["Tamil call", [["Refund", "EN"], ["vendam,", "NEG"], ["replacement", "EN"], ["anuppunga", "TA"]],
      "“vendam” applies to “refund”. Speech-to-text confidence on it is only 0.58", "issue_refund: moves money", "BLOCK issue_refund. CONFIRM the replacement: “Replacement anuppalaamaa?”", C.amber],
  ];
  const tagC = { EN: [C.blueLt, C.blue], HI: [C.slate, C.navy], TA: [C.slate, C.navy], NEG: [C.redLt, C.red] };
  traces.forEach(([t, toks, pol, act, verdict, vc], k) => {
    const x = 0.6 + k * 6.25, w = 5.9;
    card(s, x, 1.55, w, 5.2);
    s.addText(t.toUpperCase(), { x: x + 0.3, y: 1.7, w: 3, h: 0.3, fontFace: BF, fontSize: 12, bold: true, color: C.amber, charSpacing: 1, margin: 0, isTextBox: true });
    // chips
    let cx2 = x + 0.3, cyy = 2.15;
    toks.forEach(([wd, tg]) => {
      const cw = Math.max(0.75, wd.length * 0.105 + 0.3);
      if (cx2 + cw > x + w - 0.25) { cx2 = x + 0.3; cyy += 0.78; }
      const [f, c] = tagC[tg];
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx2, y: cyy, w: cw, h: 0.66, rectRadius: 0.06, fill: { color: f }, line: { color: tg === "NEG" ? C.red : f, width: 1.25 } });
      s.addText([{ text: wd, options: { bold: true, color: c, fontSize: 12, breakLine: true } }, { text: tg, options: { color: c, fontSize: 8.5 } }],
        { x: cx2, y: cyy, w: cw, h: 0.66, fontFace: BF, align: "center", valign: "middle", margin: 0, isTextBox: true });
      cx2 += cw + 0.08;
    });
    const steps = [["Negation", pol], ["Proposed action", act]];
    steps.forEach(([h, b], i) => {
      const y = 3.75 + i * 0.78;
      s.addText(h, { x: x + 0.3, y, w: 1.6, h: 0.6, fontFace: BF, fontSize: 12, bold: true, color: C.muted, valign: "middle", margin: 0, isTextBox: true });
      s.addText(b, { x: x + 1.95, y, w: w - 2.25, h: 0.6, fontFace: BF, fontSize: 13, color: C.ink, valign: "middle", margin: 0, isTextBox: true });
    });
    arrow(s, x + w / 2, 5.28, x + w / 2, 5.52, vc);
    box(s, x + 0.3, 5.55, w - 0.6, 0.95, verdict, { fill: vc === C.red ? C.redLt : C.amberLt, line: vc, size: 13, bold: true, color: vc === C.red ? C.red : "9A6400" });
  });
  footer(s);
  s.addNotes("Chip colors: blue = English, grey = Hindi or Tamil, red = negation. The Tamil example shows the confidence branch: the word is probably 'vendam', but it's too low-confidence to issue money without asking.");

  // ===== 10. MVP vs later + AI =====
  s = pres.addSlide(); s.background = { color: C.white };
  header(s, "05", "Scope: MVP vs Later Phases");
  const phases = [
    ["PHASE 1 · MVP", "Months 0–3", ["Hindi + Tamil + English", "3 guarded actions: cancel, refund, address change", "ALLOW / CONFIRM / BLOCK + re-route", "English audit note on every ticket"], C.navy, C.white],
    ["PHASE 2", "Months 4–6", ["Adds Telugu, Kannada, Bengali, Marathi", "Uses the speech-to-text engine's alternative transcripts, not just its top guess", "Learns from human agents' overrides"], C.slate, C.navy],
    ["PHASE 3", "Months 7–12", ["Admin policy editor for each action", "Chat and WhatsApp channels", "Wrong-action analytics dashboard"], C.slate, C.navy],
  ];
  phases.forEach(([h, t, items, f, c], i) => {
    const x = 0.6 + i * 4.1;
    s.addText(h, { x, y: 1.55, w: 3.95, h: 0.8, shape: pres.shapes.CHEVRON, fill: { color: f }, line: { color: f }, fontFace: BF, fontSize: 14, bold: true, color: c, align: "center", valign: "middle", margin: 0, isTextBox: true });
    s.addText(t, { x, y: 2.4, w: 3.95, h: 0.3, fontFace: BF, fontSize: 11, color: C.muted, align: "center", margin: 0, isTextBox: true });
    bullets(s, items, x + 0.2, 2.8, 3.6, 1.7, 13);
  });
  const lower = [
    [I.shieldW, "AI & agentic design", "An AI agent plans the tool calls. ActionGuard is a second, independent agent that checks each irreversible call. It combines rule-based checks per language with an LLM that works out what a negation applies to, and falls back to rules alone when offline."],
    [I.code, "Already built (Round 1)", "Code-mix tagging engine, intent scoring, MCP server, Freshdesk ticket API, and a live demo on Vercel. ActionGuard adds the checks and the gate on top."],
  ];
  lower.forEach(([ic, h, b], i) => {
    const x = 0.6 + i * 6.2;
    card(s, x, 4.75, 5.95, 1.95, "F4F6F9");
    iconCircle(s, ic, x + 0.25, 4.95, 0.7, i ? C.blue : C.navy);
    s.addText(h, { x: x + 1.1, y: 4.95, w: 4.6, h: 0.4, fontFace: HF, fontSize: 16, bold: true, color: C.navy, margin: 0, isTextBox: true });
    s.addText(b, { x: x + 1.1, y: 5.35, w: 4.65, h: 1.25, fontFace: BF, fontSize: 12, color: C.ink, valign: "top", margin: 0, isTextBox: true });
  });
  footer(s);

  // ===== 11. Freshworks integration =====
  s = pres.addSlide(); s.background = { color: C.white };
  header(s, "05", "How It Fits Into Freshworks", "Built as a tool gate inside the Freddy AI Agent → Freshdesk action path");
  const my = 1.95, mh = 1.25;
  const main = [
    [0.5, 1.55, "Caller\nphone / app", C.slate, C.ink],
    [2.45, 1.75, "Freshcaller\nvoice channel", C.slate, C.ink],
    [4.6, 1.75, "Speech-to-text\nwith word confidence", C.slate, C.ink],
    [6.75, 1.75, "Freddy AI Agent\nplans tool call", C.blueLt, C.blue],
    [8.9, 1.85, "ActionGuard\nguard_action()", C.navy, C.white],
    [11.15, 1.7, "Order APIs\ncancel · refund\naddress", C.greenLt, C.green],
  ];
  main.forEach(([x, w, t, f, c], i) => {
    box(s, x, my, w, mh, t, { fill: f, color: c, bold: true, size: 12.5, line: i === 4 ? C.amber : f, lw: i === 4 ? 2.5 : 1 });
    if (i < main.length - 1) arrow(s, x + w, my + mh / 2, main[i + 1][0], my + mh / 2);
  });
  label(s, 10.6, my + mh / 2 - 0.36, 0.7, "allow", C.green, 10);
  // branches below ActionGuard
  const by = 4.0;
  arrow(s, 9.4, my + mh, 7.6, by, C.amber); arrow(s, 10.4, my + mh, 12.0, by, C.red);
  box(s, 6.6, by, 2.5, 1.1, "CONFIRM\nFreddy reads it back\nin the caller's language", { fill: C.amberLt, line: C.amber, color: "9A6400", bold: true, size: 11.5 });
  box(s, 10.95, by, 1.9, 1.1, "BLOCK / ESCALATE\nhuman agent in\nFreshdesk Omni", { fill: C.redLt, line: C.red, color: C.red, bold: true, size: 11.5 });
  arrow(s, 7.85, by, 7.85, my + mh, C.amber); label(s, 7.9, 3.35, 0.9, "answer", "9A6400", 10);
  card(s, 0.5, 5.6, 12.35, 1.05, C.navy);
  s.addText([
    { text: "Every decision is logged  ", options: { bold: true, color: C.amber } },
    { text: "as an English private note on the Freshdesk ticket, with the utterance, language tags, negation, confidence, verdict and reason. Supervisors can audit it and it can be used for retraining.", options: { color: C.white } },
  ], { x: 0.75, y: 5.6, w: 11.9, h: 1.05, fontFace: BF, fontSize: 13.5, valign: "middle", margin: 0, isTextBox: true });
  s.addText("Delivered as a Freshworks Marketplace app plus an MCP tool (guard_action) that any agent can call before it acts.", { x: 0.5, y: 4.1, w: 5.9, h: 1.0, fontFace: BF, fontSize: 13, italic: true, color: C.muted, valign: "middle", margin: 0, isTextBox: true });
  footer(s);

  // ===== 12. Target customers =====
  s = pres.addSlide(); s.background = { color: C.white };
  header(s, "06", "Target Customers");
  const cust = [
    [I.store, "PRIMARY", "D2C, e-commerce & fintech brands", "Indian brands with 20 to 500 support seats, on Freshdesk and Freshcaller, starting to let AI agents cancel, refund and re-address orders for Hindi- and Tamil-speaking callers.", C.navy],
    [I.headset, "SECONDARY", "BPOs and support outsourcers", "They run Freshworks for several Indian brands, and one wrong refund costs them a client. They want one policy layer across all their accounts.", C.blue],
  ];
  cust.forEach(([ic, tag, h, b, c], i) => {
    const y = 1.6 + i * 2.55;
    card(s, 0.6, y, 7.3, 2.3);
    iconCircle(s, ic, 0.9, y + 0.35, 1.0, c);
    s.addText(tag, { x: 2.2, y: y + 0.3, w: 5.4, h: 0.3, fontFace: BF, fontSize: 11, bold: true, color: C.amber, charSpacing: 1, margin: 0, isTextBox: true });
    s.addText(h, { x: 2.2, y: y + 0.6, w: 5.5, h: 0.45, fontFace: HF, fontSize: 19, bold: true, color: C.navy, margin: 0, isTextBox: true });
    s.addText(b, { x: 2.2, y: y + 1.1, w: 5.45, h: 1.1, fontFace: BF, fontSize: 13.5, color: C.ink, valign: "top", margin: 0, isTextBox: true });
  });
  s.addText("Actions guarded in the MVP", { x: 8.4, y: 1.6, w: 4.4, h: 0.4, fontFace: HF, fontSize: 18, bold: true, color: C.navy, margin: 0, isTextBox: true });
  [[I.ban, "Cancel order", "Can't be undone once the order leaves the warehouse", C.red], [I.money, "Issue refund", "Moves money, and reversing it is costly", C.red], [I.truck, "Change address", "Reversible, but a wrong one means a failed delivery", C.amber]].forEach(([ic, h, b, c], i) => {
    const y = 2.2 + i * 1.4;
    iconCircle(s, ic, 8.4, y, 0.8, c);
    s.addText(h, { x: 9.4, y, w: 3.4, h: 0.38, fontFace: BF, fontSize: 15, bold: true, color: C.navy, margin: 0, isTextBox: true });
    s.addText(b, { x: 9.4, y: y + 0.38, w: 3.4, h: 0.7, fontFace: BF, fontSize: 12, color: C.muted, valign: "top", margin: 0, isTextBox: true });
  });
  footer(s);

  // ===== 13. Value proposition =====
  s = pres.addSlide(); s.background = { color: C.white };
  header(s, "07", "Value Proposition");
  card(s, 0.6, 1.55, 12.15, 1.25, C.navy);
  s.addText("Let your AI agent take real actions for Indian callers without cancelling or refunding when the caller said “don't”. Only the calls that need it get a question.",
    { x: 0.9, y: 1.55, w: 11.6, h: 1.25, fontFace: HF, fontSize: 20, color: C.white, valign: "middle", margin: 0, isTextBox: true });
  const cols = [["Without ActionGuard", I.xmark, C.red, C.redLt, [
    "Agent acts on its first guess at the intent",
    "One dropped “mat” leads to a cancelled order",
    "The only safe fallback is confirming every action, so callers get annoyed",
    "No record of why the bot acted",
  ]], ["With ActionGuard", I.check, C.green, C.greenLt, [
    "Checks negation in every language before any irreversible action",
    "Blocked requests go to the action the caller actually asked for",
    "Questions only when the action is risky and we're unsure",
    "English audit note on every Freshdesk ticket",
  ]]];
  cols.forEach(([h, ic, c, lt, items], i) => {
    const x = 0.6 + i * 6.2;
    card(s, x, 3.1, 5.95, 3.6, lt);
    s.addImage({ data: ic, x: x + 0.3, y: 3.3, w: 0.45, h: 0.45 });
    s.addText(h, { x: x + 0.9, y: 3.28, w: 4.8, h: 0.5, fontFace: HF, fontSize: 19, bold: true, color: c, valign: "middle", margin: 0, isTextBox: true });
    bullets(s, items, x + 0.3, 3.95, 5.4, 2.6, 15);
  });
  footer(s);

  // ===== 14. Pricing =====
  s = pres.addSlide(); s.background = { color: C.white };
  header(s, "08", "Pricing & Packaging", "Proposed. We only charge for the actions we actually guard.");
  const tiers = [
    ["Included", "Free", "for every Freddy AI Agent customer", ["Monitor mode: flags risky actions, never blocks", "Hindi + English", "Weekly wrong-action report"], C.slate, C.navy, false],
    ["ActionGuard Add-on", "$5", "per 1,000 guarded actions", ["Full ALLOW / CONFIRM / BLOCK gate", "All MVP languages + re-route", "Audit notes on every ticket", "First 30 days free"], C.navy, C.white, true],
    ["Enterprise", "Custom", "annual contract", ["Custom policies for each action", "Dedicated language packs", "SLA + data residency in India"], C.slate, C.navy, false],
  ];
  tiers.forEach(([n, p, u, items, f, c, hi], i) => {
    const x = 0.9 + i * 4.0, y = hi ? 1.7 : 1.95, h = hi ? 4.85 : 4.4;
    card(s, x, y, 3.6, h, f);
    s.addText(n, { x: x + 0.3, y: y + 0.25, w: 3.0, h: 0.4, fontFace: BF, fontSize: 15, bold: true, color: hi ? C.amber : C.muted, margin: 0, isTextBox: true });
    s.addText(p, { x: x + 0.3, y: y + 0.7, w: 3.0, h: 0.85, fontFace: HF, fontSize: 44, bold: true, color: c, margin: 0, isTextBox: true });
    s.addText(u, { x: x + 0.3, y: y + 1.55, w: 3.0, h: 0.35, fontFace: BF, fontSize: 12, color: hi ? C.ice : C.muted, margin: 0, isTextBox: true });
    bullets(s, items, x + 0.3, y + 2.05, 3.05, h - 2.2, 13, c);
  });
  footer(s);
  s.addNotes("Only irreversible or money-moving tool calls count as guarded actions, so the price tracks the risk removed. The free monitor mode is the upsell path.");

  // ===== 15. Go-to-market =====
  s = pres.addSlide(); s.background = { color: C.white };
  header(s, "09", "Go-to-Market Plan");
  const gtm = [
    ["Design partners", "Q1", "3 Indian D2C brands already on Freshdesk + Freshcaller run a free pilot in monitor mode"],
    ["Proof", "Q1–Q2", "Publish the wrong-action numbers from the pilot, plus a 60-second Hinglish + Tanglish demo video"],
    ["Launch", "Q2", "Freshworks Marketplace listing, in-app banner for Freddy AI Agent voice admins, and email with a 30-day trial"],
    ["Scale", "Q3+", "Sold alongside Freddy AI Agent deals in India and SEA, with a BPO partner program"],
  ];
  s.addShape(pres.shapes.LINE, { x: 1.2, y: 2.35, w: 10.95, h: 0, line: { color: C.line, width: 3 } });
  gtm.forEach(([h, q, b], i) => {
    const x = 0.6 + i * 3.1;
    s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: 2.0, w: 0.7, h: 0.7, fill: { color: i === 2 ? C.amber : C.navy }, line: { color: C.white, width: 3 } });
    s.addText(String(i + 1), { x: x + 0.3, y: 2.0, w: 0.7, h: 0.7, fontFace: BF, fontSize: 18, bold: true, color: i === 2 ? C.navy : C.white, align: "center", valign: "middle", margin: 0, isTextBox: true });
    s.addText(q, { x: x + 0.05, y: 1.6, w: 1.2, h: 0.3, fontFace: BF, fontSize: 12, bold: true, color: C.muted, align: "center", margin: 0, isTextBox: true });
    card(s, x, 3.0, 2.85, 2.4);
    s.addText(h, { x: x + 0.25, y: 3.2, w: 2.4, h: 0.45, fontFace: HF, fontSize: 18, bold: true, color: C.navy, margin: 0, isTextBox: true });
    s.addText(b, { x: x + 0.25, y: 3.7, w: 2.4, h: 2.0, fontFace: BF, fontSize: 13, color: C.ink, valign: "top", margin: 0, isTextBox: true });
  });
  s.addText("Free monitor mode shows each customer their own wrong-action count, and that report is what sells the paid add-on.", { x: 0.6, y: 5.75, w: 12.1, h: 0.5, fontFace: BF, fontSize: 14, italic: true, color: C.muted, margin: 0, isTextBox: true });
  footer(s);

  // ===== 16. Costs & resources =====
  s = pres.addSlide(); s.background = { color: C.white };
  header(s, "10", "Costs & Resources Needed");
  const team = [[I.code, "2 engineers", "gate engine + Freshworks app"], [I.lang, "1 linguist / data annotator", "Hindi + Tamil negation set"], [I.user, "Part-time PM", "pilots + pricing"]];
  team.forEach(([ic, h, b], i) => {
    const y = 1.6 + i * 1.05;
    iconCircle(s, ic === I.lang ? I.mic : ic, 0.6, y, 0.75, C.navy);
    s.addText(h, { x: 1.5, y: y + 0.02, w: 3.6, h: 0.38, fontFace: BF, fontSize: 15, bold: true, color: C.navy, margin: 0, isTextBox: true });
    s.addText(b, { x: 1.5, y: y + 0.38, w: 3.6, h: 0.35, fontFace: BF, fontSize: 12, color: C.muted, margin: 0, isTextBox: true });
  });
  // stat
  card(s, 0.6, 5.05, 4.5, 1.65, C.navy);
  s.addText("~$70K", { x: 0.85, y: 5.1, w: 4.0, h: 0.75, fontFace: HF, fontSize: 40, bold: true, color: C.amber, margin: 0, isTextBox: true });
  s.addText("to MVP in 3 months: salaries, speech-to-text and LLM usage, and labelling ~5,000 negation utterances", { x: 0.85, y: 5.85, w: 4.0, h: 0.8, fontFace: BF, fontSize: 12, color: C.white, valign: "top", margin: 0, isTextBox: true });
  // gantt
  const gx = 5.7, gw = 7.0, gy = 1.6;
  s.addText("MVP timeline", { x: gx, y: gy, w: 4, h: 0.4, fontFace: HF, fontSize: 18, bold: true, color: C.navy, margin: 0, isTextBox: true });
  const lblW = 2.6, colW = (gw - lblW) / 3;
  ["Month 1", "Month 2", "Month 3"].forEach((m, i) => s.addText(m, { x: gx + lblW + i * colW, y: gy + 0.5, w: colW, h: 0.3, fontFace: BF, fontSize: 11, bold: true, color: C.muted, align: "center", margin: 0, isTextBox: true }));
  const tasks = [["Negation dataset + lexicon", 0, 1.2, C.amber], ["Polarity + risk engine", 0.5, 1.5, C.navy], ["Speech-to-text confidence wiring", 1.0, 1.0, C.navy], ["Freshdesk / Freddy integration", 1.3, 1.5, C.blue], ["Design-partner pilot + tuning", 2.0, 1.0, C.green]];
  tasks.forEach(([t, st, du, c], i) => {
    const y = gy + 0.85 + i * 0.5;
    s.addShape(pres.shapes.RECTANGLE, { x: gx, y: y - 0.04, w: gw, h: 0.52, fill: { color: i % 2 ? C.white : "F4F6F9" }, line: { color: i % 2 ? C.white : "F4F6F9" } });
    s.addText(t, { x: gx + 0.1, y, w: lblW - 0.15, h: 0.44, fontFace: BF, fontSize: 12, color: C.ink, valign: "middle", margin: 0, isTextBox: true });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: gx + lblW + st * colW, y: y + 0.07, w: du * colW, h: 0.3, rectRadius: 0.08, fill: { color: c }, line: { color: c } });
  });
  card(s, gx, 5.05, gw, 1.65, "F4F6F9");
  s.addText([
    { text: "Optional: ARR estimate (assumption-based)", options: { bold: true, color: C.navy, breakLine: true } },
    { text: "100 paying customers × 20,000 guarded actions / month × $5 per 1,000 = $10K MRR, or about ", options: { color: C.ink } },
    { text: "$120K ARR in Year 1", options: { bold: true, color: C.green } },
    { text: ". Every number here is an assumption to test in the pilot.", options: { color: C.muted } },
  ], { x: gx + 0.25, y: 5.1, w: gw - 0.5, h: 1.55, fontFace: BF, fontSize: 13, valign: "middle", margin: 0, isTextBox: true });
  footer(s);

  // ===== 17. Metrics =====
  s = pres.addSlide(); s.background = { color: C.white };
  header(s, "11", "Expected Benefits & Success Metrics");
  const kpi = [
    ["< 0.5%", "Wrong actions", "irreversible actions taken on a held-out set of negated Hindi + Tamil requests (today our engine misroutes them)", C.red],
    ["≤ 15%", "Confirmation rate", "Friction budget: at most 15% of guarded actions trigger a read-back", C.amber],
    ["−30%", "Reversal tickets", "fewer refund or cancellation reversal tickets at pilot customers", C.green],
    ["15%", "Adoption", "of eligible Freddy AI Agent voice customers turn it on within 2 quarters", C.blue],
  ];
  kpi.forEach(([n, h, b, c], i) => {
    const x = 0.6 + (i % 2) * 3.55, y = 1.6 + Math.floor(i / 2) * 2.6;
    card(s, x, y, 3.35, 2.35);
    s.addText(n, { x: x + 0.25, y: y + 0.15, w: 2.9, h: 0.85, fontFace: HF, fontSize: 38, bold: true, color: c, margin: 0, isTextBox: true });
    s.addText(h, { x: x + 0.25, y: y + 1.0, w: 2.9, h: 0.35, fontFace: BF, fontSize: 14, bold: true, color: C.navy, margin: 0, isTextBox: true });
    s.addText(b, { x: x + 0.25, y: y + 1.35, w: 2.9, h: 0.9, fontFace: BF, fontSize: 11, color: C.muted, valign: "top", margin: 0, isTextBox: true });
  });
  card(s, 7.95, 1.6, 4.8, 4.95);
  s.addChart(pres.charts.DOUGHNUT, [{ name: "Target decision mix", labels: ["ALLOW", "CONFIRM", "BLOCK / re-route"], values: [80, 15, 5] }], {
    x: 8.1, y: 1.7, w: 4.5, h: 4.75, holeSize: 55, chartColors: [C.green, C.amber, C.red],
    showTitle: true, title: "Target mix of guarded actions (%)", titleFontFace: BF, titleFontSize: 13, titleColor: C.navy,
    showValue: true, showPercent: false, dataLabelColor: C.white, dataLabelFontSize: 12, dataLabelFontBold: true,
    showLegend: true, legendPos: "b", legendFontFace: BF, legendFontSize: 11, legendColor: C.ink,
  });
  footer(s);
  s.addNotes("The first metric is measurable today, because our Round-1 engine gives us a baseline on the negation set. The decision mix is a design target, not a measurement.");

  // ===== 18. Risks =====
  s = pres.addSlide(); s.background = { color: C.white };
  header(s, "12", "Risks & Assumptions");
  const mx = 0.9, my2 = 1.65, ms = 4.6;
  const cellC = [["FFF4DA", "FBE4E7"], ["E1F3EC", "FFF4DA"]];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++)
    s.addShape(pres.shapes.RECTANGLE, { x: mx + c * ms / 2, y: my2 + r * ms / 2, w: ms / 2, h: ms / 2, fill: { color: cellC[r][c] }, line: { color: C.white, width: 2 } });
  s.addText("Likelihood →", { x: mx, y: my2 + ms + 0.05, w: ms, h: 0.3, fontFace: BF, fontSize: 11, bold: true, color: C.muted, align: "center", margin: 0, isTextBox: true });
  s.addText("Impact →", { x: mx - ms / 2 - 0.2, y: my2 + ms / 2 - 0.15, w: ms, h: 0.3, fontFace: BF, fontSize: 11, bold: true, color: C.muted, align: "center", rotate: 270, margin: 0, isTextBox: true });
  const risks = [["R1", 0.78, 0.8], ["R2", 0.62, 0.35], ["R3", 0.3, 0.7], ["R4", 0.35, 0.3]];
  risks.forEach(([id, lx, ly]) => {
    const cx = mx + lx * ms, cy2 = my2 + (1 - ly) * ms;
    s.addShape(pres.shapes.OVAL, { x: cx - 0.3, y: cy2 - 0.3, w: 0.6, h: 0.6, fill: { color: C.navy }, line: { color: C.white, width: 2 } });
    s.addText(id, { x: cx - 0.3, y: cy2 - 0.3, w: 0.6, h: 0.6, fontFace: BF, fontSize: 13, bold: true, color: C.white, align: "center", valign: "middle", margin: 0, isTextBox: true });
  });
  const rl = [
    ["R1 · Speech-to-text drops the negation completely", "Mitigation: for irreversible actions, low confidence on a short word, or a missing word where one is expected, sends the call to CONFIRM"],
    ["R2 · Too many confirmations annoy callers", "Mitigation: 15% friction budget, and only irreversible actions are guarded. We tune the threshold in the pilot"],
    ["R3 · Dialects and spellings (vendaam, venaam, matt)", "Mitigation: lexicon plus LLM fallback, and every human override is added to the training set"],
    ["R4 · Assumption: callers accept a read-back", "In their own language. We validate with pilot CSAT, and an English read-back is the fallback"],
  ];
  rl.forEach(([h, b], i) => {
    const y = 1.6 + i * 1.28;
    card(s, 6.1, y, 6.65, 1.13);
    s.addText(h, { x: 6.35, y: y + 0.1, w: 6.2, h: 0.4, fontFace: BF, fontSize: 14, bold: true, color: C.navy, margin: 0, isTextBox: true });
    s.addText(b, { x: 6.35, y: y + 0.5, w: 6.2, h: 0.58, fontFace: BF, fontSize: 12, color: C.ink, valign: "top", margin: 0, isTextBox: true });
  });
  footer(s);

  // ===== 19. Close =====
  s = pres.addSlide(); s.background = { color: C.navy };
  iconCircle(s, I.shieldW, 0.8, 1.0, 1.1, C.navy2);
  s.addText("“Don't cancel” should mean don't cancel.", { x: 0.8, y: 2.35, w: 11.8, h: 0.9, fontFace: HF, fontSize: 36, bold: true, color: C.white, margin: 0, isTextBox: true });
  s.addText("ActionGuard lets AI agents act for India's code-mixed callers and stops them acting on a word they misheard.", { x: 0.8, y: 3.4, w: 11.5, h: 0.9, fontFace: BF, fontSize: 20, color: C.ice, margin: 0, isTextBox: true });
  const ask = [["Our ask", "A Freshworks sandbox with Freddy AI Agent + Freshcaller for a 3-brand pilot"], ["Live today", "codemix-skill.vercel.app: the Round-1 engine that ActionGuard builds on"]];
  ask.forEach(([h, b], i) => {
    const x = 0.8 + i * 6.0;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 4.65, w: 5.6, h: 1.4, rectRadius: 0.1, fill: { color: C.navy2 }, line: { color: C.navy2 } });
    s.addText(h.toUpperCase(), { x: x + 0.3, y: 4.8, w: 5, h: 0.35, fontFace: BF, fontSize: 12, bold: true, color: C.amber, charSpacing: 1, margin: 0, isTextBox: true });
    s.addText(b, { x: x + 0.3, y: 5.15, w: 5.0, h: 0.8, fontFace: BF, fontSize: 15, color: C.white, valign: "top", margin: 0, isTextBox: true });
  });
  s.addText("Team Ramanathan & Sadhana  ·  Thank you", { x: 0.8, y: 6.5, w: 11.5, h: 0.4, fontFace: BF, fontSize: 14, color: "8FA0BF", margin: 0, isTextBox: true });

  await pres.writeFile({ fileName: OUT });
  console.log("wrote", OUT);
})();
