import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  compileDocumentation,
  writeBuildManifest,
} from "./lib/MarkdownCompiler.mjs";
import { compilePromptCatalog } from "./lib/PromptCompiler.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(appRoot, "../..");
const output = path.join(appRoot, "dist");
const packagePaths = [
  "packages/mise/package.json",
  "packages/mise-ui/package.json",
  "packages/mise-php/package.json",
  "apps/mise-docs/package.json",
];

await rm(output, { force: true, recursive: true });
await mkdir(path.join(output, "public", "assets"), { recursive: true });
await compileDocumentation({
  repositoryRoot,
  outputDirectory: path.join(output, "data"),
});
await compilePromptCatalog({
  repositoryRoot,
  outputDirectory: path.join(output, "data"),
});
await writeBuildManifest(path.join(output, "data"));

const packages = [];
for (const relativePath of packagePaths) {
  const manifest = JSON.parse(await readFile(path.join(repositoryRoot, relativePath), "utf8"));
  packages.push({ name: manifest.name, version: manifest.version });
}

await writeFile(
  path.join(output, "compatibility.json"),
  `${JSON.stringify({ schemaVersion: 1, packages }, null, 2)}\n`,
  "utf8",
);
const phpDistribution = path.join(repositoryRoot, "packages", "mise-php", "dist");
const uiStyles = path.join(repositoryRoot, "packages", "mise-ui", "dist", "MiseUi.css");
if (!(await isDirectory(phpDistribution))) throw new Error("mise-php dist is missing");
await stat(uiStyles);

await cp(path.join(appRoot, "resources", "php"), path.join(output, "app"), { recursive: true });
await cp(path.join(appRoot, "public"), path.join(output, "public"), { recursive: true });
await cp(phpDistribution, path.join(output, "vendor", "mise-php"), { recursive: true });
await cp(uiStyles, path.join(output, "public", "assets", "MiseUi.css"));
await cp(
  path.join(appRoot, "temp", "client", "DocsClient.js"),
  path.join(output, "public", "assets", "DocsClient.js"),
);
await cp(
  path.join(appRoot, "temp", "client", "DocsClient.js.map"),
  path.join(output, "public", "assets", "DocsClient.js.map"),
);
await cp(
  path.join(appRoot, "temp", "client", "WebglExample.js"),
  path.join(output, "public", "assets", "WebglExample.js"),
);
await cp(
  path.join(appRoot, "temp", "client", "WebglExample.js.map"),
  path.join(output, "public", "assets", "WebglExample.js.map"),
);
await cp(
  path.join(repositoryRoot, "packages", "mise-ui", "dist"),
  path.join(output, "public", "assets", "mise-ui"),
  { recursive: true },
);
await cp(
  path.join(repositoryRoot, "packages", "mise", "dist"),
  path.join(output, "public", "assets", "mise-webgl"),
  { recursive: true },
);
await mkdir(path.join(output, "public", "assets", "vendor"), { recursive: true });
await cp(
  path.join(repositoryRoot, "node_modules", "three", "build", "three.module.js"),
  path.join(output, "public", "assets", "vendor", "three.module.js"),
);

async function isDirectory(target) {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}
