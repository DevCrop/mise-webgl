---
id: mise.docs.html-components
title: MISE HTML Components
description: Component-only HTML, 상태, 접근성과 Controller 계약
locale: ko
route: /ko/components
section: foundation
order: 20
status: rc
---

# MISE HTML Components

시각 위계, 버튼 variant, density와 interaction state는
[`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md)가 소유한다.

## 1. 목적

이 문서는 `mise-ui`와 `mise-php`가 공유하는 HTML component 계약을 소유한다.
페이지는 component tree만 조합하며 literal HTML은 등록된 component template
내부에서만 작성한다.

## 2. component-only DOM

**HTM-01** route, Controller, Model과 page composition 파일은 HTML tag를 직접
작성하지 않는다.
**HTM-02** 실제 tag는 등록된 component template만 출력한다.
**HTM-03** Slot은 `Component` 또는 `list<Component>`만 허용한다.
**HTM-04** raw HTML, `SafeHtml` public constructor, `className`, inline style과 generic
attribute bag을 제공하지 않는다.
**HTM-05** client code는 `innerHTML`, `outerHTML`, `insertAdjacentHTML`과
`document.write`를 사용하지 않는다.
**HTM-06** 동적 목록은 Component가 SSR한 `<template>`을 clone하고 검증된 text와
URL만 채운다.
**HTM-07** Component의 PHP·HTML·SCSS·Controller·test·docs는 같은 변경에서
추가·변경·삭제한다.

허용된 DOM 생성 경로:

```text
Model data
→ Component Props
→ registered PHP template
→ ComponentRenderer
→ SSR HTML
```

브라우저에서 새 node가 필요한 유일한 경로:

```text
SSR Template Component
→ template.content.cloneNode(true)
→ textContent + validated href
```

## 3. 기본 문서 구조

```text
SkipLink
DocsShell
├─ SiteHeader
│  └─ PrimaryNav
├─ PrimarySidebar
│  └─ Navigation
├─ Main
│  └─ Article
└─ OnPageAside
   └─ Navigation
```

**HTM-08** 문서에는 `main`이 하나만 존재한다.
**HTM-09** page title은 하나의 `h1`이 소유하고 본문은 heading level을 건너뛰지
않는다.
**HTM-10** `nav`는 주요 문서 또는 page 탐색에만 사용하고 각 nav에 구별 가능한
accessible name을 제공한다.
**HTM-11** 왼쪽 `aside`는 전체 문서 탐색, 오른쪽 `aside`는 현재 문서 목차만
소유한다.
**HTM-12** 독립 배포 가능한 본문은 `article`, heading을 가진 주제 구간은
`section`, 배치 전용 wrapper는 `div`를 사용한다.
**HTM-13** 행동은 `button`, 이동은 `a`, modal surface는 native `dialog`를
우선한다.

구조 기준은 WHATWG HTML sections다.

## 4. Props와 Slot

Props 원칙:

- immutable DTO
- 필수/선택 값을 type으로 구분
- semantic enum 사용
- string boolean 금지
- URL·ID·color·number 범위 검증
- callback 또는 service instance 전달 금지

공통 Props를 만들지 않는다. 실제로 여러 Component가 같은 의미와 검증을 공유할
때 작은 value object로 승격한다.

허용 예:

```text
ButtonProps(label, tone, size, disabled)
LinkProps(label, href, current)
CalloutProps(tone, title, content Slot)
```

금지 예:

```text
ComponentProps(className, style, html, attributes)
```

Named Slot은 `leading`, `content`, `trailing`, `footer`처럼 의미로 이름을 정한다.
DOM 위치를 나타내는 `left`·`right`는 방향 전환과 반응형 배치에 취약하므로
사용하지 않는다.

## 5. 상태 계약

상태의 단일 source:

| 의미 | source |
|---|---|
| 현재 page | `aria-current="page"` |
| 현재 heading | `aria-current="location"` |
| disclosure | `aria-expanded` |
| 선택 tab | `aria-selected` |
| panel 표시 | `hidden` |
| form disabled | native `disabled` |
| custom disabled | `aria-disabled` |

**HTM-14** CSS와 Controller는 같은 ARIA/native state를 읽는다.
**HTM-15** `active`, `selected`, `open` class를 상태 source로 사용하지 않는다.
**HTM-16** `data-state`는 `opening`·`closing` 같은 transient animation에만
사용한다.
**HTM-17** active 표시는 색상만 사용하지 않고 shape·weight·marker 중 하나를
함께 제공한다.

## 6. progressive enhancement

- SSR만으로 page title, 본문, link와 nav를 사용할 수 있다.
- Controller mount 전에는 정보가 숨겨지지 않는다.
- tabs는 JS가 없으면 모든 panel을 순서대로 표시한다.
- disclosure nav는 active group을 SSR에서 연다.
- search는 JS가 없으면 검색을 사용할 수 없다는 link형 안내를 제공하되 문서 탐색은
  유지한다.
- WebGL 실패 또는 미지원에서도 HTML 문서와 navigation은 유지한다.

**HTM-18** Controller는 구조를 소유하지 않고 상태 변경만 소유한다.
**HTM-19** `mount()`와 `dispose()`는 반복 호출에 안전해야 한다.
**HTM-20** listener는 Component Scope의 `AbortSignal`로 정리한다.

## 7. focus와 keyboard

- 모든 keyboard focus는 visible indicator를 가진다.
- sticky header가 focus target을 가리지 않도록 scroll padding을 제공한다.
- modal dialog open 시 내부로 focus를 이동한다.
- `Tab`과 `Shift+Tab`은 modal 안에서 순환한다.
- `Escape`는 modal을 닫고 invoker로 focus를 돌린다.
- tabs는 Left/Right, Home/End를 지원한다.
- horizontal tabs는 Up/Down의 page scroll을 가로채지 않는다.
- focus만으로 route 이동, dialog open 또는 form submit을 실행하지 않는다.

세부 keyboard 계약은 WAI-ARIA Authoring Practices를 적용한다.

## 8. 초기 Component catalog

| 영역 | Component |
|---|---|
| primitive | SkipLink, Icon, Link, Button, VisuallyHidden |
| shell | DocsShell, SiteHeader, PrimarySidebar, SidebarGroup |
| content | Breadcrumbs, ArticleDocument, Callout, CodeBlock, CodeTabs, CardGrid, PrevNext |
| navigation | OnPageToc, SearchDialog, MobileNavDialog |
| control | ThemeSwitch, CopyButton |
| WebGL | WebglSurface, WebglExample |

Component 추가 순서:

1. 실제 consumer와 semantic root를 기록한다.
2. Props·Slot·state·keyboard·no-JS 계약을 작성한다.
3. contract catalog에 등록한다.
4. PHP template과 SCSS를 구현한다.
5. 필요한 경우에만 Controller를 추가한다.
6. unit·browser·accessibility test를 추가한다.
7. API 문서와 Prompt를 갱신한다.

## 9. 검증

- literal tag 허용 경로 검사
- raw HTML API 검사
- duplicate ID와 broken ARIA relation 검사
- landmark·heading outline 검사
- keyboard-only browser test
- JS-off browser test
- reduced-motion test
- axe serious/critical 0건

## 10. 공식 근거

- https://html.spec.whatwg.org/multipage/sections.html
- https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- https://www.w3.org/WAI/WCAG22/Understanding/focus-visible
