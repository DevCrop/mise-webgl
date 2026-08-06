# mise-php

MISE HTML Component를 PHP 8.2 SSR에서 조립하기 위한 framework-neutral package다.
Composer나 특정 MVC framework를 요구하지 않고 `bootstrap.php`를 공개 entry로 둔다.

현재 RC는 `Component`, immutable `Props`와 Component-only `Slot`, `RenderContext`,
explicit `TemplateRegistry`, `PhpComponentRenderer`, UTF-8 `Escaper`, `UrlPolicy`와
기본 Callout·StatusPage·Text·WebglSurface template을 제공한다.

```bash
npm run verify --workspace mise-php
```

설계 경계는 [`docs/README.md`](./docs/README.md)에서 시작한다.
