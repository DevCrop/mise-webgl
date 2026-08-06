---
id: mise.docs.document-compiler
title: MISE Document Compiler
description: Markdown을 검증된 Component Model과 탐색 index로 만드는 build 계약
locale: ko
route: /ko/document-compiler
section: foundation
order: 35
status: rc
---

# MISE Document Compiler

## 1. 목적

MISE 문서 앱은 canonical package Markdown을 복사하지 않는다. Build compiler가
source를 검증한 뒤 raw HTML이 없는 Component Model과 탐색용 index를 생성한다.
PHP MVC runtime은 생성된 JSON만 읽고 source Markdown을 production에 포함하지 않는다.

```text
packages/mise/docs/*.md
  → front matter validation
  → restricted Markdown AST
  → typed Component Model
  → nav / TOC / search / sitemap route model
  → API / Component / token index
  → checksum manifest
```

## 2. front matter

모든 canonical 문서는 파일 첫 줄부터 다음 scalar를 선언한다. 알 수 없는 field,
중복 field와 빈 값은 build error다.

| field | 형식 | 책임 |
|---|---|---|
| `id` | `mise.docs.*` | 영구 document identity |
| `title` | text | page title과 검색 label |
| `description` | text | page summary |
| `locale` | BCP 47 subset | 현재 `ko` |
| `route` | absolute path | hosting origin과 무관한 route |
| `section` | slug | navigation group |
| `order` | non-negative integer | 안정적인 navigation 순서 |
| `status` | `draft`, `rc`, `stable`, `deprecated` | 공개 lifecycle |

`id`와 `route`는 전체 문서 집합에서 유일해야 한다. 파일명은 이동할 수 있지만
공개 `id`와 `route` 변경은 migration으로 취급한다.

## 3. 허용 block

| Markdown block | Component Model |
|---|---|
| heading | `Heading` |
| paragraph | `Paragraph` |
| ordered/unordered list | `List` |
| pipe table | `DataTable` |
| block quote | `Callout` |
| fenced code | `CodeBlock` + line token |

문서에는 level-one heading이 정확히 하나 있어야 한다. 같은 문서에서 normalize된
heading ID가 중복되면 build를 중단한다. inline text, code와 link는 typed token으로
분리하며 Markdown image는 향후 `Asset` Component 계약 전까지 허용하지 않는다.

## 4. 금지 입력

- raw HTML
- MDX `import`, `export`, expression
- `javascript:` 등 실행 URL과 protocol-relative URL
- docs root 밖으로 탈출하는 상대 경로
- 존재하지 않는 파일과 heading anchor
- 닫히지 않은 code fence

사용자가 입력한 Markdown을 runtime에서 compile하지 않는다. Compiler는 repository
build 단계에서만 실행하며 PHP View에 Markdown parser 또는 raw HTML API를 제공하지
않는다.

## 5. 생성물

| artifact | 소비자 |
|---|---|
| `documents/*.json` | PHP View Component 조립 |
| `navigation.json` | Router·Controller·primary navigation |
| `search-index.json` | client search Controller |
| `sitemap.json` | hosting adapter가 absolute URL로 변환할 route model |
| `api-index.json` | package export reference |
| `component-index.json` | Component contract catalog |
| `token-index.json` | public CSS/Sass token reference |
| `build-manifest.json` | file별 SHA-256 재현성 증거 |

`sitemap.json`은 origin을 소유하지 않는다. 독립 hosting adapter가 배포 origin을
주입해 최종 sitemap 형식으로 변환한다.

## 6. MVC 경계

- Model repository인 `DocumentCatalog`만 생성 JSON을 읽는다.
- Router는 base path와 path 문법만 검증한다.
- Controller는 route에 대응하는 immutable record와 navigation을 선택한다.
- View는 Component tree만 만들고 Markdown과 request를 해석하지 않는다.
- template만 HTML tag를 출력한다.

## 7. 결정성과 Gate

정렬은 locale 영향이 없는 `order → id` 또는 stable file key를 사용한다. Build time,
절대 source path와 환경별 값은 생성물에 기록하지 않는다. 같은 source를 두 번
compile한 `build-manifest.json`과 index가 byte 단위로 같아야 한다.

검증 항목:

- front matter schema PASS
- raw HTML·MDX 0건
- duplicate document/heading ID 0건
- broken·unsafe link 0건
- Component Model 외 HTML payload 0건
- API·Component·token index 누락 0건
- production source Markdown 0건
- repeated build hash diff 0건

## 8. 문서 추가 절차

1. 이 schema의 front matter와 하나의 `h1`을 작성한다.
2. [`README`](./README.md)의 소유권 표와 탐색 지도를 갱신한다.
3. relative link와 heading anchor를 compiler로 검증한다.
4. 필요한 새 block은 먼저 Component contract·PHP template·SCSS·test를 추가한다.
5. 생성 index와 production exclusion test를 통과시킨다.

Markdown 문법 기준은 [CommonMark specification](https://spec.commonmark.org/)을
참고하되 MISE compiler는 이 문서에 명시한 제한 subset만 공개 계약으로 제공한다.
