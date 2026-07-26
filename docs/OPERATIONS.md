# 운영 runbook

## 1. 로컬 상태 확인

```bash
make ps
make logs
docker compose exec web php -v
docker compose exec web php -i
```

정상 기준:

- container `healthy`
- PHP `8.2.x`
- `http://localhost:8080/` 200
- console uncaught error 0
- 가로 overflow 0
- WebGL 실패 시에도 HTML 콘텐츠 표시

## 2. `make up` 실패

1. Docker Desktop Linux engine이 실행 중인지 확인한다.
2. `docker version`에서 Client와 Server가 모두 출력되는지 확인한다.
3. 8080 포트 충돌을 확인하거나 `PORT=18080 make up`을 사용한다.
4. `docker compose config --quiet`을 실행한다.
5. `docker compose build --no-cache web`로 base image와 build를 재검증한다.
6. `make logs`에서 첫 오류만 추적한다.

## 3. 화면은 열리지만 500

1. `public/build/.vite/manifest.json` 존재 여부
2. JSON UTF-8 parse 여부
3. `resources/views`와 `resources/data` 읽기 권한
4. container의 `PORTFOLIO_APP_ROOT=/var/www/app`
5. 카페24의 `/app/resources`와 `/www/build/.vite` 업로드 여부

production 화면에는 상세 오류를 표시하지 않는다. 로컬 build/lint로 원인을 재현한다.

## 4. 카페24 배포 후 점검

1. HTTPS `/` 200
2. 응답의 PHP version 노출 없음
3. CSP, nosniff, framing, referrer header
4. hashed JS/CSS 200과 장기 cache
5. Chrome·Safari·Firefox console error 0
6. Android/iOS 실제 기기에서 safe area와 주소창 resize
7. 카페24 사용량과 error log

## 5. Rollback

- 이전 정상 commit의 CI artifact를 사용한다.
- hash 검증 후 app/assets/index 순서로 다시 업로드한다.
- index를 임의 편집해 복구하지 않는다.
- rollback 뒤 health URL과 브라우저 smoke test를 다시 수행한다.

## 6. Backup

- source와 JSON 원본: Git
- 배포물: GitHub Actions artifact 14일
- 운영 직전/중요 release: artifact를 별도 보관
- 카페24 원격 파일은 배포 전 수동 backup

DB가 없으므로 DB backup은 없다. 향후 사용자 write나 관리자 기능을 추가하면 별도 영속 데이터 backup/restore 검증이 출시 조건이 된다.

## 7. 공식 근거

- [Docker Compose healthcheck](https://docs.docker.com/reference/compose-file/services/#healthcheck)
- [Docker Compose 상태 의존성](https://docs.docker.com/compose/how-tos/startup-order/)
- [카페24 HTTP 오류 점검](https://help.cafe24.com/faq/web-hosting/introduce/connection-error/http-response-code-checklist)
- [카페24 FTP/SFTP](https://help.cafe24.com/faq/web-hosting/introduce/setup-management/ftp_sftp_connection_filezilla/)
