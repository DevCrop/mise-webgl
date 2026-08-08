# Repository setup — `DevCrop/mise-webgl`

MISE WebGL 프레임워크 전용 monorepo 설정과 **현재 운영 주소** 목록이다.

## Canonical map

| 리소스 | URL |
|---|---|
| GitHub repository | https://github.com/DevCrop/mise-webgl |
| Actions | https://github.com/DevCrop/mise-webgl/actions |
| Releases | https://github.com/DevCrop/mise-webgl/releases |
| npm | https://www.npmjs.com/package/mise-webgl |
| Docs (Pages) | https://devcrop.github.io/mise-webgl/ |
| Getting Started | https://devcrop.github.io/mise-webgl/ko/getting-started/ |
| npm package settings | https://www.npmjs.com/package/mise-webgl/access |
| npm tokens (계정) | https://www.npmjs.com/settings/ednyang/tokens |

## Remotes (이 워크스페이스)

| Remote | URL | 용도 |
|---|---|---|
| `mise-webgl` | `https://github.com/DevCrop/mise-webgl.git` | **framework push 대상** |
| `origin` | `https://github.com/DevCrop/RENEW_PORTFOLIO.git` | 구 Host 제품 remote (framework 배포에 쓰지 않음) |

```bash
git push mise-webgl main
```

## 1. GitHub repository

이미 생성됨: `DevCrop/mise-webgl` (public).

신규 복제 시:

```bash
gh repo create DevCrop/mise-webgl --public --source=. --remote=mise-webgl --push
```

## 2. GitHub Pages

Settings → Pages → Source: **GitHub Actions**

| Workflow | 결과 |
|---|---|
| `docs.yml` | `main`마다 latest 문서 → https://devcrop.github.io/mise-webgl/ |
| `docs-tag.yml` | tag용 docs artifact (`mise-docs-vX.Y.Z`) |

## 3. Branch / permissions

권장:

- `main` required checks: CI
- Require PR before merge (권장)
- Actions: read/write (Release가 version PR·publish 수행)

## 4. npm publish 인증

### 권장: Trusted Publishing (OIDC)

1. https://www.npmjs.com/package/mise-webgl/access  
2. GitHub Actions trusted publisher:
   - Organization/user: `DevCrop`
   - Repository: `mise-webgl`
   - Workflow: `release.yml`
   - Allow **npm publish**
3. `NPM_TOKEN` secret 제거 후 OIDC-only로 전환 (`npm@11` 필요)

### 현재 폴백: `NPM_TOKEN`

| Secret | 용도 |
|---|---|
| `NPM_TOKEN` | `release.yml` npm publish |

```bash
gh secret set NPM_TOKEN --repo DevCrop/mise-webgl
# 프롬프트에만 붙여넣기
```

세부: [`SECURITY.md`](SECURITY.md), [`PUBLISHING.md`](PUBLISHING.md)

## 5. Version automation

`.github/workflows/release.yml` + Changesets:

1. `npm run changeset` on feature branch  
2. merge to `main` → Version Packages PR  
3. merge Version PR → npm + GitHub Release  

현재 latest: **`mise-webgl@0.2.2`**

## 6. Local toolchain

| Tool | Version |
|---|---|
| Node | `22.22.2` |
| npm | `10.9.2` |
| PHP (docs export) | `8.2` (CI) |

```bash
make setup
make verify
```
