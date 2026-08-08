# PUBLISHING.md — 배포·버전 관리

## 채널 역할

| 채널 | URL | 역할 |
|---|---|---|
| GitHub | https://github.com/DevCrop/mise-webgl | 소스, PR, Actions, Releases |
| GitHub Pages | https://devcrop.github.io/mise-webgl/ | 문서 읽기 (static HTML) |
| npm | https://www.npmjs.com/package/mise-webgl | runtime 설치 (`mise-webgl`) |
| Changelog | [`packages/mise/CHANGELOG.md`](packages/mise/CHANGELOG.md) | 버전별 변경 기록 |

## Publish 대상

| Package | npm name | 상태 | 현재 버전 |
|---|---|---|---|
| WebGL core | `mise-webgl` | **public** (`MIT`) | `0.2.2` |
| UI | `mise-ui` | workspace only | — |
| PHP | `mise-php` | workspace only | — |

## 버전 관리 (Changesets)

semver는 Changesets가 소유한다. 손으로 `package.json` version을 올리지 않는다.

### 일상 흐름

1. 기능/수정 커밋과 함께 `npm run changeset`으로 intent 기록  
   - patch: docs, fix, 비공개 내부 정리  
   - minor: 호환 유지 기능 추가  
   - major: 공개 API / lifecycle breaking
2. `main`에 merge되면 `release.yml`이 **Version Packages** PR을 연다  
   (`chore: version packages` — CHANGELOG + version bump)
3. 그 PR을 merge하면:
   - `changeset publish` → npm `mise-webgl@x.y.z`
   - GitHub Release 생성
   - `docs.yml`이 Pages를 latest로 갱신

### Host pin 정책

| 환경 | 정책 | 예시 |
|---|---|---|
| production | exact | `"mise-webgl": "0.2.2"` |
| development | caret + lockfile | `"^0.2.2"` |
| automation | Dependabot/Renovate + Host CI | PR로 bump |

### Published timeline

| Version | Tag / Release | 내용 |
|---|---|---|
| `0.2.2` | [mise-webgl@0.2.2](https://github.com/DevCrop/mise-webgl/releases/tag/mise-webgl%400.2.2) | Vite CSS types 문서 |
| `0.2.1` | [mise-webgl@0.2.1](https://github.com/DevCrop/mise-webgl/releases/tag/mise-webgl%400.2.1) | Getting Started |
| `0.2.0` | [v0.2.0](https://github.com/DevCrop/mise-webgl/releases/tag/v0.2.0) | 첫 registry publish |

## 로컬 검증 (publish 전)

```bash
make verify
make package
npm run verify:host-consumer
npm run build:docs   # 로컬 PHP toolchain 필요; CI Docs가 공식 게이트
```

## npm 인증

| 방식 | 상태 | 설명 |
|---|---|---|
| Trusted Publishing (OIDC) | 권장 목표 | [package access](https://www.npmjs.com/package/mise-webgl/access)에 `DevCrop/mise-webgl` + `release.yml` |
| `NPM_TOKEN` secret | 현재 폴백 | GitHub Secrets에만 보관. 채팅·커밋 금지 |

토큰 운영·노출 대응: [`SECURITY.md`](SECURITY.md)

## 소비자 설치

```bash
npm install mise-webgl@0.2.2 three
```

| 문서 | URL |
|---|---|
| Getting Started | https://devcrop.github.io/mise-webgl/ko/getting-started/ |
| Markdown 정본 | [`packages/mise/docs/GETTING-STARTED.md`](packages/mise/docs/GETTING-STARTED.md) |
| Adoption | [`packages/mise/docs/ADOPTION.md`](packages/mise/docs/ADOPTION.md) |
| 참조 Host | [`examples/host-consumer`](examples/host-consumer) |

## 문서 배포

| Artifact | 위치 |
|---|---|
| Markdown 정본 | `packages/mise/docs/` (npm tarball에도 포함) |
| Pages build | `apps/mise-docs` → `docs.yml` |
| Pages base path | `/mise-webgl` |

저장소·Pages·secret 설정: [`REPO_SETUP.md`](REPO_SETUP.md)
