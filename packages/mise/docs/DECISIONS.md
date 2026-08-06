---
id: mise.docs.decisions
title: MISE Architecture Decisions
description: 채택한 설계와 기각한 대안의 결정 기록
locale: ko
route: /ko/decisions
section: reference
order: 60
status: stable
---

# MISE Architecture Decisions

이 package 문서는 MISE의 핵심 설계 결정을 짧게 고정한다. 상세 규칙은 [`ARCHITECTURE.md`](./ARCHITECTURE.md)가 소유한다.

## ADR-001 — Hexagonal + IoC + Scene-Oriented + Stagecraft

**상태:** 채택

**결정:**

```text
Hexagonal Architecture
+ Inversion of Control
+ Scene-Oriented domain model
+ MISE Stagecraft lifecycle
```

**이유:**

- Hexagonal은 Kernel과 Three.js·GSAP·Lenis·Barba의 방향을 분리한다.
- IoC는 frame과 lifecycle 호출 순서를 framework가 소유하게 한다.
- Scene-Oriented model은 cinematic 경험의 서사 단위를 직접 표현한다.
- Stagecraft는 Provider·Plan·Cue·Changer·Driver·Scope라는 MISE 실행 법칙을 정의한다.

**기각:**

- MVC 단독: GPU 자원, 시간, 취소와 Scene transaction을 충분히 표현하지 못한다.
- 범용 DI container: runtime resolve와 Service Locator를 유도한다.
- global event bus: 인과관계와 순서 보장이 약해진다.
- Entity Component System: 현재 객체 수와 동적 조합 요구에 비해 복잡도가 크다.

## ADR-002 — Registration 뒤 immutable Plan

**상태:** 채택

Provider는 `register()`에서 definition과 Adapter factory만 등록한다. Plan Compiler가 중복·누락·참조·capability를 검증하고 Experience·Scene·Drive·Page의 detached frozen snapshot으로 immutable `MisePlan`을 만든다. `boot()` 이후 등록과 runtime resolve는 금지한다.

이 결정은 Laravel Provider의 register/boot 구분에서 아이디어를 얻지만 Laravel container를 복제하지 않는다.

## ADR-003 — 단일 scheduler와 demand rendering

**상태:** 채택

canvas, renderer와 RAF owner는 각각 하나다. Scene·Effect·Lenis·GSAP은 자체 render loop를 만들지 않는다. 시간 기반 작업은 continuous lease, 일회성 변화는 invalidate로 다음 frame을 요청한다.

## ADR-004 — Page와 Scene lifecycle 분리

**상태:** 채택

Page는 SSR DOM과 navigation 수명이다. Scene은 WebGL 자원과 Driver 수명이다. 둘은 Stage에서 협력하지만 같은 base class로 합치지 않는다.

## ADR-005 — Cue transaction

**상태:** 채택

순서는 `before → action → after`다. `before` 실패는 commit을 막는다. `action`이 active state를 원자적으로 교체한다. `after` 실패는 이미 commit된 state를 되돌리지 않고 오류와 cleanup을 보고한다.

## ADR-006 — Port는 작게, public class는 적게

**상태:** 채택

대체 가능한 경계만 구조적 `interface`를 쓴다. identity·state·resource owner는 class를 사용할 수 있지만 concrete Kernel class는 export하지 않는다. 계산은 순수 함수를 우선한다.

## ADR-007 — own·borrow·lease

**상태:** 채택

모든 자원 관계는 생성 시점에 분류한다.

- `own`: Scope가 dispose한다.
- `borrow`: Scope가 dispose하지 않는다.
- `lease`: Scope가 release callback을 정확히 한 번 실행한다.

정리는 역순·멱등이며 한 cleanup 실패가 다음 cleanup을 막지 않는다.

## ADR-008 — Shader는 Effect owner가 통제

**상태:** 채택

Scene은 raw `uniforms`를 직접 변경하지 않는다. Effect owner가 material, uniform, program variant와 dispose를 소유한다. frame 중 shader define을 바꾸지 않는다.

## ADR-009 — 단일 package와 subpath exports

**상태:** 채택

첫 공개판은 monorepo 다중 package 대신 단일 NPM package를 사용한다.

구체적인 root와 subpath 목록은 [`ARCHITECTURE §7`](./ARCHITECTURE.md#7-공개-package-surface)이 단독 소유한다.

Root는 optional vendor를 import하지 않는다. wildcard export와 Kernel deep import를 Node export map으로 차단한다.

## ADR-010 — capability 기반 Health

**상태:** 채택

Framework core는 설치된 capability에서 expected collaboration set을 생성한다. Host 제품은 별도 profile을 추가할 수 있다. optional Adapter가 설치되지 않았다는 이유만으로 core Health가 실패하면 안 된다.

## ADR-011 — Playground는 별도 진입점

**상태:** 채택

Playground와 Inspector는 `mise-webgl/playground`에서만 제공한다. production root graph와 chunk에 포함하지 않는다. `lil-gui`는 optional peer이며 development dynamic import에서만 도달한다. Inspector는 `autoPlace: false`로 MISE container에 mount하고 touch style 기본값을 유지한다. 제품 tuning은 typed semantic getter/setter만 사용하고 Debug factory에 주입된 `FrameControl`로 invalidation한다. `Controller.listen()`은 별도 RAF를 만들기 때문에 사용하지 않고 5Hz 이하 snapshot에서 `updateDisplay()`한다. dispose는 `GUI.destroy()`가 소유한다.

## ADR-012 — Surface는 native HTML·TS·SCSS 모듈

**상태:** 채택

WebGL canvas, 정적 fallback과 Inspector selector는 MISE package가 함께 소유한다. Browser Application은 기존 data contract를 hydrate하거나 native DOM으로 생성하며 자신이 생성한 Surface만 정리한다.

React·Vue·Lit 같은 UI runtime을 추가하지 않는다. CSS와 SCSS entry를 분리해 소비자가 빌드 방식에 맞게 하나만 선택하고, SSR Host에는 같은 data contract의 HTML template을 제공한다.

## ADR-013 — reduced-motion은 live preference

**상태:** 채택

mount 시점 boolean snapshot을 장기 보관하지 않는다. Framework가 `MediaQueryList` change listener를 소유하고 readonly live state를 Driver와 Scene context에 전달한다. preference가 실행 중 켜지면 motion Adapter는 animation과 frame lease를 즉시 정리한다.

**기각:**

- mount 시 snapshot: 운영체제 설정 변경을 반영하지 못한다.
- 각 Scene의 개별 listener: listener 수명과 frame invalidation owner가 분산된다.

## ADR-014 — 실행 가능한 commercial Gate

**상태:** 채택

Architecture graph, strict type, unit/property, mutation, API report, dead code와 tarball consumer 검사를 서로 대체 불가능한 Gate로 둔다. Architecture 검사는 현재 TypeScript major를 실제로 해석하거나 ESM import graph를 직접 검증해야 하며 module/edge 0인 false-green을 허용하지 않는다.

API review entry와 report, test 설정과 검증 script는 source package가 소유하지만 review tooling과 report는 publish tarball에서 제외한다.

## ADR-015 — 최소 canvas capability와 전환 signal

**상태:** 채택

Renderer는 WebGL runtime의 필수 capability다. Page routing, DOM motion과 smooth scroll이 없는 canvas 앱은 Motion·Navigation·Scroll을 등록하지 않으며 side effect 없는 Null Port를 사용한다. 초기 Scene 진입은 `initialExperience`가 명시한다.

Scene `create`와 before/after hook은 하나의 transition AbortSignal을 공유한다. 새 전환이 이전 비동기 GLB 결과를 대체하면 stale 결과를 commit하지 않고 즉시 폐기한다.

**기각:**

- 모든 Host에 Barba·GSAP·Lenis 강제: 사용하지 않는 vendor와 DOM lifecycle을 core boot에 결합한다.
- 전역 asset promise: Scene transition과 ownership을 연결할 수 없다.
- abort 없는 epoch 검사만 사용: stale commit은 막지만 완료된 GLB 자원을 즉시 폐기할 근거가 약하다.

## ADR-016 — Surface·View·Track 기반 다중 WebGL Stage

**상태:** 채택

하나의 Experience가 전체 배경 WebGL과 문서 중간의 여러 Three.js 영역을
동시에 제공할 수 있도록 실행 모델을 다음처럼 확장한다.

```text
Stage
→ Surface: 실제 canvas·Renderer·WebGL context 경계
→ View: Surface 안의 viewport·scissor 영역
→ Track: View에 연결된 독립 Scene 순서와 Changer
→ Scene
```

기존 `ExperienceDefinition.scenes`는 `default Surface → default View →
default Track`으로 compile한다. 기존 Host와 단일 canvas consumer는 API와
동작을 변경하지 않는다.

배경과 일반 section effect는 하나의 compositor Surface에 여러 View를 두는
방식을 기본으로 한다. 실제 section 내부 canvas가 DOM stacking, pointer,
해상도 또는 장애 격리를 위해 필요한 경우에만 isolated Surface를 추가한다.

Application은 FrameLoop, Scroll Port, immutable Plan을 하나만 소유한다.
Renderer와 canvas는 실제 Surface마다 하나이며 Track마다 만들지 않는다.
각 Track은 별도 SceneChanger와 Driver session을 소유하고 다른 Track의 Scene을
직접 참조하지 않는다.

한 View에는 한 Track만 연결한다. compositor Surface는 여러 ordered View를
가질 수 있고, isolated Surface는 하나의 whole-Surface View만 가진다. 이 제한은
clear 순서와 lifecycle owner를 모호하지 않게 만든다. 같은 영역에 여러 object가
필요하면 한 Scene의 object graph로 조립한다.

`activation: "visible"` Track은 첫 viewport 진입 전 Scene resource 생성을
미룬다. 이후 offscreen에서는 update/render만 중지하여 반복 스크롤 시
생성·폐기 thrash를 피한다. View rect는 Scroll·refresh·Surface viewport 변경
시에만 DOM boundary에서 batch 측정한다.

Surface context loss는 같은 Surface의 Track만 중지한다. 다른 Surface와
Application FrameLoop를 전역 suspend하지 않는다. CPU asset source는 공유할
수 있지만 GPU resource lease는 Renderer context 경계로 분리한다.

**기각:**

- section마다 독립 MISE Application: Provider·Scroll·RAF·Health가 중복된다.
- section마다 실제 canvas 강제: WebGL context와 GPU memory 사용이 증가한다.
- 하나의 전역 Scene graph에 모든 section object 삽입: lifecycle·취소·dispose
  경계가 사라진다.
- Scene의 DOM rect 직접 측정: layout 책임과 render 책임이 결합된다.

## ADR-017 — Restricted Container + Factory + Object Host + MiseClock

**상태:** 채택

Composition Root에는 generic token 기반 Restricted Container와
Application/Runtime Factory를 사용한다. 지원 lifetime은 `value`, `singleton`,
`scoped`, `transient`다. duplicate·missing·cycle은 stable error로 실패한다.
Container는 조립이 끝난 뒤 Runtime, Scene, Driver와 Object에 전달하지 않는다.

제품 Object는 Provider나 Container binding이 아니다. Scene definition이
`defineObjectFactory` 결과를 선언하고, Scene-local Object Host가 transition
signal과 child `ResourceScope`를 주입해 생성한다. abort와 실패는 생성 후보를
즉시 rollback하며 Host가 Object를 역순·멱등으로 정리한다.

FrameLoop는 RAF timestamp를 독립 `MiseClock`에 전달한다. Clock은 `rawDelta`,
최대 0.1초로 clamp한 `delta`, clamp 누적 `elapsed`, 단조 `frame`을 만든다.
pause/resume 첫 delta는 0이며 scheduling은 계속 FrameLoop 하나가 소유한다.

계약 type은 도메인별 `types/` 모듈로 분리하고 `Contracts.ts`는 re-export
facade로 유지한다. production TS 파일은 450줄을 넘으면 Architecture Gate가
실패한다.

**이유:**

- 제한형 Container는 생성 순서와 lifetime cache를 표준화하되 Service Locator를 만들지 않는다.
- Factory는 생성 정책을 lifecycle owner와 분리해 OCP·DIP를 강화한다.
- Object Host는 Scene이 커지는 원인인 생성·abort·dispose 분기를 제거한다.
- 독립 Clock은 Three.js `Clock` deprecation과 background delta spike를 격리한다.
- type/facade/line budget은 God Object 재발을 기계적으로 차단한다.

**기각:**

- Scene에서 Container resolve: hidden dependency와 runtime failure를 만든다.
- reflection/decorator auto wiring: metadata와 bundler 결합이 증가한다.
- 범용 `ObjectManager`: 생성·update·render·dispose를 한 객체로 모은다.
- Scene별 Clock/RAF: scheduler와 시간 기준이 중복된다.

## ADR-018 — Web Foundation은 인접 package로 확장

**상태:** 채택

`mise-webgl`은 ADR-009의 단일 NPM package와 explicit subpath를 유지한다. PHP
MVC, reusable HTML Component와 범용 SCSS design system은 core에 넣지 않고
각각 인접 `mise-php`와 `mise-ui` package가 소유한다.

이 결정은 ADR-009를 폐기하지 않는다. ADR-009는 WebGL core 내부를 다중
micro-package로 쪼개지 않는 결정이고, ADR-018은 서로 다른 runtime과 release
책임을 core 밖 package로 분리하는 결정이다.

Page와 layout은 Component만 조립하며 PHP MVC는 request·content·SSR View
경계에만 적용한다. Scene·Frame·GPU resource는 계속 Stagecraft가 소유한다.

세부 의존 방향은 [`WEB-FOUNDATION.md`](./WEB-FOUNDATION.md)가 소유한다.

## 결정 변경 절차

1. 문제와 실제 consumer를 기록한다.
2. 기존 rule ID와 영향 범위를 찾는다.
3. 최소 두 대안을 비교한다.
4. API·lifecycle·resource·bundle 영향과 migration을 작성한다.
5. `ARCHITECTURE.md`, type tests, runtime tests와 API report를 함께 갱신한다.
6. breaking 여부를 판정한다.
