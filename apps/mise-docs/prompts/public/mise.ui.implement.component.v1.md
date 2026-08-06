---
id: mise.ui.implement.component.v1
title: MISE UI Component 추가
scope: public
category: implement
status: verified
version: 1
appliesTo:
  - mise-ui@0.2.0-rc.1
  - mise-php@0.2.0-rc.1
tags:
  - component
  - accessibility
  - php
  - scss
sourceSummary: Component-only DOM, PHP template, Controller와 fluid SCSS를 한 계약으로 추가하는 공개 작업 Prompt다.
relatedAdr:
  - ADR-018
relatedDocs:
  - packages/mise/docs/HTML-COMPONENTS.md
  - packages/mise/docs/SCSS-SYSTEM.md
requiredInputs:
  - packages/mise-ui/contracts/ComponentContract.schema.json
  - packages/mise-php/src/Component.php
  - packages/mise-ui/styles/abstract/_functions.scss
passCriteria:
  - Component contract validates
  - PHP escaping test passes
  - keyboard and no-JS behavior pass
  - direct component clamp count is zero
lastVerified: packages/mise-ui/tests/unit/Controller.test.ts
replacement: null
---

# Goal

MISE의 Component-only DOM과 기존 fluid SCSS 규칙을 지키는 재사용 Component 하나를
contract, PHP template, 선택적 Controller와 검증까지 완성한다.

# Context

MISE UI는 semantic Component가 HTML을 소유하고 PHP Model·Controller와 TypeScript
Controller가 literal HTML을 만들지 않는 구조다. Component SCSS는 중앙 `fluid()`와
공개 token만 소비한다.

# Required inputs

- 만들 Component의 사용자 목적과 semantic root
- Props·Slot·state·keyboard·focus·no-JS 요구
- 기존 Component catalog와 SCSS token
- 실제 consumer와 가장 작은 검증 명령

# Constraints

- 새 DOM은 등록된 Component template으로만 만든다.
- Slot은 Component 또는 Component list만 허용한다.
- dynamic text, attribute와 URL은 각 context 정책으로 escape·검증한다.
- `innerHTML`, generic class/style Props와 inline style을 추가하지 않는다.
- Component/Layout/Page partial에 직접 `clamp()`를 쓰지 않는다.
- 상태 source는 native state와 ARIA이며 state class를 source로 만들지 않는다.

# Ownership boundaries

- `mise-ui/contracts`: language-neutral anatomy와 interaction 계약
- `mise-php/templates`: semantic HTML과 context escaping
- `mise-ui/src`: DOM Controller와 dispose 가능한 event lifecycle
- `mise-ui/styles`: token을 소비하는 Component style
- consumer: content와 조립

# Task

1. 기존 catalog에서 같은 책임의 Component를 검색한다.
2. semantic root, Props, Slot, state, keyboard, focus와 no-JS 계약을 작성한다.
3. PHP Component template을 registry에 등록하고 모든 동적 값을 escape한다.
4. browser behavior가 필요할 때만 AbortSignal 기반 Controller를 추가한다.
5. 기존 token, typography, breakpoint와 `fluid()`로 SCSS를 작성한다.
6. unit, PHP, keyboard, JS-off와 accessibility 검증을 추가한다.
7. Component·token·Prompt index와 관련 문서를 갱신한다.

# Output contract

- unique Component contract ID
- 등록된 PHP template과 Component-only Slot 조립
- 필요 시 typed Controller
- 기존 foundation을 소비하는 SCSS
- unit·PHP·browser 검증 증거
- catalog와 문서 index 갱신

# Verification

- Component schema와 duplicate ID 검사
- PHP lint·escaping·safe URL test
- TypeScript strict·controller dispose test
- Sass compile·direct `clamp()` scan
- keyboard·focus return·JS-off browser test
- axe serious/critical 0건

# Stop conditions

- 기존 Component가 책임을 충족하면 새 Component를 만들지 않는다.
- semantic element나 no-JS 동작이 결정되지 않으면 구현을 중단한다.
- 새 global token이 한 Component만을 위해 필요하면 local value로 재검토한다.
- escaping 또는 focus 복귀 test가 실패하면 공개 완료로 판정하지 않는다.
