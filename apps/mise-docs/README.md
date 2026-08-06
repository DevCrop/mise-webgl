# MISE Docs

`mise-ui`와 `mise-php`를 실제 consumer로 사용하는 독립 PHP MVC 문서 앱이다.
현재 구현은 Router → Controller → immutable Model → View Component tree → Renderer
경계와 RC compatibility artifact, Prompt 공개 경계를 검증한다.

```bash
npm run verify --workspace mise-docs
```

앱 구현·배포 증거는 [`docs/README.md`](./docs/README.md)에서 시작한다.
