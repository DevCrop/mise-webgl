# AGENTS.md — MISE WebGL Monorepo

## Scope

이 저장소는 MISE WebGL 프레임워크와 Web Foundation package family(`mise-webgl`, `mise-ui`, `mise-php`) 및 독립 문서 consumer(`mise-docs`)만 소유한다. Host 제품 Experience·Scene·배포 파이프라인은 이 저장소에 두지 않는다.

## Commands

| 목적 | 명령 |
|---|---|
| 의존성 설치 | `make setup` |
| 전체 검증 | `make verify` |
| mise-webgl tarball | `make package` |
| 정적 문서 build | `make docs` |
| Host consumer 검증 | `npm run verify:host-consumer` |
| Changeset 추가 | `npm run changeset` |

## Runtime ownership

```text
packages/mise/src/Index.ts
  → createMise()
  → MiseBrowserApplication
  → FrameLoop + SceneChanger + optional Adapter ports
  → one persistent Three.js renderer

apps/mise-docs
  → Markdown compiler + PHP SSR + static export for GitHub Pages
```

MISE canonical 문서는 `packages/mise/docs/`가 소유한다. entry는 `packages/mise/docs/README.md`다.

## Boundaries

- `mise-webgl` Kernel은 PHP MVC·범용 UI Component 책임을 넣지 않는다.
- 공개 facade는 `packages/mise/src/Index.ts`, 내부 구현은 `packages/mise/src/kernel`, adapter는 명시적 package subpath다.
- Host Experience·제품 Scene·DOM selector는 소비자 저장소가 소유한다.
- 생성한 listener, RAF, GPU 자원은 생성한 객체가 `dispose()`한다.
- Three.js renderer는 하나만 유지한다.

## Required verification

Node `22.22.x` LTS (`.nvmrc`)에서 실행한다.

```bash
make verify
npm run verify:host-consumer
```

## Change discipline

- 구조·공개 API·publish surface 변경 시 `packages/mise/docs/`와 `PUBLISHING.md`를 같은 변경에서 갱신한다.
- semver 변경은 Changeset으로 기록한다.
- Host 전용 product tree를 framework repo에 다시 추가하지 않는다.
