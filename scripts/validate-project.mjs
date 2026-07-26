import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const requiredPaths = [
  "AGENTS.md",
  "Dockerfile",
  "Makefile",
  "compose.yaml",
  "public/index.php",
  "public/.htaccess",
  "resources/data/portfolio.json",
  "resources/scss/style.scss",
  "resources/ts/app.ts",
  ".github/workflows/ci.yml",
  ".github/workflows/deploy-cafe24.yml",
];
const forbiddenPaths = ["index.html", "src"];
const allowedScssPaths = [
  "resources/scss/abstract/_mixins.scss",
  "resources/scss/abstract/_tokens.scss",
  "resources/scss/base/_global.scss",
  "resources/scss/base/_reset.scss",
  "resources/scss/components/_carousel.scss",
  "resources/scss/layouts/_site.scss",
  "resources/scss/pages/_home.scss",
  "resources/scss/style.scss",
];

for (const relativePath of requiredPaths) {
  if (!(await exists(relativePath))) failures.push(`missing required path: ${relativePath}`);
}
for (const relativePath of forbiddenPaths) {
  if (await exists(relativePath)) failures.push(`forbidden legacy path exists: ${relativePath}`);
}

const actualScssPaths = await filesWithin("resources/scss");
for (const relativePath of allowedScssPaths) {
  if (!actualScssPaths.includes(relativePath)) {
    failures.push(`missing SCSS boilerplate path: ${relativePath}`);
  }
}
for (const relativePath of actualScssPaths) {
  if (!allowedScssPaths.includes(relativePath)) {
    failures.push(`SCSS partial needs a current consumer and policy update: ${relativePath}`);
  }
}

for (const relativePath of ["package.json", "resources/data/portfolio.json"]) {
  try {
    JSON.parse(await text(relativePath));
  } catch (error) {
    failures.push(`invalid JSON ${relativePath}: ${error.message}`);
  }
}

const packageJson = JSON.parse(await text("package.json"));
const dependencyNames = Object.keys({
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
});
for (const dependency of dependencyNames) {
  if (/mysql|maria|postgres|sqlite|sequelize|typeorm|prisma/i.test(dependency)) {
    failures.push(`database dependency is not allowed: ${dependency}`);
  }
}

for (const workflow of [
  ".github/workflows/ci.yml",
  ".github/workflows/deploy-cafe24.yml",
]) {
  const source = await text(workflow);
  if (/pull_request_target\s*:/.test(source)) {
    failures.push(`privileged pull_request_target is forbidden: ${workflow}`);
  }

  for (const match of source.matchAll(/^\s*uses:\s*([^\s#]+).*$/gm)) {
    const reference = match[1];
    if (!/@[0-9a-f]{40}$/.test(reference)) {
      failures.push(`action is not pinned to a full SHA: ${reference}`);
    }
  }
}

if (!/required:\s*\n\s+name:\s+Required/.test(await text(".github/workflows/ci.yml"))) {
  failures.push("CI aggregate Required job is missing");
}

const allowedDocumentationHosts = new Set([
  "barba.js.org",
  "developer.chrome.com",
  "developer.mozilla.org",
  "docs.docker.com",
  "docs.github.com",
  "help.cafe24.com",
  "hub.docker.com",
  "github.com",
  "lenis.darkroom.engineering",
  "owasp.org",
  "sass-lang.com",
  "swiperjs.com",
  "threejs.org",
  "vite.dev",
  "web.dev",
  "www.php.net",
]);

for (const relativePath of [
  "AGENTS.md",
  "docs/DEPLOYMENT.md",
  "docs/GITHUB-AUTOMATION.md",
  "docs/OPERATIONS.md",
  "docs/SECURITY.md",
]) {
  const source = await text(relativePath);
  for (const match of source.matchAll(/https:\/\/[^\s)>]+/g)) {
    const url = new URL(match[0]);
    if (!allowedDocumentationHosts.has(url.hostname)) {
      failures.push(`non-official documentation host in ${relativePath}: ${url.hostname}`);
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}

console.log("PROJECT POLICY PASS");

async function exists(relativePath) {
  try {
    await stat(path.join(root, relativePath));
    return true;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return false;
    throw error;
  }
}

async function text(relativePath) {
  const buffer = await readFile(path.join(root, relativePath));
  return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
}

async function filesWithin(relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await filesWithin(relativePath)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files.sort();
}
