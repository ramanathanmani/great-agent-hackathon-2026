// Negation benchmark: does a negated request still trigger a refund / cancel action?
//
// Compares the Round-1 intent engine alone against the same engine behind a
// v0 lexicon negation gate. The test set is small and written by the team,
// so treat the numbers as a reproducible demo, not a production benchmark.
//
// Run: node decision-policy/negation-benchmark.mjs

import { CodemixSkill } from "../codemix.js";
import { writeFileSync, mkdirSync } from "node:fs";

// Caller does NOT want the refund / cancel / return action.
const NEGATED = [
  ["hi", "Order cancel mat karo, bas address change karna hai"],
  ["hi", "Refund nahi chahiye, replacement bhej do"],
  ["hi", "Please order cancel mat karna, main ghar pe hi hoon"],
  ["hi", "Mujhe refund nahi chahiye bhaiya, bas size exchange kar do"],
  ["hi", "Cancel nahi karna hai, delivery date aage kar do"],
  ["hi", "Order ko cancel mat kijiye, payment ho gaya hai"],
  ["hi", "Return nahi karna, bas invoice bhej do"],
  ["hi", "Refund mat do, wallet mein credit kar do"],
  ["hi", "Mera order cancel na karein, address update karna hai"],
  ["hi", "Abhi cancel mat karo, main kal confirm karunga"],
  ["ta", "Refund vendam, replacement anuppunga"],
  ["ta", "Order cancel pannaadheenga, address mattum maathunga"],
  ["ta", "Enakku refund venaam, exchange pannunga"],
  ["ta", "Cancel pannaadheenga please, naan veetla irukken"],
  ["ta", "Return vendam, bill mattum anuppunga"],
  ["ta", "Order cancel seiyaadheenga, delivery late aanalum paravaillai"],
  ["ta", "Refund vendaam sir, new piece anuppunga"],
  ["ta", "Ippo cancel pannaadheenga, naalaikku sollren"],
  ["en", "Don't cancel the order, just change the address"],
  ["en", "I don't want a refund, send a replacement"],
  ["te", "Refund vaddu, replacement pampandi"],
  ["kn", "Order cancel beda, address change maadi"],
  ["bn", "Order cancel korben na, address change korte hobe"],
];

// Caller DOES want the refund / cancel / return action (some contain a
// negation word that is not about the action, e.g. "delivery nahi hua").
const AFFIRMATIVE = [
  ["hi", "Order cancel kar do please"],
  ["hi", "Refund chahiye mujhe, product kharab hai"],
  ["hi", "Mera order cancel karna hai"],
  ["hi", "Refund process kar dijiye, order 48211"],
  ["hi", "Paisa wapas chahiye, return le lo"],
  ["hi", "Product kaam nahi kar raha, refund chahiye"],
  ["hi", "Order abhi tak nahi aaya, cancel kar do"],
  ["hi", "Size sahi nahi hai, return karna hai"],
  ["hi", "Cancel karne ka option nahi dikh raha, please cancel kar do"],
  ["ta", "Order cancel pannunga"],
  ["ta", "Refund venum, product damage aayiduchu"],
  ["ta", "Enakku refund kodunga"],
  ["ta", "Return pannanum, pickup anuppunga"],
  ["ta", "Parcel varala, refund kodunga"],
  ["en", "Please cancel my order"],
  ["en", "I want a refund for order 48211"],
  ["en", "The item never arrived, refund me please"],
  ["te", "Refund kaavali, product baagaaledu"],
  ["kn", "Order cancel maadi"],
  ["bn", "Order cancel kore din"],
];

const ACTION = /^(cancel\w*|refund\w*|return\w*)$/i;
const POST_NEG = /^(mat|nahi|nahin|na|nako|vendam|vendaam|venaam|vaddu|beda|\w*(aadheenga|aadhinga|aathinga|aadhe))$/i;
const PRE_NEG = /^(don't|dont|do|not|no|never)$/i; // "do" only counts when followed by "not"
const CLAUSE_BREAK = /[,.;!?]|\b(but|bas|lekin|aur)\b/i;

export function negationInScope(text) {
  const clauses = text.split(CLAUSE_BREAK).filter(c => c && !CLAUSE_BREAK.test(c));
  for (const clause of clauses) {
    const w = clause.toLowerCase().match(/[\p{L}']+/gu) || [];
    for (let i = 0; i < w.length; i++) {
      if (!ACTION.test(w[i])) continue;
      if (w.slice(i + 1, i + 4).some(x => POST_NEG.test(x))) return true;
      const pre = w.slice(Math.max(0, i - 4), i);
      if (pre.some((x, j) => PRE_NEG.test(x) && (x !== "do" || pre[j + 1] === "not"))) return true;
    }
  }
  return false;
}

const skill = new CodemixSkill();
const run = (set, negated) => set.map(([lang, text]) => {
  const engineAction = skill.analyseOffline(text).intent_id === "cancellation_refund";
  const gateNegated = negationInScope(text);
  return { lang, text, negated, engineAction, gateNegated, executesWithGate: engineAction && !gateNegated };
});

const neg = run(NEGATED, true), aff = run(AFFIRMATIVE, false);
const pct = (n, d) => `${((100 * n) / d).toFixed(1)}%`;
const summary = {
  negated_requests: neg.length,
  affirmative_requests: aff.length,
  engine_alone_wrong_action: `${neg.filter(r => r.engineAction).length}/${neg.length} (${pct(neg.filter(r => r.engineAction).length, neg.length)})`,
  with_gate_wrong_action: `${neg.filter(r => r.executesWithGate).length}/${neg.length} (${pct(neg.filter(r => r.executesWithGate).length, neg.length)})`,
  gate_caught_negation: `${neg.filter(r => r.gateNegated).length}/${neg.length} (${pct(neg.filter(r => r.gateNegated).length, neg.length)})`,
  gate_false_block_on_real_requests: `${aff.filter(r => r.gateNegated).length}/${aff.length} (${pct(aff.filter(r => r.gateNegated).length, aff.length)})`,
  engine_recognised_real_requests: `${aff.filter(r => r.engineAction).length}/${aff.length} (${pct(aff.filter(r => r.engineAction).length, aff.length)})`,
};

console.table(summary);
for (const r of [...neg, ...aff]) {
  const flag = r.negated ? (r.executesWithGate ? "MISS" : "ok") : (r.gateNegated ? "FALSE-BLOCK" : "ok");
  if (flag !== "ok") console.log(`${flag.padEnd(11)} [${r.lang}] ${r.text}`);
}
mkdirSync(new URL("./results/", import.meta.url), { recursive: true });
writeFileSync(new URL("./results/negation-benchmark.json", import.meta.url), JSON.stringify({ summary, rows: [...neg, ...aff] }, null, 2));
