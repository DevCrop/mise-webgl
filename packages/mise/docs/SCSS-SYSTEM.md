---
id: mise.docs.scss-system
title: MISE SCSS System
description: 기존 구조를 유지하는 fluid, token과 selector 규칙
locale: ko
route: /ko/scss
section: foundation
order: 30
status: rc
---

# MISE SCSS System

## 1. 목적

이 문서는 MISE UI의 SCSS 구조, fluid scale, token과 Component style ownership을
소유한다. 기존 consumer의 foundation file과 public namespace를 유지하면서 공통
구현을 package로 승격하는 것이 원칙이다.

## 2. 고정 구조

```text
styles/
├─ abstract/
│  ├─ _variables.scss
│  ├─ _colors.scss
│  ├─ _headings.scss
│  ├─ _functions.scss
│  ├─ _mixins.scss
│  └─ index.scss
├─ base/
├─ layouts/
├─ components/
├─ pages/
└─ Index.scss
```

**SCS-01** 기존 `abstract/base/layouts/components/pages` 책임을 유지한다.
**SCS-02** `abstract`는 CSS를 출력하지 않는다.
**SCS-03** `base`는 reset·font·root·global, `layouts`는 큰 배치,
`components`는 재사용 UI, `pages`는 route 전용 조합만 소유한다.
**SCS-04** 기존 partial은 facade 또는 consumer가 남아 있는 동안 삭제·병합하지
않는다.
**SCS-05** 공통 구현을 package로 승격하면 기존 file은 `@forward`, `@use` 또는
호환 wrapper로 public API를 유지한다.

## 3. fluid 규칙

MISE는 중앙 `fluid()` 함수와 `fluid-property()` mixin을 사용한다.

```scss
font-size: function.fluid(16, 20);
@include mixin.fluid-property(gap, 16, 32);
```

**SCS-06** Component와 Page는 viewport 기반 선형 값을 직접 계산하지 않는다.
**SCS-07** Component·Layout·Page partial에 `clamp()`를 직접 작성하지 않는다.
**SCS-08** clamp 구현이 필요하면 foundation의 `fluid()` 한 곳만 소유한다.
**SCS-09** 같은 minimum·maximum 조합을 여러 Component가 사용하면 semantic token으로
승격한다.
**SCS-10** fixed 값이 의미상 맞는 border·icon pixel·focus width를 억지로 fluid로
바꾸지 않는다.

즉, 금지 대상은 CSS `clamp()` 자체가 아니라 Component마다 임의로 만드는 clamp다.
Consumer는 항상 검증된 `fluid()` API를 사용한다.

## 4. 변수 소유권과 매핑

| 값 | canonical owner | consumer |
|---|---|---|
| viewport min/max | `_variables.scss` | `fluid()` |
| breakpoint | `_variables.scss` | `mq()` |
| font family | `_variables.scss` | typography mixin |
| palette | `_colors.scss` | theme CSS variables |
| heading scale | `_headings.scss` | `heading()` |
| container/gutter | `_variables.scss` | `container()` |
| z layer | `_variables.scss` | `layer()` |
| safe area | `_mixins.scss` | layout |
| focus ring | `_mixins.scss` + color token | interactive Component |

**SCS-11** raw breakpoint·palette·font scale·z-index를 Component에 반복하지 않는다.
**SCS-12** 새 값은 semantic owner에 먼저 등록하고 Component는 mapping API를
소비한다.
**SCS-13** Sass compile-time 값과 runtime theme 값은 분리한다.
**SCS-14** runtime theme 값은 `--mise-*` CSS custom property로 내보낸다.
**SCS-15** 제품 theme는 package 내부 selector를 override하지 않고 공개 token만
설정한다.

권장 token 영역:

```text
color: background, surface, surface-strong, text, muted, line, accent, focus
type: family, size, weight, line-height, letter-spacing
space: page-gutter, section-gap, component-gap
shape: radius, border-width, shadow
motion: duration, easing
layout: container, header-height, aside-width, article-measure
layer: content, header, drawer, modal, toast
```

## 5. module과 namespace

- `@use`와 `@forward`만 사용한다.
- wildcard global import를 사용하지 않는다.
- function, variable, mixin namespace를 생략하지 않는다.
- 한 entry에서 CSS-producing module을 한 번만 load한다.
- CSS와 SCSS entry를 동시에 load하지 않는다.

공개 naming:

| 대상 | 형식 |
|---|---|
| CSS variable | `--mise-*` |
| Component | `.mise-c-*` |
| Layout | `.mise-l-*` |
| Utility | `.mise-u-*` |
| Controller hook | `data-mise-*` |

## 6. selector와 state

**SCS-16** selector nesting은 실제 DOM ownership만 표현한다.
**SCS-17** ID selector와 신규 `!important`를 금지한다.
**SCS-18** Controller hook과 style class를 분리한다.
**SCS-19** active·selected·expanded style은 ARIA/native state를 선택한다.
**SCS-20** Component 외부에서 내부 element를 deep override하지 않는다.
**SCS-21** variant는 modifier class가 아니라 검증된 data attribute 또는 root class로
한정한다.

## 7. cascade layer

```scss
@layer mise.reset, mise.tokens, mise.base, mise.layout, mise.component, mise.utility;
```

- package layer 순서는 고정한다.
- Host layer는 공개 custom property만 설정한다.
- utility는 하나의 property 책임을 가지며 Component 규칙을 덮지 않는다.
- theme selector는 token value만 바꾼다.

## 8. responsive와 접근성

- breakpoint는 `mq()`로만 소비한다.
- `svh`, `dvh`, safe-area와 pointer capability를 사용한다.
- UA·device model 분기를 금지한다.
- coarse pointer의 target size를 줄이지 않는다.
- `prefers-reduced-motion`에서 정보와 state feedback을 제거하지 않는다.
- focus ring은 Component마다 다시 정의하지 않고 mixin과 token을 사용한다.

## 9. 재사용 판단

```text
같은 값만 반복
→ semantic token 후보

같은 선언 묶음과 의미가 반복
→ mixin 후보

같은 DOM·state·behavior가 반복
→ Component 후보

한 Page에서만 사용
→ page partial 유지
```

추상화는 실제 consumer 둘 이상 또는 독립 package contract가 있을 때만 한다.

## 10. 검증

- Sass compile
- abstract CSS output 0건
- Component direct `clamp()` 0건
- raw breakpoint·palette·z-index 반복 0건
- ID selector·`!important` 0건
- public token 문서 누락 0건
- CSS entry 중복 load 0건
- light/dark contrast와 focus-visible browser test

## 11. 공식 근거

- https://sass-lang.com/documentation/at-rules/use/
- https://sass-lang.com/documentation/at-rules/forward/
- https://sass-lang.com/documentation/values/calculations/
- https://www.w3.org/WAI/WCAG22/Understanding/focus-visible
