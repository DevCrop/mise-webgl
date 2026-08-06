import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const releaseRoot = path.join(root, ".release", "web-foundation");
const consumerRoot = path.join(releaseRoot, "dogfood");
const npmEntry = process.env.npm_execpath;
if (!npmEntry) throw new Error("npm_execpath is required for package dogfood");
const sassEntry = path.join(root, "node_modules", "sass", "sass.js");

assertInsideRoot(releaseRoot);
await rm(releaseRoot, { force: true, recursive: true });
await mkdir(consumerRoot, { recursive: true });

const uiPack = pack("packages/mise-ui");
const phpPack = pack("packages/mise-php");
assertPackageFiles(uiPack, [
  "contracts/ComponentContract.schema.json",
  "dist/Index.js",
  "dist/MiseUi.css",
  "styles/Index.scss",
]);
assertPackageFiles(phpPack, [
  "dist/bootstrap.php",
  "dist/templates/components/WebglSurface.php",
]);
assertNoPrivateSources(uiPack, ["src/", "tests/"]);
assertNoPrivateSources(phpPack, ["src/", "tests/", "templates/"]);

await writeFile(path.join(consumerRoot, "package.json"), `${JSON.stringify({
  name: "mise-web-foundation-dogfood",
  private: true,
  type: "module",
  dependencies: {
    "mise-ui": `file:../${uiPack.filename}`,
    "mise-php": `file:../${phpPack.filename}`,
  },
}, null, 2)}\n`, "utf8");
await writeFile(
  path.join(consumerRoot, "Check.mjs"),
  `import { createMiseUi, tabsController } from "mise-ui";\n`
    + `if (typeof createMiseUi !== "function" || tabsController.name !== "tabs") process.exit(1);\n`,
  "utf8",
);
await writeFile(
  path.join(consumerRoot, "Check.scss"),
  `@use "mise-ui/styles/Index";\n`,
  "utf8",
);

run(process.execPath, [npmEntry, "install", "--ignore-scripts", "--no-audit", "--no-fund"], consumerRoot);
run(process.execPath, ["Check.mjs"], consumerRoot);
run(process.execPath, [sassEntry, "--load-path=node_modules", "--no-source-map", "Check.scss", "Check.css"], consumerRoot);
const css = await readFile(path.join(consumerRoot, "Check.css"), "utf8");
if (!css.includes("--mise-color-background")) throw new Error("dogfood CSS token is missing");

console.log(`WEB FOUNDATION DOGFOOD PASS ui=${uiPack.filename} php=${phpPack.filename}`);

function pack(relativePackagePath) {
  const result = run(process.execPath, [npmEntry,
    "pack",
    path.join(root, relativePackagePath),
    "--pack-destination",
    releaseRoot,
    "--ignore-scripts",
    "--json",
  ], root, true);
  const parsed = JSON.parse(result.stdout);
  const manifest = parsed[0];
  if (!manifest?.filename || !Array.isArray(manifest.files)) {
    throw new Error(`invalid npm pack result: ${relativePackagePath}`);
  }
  return manifest;
}

function assertPackageFiles(manifest, expectedPaths) {
  const paths = new Set(manifest.files.map((entry) => entry.path));
  for (const expected of expectedPaths) {
    if (!paths.has(expected)) throw new Error(`tarball file is missing: ${expected}`);
  }
}

function assertNoPrivateSources(manifest, forbiddenPrefixes) {
  for (const entry of manifest.files) {
    if (forbiddenPrefixes.some((prefix) => entry.path.startsWith(prefix))) {
      throw new Error(`tarball contains private source: ${entry.path}`);
    }
  }
}

function assertInsideRoot(target) {
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative) || relative === "") {
    throw new Error("unsafe dogfood output path");
  }
}

function run(command, args, cwd, capture = false) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    shell: false,
    stdio: capture ? "pipe" : "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${result.error?.message ?? result.stderr ?? ""}`);
  }
  return result;
}
