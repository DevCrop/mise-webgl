# GitHub 자동화

## 1. CI

`.github/workflows/ci.yml`은 pull request, `main` push와 수동 실행에서 다음을 수행한다.

1. lockfile 기반 `npm ci --ignore-scripts`
2. dependency audit
3. TypeScript 검사와 21개 단위 테스트
4. Vite production build
5. Compose와 Dockerfile 검사
6. PHP 8.2/Apache container build와 healthcheck
7. 전체 PHP lint와 HTTP 200
8. Chromium·Firefox·WebKit desktop/mobile 24개 E2E
9. 카페24 최소 배포 패키지 생성
10. 14일 보관 artifact 업로드

branch protection에는 `Required` check 하나를 필수로 설정한다. PR workflow에는 secret을 제공하지 않는다. 모든 action은 full commit SHA로 고정하고 workflow 권한은 `contents: read`만 사용한다.

## 2. 카페24 production environment

GitHub repository에 Environment `cafe24-production`을 만든다. 가능하면 required reviewer와 deployment branch `main`만 허용한다.

Environment variables:

| 이름 | 값 |
|---|---|
| `CAFE24_DEPLOY_ENABLED` | 준비 완료 후 `true` |
| `CAFE24_SSH_HOST` | 카페24 접속 host |
| `CAFE24_SSH_PORT` | 보통 SFTP `22`; 계정 안내값 우선 |
| `CAFE24_SSH_USER` | 호스팅 계정 ID |
| `CAFE24_HEALTH_URL` | 실제 production HTTPS origin |

Environment secrets:

| 이름 | 용도 |
|---|---|
| `CAFE24_SSH_PRIVATE_KEY` | 배포 전용 SFTP private key |
| `CAFE24_SSH_KNOWN_HOSTS` | 사전에 검증한 host key 전체 행 |

비밀번호 FTP만 가능한 상품에서는 자동 배포를 활성화하지 않는다. 카페24 공식 안내에서 SFTP/SSH 지원 여부를 계정별로 확인한 뒤 사용한다. host key는 workflow 중 `ssh-keyscan`으로 즉석 신뢰하지 않고 별도 채널로 확인한 값을 secret에 넣는다.

## 3. 배포

Actions → `Deploy Cafe24` → Run workflow를 사용한다.

배포 조건:

- `main` branch
- `CAFE24_DEPLOY_ENABLED=true`
- Environment 승인 완료
- locked install, audit, typecheck, unit test, build 성공
- 고정 host key 검증 성공

전송 순서는 app → hashed assets → `.htaccess` → `index.php`다. `index.php` 교체 전에 실패하면 기존 entry가 유지된다. 업로드 후 `CAFE24_HEALTH_URL`이 2xx가 아니면 workflow가 실패한다.

## 4. Rollback

1. 마지막 정상 CI run의 `cafe24-<commit SHA>` artifact를 받는다.
2. 해당 artifact의 `manifest.sha256`을 검증한다.
3. `deploy.sftp`를 동일한 검증된 SFTP 연결로 실행한다.
4. HTTPS 200, header, console과 주요 화면을 확인한다.
5. 실패 배포 commit과 원인을 기록한다.

공유 웹호스팅에서는 atomic symlink release를 보장할 수 없으므로 이전 artifact 보관이 rollback 기준이다.

## 5. 공식 근거

- [GitHub Actions 보안 강화와 full SHA](https://docs.github.com/en/code-security/tutorials/secure-your-organization/protect-against-threats)
- [최소 `GITHUB_TOKEN` 권한](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions)
- [GitHub Environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
- [Workflow artifacts](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts)
- [Artifact 저장과 공유](https://docs.github.com/en/actions/tutorials/store-and-share-data)
- [카페24 SFTP 지원 범위](https://help.cafe24.com/faq/web-hosting/introduce/setup-management/ftp_sftp_connection_filezilla/)
