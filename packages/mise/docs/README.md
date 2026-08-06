---
id: mise.docs.index
title: MISE Documentation
description: MISE 공식 package 문서의 소유권과 탐색 지도
locale: ko
route: /ko/docs
section: foundation
order: 15
status: stable
---

# MISE Documentation

`mise-webgl`은 Three.js/WebGL 경험을 Scene 단위로 구성하고 Scroll·Auto 진행,
DOM 상호작용, Shader, 자원 수명과 디버깅을 하나의 생명주기로 통제하는
TypeScript core package다. MISE Web Foundation은 이 core와 독립
`mise-ui`·`mise-php` package를 조합하며 core Kernel의 책임을 확장하지 않는다.

이 package의 `docs` 디렉터리는 Host 저장소와 독립적으로 이동 가능한 MISE 공식 문서 세트다. 문서 해석에 Host 제품명, 디렉터리 구조, 현재 테스트 수와 배포 환경이 필요하면 독립성 위반이다.

## 1. 문서 소유권

유형은 학습(Tutorial), 절차(How-to), 참조(Reference), 설명(Explanation)을 뜻한다.

| 유형 | 문서 | 단일 책임 |
|---|---|---|
| 참조 | [`ARCHITECTURE.md`](./ARCHITECTURE.md) | 규범, 도메인 모델, 공개 API, 생명주기와 의존 방향 |
| 설명 | [`WEB-FOUNDATION.md`](./WEB-FOUNDATION.md) | WebGL core·UI·PHP MVC·문서 앱의 상위 package 경계 |
| 참조 | [`HTML-COMPONENTS.md`](./HTML-COMPONENTS.md) | Component-only HTML·상태·접근성·controller 계약 |
| 참조 | [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) | 시각 언어·버튼·상태·밀도·접근성 설계 계약 |
| 참조 | [`SCSS-SYSTEM.md`](./SCSS-SYSTEM.md) | SCSS 구조·fluid·token·selector·재사용 계약 |
| 참조 | [`DOCUMENT-COMPILER.md`](./DOCUMENT-COMPILER.md) | Markdown front matter·Component Model·탐색 index build 계약 |
| 참조 | [`PROMPT-CATALOG.md`](./PROMPT-CATALOG.md) | internal/public prompt index·metadata·보안·검증 계약 |
| 설명 | [`DECISIONS.md`](./DECISIONS.md) | 채택한 설계와 기각한 대안의 이유 |
| 참조 | [`CONTRACTS.md`](./CONTRACTS.md) | 구현·Adapter·확장 review checklist |
| 절차 | [`VERIFICATION.md`](./VERIFICATION.md) | framework·package·browser·device 합격 Gate |
| 절차 | [`ADOPTION.md`](./ADOPTION.md) | Host 적용, 분리, 확장과 교체 절차 |
| 절차 | [`OBJECTS-SHADERS-ASSETS.md`](./OBJECTS-SHADERS-ASSETS.md) | 객체·Shader·GLB·cache·ownership 실전 기준 |
| 절차 | [`LIFECYCLE-RECIPES.md`](./LIFECYCLE-RECIPES.md) | before/after·Promise·abort transaction 예시 |
| 참조 | [`API-GUIDE.md`](./API-GUIDE.md) | BAD/BASE/GOOD API·type·Props·코드 배치 기준 |
| 학습 | [`EXAMPLES.md`](./EXAMPLES.md) | canvas 앱·Scene·Playground·logging 전체 예시 |
| 설명 | [`ENTERPRISE-COMPOSITION.md`](./ENTERPRISE-COMPOSITION.md) | Container·Factory·Object Host·Clock·God Object 방지 |

규범 충돌 시 `ARCHITECTURE.md`의 rule ID가 우선한다. 다른 문서는 규칙을 복제하거나 새 규칙을 만들지 않고 각자의 책임에서 rule ID를 적용한다.

## 2. 탐색 지도

| 질문 | 문서 |
|---|---|
| WebGL core 패턴과 MVC가 최상위가 아닌 이유 | [`ARCHITECTURE §3`](./ARCHITECTURE.md#3-최종-공식-패턴), [`DECISIONS`](./DECISIONS.md) |
| PHP MVC와 Web Foundation package 경계 | [`WEB-FOUNDATION`](./WEB-FOUNDATION.md) |
| Component로만 DOM을 구성하는 방법 | [`HTML-COMPONENTS`](./HTML-COMPONENTS.md) |
| 문서 UI·버튼·상태를 일관되게 설계하는 방법 | [`DESIGN-SYSTEM`](./DESIGN-SYSTEM.md) |
| 기존 SCSS 구조·fluid·변수 매핑 | [`SCSS-SYSTEM`](./SCSS-SYSTEM.md) |
| Markdown을 Component Model과 index로 만드는 방법 | [`DOCUMENT-COMPILER`](./DOCUMENT-COMPILER.md) |
| 작업·사용자 prompt를 index하는 방법 | [`PROMPT-CATALOG`](./PROMPT-CATALOG.md) |
| Page·Experience·Surface·View·Track·Scene 관계 | [`ARCHITECTURE §4`](./ARCHITECTURE.md#4-도메인-언어) |
| 의존 방향과 UML | [`ARCHITECTURE §5`](./ARCHITECTURE.md#5-의존-방향과-관계) |
| package 구조와 공개 API | [`ARCHITECTURE §6–7`](./ARCHITECTURE.md#6-npm-package-구조) |
| TypeScript 법칙 | [`ARCHITECTURE §8`](./ARCHITECTURE.md#8-typescript-타입-법칙) |
| Provider·Registrar·Plan | [`ARCHITECTURE §9`](./ARCHITECTURE.md#9-provider-registrar-plan과-ioc) |
| Cue·Scene·Page lifecycle | [`ARCHITECTURE §11–12`](./ARCHITECTURE.md#11-cue-pipeline) |
| Driver·Frame·delta | [`ARCHITECTURE §13–14`](./ARCHITECTURE.md#13-driver) |
| Renderer·Resource·Shader | [`ARCHITECTURE §15–17`](./ARCHITECTURE.md#15-renderer-viewport와-quality) |
| DOM·Health·Debug·Logging | [`ARCHITECTURE §18–21`](./ARCHITECTURE.md#18-dom-motion과-navigation) |
| OOP·SOLID | [`ARCHITECTURE §22`](./ARCHITECTURE.md#22-oop와-solid) |
| 적용과 확장 예시 | [`ADOPTION.md`](./ADOPTION.md) |
| Earth·Moon·Shader·GLB 관리 | [`OBJECTS-SHADERS-ASSETS.md`](./OBJECTS-SHADERS-ASSETS.md) |
| before/after와 Promise | [`LIFECYCLE-RECIPES.md`](./LIFECYCLE-RECIPES.md) |
| BAD/BASE/GOOD API와 Props | [`API-GUIDE.md`](./API-GUIDE.md) |
| Playground·debug·logging 예시 | [`EXAMPLES.md`](./EXAMPLES.md) |
| Container·Factory·Clock 고도화 | [`ENTERPRISE-COMPOSITION.md`](./ENTERPRISE-COMPOSITION.md) |
| 합격 판정과 release 증거 | [`VERIFICATION.md`](./VERIFICATION.md) |

## 3. 경계

아래 표는 `mise-webgl` core의 경계다. Web Foundation 전체 의존 방향은
[`WEB-FOUNDATION.md`](./WEB-FOUNDATION.md)가 소유한다.

| MISE | Host | Adapter |
|---|---|---|
| Provider·Plan·Stage | URL·SSR·CMS·콘텐츠 | vendor/browser API 변환 |
| Surface·View·Track·Page·Scene·Cue lifecycle | 제품 Scene·DOM·Shader 의미 | Renderer·Motion·Scroll·Navigation |
| Driver·Frame scheduler | 실제 GLB·texture·audio | 생성·실패·dispose 처리 |
| Resource·Health·Debug Port | 제품 budget·Health profile | Port 구현 |
| Surface HTML·DOM·SCSS | fallback 문구·`--mise-*` override | browser capability |
| public API·package Gate | 배포 인프라 | vendor dependency |

Kernel은 Host와 concrete Adapter를 import하지 않는다. Composition Root만 세 영역을 함께 안다.

## 4. 유지 규칙

- 내부 Markdown link가 이 디렉터리 안에서만 해석된다.
- Host 제품명·source path·명령·release별 평가 수치·실행 결과가 없다.
- 외부 기술 주장은 공식 문서로만 근거를 남긴다.
- 구현 snapshot과 release evidence는 Host 또는 release artifact가 소유한다.
- 동일 규범을 두 canonical 파일이 동시에 소유하지 않는다.
- 문서를 추가·이동·삭제하면 위 소유권 표와 탐색 지도를 같은 변경에서 갱신한다.
- 한 문서는 한 사용자 목적과 한 유형만 소유한다.
- `ARCHITECTURE.md`는 2,000줄, 나머지 Markdown은 400줄 이하로 유지한다.
  초과 시 새 문서를 만들기 전에 중복과 잘못된 소유권을 제거한다.

세부 Gate는 [`VERIFICATION.md`](./VERIFICATION.md)를 따른다.
