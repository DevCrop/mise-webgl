import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exampleRoot = path.join(root, "examples", "host-consumer");
const releaseRoot = path.join(root, ".release", "host-consumer");
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("npm_execpath is required for host consumer verification.");

await rm(releaseRoot, { force: true, recursive: true });
await mkdir(releaseRoot, { recursive: true });

const { stdout } = await run(
  process.execPath,
  [
    npmCli,
    "pack",
    path.join(root, "packages", "mise"),
    "--pack-destination",
    releaseRoot,
    "--ignore-scripts",
    "--json",
  ],
  { cwd: root, encoding: "utf8", maxBuffer: 1024 * 1024 },
);
const [manifest] = JSON.parse(stdout);
if (!manifest?.filename) throw new Error("Host consumer tarball is missing.");

const consumerPackage = JSON.parse(
  await readFile(path.join(exampleRoot, "package.json"), "utf8"),
);
consumerPackage.dependencies["mise-webgl"] = `file:./${manifest.filename}`;
await writeFile(
  path.join(releaseRoot, "package.json"),
  `${JSON.stringify({
    name: "mise-host-consumer-verify",
    private: true,
    type: "module",
    dependencies: consumerPackage.dependencies,
    devDependencies: consumerPackage.devDependencies,
    scripts: consumerPackage.scripts,
  }, null, 2)}\n`,
);
await mkdir(path.join(releaseRoot, "src"), { recursive: true });
await writeFile(
  path.join(releaseRoot, "tsconfig.json"),
  await readFile(path.join(exampleRoot, "tsconfig.json")),
);
await writeFile(
  path.join(releaseRoot, "src", "main.ts"),
  await readFile(path.join(exampleRoot, "src", "main.ts")),
);

await run(process.execPath, [npmCli, "install", "--ignore-scripts", "--no-audit", "--no-fund"], {
  cwd: releaseRoot,
  encoding: "utf8",
});
await run(process.execPath, [npmCli, "run", "verify"], {
  cwd: releaseRoot,
  encoding: "utf8",
});

console.log(`HOST CONSUMER VERIFY PASS tarball=${manifest.filename}`);
