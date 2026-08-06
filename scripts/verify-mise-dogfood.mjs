import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const EXPECTED_DOGFOOD_HEALTH_CHECKS = 19;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = path.join(root, ".release", "mise-fixture", "dist");
const fixtureRelative = path.relative(root, fixtureRoot).replaceAll("\\", "/");
if (fixtureRelative !== ".release/mise-fixture/dist") {
  throw new Error("Refusing to serve an unexpected MISE dogfood path.");
}
if (!(await stat(fixtureRoot)).isDirectory()) {
  throw new Error("MISE dogfood build is missing. Run npm run package:mise.");
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const relative = url.pathname === "/"
      ? "index.html"
      : decodeURIComponent(url.pathname.slice(1));
    const target = path.resolve(fixtureRoot, relative);
    if (
      target !== fixtureRoot
      && !target.startsWith(`${fixtureRoot}${path.sep}`)
    ) {
      response.writeHead(403).end();
      return;
    }
    const body = await readFile(target);
    response.writeHead(200, {
      "Content-Type": contentType(target),
      "Cache-Control": "no-store",
    });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const address = server.address();
if (!address || typeof address === "string") {
  throw new Error("MISE dogfood server did not expose a TCP port.");
}

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

try {
  await page.goto(`http://127.0.0.1:${address.port}/`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(() =>
    window.__MISE_DOGFOOD__?.app.health().status === "healthy"
    && window.__MISE_DOGFOOD__.scene() === "fixture-0",
  );
  const health = await page.evaluate(() =>
    window.__MISE_DOGFOOD__.app.health(),
  );
  if (
    health.total !== EXPECTED_DOGFOOD_HEALTH_CHECKS
    || health.missing.length !== 0
  ) {
    throw new Error(
      `MISE dogfood health mismatch: ${health.observed.length}/${health.total}`,
    );
  }

  const samples = [];
  for (let transition = 1; transition <= 10; transition += 1) {
    const slot = transition % 2;
    await page.evaluate((value) => {
      window.__MISE_DOGFOOD__.select(value);
    }, slot);
    await page.waitForFunction(
      (value) => window.__MISE_DOGFOOD__.scene() === `fixture-${value}`,
      slot,
    );
    samples.push(await page.evaluate(() =>
      window.__MISE_DOGFOOD__.stats(),
    ));
  }
  assertPlateau(samples, "geometries");
  assertPlateau(samples, "textures");
  assertPlateau(samples, "programs");
  const activeResources = await page.evaluate(() =>
    window.__MISE_DOGFOOD__.resources(),
  );
  if (activeResources.active !== 6) {
    throw new Error(
      `MISE active resource ownership mismatch: ${activeResources.active}`,
    );
  }

  await page.evaluate(() => window.__MISE_DOGFOOD__.app.dispose());
  await page.waitForFunction(() =>
    document.querySelector("[data-mise-surface][data-mise-canvas]") !== null,
  );
  const terminal = await page.evaluate(() =>
    window.__MISE_DOGFOOD__.stats(),
  );
  for (const key of ["geometries", "textures", "programs"]) {
    if (terminal[key] !== 0) {
      throw new Error(`MISE terminal renderer stat is not zero: ${key}`);
    }
  }
  const terminalResources = await page.evaluate(() =>
    window.__MISE_DOGFOOD__.resources(),
  );
  if (
    terminalResources.active !== 0
    || terminalResources.created !== terminalResources.disposed
  ) {
    throw new Error(
      "MISE terminal resource ownership did not return to zero: "
      + `created=${terminalResources.created} `
      + `disposed=${terminalResources.disposed} `
      + `active=${terminalResources.active}`,
    );
  }
  if (errors.length > 0) {
    throw new Error(`MISE dogfood browser errors: ${errors.join(" | ")}`);
  }

  const plateau = samples.at(-1);
  console.log(
    "MISE DOGFOOD PASS "
    + `health=${health.observed.length}/${health.total} transitions=10 `
    + `resources=g${plateau.geometries}t${plateau.textures}p${plateau.programs} `
    + `owned=${terminalResources.created}/${terminalResources.disposed} `
    + "terminal=g0t0p0 owned-active=0 errors=0",
  );
} finally {
  await page.close();
  await browser.close();
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

function assertPlateau(samples, key) {
  const values = samples.map((sample) => sample[key]);
  if (new Set(values).size === 1) return;
  throw new Error(`MISE resource did not plateau: ${key}=${values.join(",")}`);
}

function contentType(target) {
  switch (path.extname(target)) {
    case ".css":
      return "text/css; charset=UTF-8";
    case ".html":
      return "text/html; charset=UTF-8";
    case ".js":
      return "application/javascript; charset=UTF-8";
    default:
      return "application/octet-stream";
  }
}
