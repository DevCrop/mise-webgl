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

### npm 인증 (권장 순서)

| 방식 | 상태 | 설명 |
|---|---|---|
| **Trusted Publishing (OIDC)** | 권장 | 장기 토큰 없이 `release.yml`만으로 publish. [npm 설정](https://www.npmjs.com/package/mise-webgl/access)에서 `DevCrop/mise-webgl` + `release.yml` 연결 |
| `NPM_TOKEN` secret | 임시/폴백 | Trusted Publishing 전환 전까지만 사용. **저장소·로그·채팅에 절대 기록하지 않음** |

Trusted Publishing 사용 시 `release.yml`에서 `NPM_TOKEN`/`NODE_AUTH_TOKEN` env를 제거하고, publish job에 `npm install -g npm@11` 단계가 필요하다 (Node 22 기본 npm은 OIDC 미지원).

## 보안 운영

- `.npmrc`, `.env*`는 gitignore 대상이다. 로컬 인증은 사용자 홈 디렉터리 `~/.npmrc`만 사용한다.
- npm granular token은 **bypass 2FA 없이** 발급하지 않는다 (CI publish 실패). bypass 토큰은 7일 만료이므로 Trusted Publishing으로 이전한다.
- 토큰이 노출되면 즉시 npm에서 revoke → GitHub `NPM_TOKEN` 갱신 → Release workflow 재실행.
- GitHub Secret scanning / push protection은 `DevCrop/mise-webgl`에서 활성화되어 있다.
- Dependabot이 npm·GitHub Actions 의존성을 주간 점검한다 (`.github/dependabot.yml`).

필수 secret (Trusted Publishing 미사용 시만):

| Secret | 용도 |
|---|---|
| `NPM_TOKEN` | npm publish (임시) |

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
