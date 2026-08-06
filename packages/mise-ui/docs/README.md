# mise-ui documentation

## Scope

- Component contract와 JSON Schema
- progressive enhancement DOM Controller lifecycle
- Sass token·`rem()`·`fluid()`·responsive/focus/viewport mixin
- `abstract/base/layouts/components/pages` 책임 구조와 theme runtime token
- DocsShell·navigation·content·control style과 Tabs ARIA Controller

## Boundary

- PHP와 WebGL runtime을 import하지 않는다.
- DOM 문자열 writer를 사용하지 않는다.
- Component markup과 Controller state는 공개 selector 계약으로만 연결한다.

## Public entries

- package root: Controller와 Component contract
- `styles.scss`: Sass source entry
- `styles.css`: compiled CSS entry
- `tokens.scss`: theme·font·fluid runtime token mixin
- `component-contract.schema.json`: language-neutral schema

제품군의 canonical 규칙은 MISE Web Foundation의
`HTML-COMPONENTS.md`와 `SCSS-SYSTEM.md`가 소유한다.
