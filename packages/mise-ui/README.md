# mise-ui

MISE 제품군의 HTML Component 계약, DOM Controller lifecycle, Sass foundation을
소유하는 독립 package다. WebGL과 PHP runtime에 의존하지 않는다.

현재 RC public entry는 `createMiseUi`, `defineController`, `tabsController`,
`defineComponentContract`, language-neutral Component JSON Schema와
`styles.css`·`styles.scss`·`tokens.scss`다.

```scss
@use "mise-ui/styles.scss";
```

```bash
npm run verify --workspace mise-ui
```

설계 규칙은 [`docs/README.md`](./docs/README.md)에서 시작한다.
