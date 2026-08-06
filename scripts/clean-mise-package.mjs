import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "packages", "mise", "dist");
const relative = path.relative(root, target);

if (relative !== "packages\\mise\\dist" && relative !== "packages/mise/dist") {
  throw new Error("Refusing to clean an unexpected MISE package path.");
}

await rm(target, { force: true, recursive: true });
