import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(packageRoot, "dist");

await rm(output, { force: true, recursive: true });
await mkdir(output, { recursive: true });
await cp(path.join(packageRoot, "src"), output, { recursive: true });
await cp(path.join(packageRoot, "templates"), path.join(output, "templates"), { recursive: true });
