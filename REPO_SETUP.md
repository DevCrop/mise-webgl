# Repository setup — `devcrop/mise-webgl`

이 저장소는 MISE WebGL 프레임워크 전용 monorepo다. GitHub에서 소스·문서·릴리스를 관리하고 npm으로 `mise-webgl`을 배포한다.

## 1. GitHub repository 생성

```bash
gh repo create DevCrop/mise-webgl --public --source=. --remote=mise-webgl --push
```

기존 `RENEW_PORTFOLIO` remote는 Host 제품용으로 유지하고, framework는 `mise-webgl` remote만 사용한다.

```bash
git remote rename origin portfolio
git remote add mise-webgl https://github.com/DevCrop/mise-webgl.git
git push -u mise-webgl main
```

## 2. GitHub Pages

Settings → Pages → Source: **GitHub Actions**

`docs.yml` workflow가 `main` push마다 latest 문서를 배포한다.

- Latest: `https://devcrop.github.io/mise-webgl/`
- Tag artifact: `docs-tag.yml` uploads `mise-docs-vX.Y.Z` (version-scoped base path build)

## 3. Branch protection

`main` branch:

- Required status check: **Required**
- Require PR before merge (권장)

## 4. npm publish 인증

### 권장: Trusted Publishing (OIDC)

장기 `NPM_TOKEN` 없이 publish한다.

1. [mise-webgl package access](https://www.npmjs.com/package/mise-webgl/access) → **GitHub Actions** trusted publisher 추가
   - Organization/user: `DevCrop`
   - Repository: `mise-webgl`
   - Workflow: `release.yml`
   - Action: **Allow npm publish**
2. `release.yml`은 `id-token: write` 권한과 `registry-url`만 유지하고 `NPM_TOKEN` secret은 제거한다.
3. publish job에서 `npm install -g npm@11`로 OIDC 호환 CLI를 보장한다.

### 임시: GitHub secret `NPM_TOKEN`

Trusted Publishing 전환 전까지만 사용한다.

| Secret | 용도 |
|---|---|
| `NPM_TOKEN` | `release.yml`에서 `mise-webgl` publish |

npm granular access token 발급 시:

- Packages: **Read and write** (All packages 또는 `mise-webgl`만)
- **Bypass 2FA** 활성화 (CI publish 필수)
- 토큰 값은 GitHub Secrets에만 저장하고 채팅·로그·커밋에 남기지 않는다
- write 토큰은 7일 만료 → Trusted Publishing으로 이전

```bash
gh secret set NPM_TOKEN --repo DevCrop/mise-webgl
# 프롬프트에 토큰 붙여넣기 (명령줄 인자로 전달하지 않음)
```

토큰 노출 시: npm에서 즉시 revoke → 새 토큰 발급 → secret 갱신.

## 5. Changesets bot (선택)

`.github/workflows/release.yml`은 Changesets action을 사용한다. `NPM_TOKEN`과 `GITHUB_TOKEN` 권한만으로 Version Packages PR을 자동 생성할 수 있다.
