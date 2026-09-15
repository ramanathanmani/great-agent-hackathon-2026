/**
 * Spec traceability checker — enforces the conventions in specs/README.md.
 * Zero dependencies. Reads files only; never executes project code.
 * Run: npm run check:specs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const specsDir = path.join(rootDir, "specs");
const REQUIRED_FILES = ["requirements.md", "design.md", "tasks.md"];
const STATUSES = ["Draft", "Approved", "Implemented"];
const PRIORITIES = ["Must", "Should", "Could"];
const CURRENT = ["Met", "Partial", "Unmet"];

const errors = [];
const fail = (spec, msg) => errors.push(`[${spec}] ${msg}`);

if (!fs.existsSync(path.join(specsDir, "constitution.md"))) {
  errors.push("specs/constitution.md is missing");
}

const specDirs = fs.existsSync(specsDir)
  ? fs.readdirSync(specsDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith("_"))
      .map(d => d.name)
  : [];

for (const spec of specDirs) {
  if (!/^\d{3}-[a-z0-9-]+$/.test(spec)) {
    fail(spec, "folder name must match NNN-kebab-slug");
  }

  const dir = path.join(specsDir, spec);
  const missing = REQUIRED_FILES.filter(f => !fs.existsSync(path.join(dir, f)));
  if (missing.length) {
    fail(spec, `missing ${missing.join(", ")}`);
    continue;
  }

  const requirements = fs.readFileSync(path.join(dir, "requirements.md"), "utf-8").replace(/\r\n/g, "\n");
  const tasks = fs.readFileSync(path.join(dir, "tasks.md"), "utf-8").replace(/\r\n/g, "\n");

  const statusMatch = requirements.match(/^Status:\s*(\w+)\s*$/m);
  const status = statusMatch && statusMatch[1];
  if (!STATUSES.includes(status)) {
    fail(spec, `requirements.md needs "Status: ${STATUSES.join(" | ")}"`);
  }

  // Split requirements into blocks by "### REQ-..." headings
  const reqBlocks = [...requirements.matchAll(/^### (REQ-[A-Z0-9]+-\d{3}):[^\n]*\n([\s\S]*?)(?=^### |^## |(?![\s\S]))/gm)];
  if (reqBlocks.length === 0) fail(spec, "no requirements found (expected '### REQ-<AREA>-<NNN>: Title')");

  const reqIds = new Set();
  const pendingTaskRefs = [];
  const currentCounts = { Met: 0, Partial: 0, Unmet: 0 };
  const metAndVerified = new Set();
  for (const [, id, body] of reqBlocks) {
    if (reqIds.has(id)) fail(spec, `${id} is defined more than once`);
    reqIds.add(id);

    if (!/\*\*Acceptance criteria\*\*/.test(body) || !/^- .+/m.test(body)) {
      fail(spec, `${id} has no acceptance criteria bullets`);
    }

    // Optional metadata lines — validated when present
    const priority = body.match(/^Priority:\s*(\w+)\s*$/m);
    if (priority && !PRIORITIES.includes(priority[1])) {
      fail(spec, `${id} Priority must be one of ${PRIORITIES.join(" | ")}`);
    }
    const current = body.match(/^Current:\s*(\w+)/m);
    if (current) {
      if (!CURRENT.includes(current[1])) fail(spec, `${id} Current must be one of ${CURRENT.join(" | ")}`);
      else currentCounts[current[1]]++;
      if (current[1] === "Met") metAndVerified.add(id);
      if (status === "Implemented" && current[1] !== "Met") fail(spec, `${id} is ${current[1]} but spec is Implemented`);
    }

    const verify = body.match(/^Verify:\s*(.+)$/m);
    if (!verify) {
      fail(spec, `${id} has no "Verify:" line`);
      continue;
    }
    // A Verify line may combine existing evidence and pending work:
    //   Verify: `test/benchmark.test.mjs`; pending (T-009)
    const paths = [...verify[1].matchAll(/`([^`]+)`/g)].map(m => m[1]);
    // pending (T-001) or pending (T-010, T-027)
    const pendings = [...verify[1].matchAll(/pending\s*\(([^)]*)\)/g)]
      .flatMap(m => m[1].match(/T-\d{3}/g) || []);
    if (paths.length === 0 && pendings.length === 0) {
      fail(spec, `${id} Verify: must list \`path\` and/or pending (T-###)`);
    }
    for (const p of paths) {
      const filePart = p.split(/\s+/)[0];
      if (!fs.existsSync(path.join(rootDir, filePart))) fail(spec, `${id} verifies with missing file ${filePart}`);
    }
    for (const t of pendings) {
      pendingTaskRefs.push([id, t]);
      if (status === "Implemented") fail(spec, `${id} is still pending on ${t} but spec is Implemented`);
    }
  }

  // Tasks
  const taskLines = [...tasks.matchAll(/^- \[( |x)\] (T-\d{3}):(.*)$/gm)];
  if (taskLines.length === 0) fail(spec, "tasks.md has no tasks (expected '- [ ] T-###: ... (REQ-...)')");

  const taskIds = new Set();
  const coveredReqs = new Set();
  for (const [, done, taskId, rest] of taskLines) {
    if (taskIds.has(taskId)) fail(spec, `${taskId} is defined more than once`);
    taskIds.add(taskId);

    const refs = rest.match(/REQ-[A-Z0-9]+-\d{3}/g) || [];
    if (refs.length === 0) fail(spec, `${taskId} references no requirement`);
    for (const r of refs) {
      if (!reqIds.has(r)) fail(spec, `${taskId} references unknown ${r}`);
      coveredReqs.add(r);
    }
    if (status === "Implemented" && done !== "x") fail(spec, `${taskId} is unchecked but spec is Implemented`);
  }

  // A requirement needs a task unless it is already Met with no pending verification
  for (const id of reqIds) {
    const done = metAndVerified.has(id) && !pendingTaskRefs.some(([r]) => r === id);
    if (!coveredReqs.has(id) && !done) fail(spec, `${id} is not covered by any task`);
  }
  for (const [id, taskId] of pendingTaskRefs) {
    if (!taskIds.has(taskId)) fail(spec, `${id} is pending on unknown task ${taskId}`);
  }

  const tracked = currentCounts.Met + currentCounts.Partial + currentCounts.Unmet;
  const currentSummary = tracked ? `, current: ${currentCounts.Met} met / ${currentCounts.Partial} partial / ${currentCounts.Unmet} unmet` : "";
  console.log(`[check:specs] ${spec}: ${status}, ${reqIds.size} requirements, ${taskIds.size} tasks, ${pendingTaskRefs.length} pending verifications${currentSummary}`);
}

if (errors.length) {
  console.error(`\n[check:specs] FAILED with ${errors.length} error(s):`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(`[check:specs] OK — ${specDirs.length} spec(s) checked.`);
