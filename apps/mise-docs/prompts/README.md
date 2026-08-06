# MISE Prompt Index

이 디렉터리는 MISE Web Foundation 작업 Prompt의 source index다. 관리 규칙은
[`PROMPT-CATALOG.md`](../../../packages/mise/docs/PROMPT-CATALOG.md)를 따른다.

## Internal

Internal Prompt는 구현·리뷰·검증을 재현하기 위한 저장소 자산이며 production
artifact와 공개 문서 검색에서 제외한다.

| ID | 상태 | 목적 | 문서 |
|---|---|---|---|
| `mise.foundation.implement.web-foundation.v1` | reviewed | Web Foundation을 문서 우선 Phase로 구현 | [`internal/mise.foundation.implement.web-foundation.v1.md`](./internal/mise.foundation.implement.web-foundation.v1.md) |

## Public

| ID | 상태 | 목적 | 검증 | 문서 |
|---|---|---|---|---|
| `mise.ui.implement.component.v1` | verified | Component-only UI 추가 | `Controller.test.ts` | [`public/mise.ui.implement.component.v1.md`](./public/mise.ui.implement.component.v1.md) |

## 규칙

- ID는 rename하지 않는다.
- architecture 변경은 ADR과 연결한다.
- 전체 대화와 hidden reasoning을 저장하지 않는다.
- secret·개인정보·사용자 로컬 경로를 저장하지 않는다.
- `verified`는 연결된 test 또는 dogfood 증거가 있을 때만 사용한다.
- internal file은 package와 production artifact에서 제외한다.
