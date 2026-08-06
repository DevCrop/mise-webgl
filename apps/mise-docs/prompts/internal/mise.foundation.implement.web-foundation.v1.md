---
id: mise.foundation.implement.web-foundation.v1
title: MISE Web Foundation 구현
scope: internal
category: implement
status: reviewed
version: 1
appliesTo:
  - mise-webgl@0.1
  - mise-docs@0.2.0-rc.1
tags:
  - architecture
  - component
  - php
  - scss
  - webgl
  - documentation
sourceSummary: 기존 WebGL core를 보존하면서 PHP MVC, Component-only HTML, 기존 fluid SCSS 구조와 Prompt index를 독립 package와 문서 앱으로 단계 구현한다.
relatedAdr:
  - ADR-018
relatedDocs:
  - packages/mise/docs/WEB-FOUNDATION.md
  - packages/mise/docs/HTML-COMPONENTS.md
  - packages/mise/docs/SCSS-SYSTEM.md
  - packages/mise/docs/PROMPT-CATALOG.md
  - packages/mise/docs/DOCUMENT-COMPILER.md
  - docs/MISE-WEB-FOUNDATION-PLAN.md
requiredInputs:
  - current worktree
  - canonical MISE docs
  - current SCSS foundation
  - current verification commands
passCriteria:
  - critical gates all pass
  - final quality score is at least 95 out of 100
  - packaged standalone docs app passes dogfood
lastVerified: null
replacement: null
---

# Goal

MISE Web Foundation을 canonical Markdown, validator, package, Component, PHP MVC 문서
앱, Prompt Catalog와 standalone artifact 순서로 구현한다.

# Context

`mise-webgl`은 Three.js/WebGL Scene lifecycle과 GPU resource를 이미 소유한다.
기존 제품은 PHP 8.2 SSR, TypeScript, SCSS와 bare WebGL canvas를 사용한다. 새 UI와
문서 앱은 core를 오염시키지 않고 인접 package로 추가한다.

# Required inputs

- 현재 dirty tree와 사용자 변경
- `packages/mise/docs/README.md`의 canonical index
- `docs/MISE-WEB-FOUNDATION-PLAN.md`의 Phase와 Gate
- 기존 `resources/scss/abstract` public API
- 기존 `mise-webgl` API report와 verification

# Constraints

- Phase 순서를 건너뛰지 않는다.
- canonical Markdown과 index를 코드보다 먼저 갱신한다.
- PHP request 계층에만 MVC를 적용한다.
- WebGL Scene·Frame·Resource에는 Stagecraft를 유지한다.
- page·route·Model·Controller는 literal HTML을 만들지 않는다.
- Component·Layout·Page SCSS는 직접 `clamp()`를 작성하지 않는다.
- 기존 `fluid()`와 SCSS partial public API를 재사용한다.
- raw HTML Slot, generic class/style Props와 `innerHTML` 계열을 금지한다.
- 현재 Portfolio UI는 adoption Phase 전까지 교체하지 않는다.
- internal Prompt를 production artifact에 포함하지 않는다.

# Ownership boundaries

- `mise-webgl`: WebGL lifecycle과 public facade
- `mise-ui`: DOM Controller, Component contract, SCSS
- `mise-php`: PHP Component와 renderer
- `mise-docs`: route·Model·Controller composition과 문서 consumer
- Host: 제품 content, deployment와 현재 verification evidence

# Task

1. 기존 구조와 공식 근거를 조사한다.
2. portable 규격과 저장소 실행 계획을 분리해 index한다.
3. 규칙을 validator에 연결한다.
4. package를 독립 dependency 방향으로 만든다.
5. 기존 fluid·token·partial을 facade 방식으로 재사용한다.
6. PHP MVC와 Component renderer를 구현한다.
7. HTML Component와 browser Controller를 구현한다.
8. Markdown을 Component Model로 compile한다.
9. docs app과 Prompt Catalog를 dogfood한다.
10. WebGL API·accessibility·package artifact를 감사한다.

# Output contract

- canonical Markdown와 rule ID
- root 실행 계획과 evidence
- language-neutral Component contract
- 독립 `mise-ui`와 `mise-php` artifact
- PHP MVC standalone 문서 앱
- internal/public Prompt index
- 100점 score report와 95점 이상 결과

# Verification

- project policy와 public docs lint
- PHP lint·escaping·URL test
- TypeScript strict·unit test
- Sass compile·direct clamp scan
- keyboard·JS-off·reduced-motion browser test
- axe serious/critical 0건
- WebGL API report·resource disposal·fallback test
- source alias 없는 tarball dogfood
- production artifact content와 checksum audit

# Stop conditions

- 사용자 변경과 충돌하면 해당 파일을 덮어쓰지 않는다.
- package dependency cycle이 생기면 다음 Phase로 진행하지 않는다.
- critical Gate가 실패하면 점수로 상쇄하지 않는다.
- 공식 근거가 없는 외부 제품 추정은 durable rule로 만들지 않는다.
- 전체 요구 증거가 없으면 Goal을 complete로 표시하지 않는다.
