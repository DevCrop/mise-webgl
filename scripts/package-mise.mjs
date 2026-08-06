import { execFile } from "node:child_process";
import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDirectory = path.join(root, "packages", "mise");
const outputDirectory = path.join(root, ".release", "npm");
const outputRelative = path.relative(root, outputDirectory).replaceAll("\\", "/");

if (outputRelative !== ".release/npm") {
  throw new Error("Refusing to replace an unexpected NPM package directory.");
}

await rm(outputDirectory, { force: true, recursive: true });
await mkdir(outputDirectory, { recursive: true });

const npmCli = process.env["npm_execpath"];
if (!npmCli) throw new Error("npm_execpath is required to package MISE.");

const { stdout } = await run(
  process.execPath,
  [
    npmCli,
    "pack",
    "--ignore-scripts",
    "--json",
    "--pack-destination",
    outputDirectory,
  ],
  {
    cwd: packageDirectory,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  },
);
const [result] = JSON.parse(stdout);
if (!result?.filename) throw new Error("MISE package did not produce a tarball.");

const tarball = path.join(outputDirectory, result.filename);
const packageJson = JSON.parse(
  await readFile(path.join(packageDirectory, "package.json"), "utf8"),
);
const paths = new Set(result.files.map((file) => file.path));
const required = [
  "README.md",
  "docs/README.md",
  "docs/ARCHITECTURE.md",
  "docs/DECISIONS.md",
  "docs/CONTRACTS.md",
  "docs/VERIFICATION.md",
  "docs/ADOPTION.md",
  "docs/OBJECTS-SHADERS-ASSETS.md",
  "docs/ENTERPRISE-COMPOSITION.md",
  "docs/LIFECYCLE-RECIPES.md",
  "docs/API-GUIDE.md",
  "docs/EXAMPLES.md",
  "package.json",
  "dist/Index.js",
  "dist/Index.d.ts",
  "dist/Clock.js",
  "dist/Clock.d.ts",
  "dist/Container.js",
  "dist/Container.d.ts",
  "dist/Blender.js",
  "dist/Blender.d.ts",
  "dist/Three.js",
  "dist/Three.d.ts",
  "dist/Gsap.js",
  "dist/Lenis.js",
  "dist/Barba.js",
  "dist/Console.js",
  "dist/Playground.js",
  "dist/Testing.js",
  "dist/Mise.css",
  "dist/Playground.css",
  "html/MiseSurface.html",
  "styles/Index.scss",
  "styles/_Surface.scss",
  "styles/Playground.scss",
  "styles/_Inspector.scss",
];

for (const requiredPath of required) {
  if (!paths.has(requiredPath)) {
    throw new Error(`MISE tarball is missing ${requiredPath}.`);
  }
}
for (const forbiddenPrefix of [
  "src/",
  "tests/",
  "coverage/",
  "reports/",
  "etc/",
  "scripts/",
]) {
  if ([...paths].some((value) => value.startsWith(forbiddenPrefix))) {
    throw new Error(`MISE tarball contains forbidden source: ${forbiddenPrefix}`);
  }
}
for (const forbiddenPath of [
  "api-extractor.json",
  "knip.json",
  "stryker.config.mjs",
  "vitest.config.ts",
  "dist/ApiReport.js",
  "dist/ApiReport.d.ts",
]) {
  if (paths.has(forbiddenPath)) {
    throw new Error(`MISE tarball contains review tooling: ${forbiddenPath}`);
  }
}
if (
  packageJson.name !== "mise-webgl"
  || packageJson.private !== false
  || packageJson.license !== "MIT"
  || packageJson.publishConfig?.access !== "public"
) {
  throw new Error("MISE package publishing guard is invalid.");
}

await run(process.execPath, [
  npmCli,
  "exec",
  "--",
  "publint",
  "run",
  tarball,
  "--strict",
], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 1024 * 1024,
});
await run(process.execPath, [
  npmCli,
  "exec",
  "--",
  "attw",
  tarball,
  "--profile",
  "esm-only",
  "--no-definitely-typed",
  "--entrypoints",
  ".",
  "./clock",
  "./container",
  "./blender",
  "./three",
  "./gsap",
  "./lenis",
  "./barba",
  "./console",
  "./playground",
  "./testing",
  "--quiet",
], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 1024 * 1024,
});

console.log(
  `MISE PACKAGE PASS file=${path.relative(root, tarball).replaceAll("\\", "/")} size=${result.size} unpacked=${result.unpackedSize} publint=strict attw=esm-only`,
);
