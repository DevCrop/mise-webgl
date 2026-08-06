const COMPONENT_ID = /^mise\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*\.v[1-9]\d*$/u;
const PROMPT_ID = /^mise\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*\.v[1-9]\d*$/u;
const LITERAL_HTML = /<(?:html|head|body|header|footer|main|nav|aside|article|section|div|span|a|button|dialog|template|canvas)\b/iu;
const FORBIDDEN_DOM_WRITER = /\b(?:innerHTML|outerHTML|insertAdjacentHTML|document\.write)\b/u;
const MODULE_VARIABLE = /^\$([a-z][a-z0-9-]*)\s*:/gmu;
const PROMPT_SENSITIVE_VALUE = /(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{12,}|[A-Za-z]:\\{1,2}Users\\{1,2}|\/Users\/[^/\s]+\/|\/home\/[^/\s]+\/)/u;
const PROMPT_HEADINGS = Object.freeze([
  "Goal",
  "Context",
  "Required inputs",
  "Constraints",
  "Ownership boundaries",
  "Task",
  "Output contract",
  "Verification",
  "Stop conditions",
]);

export const WEB_FOUNDATION_WEIGHTS = Object.freeze({
  architecture: 15,
  docs: 15,
  html: 20,
  scss: 15,
  webgl: 15,
  accessibility: 10,
  security: 10,
});

export function validateComponentContract(contract) {
  const failures = [];
  if (!isRecord(contract)) return ["component contract must be an object"];
  if (!COMPONENT_ID.test(stringValue(contract.id))) {
    failures.push("component contract id is invalid");
  }
  for (const field of ["element", "props", "slots", "states", "keyboard", "focus", "noJs"]) {
    if (!(field in contract)) failures.push(`component contract is missing ${field}`);
  }
  if (!isRecord(contract.props)) failures.push("component contract props must be an object");
  if (!isRecord(contract.slots)) failures.push("component contract slots must be an object");
  if (!Array.isArray(contract.states)) failures.push("component contract states must be an array");
  return failures;
}

export function validateScssSources(sources, clampAllowlist = [], importantAllowlist = []) {
  const failures = [];
  const declarations = new Map();
  for (const [file, source] of entries(sources)) {
    if (/\bclamp\s*\(/u.test(source) && !clampAllowlist.includes(file)) {
      failures.push(`direct clamp() is forbidden: ${file}`);
    }
    if (/!important\b/u.test(source) && !importantAllowlist.includes(file)) {
      failures.push(`!important is forbidden: ${file}`);
    }
    for (const match of source.matchAll(MODULE_VARIABLE)) {
      const owners = declarations.get(match[1]) ?? [];
      owners.push(file);
      declarations.set(match[1], owners);
    }
  }
  for (const [variable, owners] of declarations) {
    if (owners.length > 1) {
      failures.push(`duplicate SCSS variable $${variable}: ${owners.join(", ")}`);
    }
  }
  return failures;
}

export function validateDomControllerSources(sources) {
  const failures = [];
  for (const [file, source] of entries(sources)) {
    if (FORBIDDEN_DOM_WRITER.test(source)) {
      failures.push(`forbidden DOM writer: ${file}`);
    }
  }
  return failures;
}

export function validatePhpCompositionSources(sources, literalHtmlAllowlist = []) {
  const failures = [];
  for (const [file, source] of entries(sources)) {
    if (LITERAL_HTML.test(source) && !literalHtmlAllowlist.includes(file)) {
      failures.push(`literal HTML outside Component template: ${file}`);
    }
  }
  return failures;
}

export function validateRuleFamily(source, family) {
  const numbers = [...source.matchAll(new RegExp(`\\*\\*(${family})-(\\d{2})\\*\\*`, "g"))]
    .map((match) => Number.parseInt(match[2], 10))
    .toSorted((left, right) => left - right);
  const expected = Array.from({ length: numbers.at(-1) ?? 0 }, (_, index) => index + 1);
  if (numbers.length === 0 || numbers.join(",") !== expected.join(",")) {
    return [`rule family must be contiguous: ${family}`];
  }
  return [];
}

export function validatePromptRecord(prompt) {
  const failures = [];
  if (!isRecord(prompt)) return ["prompt record must be an object"];
  if (!PROMPT_ID.test(stringValue(prompt.id))) failures.push("prompt id is invalid");
  if (!new Set(["internal", "public"]).has(prompt.scope)) failures.push("prompt scope is invalid");
  if (!new Set(["draft", "reviewed", "verified", "deprecated"]).has(prompt.status)) {
    failures.push("prompt status is invalid");
  }
  for (const field of ["title", "category", "version", "sourceSummary", "requiredInputs", "passCriteria"]) {
    if (!(field in prompt)) failures.push(`prompt is missing ${field}`);
  }
  if (prompt.scope === "internal" && prompt.public === true) {
    failures.push("internal prompt cannot be public");
  }
  if (prompt.status === "verified" && !prompt.lastVerified) {
    failures.push("verified prompt requires lastVerified");
  }
  if (containsSensitiveValue(prompt)) {
    failures.push("prompt contains a secret or local user path");
  }
  return failures;
}

export function validateWorkspacePackages(rootManifest, manifests) {
  const failures = [];
  const expectedWorkspaces = [
    "packages/mise",
    "packages/mise-ui",
    "packages/mise-php",
    "apps/mise-docs",
  ];
  const workspaces = Array.isArray(rootManifest.workspaces) ? rootManifest.workspaces : [];
  for (const workspace of expectedWorkspaces) {
    if (!workspaces.includes(workspace)) failures.push(`workspace is missing: ${workspace}`);
  }

  const expectedVersions = {
    "mise-ui": "0.2.0-rc.1",
    "mise-php": "0.2.0-rc.1",
    "mise-docs": "0.2.0-rc.1",
  };
  for (const [name, version] of Object.entries(expectedVersions)) {
    if (manifests[name]?.version !== version) {
      failures.push(`workspace version mismatch: ${name}`);
    }
  }

  const expectedFiles = {
    "mise-ui": ["dist", "contracts", "docs", "styles", "README.md"],
    "mise-php": ["dist", "docs", "README.md"],
  };
  for (const [name, files] of Object.entries(expectedFiles)) {
    if (JSON.stringify(manifests[name]?.files) !== JSON.stringify(files)) {
      failures.push(`package artifact allowlist mismatch: ${name}`);
    }
  }

  const forbiddenEdges = {
    "mise-webgl": ["mise-ui", "mise-php", "mise-docs"],
    "mise-ui": ["mise-webgl", "mise-php", "mise-docs"],
    "mise-php": ["mise-webgl", "mise-ui", "mise-docs"],
  };
  for (const [name, forbidden] of Object.entries(forbiddenEdges)) {
    const dependencies = manifests[name]?.dependencies ?? {};
    for (const target of forbidden) {
      if (target in dependencies) failures.push(`forbidden package edge: ${name} -> ${target}`);
    }
  }

  const docsDependencies = manifests["mise-docs"]?.dependencies ?? {};
  for (const dependency of ["mise-ui", "mise-php"]) {
    if (!(dependency in docsDependencies)) {
      failures.push(`mise-docs dependency is missing: ${dependency}`);
    }
  }

  failures.push(...findPackageCycles(manifests));
  return failures;
}

export function validatePromptDocument(source, file) {
  const failures = [];
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u)?.[1];
  if (!frontmatter) return [`prompt frontmatter is missing: ${file}`];
  const scalar = (name) => frontmatter.match(new RegExp(`^${name}:\\s*(.*)$`, "mu"))?.[1]?.trim();
  const prompt = {
    id: scalar("id"),
    title: scalar("title"),
    scope: scalar("scope"),
    category: scalar("category"),
    status: scalar("status"),
    version: Number.parseInt(scalar("version") ?? "", 10),
    sourceSummary: scalar("sourceSummary"),
    requiredInputs: /^requiredInputs:\s*$/mu.test(frontmatter) ? [] : undefined,
    passCriteria: /^passCriteria:\s*$/mu.test(frontmatter) ? [] : undefined,
    lastVerified: scalar("lastVerified") === "null" ? null : scalar("lastVerified"),
  };
  failures.push(...validatePromptRecord(prompt).map((failure) => `${failure}: ${file}`));
  const headings = [...source.matchAll(/^#\s+(.+?)\s*$/gmu)].map((match) => match[1]);
  if (headings.join("|") !== PROMPT_HEADINGS.join("|")) {
    failures.push(`prompt headings are invalid: ${file}`);
  }
  if (file.includes("/internal/") && prompt.scope !== "internal") {
    failures.push(`internal Prompt path requires internal scope: ${file}`);
  }
  if (file.includes("/public/") && prompt.scope !== "public") {
    failures.push(`public Prompt path requires public scope: ${file}`);
  }
  return failures;
}

export function createScoreReport(evidence, criticalGates) {
  const categoryScores = Object.fromEntries(
    Object.keys(WEB_FOUNDATION_WEIGHTS).map((category) => [category, 0]),
  );
  const plannedScores = { ...categoryScores };
  const failures = [];
  for (const item of evidence) {
    if (!(item.category in WEB_FOUNDATION_WEIGHTS)) {
      failures.push(`unknown score category: ${item.category}`);
      continue;
    }
    plannedScores[item.category] += item.points;
    if (item.status === "pass") categoryScores[item.category] += item.points;
  }
  for (const [category, score] of Object.entries(categoryScores)) {
    if (score > WEB_FOUNDATION_WEIGHTS[category]) {
      failures.push(`score exceeds category weight: ${category}`);
    }
    if (plannedScores[category] !== WEB_FOUNDATION_WEIGHTS[category]) {
      failures.push(`planned score must equal category weight: ${category}`);
    }
  }
  const score = Object.values(categoryScores).reduce((total, value) => total + value, 0);
  const pendingCritical = criticalGates
    .filter((gate) => gate.status !== "pass")
    .map((gate) => gate.id);
  return {
    categoryScores,
    criticalPass: pendingCritical.length === 0,
    failures,
    pendingCritical,
    releaseCandidate: failures.length === 0 && pendingCritical.length === 0 && score >= 95,
    score,
  };
}

function entries(sources) {
  return sources instanceof Map ? sources.entries() : Object.entries(sources);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value) {
  return typeof value === "string" ? value : "";
}

function findPackageCycles(manifests) {
  const workspaceNames = new Set(Object.keys(manifests));
  const graph = Object.fromEntries(Object.entries(manifests).map(([name, manifest]) => [
    name,
    Object.keys(manifest.dependencies ?? {}).filter((dependency) => workspaceNames.has(dependency)),
  ]));
  const visited = new Set();
  const active = new Set();
  const failures = [];

  function visit(name, trail) {
    if (active.has(name)) {
      failures.push(`package dependency cycle: ${[...trail, name].join(" -> ")}`);
      return;
    }
    if (visited.has(name)) return;
    active.add(name);
    for (const dependency of graph[name] ?? []) visit(dependency, [...trail, name]);
    active.delete(name);
    visited.add(name);
  }

  for (const name of workspaceNames) visit(name, []);
  return failures;
}

function containsSensitiveValue(value) {
  if (typeof value === "string") return PROMPT_SENSITIVE_VALUE.test(value);
  if (Array.isArray(value)) return value.some(containsSensitiveValue);
  if (isRecord(value)) return Object.values(value).some(containsSensitiveValue);
  return false;
}
