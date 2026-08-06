---
id: mise.docs.design-system
title: MISE Design System
description: 문서 UI의 시각 언어, 버튼, 상태, 밀도, 접근성과 검증 규칙
locale: ko
route: /ko/design-system
section: foundation
order: 25
status: rc
---

# MISE Design System

## 1. 목적

이 문서는 MISE 문서 Surface의 시각 언어와 상호작용 품질을 소유한다. HTML 의미와
Component 조립 규칙은 [`HTML-COMPONENTS.md`](./HTML-COMPONENTS.md), 값과 selector 구현은
[`SCSS-SYSTEM.md`](./SCSS-SYSTEM.md)가 소유한다. 이 문서는 두 계약 사이에서 사용자가 실제로
보는 위계, 밀도, 상태와 일관성을 고정한다.

**DGN-01** UI는 콘텐츠를 주연으로 두고 shell, navigation, control은 낮은 시각 소음으로 보조한다.

**DGN-02** 한 화면은 neutral surface와 하나의 accent family만 사용한다. 상태 의미가 없는 무지개
색상, 장식용 gradient와 과도한 glass 효과를 금지한다.

**DGN-03** 문서 화면은 landing page처럼 과장하지 않는다. 본문 `h1`은 읽기 흐름을 지배하되
viewport 대부분을 차지하지 않는다.

**DGN-04** 모양보다 의미를 먼저 선택한다. 이동은 link, 실행은 button, 현재 위치는
`aria-current`, 선택은 해당 native 또는 ARIA state가 소유한다.

## 2. 시각 방향

MISE의 기본 방향은 quiet editorial workspace다.

| 축 | 계약 |
|---|---|
| canvas | 따뜻한 off-white 또는 거의 검은 neutral background |
| surface | background와 한 단계만 분리되는 solid surface |
| ink | 제목과 핵심 action에 쓰는 고대비 text color |
| accent | 현재 위치, focus, 정보 강조에 제한하는 lime family |
| border | 그림자를 대신하는 얇은 구조선 |
| radius | 작은 control, 중간 content surface, pill group의 세 단계 |
| shadow | dialog나 실제 elevation처럼 겹침을 설명할 때만 사용 |
| typography | display와 body의 역할 분리, 본문은 긴 호흡과 높은 가독성 |

**DGN-05** accent는 전체 면적을 칠하는 배경이 아니라 marker, focus, underline, callout tint에
우선 사용한다.

**DGN-06** 배경 blur는 sticky shell의 공간 분리에만 제한한다. 본문 card마다 blur를 반복하지 않는다.

**DGN-07** 같은 depth의 surface는 같은 border, radius와 background token을 소비한다.

## 3. Token mapping

시각 값은 semantic token을 통해서만 소비한다.

```text
foundation palette
→ semantic color token
→ component role
→ native/ARIA state override
```

| 역할 | token 예 | 소비자 |
|---|---|---|
| page canvas | `--mise-color-background` | body, dialog |
| content surface | `--mise-color-surface` | card, input, grouped control |
| emphasized surface | `--mise-color-surface-strong` | table header, inline code |
| primary ink | `--mise-color-text` | title, primary action |
| secondary ink | `--mise-color-muted` | description, quiet navigation |
| structural line | `--mise-color-line` | divider, control border |
| interaction accent | `--mise-color-accent` | focus, marker, underline |

**DGN-08** component partial은 palette literal을 직접 소비하지 않고 semantic token을 사용한다.

**DGN-09** spacing과 type scale의 유동 값은 중앙 `fluid()` 또는 `fluid-property()`만 사용한다.
Component, layout과 page partial은 `clamp()`를 직접 작성하지 않는다.

**DGN-10** content width, sidebar width, header height와 radius는 layout 또는 token layer가 소유한다.
개별 page에서 같은 값을 다시 선언하지 않는다.

## 4. Typography와 문서 위계

| 요소 | 역할 | 기준 |
|---|---|---|
| eyebrow | 상태와 분류 | 작고 짧은 mono label, 대문자 또는 짧은 한국어 |
| `h1` | 현재 문서 | 한 개, 최대 폭 제한, 균형 잡힌 줄바꿈 |
| lead | 문서 목적 | muted color, body보다 한 단계 큼 |
| `h2` | 주요 절 | 충분한 앞 간격과 anchor offset |
| `h3` 이하 | 하위 절 | 앞 단계보다 크기와 간격을 낮춤 |
| body | 설명 | 편한 행간, 과도하게 넓지 않은 measure |
| code | 식별자와 명령 | mono, body와 분리되는 surface |

**DGN-11** heading level은 크기를 선택하는 도구가 아니다. 문서 outline을 먼저 정하고 token으로
크기를 매핑한다.

**DGN-12** 본문은 card의 연속이 아니다. 독립된 경계나 행동이 있을 때만 surface로 묶는다.

## 5. Button system

Button은 목적, 크기, 상태를 독립 축으로 가진다.

| variant | 용도 | 시각 계약 |
|---|---|---|
| primary | 화면의 가장 중요한 한 가지 실행 | ink background, inverse text |
| secondary | 일반 실행과 보조 action | surface, line border, text ink |
| quiet | disclosure, 닫기, copy 같은 저강도 실행 | transparent, muted ink |

| size | 최소 높이 | 사용처 |
|---|---:|---|
| compact | 32px | 밀도 높은 보조 도구, 충분한 주변 간격 필수 |
| default | 38px | desktop 일반 control |
| touch | 48px | coarse pointer에서 interactive control |

**DGN-13** 한 영역의 primary button은 원칙적으로 하나다. 나머지는 secondary 또는 quiet로
명확히 낮춘다.

**DGN-14** button label은 동사 또는 즉시 이해 가능한 action을 사용한다. icon-only button은
접근 가능한 이름을 반드시 제공한다.

**DGN-15** button은 `type`을 명시한다. navigation을 button으로, action을 빈 `href` link로
구현하지 않는다.

**DGN-16** `disabled`는 실행을 막고 focus 순서에서도 제외해야 할 native form control에 쓴다.
발견 가능성을 유지해야 하는 custom control은 `aria-disabled="true"`와 실행 guard를 함께 쓴다.

**DGN-17** loading state는 label 폭을 가능한 유지하고 실행을 중복 허용하지 않는다.
`aria-busy="true"` 또는 동등한 상태를 노출하며 성공과 실패를 색상만으로 알리지 않는다.

### 5.1 상태 행렬

| 상태 | 필수 변화 |
|---|---|
| default | variant hierarchy 유지 |
| hover | pointer 가능 환경에서만 border 또는 surface 한 단계 변화 |
| active | 짧은 pressed feedback, layout shift 없음 |
| focus-visible | 최소 2px의 분명한 outline, background와 충분한 대비 |
| disabled | 낮은 대비와 비활성 cursor, 실행 불가 |
| loading | 중복 실행 불가, 상태 이름 노출 |

**DGN-18** hover는 기능 발견의 유일한 수단이 아니다. touch와 keyboard에서도 같은 기능을 사용할
수 있어야 한다.

**DGN-19** focus outline을 제거하지 않는다. sticky header와 dialog는 focused target을 가리지 않는다.

## 6. Navigation과 shell

```text
SiteHeader
├─ Brand
├─ Primary navigation
└─ Search + Theme controls

DocsShell
├─ PrimarySidebar: 전체 문서 구조
├─ ArticleDocument: 현재 문서
└─ OnPageToc: 현재 문서 outline
```

**DGN-20** header는 brand, 주요 이동과 전역 도구만 소유한다. 본문 action을 header에 복제하지 않는다.

**DGN-21** sidebar는 section label과 route link를 그룹화한다. 현재 page는 고대비 surface와 marker를
함께 사용하여 색상 하나에 의존하지 않는다.

**DGN-22** page TOC는 실제 compiler heading만 표시한다. 존재하지 않는 anchor와 고정 샘플 목차를
출력하지 않는다.

**DGN-23** mobile에서 sidebar와 TOC가 본문 폭을 압박하지 않는다. disclosure나 별도 dialog로
전환하되 SSR link 자체는 보존한다.

## 7. Content components

| component | 설계 기준 |
|---|---|
| callout | 정보 강조만 수행, 본문보다 과도하게 강하지 않음 |
| code block | 고대비 mono surface, copy action은 quiet hierarchy |
| table | header와 row 경계 명확, 좁은 화면 horizontal overflow 허용 |
| inline code | 문장 리듬을 깨지 않는 작은 emphasized surface |
| link | accent underline과 focus indicator, color-only 구분 금지 |
| dialog | 실제 overlay elevation, heading·close·focus return 제공 |

**DGN-24** content component는 같은 정보를 장식 목적으로 반복하지 않는다.

**DGN-25** WebGL surface는 문서 탐색과 독립적으로 실패할 수 있어야 한다. fallback text와 문서
navigation은 WebGL 실패 뒤에도 남는다.

## 8. Motion과 feedback

**DGN-26** motion은 상태 변화의 방향이나 연속성을 설명할 때만 추가한다.

**DGN-27** hover, active와 dialog transition은 layout을 이동시키지 않는다.

**DGN-28** `prefers-reduced-motion: reduce`에서는 비필수 animation과 smooth scrolling을 제거한다.

**DGN-29** copy, search, theme와 disclosure는 native 또는 ARIA state를 single source of truth로 쓴다.
장식 class를 상태 원본으로 쓰지 않는다.

## 9. Reference policy

규범 근거와 시각 참고를 분리한다.

| 분류 | 출처 | 사용 범위 |
|---|---|---|
| 규범 | [WHATWG button](https://html.spec.whatwg.org/multipage/form-elements.html#the-button-element) | native 의미와 속성 |
| 규범 | [MDN button](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button) | accessible name과 구현 참고 |
| 규범 | [WCAG 2.2 Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) | 최소 target과 spacing |
| 규범 | [WCAG 2.2 Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html) | visible focus 품질 |
| 비규범 시각 참고 | [Notion](https://www.notion.com/product/notion) | 문서 중심 density와 quiet chrome 관찰 |
| 비규범 시각 참고 | [Claude](https://www.anthropic.com/claude) | 따뜻한 neutral, 절제된 hierarchy 관찰 |
| 비규범 시각 참고 | [Open Design](https://open-design.ai/ko/) | off-white canvas, ink action, 제한된 accent 관찰 |

**DGN-30** 비규범 시각 참고는 브랜드, asset, copy 또는 token의 복제 허가가 아니다. MISE는 관찰한
원리를 자체 semantic token과 Component 계약으로 다시 설계한다.

## 10. 검증 Gate

- 모든 route의 title, body와 TOC가 compiler artifact에서 일치한다.
- navigation의 모든 visible link가 HTTP 200을 반환하고 not-found title을 출력하지 않는다.
- keyboard focus가 항상 보이고 sticky element에 가려지지 않는다.
- interactive target은 WCAG 2.2 최소값을 통과하고 coarse pointer에서 48px 높이를 사용한다.
- primary, secondary, quiet button의 default, hover, active, focus, disabled 상태를 검증한다.
- light와 dark theme에서 text, focus와 control 경계의 대비를 검증한다.
- 320px, tablet, desktop과 wide viewport에서 horizontal page overflow가 없다.
- JS-off에서 heading, body와 route navigation을 읽고 이동할 수 있다.
- reduced motion에서 비필수 animation이 없다.
- serious와 critical accessibility violation이 0건이다.
