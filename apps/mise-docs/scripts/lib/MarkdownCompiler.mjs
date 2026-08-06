import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const DOCUMENT_FIELDS = [
  "id",
  "title",
  "description",
  "locale",
  "route",
  "section",
  "order",
  "status",
];
const DOCUMENT_STATUSES = new Set(["draft", "rc", "stable", "deprecated"]);
const COMPONENT_NAMES = Object.freeze({
  blockquote: "Callout",
  code: "CodeBlock",
  heading: "Heading",
  list: "List",
  paragraph: "Paragraph",
  table: "DataTable",
});

export async function compileDocumentation({ repositoryRoot, outputDirectory }) {
  const docsRoot = path.join(repositoryRoot, "packages", "mise", "docs");
  const sourceNames = (await readdir(docsRoot))
    .filter((name) => name.endsWith(".md"))
    .sort((left, right) => left.localeCompare(right, "en"));
  const sources = [];
  for (const name of sourceNames) {
    const absolutePath = path.join(docsRoot, name);
    const source = await readFile(absolutePath, "utf8");
    const parsed = parseDocumentSource(source, `packages/mise/docs/${name}`);
    sources.push({ absolutePath, name, source, ...parsed });
  }

  validateUniqueMetadata(sources);
  await validateLinks(sources, docsRoot);
  const routeBySource = new Map(sources.map((source) => [source.absolutePath, source.metadata.route]));
  const documents = sources.map((source) => compileParsedDocument(source, routeBySource));
  const navigation = documents
    .map(({ id, locale, order, route, section, status, title }) => ({
      id,
      locale,
      order,
      route,
      section,
      status,
      title,
    }))
    .sort(compareOrderThenId);
  const search = documents.flatMap((document) => searchEntries(document));
  const sitemap = navigation.map(({ id, locale, route, status }) => ({ id, locale, route, status }));
  const api = await compileApiIndex(repositoryRoot);
  const components = await compileComponentIndex(repositoryRoot);
  const tokens = await compileTokenIndex(repositoryRoot);

  await mkdir(path.join(outputDirectory, "documents"), { recursive: true });
  const outputs = [];
  for (const document of documents) {
    const relativePath = `documents/${document.id}.json`;
    await writeJson(path.join(outputDirectory, relativePath), document);
    outputs.push(relativePath);
  }
  for (const [relativePath, value] of [
    ["navigation.json", { schemaVersion: 1, items: navigation }],
    ["search-index.json", { schemaVersion: 1, items: search }],
    ["sitemap.json", { schemaVersion: 1, routes: sitemap }],
    ["api-index.json", api],
    ["component-index.json", components],
    ["token-index.json", tokens],
  ]) {
    await writeJson(path.join(outputDirectory, relativePath), value);
    outputs.push(relativePath);
  }

  await writeBuildManifest(outputDirectory);

  return { documents, navigation, search, sitemap, api, components, tokens };
}

export async function writeBuildManifest(outputDirectory) {
  const relativePaths = (await filesWithin(outputDirectory))
    .filter((relativePath) => relativePath !== "build-manifest.json")
    .sort();
  const files = [];
  for (const relativePath of relativePaths) {
    const contents = await readFile(path.join(outputDirectory, relativePath));
    files.push({
      path: relativePath,
      sha256: createHash("sha256").update(contents).digest("hex"),
    });
  }
  await writeJson(path.join(outputDirectory, "build-manifest.json"), {
    schemaVersion: 1,
    files,
  });
}

export function compileMarkdownDocument(source, relativePath = "document.md") {
  const parsed = parseDocumentSource(source, relativePath);
  return compileParsedDocument({
    absolutePath: path.resolve(relativePath),
    name: path.basename(relativePath),
    ...parsed,
  }, new Map());
}

function parseDocumentSource(source, relativePath) {
  if (source.charCodeAt(0) === 0xfeff) {
    throw new Error(`UTF-8 BOM is not allowed: ${relativePath}`);
  }
  const frontmatterMatch = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(source);
  if (!frontmatterMatch) throw new Error(`Document frontmatter is missing: ${relativePath}`);
  const metadata = parseFrontmatter(frontmatterMatch[1], relativePath);
  const body = source.slice(frontmatterMatch[0].length).replace(/\r\n?/gu, "\n");
  rejectExecutableMarkdown(body, relativePath);
  const headings = collectHeadings(body, relativePath);
  if (headings.length === 0 || headings[0].level !== 1) {
    throw new Error(`Document must start with one level-one heading: ${relativePath}`);
  }
  if (headings.filter((heading) => heading.level === 1).length !== 1) {
    throw new Error(`Document must contain exactly one level-one heading: ${relativePath}`);
  }

  return { body, headings, metadata, relativePath };
}

function parseFrontmatter(source, relativePath) {
  const values = new Map();
  for (const line of source.split(/\r?\n/u)) {
    if (line.trim() === "") continue;
    const match = /^([A-Za-z][A-Za-z0-9]*):\s*(.*?)\s*$/u.exec(line);
    if (!match) throw new Error(`Invalid frontmatter line in ${relativePath}: ${line}`);
    const [, key, value] = match;
    if (!DOCUMENT_FIELDS.includes(key)) throw new Error(`Unknown frontmatter field ${key}: ${relativePath}`);
    if (values.has(key)) throw new Error(`Duplicate frontmatter field ${key}: ${relativePath}`);
    if (value === "") throw new Error(`Empty frontmatter field ${key}: ${relativePath}`);
    values.set(key, value);
  }
  for (const field of DOCUMENT_FIELDS) {
    if (!values.has(field)) throw new Error(`Missing frontmatter field ${field}: ${relativePath}`);
  }
  const order = Number(values.get("order"));
  const metadata = {
    id: values.get("id"),
    title: values.get("title"),
    description: values.get("description"),
    locale: values.get("locale"),
    route: values.get("route"),
    section: values.get("section"),
    order,
    status: values.get("status"),
  };
  if (!/^mise\.docs\.[a-z][a-z0-9-]*$/u.test(metadata.id)) throw new Error(`Invalid document id: ${relativePath}`);
  if (!/^[a-z]{2}(?:-[A-Z]{2})?$/u.test(metadata.locale)) throw new Error(`Invalid document locale: ${relativePath}`);
  if (!/^\/[a-z0-9/-]*$/u.test(metadata.route) || metadata.route.includes("//")) throw new Error(`Invalid document route: ${relativePath}`);
  if (!/^[a-z][a-z0-9-]*$/u.test(metadata.section)) throw new Error(`Invalid document section: ${relativePath}`);
  if (!Number.isSafeInteger(order) || order < 0) throw new Error(`Invalid document order: ${relativePath}`);
  if (!DOCUMENT_STATUSES.has(metadata.status)) throw new Error(`Invalid document status: ${relativePath}`);
  return Object.freeze(metadata);
}

function rejectExecutableMarkdown(body, relativePath) {
  let fenced = false;
  for (const [index, line] of body.split("\n").entries()) {
    if (/^\s*```/u.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    if (/^\s*<\/?[A-Za-z][^>]*>/u.test(line)) {
      throw new Error(`Raw HTML is not allowed at ${relativePath}:${index + 1}`);
    }
    if (/^\s*(?:import|export)\s/u.test(line) || /^\s*\{[^{}]*\}\s*$/u.test(line)) {
      throw new Error(`MDX syntax is not allowed at ${relativePath}:${index + 1}`);
    }
  }
  if (fenced) throw new Error(`Unterminated code fence: ${relativePath}`);
}

function collectHeadings(body, relativePath) {
  const headings = [];
  const ids = new Set();
  let fenced = false;
  for (const line of body.split("\n")) {
    if (/^\s*```/u.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const match = /^(#{1,6})\s+(.+?)\s*#*$/u.exec(line);
    if (!match) continue;
    const text = plainInlineText(match[2]);
    const id = headingId(text);
    if (id === "" || ids.has(id)) throw new Error(`Duplicate or empty heading id ${id}: ${relativePath}`);
    ids.add(id);
    headings.push({ id, level: match[1].length, text });
  }
  return headings;
}

function compileParsedDocument(source, routeBySource) {
  const resolver = (href) => resolvePublishedHref(href, source.absolutePath, routeBySource);
  const components = parseBlocks(source.body, resolver, source.relativePath)
    .filter((entry) => entry.component !== COMPONENT_NAMES.heading || entry.props.level !== 1);
  return {
    schemaVersion: 1,
    ...source.metadata,
    source: source.relativePath,
    toc: source.headings
      .filter(({ level }) => level >= 2 && level <= 3)
      .map(({ id, level, text }) => ({ id, level, text })),
    componentModel: {
      component: "ArticleDocument",
      props: {
        description: source.metadata.description,
        documentId: source.metadata.id,
        title: source.metadata.title,
      },
      slots: { content: components },
    },
  };
}

function parseBlocks(body, resolveHref, relativePath) {
  const lines = body.split("\n");
  const blocks = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (line.trim() === "") {
      index += 1;
      continue;
    }
    const heading = /^(#{1,6})\s+(.+?)\s*#*$/u.exec(line);
    if (heading) {
      const text = plainInlineText(heading[2]);
      blocks.push(component(COMPONENT_NAMES.heading, {
        id: headingId(text),
        level: heading[1].length,
        content: parseInline(heading[2], resolveHref),
      }));
      index += 1;
      continue;
    }
    const fence = /^```([A-Za-z0-9_-]*)\s*$/u.exec(line);
    if (fence) {
      const code = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/u.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      if (index >= lines.length) throw new Error(`Unterminated code fence: ${relativePath}`);
      const value = code.join("\n");
      blocks.push(component(COMPONENT_NAMES.code, {
        language: fence[1] || "text",
        lines: tokenizeCode(value),
        value,
      }));
      index += 1;
      continue;
    }
    if (isTable(lines, index)) {
      const headers = tableCells(lines[index]).map((cell) => parseInline(cell, resolveHref));
      const rows = [];
      index += 2;
      while (index < lines.length && /^\s*\|.*\|\s*$/u.test(lines[index])) {
        rows.push(tableCells(lines[index]).map((cell) => parseInline(cell, resolveHref)));
        index += 1;
      }
      blocks.push(component(COMPONENT_NAMES.table, { headers, rows }));
      continue;
    }
    const listMatch = /^\s*(?:([-*])|(\d+)\.)\s+(.+)$/u.exec(line);
    if (listMatch) {
      const ordered = listMatch[2] !== undefined;
      const items = [];
      while (index < lines.length) {
        const item = /^\s*(?:([-*])|(\d+)\.)\s+(.+)$/u.exec(lines[index]);
        if (!item || (item[2] !== undefined) !== ordered) break;
        items.push(parseInline(item[3], resolveHref));
        index += 1;
      }
      blocks.push(component(COMPONENT_NAMES.list, { ordered, items }));
      continue;
    }
    if (/^>\s?/u.test(line)) {
      const quote = [];
      while (index < lines.length && /^>\s?/u.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/u, ""));
        index += 1;
      }
      blocks.push(component(COMPONENT_NAMES.blockquote, { content: parseInline(quote.join(" "), resolveHref) }));
      continue;
    }
    const paragraph = [];
    while (index < lines.length && lines[index].trim() !== "" && !startsBlock(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    if (paragraph.length === 0) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(component(COMPONENT_NAMES.paragraph, {
      content: parseInline(paragraph.join(" "), resolveHref),
    }));
  }
  return blocks;
}

function startsBlock(lines, index) {
  const line = lines[index];
  return /^(?:#{1,6}\s|```|>\s?|\s*(?:[-*]|\d+\.)\s+)/u.test(line) || isTable(lines, index);
}

function isTable(lines, index) {
  if (index + 1 >= lines.length || !/^\s*\|.*\|\s*$/u.test(lines[index])) return false;
  const separator = tableCells(lines[index + 1]);
  return separator.length > 0 && separator.every((cell) => /^:?-{3,}:?$/u.test(cell.trim()));
}

function tableCells(line) {
  return line.trim().replace(/^\|/u, "").replace(/\|$/u, "").split("|").map((cell) => cell.trim());
}

function parseInline(value, resolveHref) {
  const tokens = [];
  const pattern = /`([^`]+)`|(!?)\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gu;
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    if (match.index > cursor) tokens.push({ kind: "text", value: value.slice(cursor, match.index) });
    if (match[1] !== undefined) {
      tokens.push({ kind: "code", value: match[1] });
    } else {
      if (match[2] === "!") throw new Error("Inline Markdown images are not allowed; use an Asset Component.");
      tokens.push({ kind: "link", label: plainInlineText(match[3]), href: resolveHref(match[4]) });
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < value.length) tokens.push({ kind: "text", value: value.slice(cursor) });
  return tokens.length === 0 ? [{ kind: "text", value }] : tokens;
}

function tokenizeCode(value) {
  return value.split("\n").map((line, lineIndex) => ({
    line: lineIndex + 1,
    tokens: tokenizeCodeLine(line),
  }));
}

function tokenizeCodeLine(line) {
  const tokens = [];
  const pattern = /(\/\/.*$|#.*$)|("(?:\\.|[^"])*"|'(?:\\.|[^'])*')|\b(\d+(?:\.\d+)?)\b|\b(const|let|function|return|new|class|interface|type|import|from|export|public|private|readonly)\b/gu;
  let cursor = 0;
  for (const match of line.matchAll(pattern)) {
    if (match.index > cursor) tokens.push({ kind: "plain", value: line.slice(cursor, match.index) });
    const kind = match[1] ? "comment" : match[2] ? "string" : match[3] ? "number" : "keyword";
    tokens.push({ kind, value: match[0] });
    cursor = match.index + match[0].length;
  }
  if (cursor < line.length) tokens.push({ kind: "plain", value: line.slice(cursor) });
  return tokens;
}

async function validateLinks(sources, docsRoot) {
  const sourceByPath = new Map(sources.map((source) => [source.absolutePath, source]));
  for (const source of sources) {
    const links = markdownLinks(source.body);
    for (const href of links) {
      validateSafeHref(href, source.relativePath);
      if (/^(?:https?:|mailto:)/u.test(href)) continue;
      const [pathname, rawFragment = ""] = href.split("#", 2);
      const targetPath = pathname === "" ? source.absolutePath : path.resolve(path.dirname(source.absolutePath), decodeURIComponent(pathname));
      const relative = path.relative(docsRoot, targetPath);
      if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Document link escapes docs root: ${source.relativePath} -> ${href}`);
      const target = sourceByPath.get(targetPath);
      if (target) {
        if (rawFragment !== "" && !target.headings.some(({ id }) => id === decodeURIComponent(rawFragment))) {
          throw new Error(`Broken document heading link: ${source.relativePath} -> ${href}`);
        }
        continue;
      }
      try {
        const targetStat = await stat(targetPath);
        if (!targetStat.isFile()) throw new Error("not-file");
      } catch {
        throw new Error(`Broken document link: ${source.relativePath} -> ${href}`);
      }
    }
  }
}

function markdownLinks(body) {
  const links = [];
  let fenced = false;
  for (const line of body.split("\n")) {
    if (/^\s*```/u.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    for (const match of line.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gu)) links.push(match[1]);
  }
  return links;
}

function validateSafeHref(href, relativePath) {
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(href) && !/^(?:https?:|mailto:)/u.test(href)) {
    throw new Error(`Unsafe document URL: ${relativePath} -> ${href}`);
  }
  if (href.startsWith("//") || /[\u0000-\u001f\u007f]/u.test(href)) {
    throw new Error(`Unsafe document URL: ${relativePath} -> ${href}`);
  }
}

function resolvePublishedHref(href, sourcePath, routeBySource) {
  validateSafeHref(href, sourcePath);
  if (/^(?:https?:|mailto:)/u.test(href)) return href;
  const [pathname, fragment = ""] = href.split("#", 2);
  if (pathname === "") return fragment === "" ? "#" : `#${fragment}`;
  const target = path.resolve(path.dirname(sourcePath), decodeURIComponent(pathname));
  const route = routeBySource.get(target);
  if (!route) return href;
  return fragment === "" ? route : `${route}#${fragment}`;
}

function validateUniqueMetadata(sources) {
  for (const field of ["id", "route"]) {
    const values = new Set();
    for (const source of sources) {
      const value = source.metadata[field];
      if (values.has(value)) throw new Error(`Duplicate document ${field}: ${value}`);
      values.add(value);
    }
  }
}

async function compileApiIndex(repositoryRoot) {
  const packages = [];
  for (const directory of ["mise", "mise-ui", "mise-php"]) {
    const manifest = JSON.parse(await readFile(path.join(repositoryRoot, "packages", directory, "package.json"), "utf8"));
    packages.push({
      name: manifest.name,
      version: manifest.version,
      exports: Object.entries(manifest.exports ?? {})
        .map(([subpath, target]) => ({ subpath, target }))
        .sort((left, right) => left.subpath.localeCompare(right.subpath, "en")),
    });
  }
  return { schemaVersion: 1, packages };
}

async function compileComponentIndex(repositoryRoot) {
  const contractsRoot = path.join(repositoryRoot, "packages", "mise-ui", "contracts");
  const names = (await readdir(contractsRoot)).filter((name) => name.endsWith(".json") && !name.endsWith(".schema.json")).sort();
  const items = [];
  const ids = new Set();
  for (const name of names) {
    const contract = JSON.parse(await readFile(path.join(contractsRoot, name), "utf8"));
    if (typeof contract.id !== "string" || ids.has(contract.id)) throw new Error(`Invalid or duplicate Component contract id: ${name}`);
    ids.add(contract.id);
    items.push({
      id: contract.id,
      name: path.basename(name, ".json"),
      element: contract.element,
      props: contract.props,
      slots: contract.slots,
      states: contract.states,
      keyboard: contract.keyboard,
      focus: contract.focus,
      noJs: contract.noJs,
    });
  }
  return { schemaVersion: 1, items };
}

async function compileTokenIndex(repositoryRoot) {
  const root = path.join(repositoryRoot, "packages", "mise-ui", "styles", "abstract");
  const names = (await readdir(root)).filter((name) => name.endsWith(".scss")).sort();
  const cssCustomProperties = new Set();
  const functions = new Set();
  const mixins = new Set();
  const sassVariables = new Set();
  for (const name of names) {
    const source = await readFile(path.join(root, name), "utf8");
    for (const match of source.matchAll(/--mise-[a-z0-9-]+/gu)) cssCustomProperties.add(match[0]);
    for (const match of source.matchAll(/^@function\s+([a-z][a-z0-9-]*)/gmu)) functions.add(match[1]);
    for (const match of source.matchAll(/^@mixin\s+([a-z][a-z0-9-]*)/gmu)) mixins.add(match[1]);
    for (const match of source.matchAll(/^\$([a-z][a-z0-9-]*):/gmu)) sassVariables.add(match[1]);
  }
  return {
    schemaVersion: 1,
    cssCustomProperties: [...cssCustomProperties].sort(),
    sass: {
      functions: [...functions].sort(),
      mixins: [...mixins].sort(),
      variables: [...sassVariables].sort(),
    },
  };
}

function searchEntries(document) {
  const entries = [{
    documentId: document.id,
    headingId: null,
    route: document.route,
    section: document.section,
    text: `${document.title} ${document.description}`,
    title: document.title,
  }];
  for (const heading of document.toc) {
    entries.push({
      documentId: document.id,
      headingId: heading.id,
      route: `${document.route}#${heading.id}`,
      section: document.section,
      text: `${document.title} ${heading.text}`,
      title: heading.text,
    });
  }
  return entries;
}

function component(name, props) {
  return { component: name, props, slots: {} };
}

function headingId(value) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[`*_~]/gu, "")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/\s+/gu, "-")
    .replace(/-+/gu, "-");
}

function plainInlineText(value) {
  return value
    .replace(/!?(?:\[([^\]]+)\]\([^)]+\))/gu, "$1")
    .replace(/[`*_~]/gu, "")
    .trim();
}

function compareOrderThenId(left, right) {
  return left.order - right.order || left.id.localeCompare(right.id, "en");
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

async function filesWithin(directory, prefix = "") {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) {
      found.push(...await filesWithin(path.join(directory, entry.name), relativePath));
      continue;
    }
    found.push(relativePath);
  }
  return found;
}
