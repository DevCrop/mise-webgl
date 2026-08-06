import { spawn } from "node:child_process";
import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(packageRoot, "..", "..");
const strykerCli = path.join(
  repositoryRoot,
  "node_modules",
  "@stryker-mutator",
  "core",
  "bin",
  "stryker.js",
);
const setupProbePattern = /^stryker-setup-\d+\.js$/;
let child = null;
let terminating = false;

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (terminating) return;
    terminating = true;
    child?.kill(signal);
    void cleanSetupProbes().finally(() => {
      process.exitCode = signal === "SIGINT" ? 130 : 143;
    });
  });
}

await cleanSetupProbes();
try {
  child = spawn(process.execPath, [strykerCli, "run"], {
    cwd: packageRoot,
    stdio: "inherit",
  });
  process.exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        resolve(signal === "SIGINT" ? 130 : 143);
        return;
      }
      resolve(code ?? 1);
    });
  });
} finally {
  child = null;
  await cleanSetupProbes();
}

async function cleanSetupProbes() {
  const names = await readdir(packageRoot);
  const probes = names.filter((name) => setupProbePattern.test(name));
  await Promise.all(
    probes.map((name) => rm(path.join(packageRoot, name), { force: true })),
  );
}
