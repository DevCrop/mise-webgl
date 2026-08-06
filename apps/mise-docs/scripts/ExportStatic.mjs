import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = path.join(appRoot, "dist");
const basePath = process.env.MISE_DOCS_BASE_PATH ?? "/mise-webgl";
const exportScript = path.join(appRoot, "scripts", "ExportStatic.php");

const result = spawnSync(
  "php",
  [exportScript, distDirectory, basePath],
  { stdio: "inherit", encoding: "utf8" },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`MISE DOCS STATIC SITE base=${basePath} output=${path.join(distDirectory, "public")}`);
