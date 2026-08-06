import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(packageRoot, "src");
const expectedFiles = [
  "Component.php",
  "ComponentRenderer.php",
  "Escaper.php",
  "GenericComponent.php",
  "PhpComponentRenderer.php",
  "Props.php",
  "RenderContext.php",
  "Slot.php",
  "TemplateRegistry.php",
  "UrlPolicy.php",
  "bootstrap.php",
];

test("exports the complete PHP skeleton", async () => {
  const files = (await readdir(sourceRoot)).toSorted();
  assert.deepEqual(files, expectedFiles.toSorted());
});

test("keeps structural markup outside PHP composition classes", async () => {
  const literalTag = /<(?:html|head|body|header|footer|main|nav|aside|article|section|div|span|a|button|dialog|template|canvas)\b/iu;
  for (const file of expectedFiles) {
    const source = await readFile(path.join(sourceRoot, file), "utf8");
    assert.equal(literalTag.test(source), false, file);
  }
});

test("keeps literal markup inside registered Component templates", async () => {
  const templateRoot = path.join(packageRoot, "templates", "components");
  assert.deepEqual(
    (await readdir(templateRoot)).toSorted(),
    ["Callout.php", "StatusPage.php", "Text.php", "WebglSurface.php"],
  );
});
