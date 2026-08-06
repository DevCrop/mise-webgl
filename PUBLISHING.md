# PUBLISHING.md — MISE npm 배포

## 개요

| 채널 | 역할 |
|---|---|
| GitHub | 소스, PR, tag, Releases |
| GitHub Pages | 문서 읽기 (`apps/mise-docs` static export) |
| npm | `mise-webgl` runtime 설치 |

## Publish 대상

| Package | npm name | 상태 |
|---|---|---|
| WebGL core | `mise-webgl` | publish-ready (`MIT`, public) |
| UI | `mise-ui` | workspace only |
| PHP | `mise-php` | workspace only |

## 로컬 검증

```bash
make verify
make package
npm run verify:host-consumer
npm run build:docs
```

## Release 흐름

1. 변경마다 `npm run changeset`으로 semver intent 기록
2. `main` merge → `release.yml`이 Version Packages PR 생성
3. Version PR merge → `changeset publish`로 npm 배포 + GitHub Release
4. `docs.yml`이 latest 문서를 Pages에 배포

필수 secret:

| Secret | 용도 |
|---|---|
| `NPM_TOKEN` | npm publish |

## 소비자 설치

```bash
npm install mise-webgl three
```

```ts
import { createMise, defineExperience, defineProvider, defineScene, scroll } from "mise-webgl";
import { ThreeRenderer } from "mise-webgl/three";
import "mise-webgl/styles.css";
```

Host 적용: [`packages/mise/docs/ADOPTION.md`](packages/mise/docs/ADOPTION.md)

## Host 안정성 권장

| 정책 | 용도 |
|---|---|
| exact pin `0.1.0` | production |
| caret `^0.1.0` + lockfile | development |
| Renovate/Dependabot PR | 자동 bump + Host CI gate |

참조 Host: [`examples/host-consumer`](examples/host-consumer)

## 문서 배포

- npm tarball: `packages/mise/docs/`
- GitHub Pages: `npm run build:docs` → `apps/mise-docs/dist/public`
- Pages base path: `/mise-webgl` (`MISE_DOCS_BASE_PATH`)

저장소 생성·Pages·branch protection: [`REPO_SETUP.md`](REPO_SETUP.md)
