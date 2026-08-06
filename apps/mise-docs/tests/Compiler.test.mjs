import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  compileDocumentation,
  compileMarkdownDocument,
} from "../scripts/lib/MarkdownCompiler.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const frontmatter = `---
id: mise.docs.fixture
title: Fixture
description: Compiler fixture
locale: ko
route: /ko/fixture
section: test
order: 1
status: draft
---`;

test("compiles Markdown into a raw-HTML-free Component Model", () => {
  const result = compileMarkdownDocument(`${frontmatter}
# Fixture

## API

Use \`createMise\` with [docs](https://example.com/docs).

| Key | Value |
|---|---|
| mode | strict |

\`\`\`ts
const mode = "strict";
\`\`\`
`);
  assert.equal(result.componentModel.component, "ArticleDocument");
  assert.deepEqual(result.toc, [{ id: "api", level: 2, text: "API" }]);
  assert.equal(result.componentModel.slots.content.some((block) => block.component === "CodeBlock"), true);
  assert.equal(JSON.stringify(result).includes("<script"), false);
});

test("rejects raw HTML, MDX, duplicate headings, and unsafe URLs", () => {
  assert.throws(() => compileMarkdownDocument(`${frontmatter}\n# Fixture\n\n<script>alert(1)</script>\n`), /Raw HTML/u);
  assert.throws(() => compileMarkdownDocument(`${frontmatter}\n# Fixture\n\nexport const value = 1\n`), /MDX/u);
  assert.throws(() => compileMarkdownDocument(`${frontmatter}\n# Fixture\n\n## Same\n\n## Same\n`), /Duplicate/u);
  assert.throws(() => compileMarkdownDocument(`${frontmatter}\n# Fixture\n\n[unsafe](javascript:alert)\n`), /Unsafe/u);
});

test("produces byte-identical indices and checksums from the same sources", async () => {
  const first = await mkdtemp(path.join(tmpdir(), "mise-docs-first-"));
  const second = await mkdtemp(path.join(tmpdir(), "mise-docs-second-"));
  try {
    await compileDocumentation({ repositoryRoot, outputDirectory: first });
    await compileDocumentation({ repositoryRoot, outputDirectory: second });
    for (const name of ["build-manifest.json", "navigation.json", "search-index.json"]) {
      assert.equal(await readFile(path.join(first, name), "utf8"), await readFile(path.join(second, name), "utf8"));
    }
  } finally {
    await rm(first, { force: true, recursive: true });
    await rm(second, { force: true, recursive: true });
  }
});
