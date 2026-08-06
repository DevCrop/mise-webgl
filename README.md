# MISE WebGL Monorepo

Three.js/WebGL 경험을 Scene 단위로 구성하고 Scroll·Auto 진행, DOM motion, 자원 수명과 단일 frame loop를 통제하는 **MISE** 프레임워크 저장소다.

## Packages

| Package | 경로 | 역할 |
|---|---|---|
| `mise-webgl` | `packages/mise` | WebGL kernel, lifecycle, adapters |
| `mise-ui` | `packages/mise-ui` | Component contract, controllers, SCSS |
| `mise-php` | `packages/mise-php` | PHP Component renderer |
| `mise-docs` | `apps/mise-docs` | 공식 문서 standalone consumer |

## 시작

```bash
make setup
make verify
```

Node `20.19.x`를 사용한다. [`.nvmrc`](.nvmrc) 참고.

release tarball:

```bash
make package
```

## 문서

| 채널 | URL / 위치 |
|---|---|
| 정본 Markdown | [`packages/mise/docs/README.md`](packages/mise/docs/README.md) |
| GitHub Pages | `https://devcrop.github.io/mise-webgl/` |
| npm tarball | `mise-webgl` package `docs/` |

## Host 사용

외부 Host 프로젝트는 npm으로 `mise-webgl`을 설치한다.

```bash
npm install mise-webgl three
```

참조 구현: [`examples/host-consumer`](examples/host-consumer)

- 적용 절차: [`packages/mise/docs/ADOPTION.md`](packages/mise/docs/ADOPTION.md)
- 배포 runbook: [`PUBLISHING.md`](PUBLISHING.md)
- GitHub/Pages/npm 설정: [`REPO_SETUP.md`](REPO_SETUP.md)

## Agent rules

[`AGENTS.md`](AGENTS.md)
