---
id: mise.docs.web-foundation
title: MISE Web Foundation
description: WebGL core, UI, PHP MVC와 독립 문서 앱의 package 경계
locale: ko
route: /ko
section: foundation
order: 10
status: rc
---

# MISE Web Foundation

## 1. 문서 지위

이 문서는 `mise-webgl`, `mise-ui`, `mise-php`를 MISE라는 하나의 제품군으로
조합하는 portable architecture를 소유한다. 각 package의 내부 규범은 해당
package 문서가 소유하며 이 문서는 규칙을 복제하지 않고 경계와 의존 방향만
정한다.

| 항목 | 값 |
|---|---|
| 유형 | Explanation |
| 상태 | target contract |
| WebGL core | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| HTML component | [`HTML-COMPONENTS.md`](./HTML-COMPONENTS.md) |
| Design system | [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) |
| SCSS | [`SCSS-SYSTEM.md`](./SCSS-SYSTEM.md) |
| Prompt | [`PROMPT-CATALOG.md`](./PROMPT-CATALOG.md) |

`mise-webgl`의 현재 API와 lifecycle은 이 확장 때문에 UI 또는 PHP 구현을
import하지 않는다. Web Foundation은 core를 넓혀 하나의 거대한 package로 만드는
계획이 아니라, 명시적인 package를 조합하는 상위 계약이다.

## 2. 제품군

```text
MISE Web Foundation
├─ mise-webgl
│  └─ Three.js Surface·Stage·View·Track·Scene·Object·Frame·Resource
├─ mise-ui
│  └─ DOM component contract·controller·SCSS foundation
├─ mise-php
│  └─ PHP SSR component·renderer·request composition
└─ mise-docs
   └─ package docs를 조합하는 독립 consumer
```

**WF-01** 각 package는 독립 build·test·artifact를 가진다.
**WF-02** `mise-webgl`은 `mise-ui`, `mise-php`, 문서 앱을 import하지 않는다.
**WF-03** `mise-ui`는 PHP 또는 WebGL runtime을 요구하지 않는다.
**WF-04** `mise-php`는 `mise-ui`의 언어 중립 component contract만 소비한다.
**WF-05** 앱 composition root만 세 package와 제품 데이터를 함께 안다.
**WF-06** package 문서에는 Host 경로·명령·제품명·release 결과를 넣지 않는다.

## 3. MVC 적용 경계

MISE Web Foundation은 PHP SSR 요청 계층에 MVC를 사용한다.

```text
Request
→ Controller
→ Model
→ Component Tree
→ View Renderer
→ HTML Response
```

| MVC | 책임 | 금지 |
|---|---|---|
| Model | route, navigation, document, component Props 데이터 | HTML 문자열, DOM query |
| View | 등록된 Component와 template | request 해석, WebGL lifecycle |
| Controller | request 검증, Model 선택, root Component 조립 | 태그 출력, Shader·renderer 접근 |

브라우저 controller는 별도 경계다.

```text
SSR Component DOM
→ mise-ui Controller mount
→ ARIA/hidden/text 상태 갱신
→ dispose
```

**MVC-01** PHP Controller는 HTML을 직접 출력하지 않고 root Component를 renderer에
전달한다.
**MVC-02** Model은 immutable data이며 Component 또는 HTML fragment를 포함하지
않는다.
**MVC-03** View는 request, filesystem path와 전역 container를 읽지 않는다.
**MVC-04** browser controller는 자신이 소유한 component root 밖을 변경하지 않는다.
**MVC-05** `mise-webgl` kernel에는 MVC를 적용하지 않는다. WebGL core는 Stagecraft,
IoC와 Scene lifecycle을 계속 사용한다.
**MVC-06** WebGL과 DOM의 연결은 typed Props, Cue, Port 또는 명시적 adapter를 통해서만
이뤄진다.

MVC는 PHP 문서·콘텐츠 요청의 데이터·표현·입력 분리에 사용한다. GPU resource,
RAF, Scene transaction과 Shader ownership은 MVC가 아니라
[`ARCHITECTURE.md`](./ARCHITECTURE.md)가 소유한다.

## 4. 의존 방향

```text
Document Model ───────────────┐
Navigation Model ─────────────┼→ PHP Controller → Component Tree
Component Contract ───────────┘                       │
                                                     ▼
                                              PHP View Renderer
                                                     │
                                                     ▼
                                                   HTML
                                                     │
                          ┌──────────────────────────┴──────────┐
                          ▼                                     ▼
                 mise-ui Controller                      mise-webgl App
```

**WF-07** Model에서 View로만 의존한다. View가 Controller를 호출하지 않는다.
**WF-08** DOM controller와 WebGL Scene은 서로의 concrete instance를 참조하지 않는다.
**WF-09** package 사이 selector 또는 token을 복제하지 않고 contract artifact를
소비한다.
**WF-10** 공유 기능은 consumer 둘 이상과 검증된 중복이 있을 때만 package로
승격한다.

## 5. public surface

Web Foundation의 최소 public surface는 다음과 같다.

```text
mise-webgl
  createMise, definitions, adapters, styles, surface contract

mise-ui
  createMiseUi, defineController, controller factories
  component contract JSON
  styles.css, styles.scss, tokens.scss

mise-php
  Component, ComponentRenderer, RenderContext
  Props DTO, typed Slot, bootstrap.php
```

WebGL public API는 [`API-GUIDE.md`](./API-GUIDE.md)와
[`ARCHITECTURE §7`](./ARCHITECTURE.md#7-공개-package-surface)이 계속 단독
소유한다. UI 또는 PHP 문서는 WebGL facade를 재정의하지 않는다.

## 6. 문서와 consumer

- 각 package는 자신의 `docs`를 소유한다.
- umbrella 문서는 package 이름과 portable 계약만 다룬다.
- 문서 앱은 package 문서를 집계하되 canonical 내용을 복사하지 않는다.
- 제품 문서는 package 적용 차이, 배포와 실행 증거만 소유한다.
- 독립 fixture는 local source alias가 아니라 packaged artifact를 사용한다.

### 6.1 RC compatibility matrix

| Consumer | `mise-webgl` | `mise-ui` | `mise-php` |
|---|---:|---:|---:|
| `mise-docs@0.2.0-rc.1` | `0.1.x` | `0.2.0-rc.1` | `0.2.0-rc.1` |

RC 동안 package 계약 변경은 matrix와 관련 rule·test·artifact evidence를 같은
변경에서 갱신한다. `mise-webgl`의 기존 `0.1.x` API는 adjacent package를 import하지
않으므로 독립적으로 유지한다.

## 7. 공식 참고 원칙

1. WHATWG·W3C·PHP·Sass·Three.js 규격이 최우선이다.
2. MISE rule ID와 ADR이 제품군의 결정을 소유한다.
3. 벤더 guide는 구조 비교에만 사용하고 외형·코드·제품 제한을 복제하지 않는다.
4. 공식 문서로 확인할 수 없는 내부 구현은 규칙으로 만들지 않는다.

참고 범위:

| 공식 자료 | MISE 적용 | 비채택 |
|---|---|---|
| [Notion Block](https://developers.notion.com/reference/block) | typed content와 child composition | Notion 외형과 비공개 UI 구현 |
| [Slack Block Kit](https://docs.slack.dev/block-kit/) | surface·block·element·composition 분리 | Slack 전용 JSON 제한 |
| [Material Components](https://m3.material.io/components) | component anatomy·state·token 비교 | Material visual 복제 |
| [Google developer style](https://developers.google.com/style) | 기술 문서 용어와 reference hierarchy | Google 제품 전용 표현 |
| [Next.js layout](https://nextjs.org/docs/app/api-reference/file-conventions/layout) | shared layout과 server/client 책임 분리 | React·Next.js runtime |

각 URL은 RC 전 검증일, 채택 규칙과 비채택 범위를 Reference Matrix에 기록한다.

## 8. 완료 조건

- 세 package가 독립적으로 build와 package된다.
- 문서 앱이 packaged artifact만으로 실행된다.
- PHP route와 Model에 HTML tag가 없다.
- Component 밖의 DOM 생성이 validator에서 0건이다.
- SCSS component에 직접 작성한 `clamp()`가 0건이다.
- WebGL core가 UI/PHP를 import하지 않는다.
- 모든 public API·Component·token·Prompt가 index와 검증 증거를 가진다.
