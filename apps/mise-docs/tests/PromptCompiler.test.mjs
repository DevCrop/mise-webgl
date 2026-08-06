import assert from "node:assert/strict";
import test from "node:test";
import { parsePrompt } from "../scripts/lib/PromptCompiler.mjs";

const metadata = `---
id: mise.ui.review.fixture.v1
title: Fixture
scope: public
category: review
status: verified
version: 1
appliesTo:
  - mise-ui@0.2.0-rc.1
tags:
  - fixture
sourceSummary: Public compiler fixture
relatedAdr:
  - ADR-018
relatedDocs:
  - packages/mise/docs/HTML-COMPONENTS.md
requiredInputs:
  - packages/mise-ui/contracts/ComponentContract.schema.json
passCriteria:
  - fixture passes
lastVerified: packages/mise-ui/tests/unit/Controller.test.ts
replacement: null
---`;
const sections = `# Goal
Goal.
# Context
Context.
# Required inputs
Inputs.
# Constraints
Constraints.
# Ownership boundaries
Boundaries.
# Task
Task.
# Output contract
Output.
# Verification
Verification.
# Stop conditions
Stop.
`;

test("parses a versioned public Prompt with ordered sections", () => {
  const prompt = parsePrompt(`${metadata}\n${sections}`, "apps/mise-docs/prompts/public/fixture.md", "public");
  assert.equal(prompt.metadata.id, "mise.ui.review.fixture.v1");
  assert.equal(prompt.metadata.version, 1);
  assert.equal(prompt.sections.Goal, "Goal.");
});

test("rejects scope mismatch, missing evidence, and sensitive material", () => {
  assert.throws(() => parsePrompt(`${metadata}\n${sections}`, "internal.md", "internal"), /scope/u);
  assert.throws(
    () => parsePrompt(`${metadata.replace("lastVerified: packages/mise-ui/tests/unit/Controller.test.ts", "lastVerified: null")}\n${sections}`),
    /evidence/u,
  );
  assert.throws(() => parsePrompt(`${metadata}\n${sections}\nContact owner@example.com`), /sensitive/u);
});
