import { readFile } from "node:fs/promises";

const reportUrl = new URL("../etc/mise-webgl.api.md", import.meta.url);
const report = await readFile(reportUrl, "utf8");
const undocumented = report.match(/\(undocumented\)/g) ?? [];
const warnings = report.match(/\/\/ Warning:/g) ?? [];
const architecture = await readFile(
  new URL("../docs/ARCHITECTURE.md", import.meta.url),
  "utf8",
);
const enterpriseComposition = await readFile(
  new URL("../docs/ENTERPRISE-COMPOSITION.md", import.meta.url),
  "utf8",
);
const contracts = await readFile(
  new URL("../docs/CONTRACTS.md", import.meta.url),
  "utf8",
);
const requiredDocumentation = new Map([
  ["architecture restricted container", [architecture, "Restricted Container"]],
  ["architecture object host", [architecture, "Object Host"]],
  ["architecture clock", [architecture, "MiseClock"]],
  ["architecture source budget", [architecture, "450줄"]],
  ["enterprise service-locator ban", [enterpriseComposition, "Service Locator"]],
  ["enterprise object factory", [enterpriseComposition, "defineObjectFactory"]],
  ["enterprise health derivation", [enterpriseComposition, "scene.object-factory"]],
  ["contracts raw delta", [contracts, "`rawDelta`"]],
]);
const missingDocumentation = [...requiredDocumentation]
  .filter(([, [source, marker]]) => !source.includes(marker))
  .map(([label]) => label);

if (
  undocumented.length > 0
  || warnings.length > 0
  || missingDocumentation.length > 0
) {
  console.error(
    `FAIL public docs: undocumented=${undocumented.length} warnings=${warnings.length} missing=${missingDocumentation.join(",")}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    "PASS public docs: undocumented=0 warnings=0 enterprise-contract=complete",
  );
}
