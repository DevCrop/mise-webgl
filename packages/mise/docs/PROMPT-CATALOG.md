---
id: mise.docs.prompt-catalog
title: MISE Prompt Catalog
description: public과 internal Prompt의 metadata, index와 검증 계약
locale: ko
route: /ko/prompts
section: prompts
order: 50
status: rc
---

# MISE Prompt Catalog

## 1. 목적

이 문서는 MISE 설계·구현·리뷰를 재현하는 internal Prompt와 MISE 사용자가
복사해 사용할 public Prompt의 분리, index, version과 검증 규칙을 소유한다.

## 2. 범위

```text
Prompt Catalog
├─ internal
│  └─ architecture, implementation, review, verification, release
└─ public
   └─ component, controller, docs, WebGL integration, migration
```

**PRM-01** 전체 대화와 hidden reasoning을 저장하지 않는다.
**PRM-02** 사용자 원문은 개인정보·secret·로컬 경로를 제거한 `sourceSummary`로만
남긴다.
**PRM-03** internal Prompt는 public 문서, 검색 index와 production artifact에서
제외한다.
**PRM-04** Prompt는 실행 가능한 정제본, 입력, 출력, 금지와 pass criteria를
포함한다.
**PRM-05** 결과 전문 대신 test·artifact·ADR·commit 같은 검증 증거를 연결한다.

## 3. ID와 metadata

ID 형식:

```text
mise.<package>.<category>.<name>.v<major>
```

예:

```text
mise.ui.implement.tabs.v1
mise.php.review.escaping.v1
mise.docs.audit.accessibility.v1
```

필수 frontmatter:

```yaml
id: mise.ui.implement.tabs.v1
title: Tabs Component 구현
scope: internal
category: implement
status: draft
version: 1
appliesTo:
  - mise-ui@0.2
tags:
  - component
  - accessibility
sourceSummary: 비식별 요청 요약
relatedAdr:
  - ADR-UI-002
relatedDocs:
  - components/tabs
requiredInputs:
  - component contract
passCriteria:
  - keyboard test pass
lastVerified: null
replacement: null
```

## 4. 본문 구조

모든 Prompt는 다음 heading을 같은 순서로 사용한다.

1. Goal
2. Context
3. Required inputs
4. Constraints
5. Ownership boundaries
6. Task
7. Output contract
8. Verification
9. Stop conditions

같은 지시는 한 번만 작성한다. 장황한 배경 대신 실제 파일·계약·pass 결과를
명시한다. 외부 write, destructive action과 scope 확대에는 명확한 승인 경계를 둔다.

## 5. 상태

```text
draft → reviewed → verified → deprecated
```

`verified` 조건:

- required input이 존재한다.
- output contract가 결정돼 있다.
- pass criteria가 자동 또는 수동으로 판정 가능하다.
- 관련 fixture 또는 dogfood 증거가 있다.
- architecture 변경이면 ADR이 연결된다.
- secret·개인정보 scan을 통과한다.

폐기 Prompt는 삭제하지 않는다. `deprecated`와 `replacement`를 기록해 기존 link와
결정 이력을 유지한다.

## 6. index

Prompt index는 다음 필드로 filter할 수 있어야 한다.

- scope
- package
- category
- status
- version
- tag
- related ADR
- related docs

ID는 rename하지 않는다. 의미가 바뀌면 major ID를 올리고 이전 Prompt에
replacement를 설정한다.

**PRM-06** duplicate ID는 build failure다.
**PRM-07** 깨진 ADR·문서·fixture link는 build failure다.
**PRM-08** `verified` Prompt의 package version이 현재 compatibility range와 맞지
않으면 stale로 실패한다.
**PRM-09** public Prompt는 문서의 component-only Markdown pipeline을 사용한다.

## 7. Prompt와 다른 지침의 경계

| 자산 | 책임 |
|---|---|
| Prompt | 한 작업의 입력·출력·제약 |
| AGENTS.md | repository 전체의 영구 규칙 |
| ADR | 채택한 architecture 결정과 대안 |
| Skill | 반복되는 tool workflow와 절차 |
| API docs | 사용자 공개 계약 |

반복 Prompt가 tool 호출, 분기와 검증 절차를 안정적으로 공유하게 되면 Skill 후보로
승격한다. Prompt와 Skill에 같은 절차를 복제하지 않는다.

## 8. 초기 catalog

Internal:

- package boundary 설계
- Component contract 작성
- PHP escaping review
- DOM ownership review
- SCSS variable mapping review
- WebGL API compatibility review
- browser accessibility audit
- RC package dogfood

Public:

- PHP Component 추가
- TS Controller 추가
- SCSS token 확장
- API 문서 작성
- WebGL Surface 통합
- 접근성 audit
- 기존 PHP Host migration

## 9. 검증

- schema parse
- duplicate ID
- required heading
- internal/public leakage
- secret·개인정보 pattern
- broken relation
- stale package version
- public search와 copy browser test

## 10. 공식 근거

- https://developers.openai.com/api/docs/guides/latest-model
- https://developers.openai.com/codex/use-cases
