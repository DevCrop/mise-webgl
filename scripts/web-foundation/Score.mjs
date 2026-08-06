import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createScoreReport } from "./Policy.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = path.join(root, "docs", "mise-web-foundation-score.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const evidenceFailures = [];

for (const item of [...manifest.evidence, ...manifest.criticalGates]) {
  if (!item.id) evidenceFailures.push("score item requires id");
  for (const relativePath of item.evidence ?? []) {
    try {
      await stat(path.join(root, relativePath));
    } catch {
      evidenceFailures.push(`score evidence does not exist: ${item.id} -> ${relativePath}`);
    }
  }
}

const report = createScoreReport(manifest.evidence, manifest.criticalGates);
report.failures.push(...evidenceFailures);
if (report.failures.length > 0) {
  for (const failure of report.failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}

const critical = report.criticalPass ? "PASS" : `PENDING(${report.pendingCritical.length})`;
const release = report.releaseCandidate ? "YES" : "NO";
console.log(`WEB FOUNDATION SCORE ${report.score}/100 CRITICAL=${critical} RC=${release}`);

if (process.argv.includes("--require-release") && !report.releaseCandidate) {
  process.exit(1);
}
