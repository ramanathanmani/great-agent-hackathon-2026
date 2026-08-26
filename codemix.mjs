/**
 * Codemix Skill — ES Module Wrapper
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { CodemixSkill, CRM_ORDERS, BENCHMARK_DATASET, HELD_OUT_DATASET, INTENT_RULES, EN_WORDS } = require("./codemix.js");

export { CodemixSkill, CRM_ORDERS, BENCHMARK_DATASET, HELD_OUT_DATASET, INTENT_RULES, EN_WORDS };
export default CodemixSkill;
