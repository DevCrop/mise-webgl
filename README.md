# MISE WebGL Monorepo

Three.js/WebGL 경험을 Scene 단위로 구성하고 Scroll·Auto 진행, DOM motion, 자원 수명과 단일 frame loop를 통제하는 **MISE** 프레임워크 저장소다.

## Packages

| Package | 경로 | 역할 |
|---|---|---|
| `mise-webgl` | `packages/mise` | WebGL kernel, lifecycle, adapters |
| `mise-ui` | `packages/mise-ui` | Component contract, controllers, SCSS |
| `mise-php` | `packages/mise-php` | PHP Component renderer |
| `mise-docs` | `apps/mise-docs` | 공식 문서 standalone consumer |

## Toolchain (Host 정렬용)

Host·CI·이 저장소는 아래 버전을 맞춘다.

| Tool | Version | 근거 |
|---|---|---|
| Node.js | **22.x LTS** (`22.22.2`) | [`.nvmrc`](.nvmrc), [`.node-version`](.node-version) |
| npm | **10.9.x** (`10.9.2`) | [`package.json`](package.json) `packageManager` |
| TypeScript | **7.0.x** (`^7.0.2`) | root / workspace `devDependencies` |
| three (peer) | **^0.185.0** | `mise-webgl` `peerDependencies` |

```bash
nvm use          # .nvmrc → 22.22.2
corepack enable  # packageManager npm@10.9.2
```

## 시작

```bash
make setup
make verify
```

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
