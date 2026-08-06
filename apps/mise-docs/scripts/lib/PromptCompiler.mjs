import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const FIELDS = Object.freeze([
  "id",
  "title",
  "scope",
  "category",
  "status",
  "version",
  "appliesTo",
  "tags",
  "sourceSummary",
  "relatedAdr",
  "relatedDocs",
  "requiredInputs",
  "passCriteria",
  "lastVerified",
  "replacement",
]);
const LIST_FIELDS = new Set(["appliesTo", "tags", "relatedAdr", "relatedDocs", "requiredInputs", "passCriteria"]);
const HEADINGS = Object.freeze([
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
const SENSITIVE = /(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{12,}|[A-Za-z]:\\{1,2}Users\\{1,2}|\/Users\/[^/\s]+\/|\/home\/[^/\s]+\/|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b)/iu;

export async function compilePromptCatalog({ repositoryRoot, outputDirectory }) {
  const root = path.join(repositoryRoot, "apps", "mise-docs", "prompts");
  const records = [];
  for (const scope of ["internal", "public"]) {
    const directory = path.join(root, scope);
    const names = (await readdir(directory)).filter((name) => name.endsWith(".md")).sort();
    for (const name of names) {
      const relativePath = `apps/mise-docs/prompts/${scope}/${name}`;
      records.push(parsePrompt(await readFile(path.join(directory, name), "utf8"), relativePath, scope));
    }
  }
  validateUniqueRecords(records);
  await validateRelations(records, repositoryRoot);

  const publicRecords = records
    .filter(({ metadata }) => metadata.scope === "public")
    .sort((left, right) => left.metadata.id.localeCompare(right.metadata.id, "en"));
  const promptsDirectory = path.join(outputDirectory, "prompts");
  await mkdir(promptsDirectory, { recursive: true });
  const items = [];
  for (const prompt of publicRecords) {
    const route = `/ko/prompts#prompt-${prompt.metadata.id}`;
    const record = {
      schemaVersion: 1,
      ...prompt.metadata,
      route,
      copyText: prompt.body.trim(),
      sections: prompt.sections,
    };
    await writeJson(path.join(promptsDirectory, `${prompt.metadata.id}.json`), record);
    items.push({
      id: record.id,
      title: record.title,
      category: record.category,
      status: record.status,
      version: record.version,
      tags: record.tags,
      route,
      sourceSummary: record.sourceSummary,
      lastVerified: record.lastVerified,
    });
  }
  await writeJson(path.join(outputDirectory, "prompt-index.json"), { schemaVersion: 1, items });
  await extendSearchIndex(outputDirectory, items);
  return { publicRecords: items, totalRecords: records.length };
}

export function parsePrompt(source, relativePath = "prompt.md", expectedScope = "public") {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(source);
  if (!match) throw new Error(`Prompt frontmatter is missing: ${relativePath}`);
  const metadata = parseFrontmatter(match[1], relativePath);
  if (metadata.scope !== expectedScope) throw new Error(`Prompt scope does not match path: ${relativePath}`);
  const body = source.slice(match[0].length).replace(/\r\n?/gu, "\n");
  if (SENSITIVE.test(source)) throw new Error(`Prompt contains sensitive material: ${relativePath}`);
  if (/^\s*<\/?[A-Za-z][^>]*>/mu.test(body)) throw new Error(`Prompt raw HTML is not allowed: ${relativePath}`);
  const headings = [...body.matchAll(/^#\s+(.+?)\s*$/gmu)].map((entry) => entry[1]);
  if (headings.join("|") !== HEADINGS.join("|")) throw new Error(`Prompt headings are invalid: ${relativePath}`);
  const sections = {};
  for (let index = 0; index < HEADINGS.length; index += 1) {
    const heading = HEADINGS[index];
    const start = body.indexOf(`# ${heading}`) + heading.length + 3;
    const next = index + 1 < HEADINGS.length ? body.indexOf(`# ${HEADINGS[index + 1]}`, start) : body.length;
    sections[heading] = body.slice(start, next).trim();
  }
  return { body, metadata, relativePath, sections };
}

function parseFrontmatter(source, relativePath) {
  const values = new Map();
  let list = null;
  for (const line of source.split(/\r?\n/u)) {
    if (line.trim() === "") continue;
    const item = /^\s{2}-\s+(.+?)\s*$/u.exec(line);
    if (item) {
      if (list === null) throw new Error(`Prompt list item has no field: ${relativePath}`);
      values.get(list).push(item[1]);
      continue;
    }
    const scalar = /^([A-Za-z][A-Za-z0-9]*):\s*(.*?)\s*$/u.exec(line);
    if (!scalar) throw new Error(`Invalid Prompt frontmatter: ${relativePath}`);
    const [, field, rawValue] = scalar;
    if (!FIELDS.includes(field) || values.has(field)) throw new Error(`Unknown or duplicate Prompt field ${field}: ${relativePath}`);
    if (LIST_FIELDS.has(field)) {
      if (rawValue !== "") throw new Error(`Prompt list field must use block items: ${relativePath}`);
      values.set(field, []);
      list = field;
      continue;
    }
    if (rawValue === "") throw new Error(`Prompt scalar field is empty: ${relativePath}`);
    values.set(field, rawValue === "null" ? null : field === "version" ? Number(rawValue) : rawValue);
    list = null;
  }
  for (const field of FIELDS) {
    if (!values.has(field)) throw new Error(`Prompt field is missing (${field}): ${relativePath}`);
  }
  const metadata = Object.fromEntries(values);
  if (!/^mise\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*\.v[1-9][0-9]*$/u.test(metadata.id)) {
    throw new Error(`Prompt id is invalid: ${relativePath}`);
  }
  if (!new Set(["internal", "public"]).has(metadata.scope)) throw new Error(`Prompt scope is invalid: ${relativePath}`);
  if (!new Set(["draft", "reviewed", "verified", "deprecated"]).has(metadata.status)) throw new Error(`Prompt status is invalid: ${relativePath}`);
  if (!Number.isSafeInteger(metadata.version) || !metadata.id.endsWith(`.v${metadata.version}`)) throw new Error(`Prompt version is invalid: ${relativePath}`);
  if (metadata.status === "verified" && typeof metadata.lastVerified !== "string") throw new Error(`Verified Prompt requires evidence: ${relativePath}`);
  for (const field of LIST_FIELDS) {
    if (new Set(metadata[field]).size !== metadata[field].length) throw new Error(`Prompt list contains duplicates (${field}): ${relativePath}`);
  }
  return metadata;
}

async function validateRelations(records, repositoryRoot) {
  const ids = new Set(records.map(({ metadata }) => metadata.id));
  const decisions = await readFile(path.join(repositoryRoot, "packages", "mise", "docs", "DECISIONS.md"), "utf8");
  const packageNames = new Set();
  for (const directory of ["mise", "mise-ui", "mise-php"]) {
    const manifest = JSON.parse(await readFile(path.join(repositoryRoot, "packages", directory, "package.json"), "utf8"));
    packageNames.add(manifest.name);
  }
  const docsManifest = JSON.parse(await readFile(path.join(repositoryRoot, "apps", "mise-docs", "package.json"), "utf8"));
  packageNames.add(docsManifest.name);
  for (const prompt of records) {
    for (const relation of prompt.metadata.relatedDocs) await requireFile(repositoryRoot, relation, prompt.relativePath);
    for (const relation of prompt.metadata.requiredInputs.filter(looksLikePath)) await requireFile(repositoryRoot, relation, prompt.relativePath);
    for (const adr of prompt.metadata.relatedAdr) {
      if (!new RegExp(`\\b${escapePattern(adr)}\\b`, "u").test(decisions)) throw new Error(`Prompt ADR relation is broken: ${prompt.relativePath} -> ${adr}`);
    }
    for (const target of prompt.metadata.appliesTo) {
      const packageName = target.split("@", 1)[0];
      if (!packageNames.has(packageName)) throw new Error(`Prompt package relation is broken: ${prompt.relativePath} -> ${target}`);
    }
    if (typeof prompt.metadata.lastVerified === "string") await requireFile(repositoryRoot, prompt.metadata.lastVerified, prompt.relativePath);
    if (typeof prompt.metadata.replacement === "string" && !ids.has(prompt.metadata.replacement)) {
      throw new Error(`Prompt replacement is broken: ${prompt.relativePath}`);
    }
  }
}

function validateUniqueRecords(records) {
  const ids = new Set();
  for (const { metadata, relativePath } of records) {
    if (ids.has(metadata.id)) throw new Error(`Duplicate Prompt id: ${metadata.id}`);
    ids.add(metadata.id);
    if (!relativePath.includes(`/${metadata.scope}/`)) throw new Error(`Prompt scope path is invalid: ${relativePath}`);
  }
}

async function requireFile(repositoryRoot, relativePath, source) {
  const target = path.resolve(repositoryRoot, relativePath);
  const boundary = path.relative(repositoryRoot, target);
  if (boundary.startsWith("..") || path.isAbsolute(boundary)) throw new Error(`Prompt relation escapes repository: ${source}`);
  try {
    if (!(await stat(target)).isFile()) throw new Error("not-file");
  } catch {
    throw new Error(`Prompt relation is broken: ${source} -> ${relativePath}`);
  }
}

function looksLikePath(value) {
  return /^(?:apps|docs|packages|resources|scripts|tests)\//u.test(value);
}

async function extendSearchIndex(outputDirectory, prompts) {
  const target = path.join(outputDirectory, "search-index.json");
  const index = JSON.parse(await readFile(target, "utf8"));
  for (const prompt of prompts) {
    index.items.push({
      documentId: "mise.docs.prompt-catalog",
      headingId: `prompt-${prompt.id}`,
      route: prompt.route,
      section: "prompts",
      text: `${prompt.title} ${prompt.sourceSummary} ${prompt.tags.join(" ")}`,
      title: prompt.title,
    });
  }
  index.items.sort((left, right) => left.route.localeCompare(right.route, "en") || left.title.localeCompare(right.title, "ko"));
  await writeJson(target, index);
}

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

async function writeJson(target, value) {
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(stableValue(value), null, 2)}\n`, "utf8");
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}
