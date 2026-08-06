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

## 4. npm publish secrets

Repository secrets:

| Secret | 용도 |
|---|---|
| `NPM_TOKEN` | `release.yml`에서 `mise-webgl` publish |

npm에서 Automation token을 발급하고 `NPM_TOKEN`으로 등록한다.

## 5. Changesets bot (선택)

`.github/workflows/release.yml`은 Changesets action을 사용한다. `NPM_TOKEN`과 `GITHUB_TOKEN` 권한만으로 Version Packages PR을 자동 생성할 수 있다.
