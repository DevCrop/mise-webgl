# MISE WebGL Monorepo

Three.js/WebGL 경험을 Scene 단위로 구성하고 Scroll·Auto 진행, DOM motion, 자원 수명과 단일 frame loop를 통제하는 **MISE** 프레임워크 저장소다.

**현재 배포:** `mise-webgl@0.2.2` (npm latest)

## Canonical URLs

| 무엇 | 주소 |
|---|---|
| GitHub (이 프레임워크 repo) | https://github.com/DevCrop/mise-webgl |
| Actions (CI / Docs / Release) | https://github.com/DevCrop/mise-webgl/actions |
| Releases | https://github.com/DevCrop/mise-webgl/releases |
| npm package | https://www.npmjs.com/package/mise-webgl |
| 문서 홈 (GitHub Pages) | https://devcrop.github.io/mise-webgl/ |
| Getting Started (다른 프로젝트용) | https://devcrop.github.io/mise-webgl/ko/getting-started/ |
| Adoption | https://devcrop.github.io/mise-webgl/ko/adoption/ |
| Examples | https://devcrop.github.io/mise-webgl/ko/examples/ |
| Docs index | https://devcrop.github.io/mise-webgl/ko/docs/ |
| Security / secrets | [`SECURITY.md`](SECURITY.md) |
| Publish / versioning | [`PUBLISHING.md`](PUBLISHING.md) |
| Repo setup | [`REPO_SETUP.md`](REPO_SETUP.md) |

> Host 제품 repo(`RENEW_PORTFOLIO`)와 framework repo(`mise-webgl`)는 분리한다.  
> 이 워크스페이스의 push remote는 `mise-webgl` → `DevCrop/mise-webgl`이다.

## Packages

| Package | 경로 | npm | 역할 |
|---|---|---|---|
| `mise-webgl` | `packages/mise` | **published** | WebGL kernel, lifecycle, adapters |
| `mise-ui` | `packages/mise-ui` | workspace only | Component contract, controllers, SCSS |
| `mise-php` | `packages/mise-php` | workspace only | PHP Component renderer |
| `mise-docs` | `apps/mise-docs` | — | 공식 문서 Pages consumer |

## Version history (published)

| Version | 요약 |
|---|---|
| `0.2.2` | Vite CSS 타입 안내 (외부 Host typecheck) |
| `0.2.1` | Getting Started + npm README 소비자 가이드 |
| `0.2.0` | 첫 public npm publish, Pages, Changesets, host-consumer |
| `0.1.0` | changelog baseline (registry에는 `0.2.0`부터 live) |

상세 changelog: [`packages/mise/CHANGELOG.md`](packages/mise/CHANGELOG.md)

## Versioning (어떻게 올리는지)

```text
코드 변경
  → npm run changeset          # patch / minor / major 기록
  → main merge
  → Release workflow가 "Version Packages" PR 생성
  → 그 PR merge
  → npm publish + GitHub Release 자동
  → Docs workflow가 Pages 갱신
```

| 환경 | Host가 쓸 pin |
|---|---|
| production | `"mise-webgl": "0.2.2"` exact |
| development | `"^0.2.2"` + lockfile |

전체 절차: [`PUBLISHING.md`](PUBLISHING.md)

## Host에서 쓰기

```bash
npm install mise-webgl@0.2.2 three
```

1. [Getting Started](https://devcrop.github.io/mise-webgl/ko/getting-started/) copy-paste
2. Vite면 `src/vite-env.d.ts`에 `/// <reference types="vite/client" />`
3. 제품 구조는 [Adoption](https://devcrop.github.io/mise-webgl/ko/adoption/)

참조 구현: [`examples/host-consumer`](examples/host-consumer)

## Toolchain

| Tool | Version |
|---|---|
| Node.js | `22.22.2` (`.nvmrc`) |
| npm | `10.9.2` (`packageManager`) |
| TypeScript | `^7.0.2` |
| three (peer) | `^0.185.0` |

```bash
make setup
make verify
```

## Automation

| Workflow | 트리거 | 하는 일 |
|---|---|---|
| `ci.yml` | PR / push | lint, typecheck, package gates |
| `docs.yml` | `main` push | GitHub Pages 문서 배포 |
| `release.yml` | `main` push | Changesets version PR 또는 npm publish |
| Dependabot | weekly | npm + GitHub Actions bump PRs |

## Milestone summary (완료)

1. Framework-only monorepo로 정리 (`mise-webgl` 소유)
2. GitHub repo + Pages + CI/Docs/Release 분리
3. Changesets 기반 semver / CHANGELOG / GitHub Release
4. npm `mise-webgl` public publish (`0.2.0` → `0.2.2`)
5. 외부 Host용 Getting Started 문서 + host-consumer 예제
6. Secret scanning, Dependabot, credential hygiene (`SECURITY.md`)

## Agent rules

[`AGENTS.md`](AGENTS.md)
