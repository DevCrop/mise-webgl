import assert from "node:assert/strict";
import test from "node:test";
import {
  createScoreReport,
  validateComponentContract,
  validateDomControllerSources,
  validatePhpCompositionSources,
  validatePromptDocument,
  validatePromptRecord,
  validateRuleFamily,
  validateScssSources,
  validateWorkspacePackages,
} from "./Policy.mjs";

test("accepts a complete Component contract", () => {
  assert.deepEqual(validateComponentContract({
    id: "mise.ui.tabs.v1",
    element: "section",
    props: {},
    slots: {},
    states: ["active"],
    keyboard: ["ArrowLeft", "ArrowRight"],
    focus: "roving-tabindex",
    noJs: "all panels visible",
  }), []);
});

test("rejects incomplete Component contracts", () => {
  assert.match(validateComponentContract({ id: "tabs" }).join("\n"), /id is invalid|missing/u);
});

test("enforces central fluid ownership and unique SCSS variables", () => {
  assert.deepEqual(validateScssSources({
    "abstract/_functions.scss": "@function fluid() { @return clamp(1rem, 2vw, 3rem); }",
    "abstract/_variables.scss": "$space: 16;",
    "components/_card.scss": ".card { gap: fluid(12, 24); }",
  }, ["abstract/_functions.scss"]), []);
  assert.equal(validateScssSources({
    "abstract/_variables.scss": "$space: 16;",
    "components/_card.scss": "$space: 20; .card { width: clamp(1rem, 2vw, 3rem); }",
  }).length, 2);
});

test("rejects unsafe DOM writers", () => {
  assert.deepEqual(validateDomControllerSources({ "Tabs.ts": "root.dataset.state = 'ready';" }), []);
  assert.match(validateDomControllerSources({ "Tabs.ts": "root.innerHTML = value;" })[0], /forbidden/u);
});

test("allows literal HTML only in registered Component templates", () => {
  const sources = {
    "src/View.php": "<?php return $components->render('Card');",
    "templates/components/Card.php": "<article><?= $title ?></article>",
  };
  assert.deepEqual(validatePhpCompositionSources(sources, ["templates/components/Card.php"]), []);
  assert.equal(validatePhpCompositionSources(sources).length, 1);
});

test("requires contiguous rule families", () => {
  assert.deepEqual(validateRuleFamily("**HTM-01** a\n**HTM-02** b", "HTM"), []);
  assert.equal(validateRuleFamily("**HTM-01** a\n**HTM-03** c", "HTM").length, 1);
});

test("validates Prompt visibility and lifecycle", () => {
  const prompt = {
    id: "mise.ui.implement.tabs.v1",
    title: "Tabs",
    scope: "internal",
    category: "implement",
    status: "verified",
    version: 1,
    sourceSummary: "비식별 요약",
    requiredInputs: ["contract"],
    passCriteria: ["test pass"],
    lastVerified: "2026-08-01",
  };
  assert.deepEqual(validatePromptRecord(prompt), []);
  assert.match(validatePromptRecord({ ...prompt, public: true }).join("\n"), /cannot be public/u);
  assert.match(
    validatePromptRecord({ ...prompt, sourceSummary: "C:\\Users\\name\\private" }).join("\n"),
    /secret or local user path/u,
  );
});

test("validates Prompt frontmatter, scope path, and heading order", () => {
  const document = `---
id: mise.ui.implement.tabs.v1
title: Tabs
scope: internal
category: implement
status: reviewed
version: 1
sourceSummary: 비식별 요약
requiredInputs:
  - contract
passCriteria:
  - test pass
lastVerified: null
---
# Goal
# Context
# Required inputs
# Constraints
# Ownership boundaries
# Task
# Output contract
# Verification
# Stop conditions
`;
  assert.deepEqual(validatePromptDocument(document, "prompts/internal/Tabs.md"), []);
  assert.match(
    validatePromptDocument(document.replace("scope: internal", "scope: public"), "prompts/internal/Tabs.md").join("\n"),
    /requires internal scope/u,
  );
});

test("never grants release status with a pending Critical Gate", () => {
  const report = createScoreReport([
    { category: "architecture", points: 15, status: "pass" },
    { category: "docs", points: 15, status: "pass" },
    { category: "html", points: 20, status: "pass" },
    { category: "scss", points: 15, status: "pass" },
    { category: "webgl", points: 15, status: "pass" },
    { category: "accessibility", points: 10, status: "pass" },
    { category: "security", points: 10, status: "pass" },
  ], [{ id: "component-only-dom", status: "pending" }]);
  assert.equal(report.score, 100);
  assert.equal(report.criticalPass, false);
  assert.equal(report.releaseCandidate, false);
});

test("enforces acyclic package boundaries and artifact allowlists", () => {
  const root = {
    workspaces: ["packages/mise", "packages/mise-ui", "packages/mise-php", "apps/mise-docs"],
  };
  const manifests = {
    "mise-webgl": { version: "0.1.0", files: [], dependencies: {} },
    "mise-ui": {
      version: "0.2.0-rc.1",
      files: ["dist", "contracts", "docs", "styles", "README.md"],
      dependencies: {},
    },
    "mise-php": {
      version: "0.2.0-rc.1",
      files: ["dist", "docs", "README.md"],
      dependencies: {},
    },
    "mise-docs": {
      version: "0.2.0-rc.1",
      dependencies: { "mise-ui": "0.2.0-rc.1", "mise-php": "0.2.0-rc.1" },
    },
  };
  assert.deepEqual(validateWorkspacePackages(root, manifests), []);
  manifests["mise-ui"].dependencies = { "mise-docs": "0.2.0-rc.1" };
  assert.match(validateWorkspacePackages(root, manifests).join("\n"), /forbidden|cycle/u);
});
