import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { init, parse } from "es-module-lexer";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(projectRoot, "src");
const maximumSourceLines = 450;
const forbiddenCatchAllBasenames = new Set([
  "BaseManager.ts",
  "Common.ts",
  "CommonService.ts",
  "Helpers.ts",
  "ObjectManager.ts",
  "ServiceLocator.ts",
  "Utils.ts",
]);

function toProjectPath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll("\\", "/");
}

async function collectTypeScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectTypeScriptFiles(target));
    if (entry.isFile() && entry.name.endsWith(".ts")) files.push(target);
  }
  return files.sort();
}

async function exists(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function resolveRelativeImport(sourcePath, specifier) {
  const absolute = path.resolve(path.dirname(sourcePath), specifier);
  const candidates = [];
  if (absolute.endsWith(".js")) {
    candidates.push(`${absolute.slice(0, -3)}.ts`);
    candidates.push(`${absolute.slice(0, -3)}.d.ts`);
  } else if (absolute.endsWith(".ts")) {
    candidates.push(absolute);
  } else {
    candidates.push(`${absolute}.ts`);
    candidates.push(path.join(absolute, "Index.ts"));
  }
  for (const candidate of candidates) {
    if (await exists(candidate)) return toProjectPath(candidate);
  }
  return null;
}

function layer(modulePath) {
  const match = /^src\/([^/]+)/.exec(modulePath);
  return match?.[1] ?? "";
}

function forbiddenReason(from, to) {
  const fromLayer = layer(from);
  const toLayer = layer(to);
  const outerLayers = new Set([
    "adapters",
    "application",
    "dom",
    "playground",
    "testing",
  ]);
  if (fromLayer === "kernel" && outerLayers.has(toLayer)) {
    return "kernel must not import outer layers";
  }
  if (
    fromLayer === "adapters"
    && new Set(["application", "kernel", "dom", "playground", "testing"])
      .has(toLayer)
  ) {
    return "adapter must depend on contracts, not orchestrators";
  }
  if (
    from === "src/Contracts.ts"
    && new Set(["adapters", "application", "dom", "kernel", "playground", "testing"])
      .has(toLayer)
  ) {
    return "contracts must not import implementations";
  }
  if (
    layer(to) === "container"
    && !new Set(["application", "container", "factory"]).has(fromLayer)
    && from !== "src/Container.ts"
  ) {
    return "Container is restricted to composition layers";
  }
  return null;
}

function findCycles(graph) {
  const cycles = [];
  const state = new Map();
  const stack = [];
  const visit = (node) => {
    state.set(node, 1);
    stack.push(node);
    for (const target of graph.get(node) ?? []) {
      if (!graph.has(target)) continue;
      if (state.get(target) === 1) {
        const start = stack.indexOf(target);
        cycles.push([...stack.slice(start), target]);
      } else if (!state.has(target)) {
        visit(target);
      }
    }
    stack.pop();
    state.set(node, 2);
  };
  for (const node of graph.keys()) {
    if (!state.has(node)) visit(node);
  }
  return cycles;
}

function validateGraph(graph, unresolved = []) {
  const failures = unresolved.map(
    ({ from, specifier }) => `${from} -> ${specifier}: unresolved relative import`,
  );
  let edgeCount = 0;
  for (const [from, targets] of graph) {
    edgeCount += targets.size;
    for (const to of targets) {
      const reason = forbiddenReason(from, to);
      if (reason) failures.push(`${from} -> ${to}: ${reason}`);
    }
  }
  for (const cycle of findCycles(graph)) {
    failures.push(`cycle: ${cycle.join(" -> ")}`);
  }
  return { failures, edgeCount };
}

function verifyValidatorSelfTest() {
  const graph = new Map([
    ["src/kernel/A.ts", new Set(["src/application/B.ts"])],
    ["src/application/B.ts", new Set(["src/kernel/A.ts"])],
  ]);
  const result = validateGraph(graph, [
    { from: "src/kernel/A.ts", specifier: "./Missing.js" },
  ]);
  if (result.failures.length !== 3) {
    throw new Error("Architecture validator self-test failed.");
  }
}

async function main() {
  verifyValidatorSelfTest();
  await init;
  const files = await collectTypeScriptFiles(sourceRoot);
  const graph = new Map(files.map((file) => [toProjectPath(file), new Set()]));
  const unresolved = [];
  const sourceByModule = new Map();
  for (const file of files) {
    const source = await readFile(file, "utf8");
    const modulePath = toProjectPath(file);
    sourceByModule.set(modulePath, source);
    const [imports] = parse(source);
    for (const imported of imports) {
      const specifier = imported.n;
      if (!specifier?.startsWith(".")) continue;
      const resolved = await resolveRelativeImport(file, specifier);
      if (resolved) graph.get(modulePath).add(resolved);
      else unresolved.push({ from: modulePath, specifier });
    }
  }

  const result = validateGraph(graph, unresolved);
  for (const [modulePath, source] of sourceByModule) {
    const lineCount = source.split(/\r?\n/u).length;
    if (!modulePath.endsWith(".d.ts") && lineCount > maximumSourceLines) {
      result.failures.push(
        `${modulePath}: ${lineCount} lines exceeds ${maximumSourceLines}`,
      );
    }
    const basename = path.posix.basename(modulePath);
    if (forbiddenCatchAllBasenames.has(basename)) {
      result.failures.push(
        `${modulePath}: catch-all module name "${basename}" is forbidden`,
      );
    }
    if (
      !new Set(["application", "container", "factory"]).has(layer(modulePath))
      && modulePath !== "src/Container.ts"
      && /\b(?:container|resolver|bindingContext)\.resolve\s*\(/u.test(source)
    ) {
      result.failures.push(
        `${modulePath}: Container resolve is restricted to composition layers`,
      );
    }
    if (
      /from\s+["']lil-gui["']/u.test(source)
      && layer(modulePath) !== "playground"
    ) {
      result.failures.push(
        `${modulePath}: lil-gui is restricted to the Playground subpath`,
      );
    }
    if (
      layer(modulePath) === "playground"
      && /\.listen\s*\(/u.test(source)
    ) {
      result.failures.push(
        `${modulePath}: lil-gui listen would create a second RAF owner`,
      );
    }
  }
  const contracts = sourceByModule.get("src/Contracts.ts") ?? "";
  if (/\b(?:class|interface|function|const|let|var)\s+[A-Za-z_$]/u.test(contracts)) {
    result.failures.push("src/Contracts.ts must remain a re-export facade");
  }
  if (files.length === 0 || result.edgeCount === 0) {
    result.failures.push("Architecture graph is empty.");
  }
  if (result.failures.length > 0) {
    for (const failure of result.failures) console.error(`ERROR ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `PASS architecture: ${files.length} modules, ${result.edgeCount} internal edges, `
      + `0 cycles, 0 forbidden directions, 0 unresolved imports, <=${maximumSourceLines} lines.`,
  );
}

await main();
