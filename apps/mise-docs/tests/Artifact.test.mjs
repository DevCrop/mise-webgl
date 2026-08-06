import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(appRoot, "dist");

test("builds the RC compatibility manifest", async () => {
  const manifest = JSON.parse(await readFile(path.join(output, "compatibility.json"), "utf8"));
  assert.equal(manifest.schemaVersion, 1);
  assert.deepEqual(
    manifest.packages.map((entry) => entry.name),
    ["mise-webgl", "mise-ui", "mise-php", "mise-docs"],
  );
});

test("never publishes internal Prompt records", async () => {
  const paths = await filesWithin(output);
  assert.equal(paths.some((entry) => entry.includes("prompts/internal")), false);
  assert.equal(paths.some((entry) => entry.endsWith(".md")), false);
  assert.equal(paths.some((entry) => entry.includes("node_modules")), false);
  const contents = await Promise.all(paths.map((entry) => readFile(path.join(output, entry), "utf8")));
  assert.equal(contents.some((entry) => entry.includes("mise.foundation.implement.web-foundation.v1")), false);
});

test("packages the standalone PHP MVC runtime", async () => {
  const paths = await filesWithin(output);
  for (const expected of [
    "app/MiseDocsApplication.php",
    "app/templates/components/Document.php",
    "public/assets/MiseUi.css",
    "public/index.php",
    "vendor/mise-php/bootstrap.php",
  ]) {
    assert.equal(paths.includes(expected), true, expected);
  }
});

test("publishes deterministic Component Model and generated indices", async () => {
  const navigation = JSON.parse(await readFile(path.join(output, "data", "navigation.json"), "utf8"));
  const manifest = JSON.parse(await readFile(path.join(output, "data", "build-manifest.json"), "utf8"));
  assert.equal(navigation.schemaVersion, 1);
  assert.equal(navigation.items.length >= 10, true);
  assert.equal(navigation.items[0].route, "/ko");
  for (const expected of [
    "api-index.json",
    "component-index.json",
    "navigation.json",
    "search-index.json",
    "sitemap.json",
    "token-index.json",
  ]) {
    assert.equal(manifest.files.some((entry) => entry.path === expected), true, expected);
  }
  const home = JSON.parse(await readFile(
    path.join(output, "data", "documents", "mise.docs.web-foundation.json"),
    "utf8",
  ));
  assert.equal(home.componentModel.component, "ArticleDocument");
  assert.equal(home.componentModel.slots.content.some((block) => block.component === "DataTable"), true);
  assert.equal(JSON.stringify(home).includes("<script"), false);
});

test("publishes only verified public Prompt records and search entries", async () => {
  const promptIndex = JSON.parse(await readFile(path.join(output, "data", "prompt-index.json"), "utf8"));
  const searchIndex = JSON.parse(await readFile(path.join(output, "data", "search-index.json"), "utf8"));
  assert.deepEqual(promptIndex.items.map((entry) => entry.id), ["mise.ui.implement.component.v1"]);
  assert.equal(promptIndex.items[0].status, "verified");
  assert.equal(searchIndex.items.some((entry) => entry.headingId === "prompt-mise.ui.implement.component.v1"), true);
  const publicPrompt = JSON.parse(await readFile(
    path.join(output, "data", "prompts", "mise.ui.implement.component.v1.json"),
    "utf8",
  ));
  assert.equal(publicPrompt.copyText.startsWith("# Goal"), true);
  assert.equal(publicPrompt.lastVerified, "packages/mise-ui/tests/unit/Controller.test.ts");
});

async function filesWithin(directory, prefix = "") {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = path.posix.join(prefix, entry.name);
    if (!entry.isDirectory()) {
      found.push(relativePath);
      continue;
    }
    found.push(...await filesWithin(path.join(directory, entry.name), relativePath));
  }
  return found;
}
