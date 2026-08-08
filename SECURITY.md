# SECURITY.md — credential hygiene

## npm publish

| Rule | Detail |
|---|---|
| Prefer OIDC | Configure [Trusted Publishing](https://www.npmjs.com/package/mise-webgl/access) for `DevCrop/mise-webgl` + `release.yml`, then remove `NPM_TOKEN` from GitHub Secrets |
| No long-lived tokens in git | Never commit `.npmrc`, `.env`, or token strings |
| Rotate on exposure | Revoke on npm → `gh secret set NPM_TOKEN --repo DevCrop/mise-webgl` (paste at prompt, not CLI args) → re-run Release workflow |
| Scope minimally | Granular token: `mise-webgl` only, bypass 2FA only while OIDC is not configured |

## GitHub

- Secret scanning and push protection: enabled on `DevCrop/mise-webgl`
- Dependabot: `.github/dependabot.yml` (npm + GitHub Actions, weekly)
- `NPM_TOKEN` is the only required repository secret for release automation today

## Local development

```bash
# Use user-level auth only — never project-root .npmrc with tokens
npm login
```

See also: [`PUBLISHING.md`](PUBLISHING.md), [`REPO_SETUP.md`](REPO_SETUP.md)
