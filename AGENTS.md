# AGENTS.md — Portfolio Lite

## Scope

이 저장소는 PHP 8.2 SSR + Vite TypeScript/SCSS + Three.js/WebGL로 구성된 단일 페이지 포트폴리오다. 콘텐츠 원본은 `resources/data/portfolio.json`이다. 데이터베이스, 관리자, 인증, Composer와 production Node 런타임은 도입하지 않는다.

## Commands

| 목적 | 명령 |
|---|---|
| 의존성 설치 | `make setup` |
| HMR 개발 | `make dev` |
| production형 Docker 실행 | `make up` |
| 종료 | `make down` |
| 로그 | `make logs` |
| TS·단위·build 검사 | `make verify` |
| 컨테이너 브라우저 검사 | `make browser` |
| 카페24 패키지 | `make package` |
| Compose 검사 | `make config` |

## Runtime

```text
GET /
  → public/index.php
  → resources/data/portfolio.json
  → resources/views/layouts/app.php
  → public/build/.vite/manifest.json
  → PHP SSR HTML + hashed CSS/JS

resources/ts/app.ts
  → BrowserApplication
  → Barba lifecycle + Lenis + GSAP + Swiper
  → one persistent Three.js renderer
```

## Boundaries

- PHP가 HTML과 JSON 읽기를 소유한다. TS는 DOM lifecycle, motion, carousel, WebGL만 소유한다.
- Sass entry는 `resources/scss/style.scss`다. 8개 파일의 `abstract/base/layouts/components/pages` 구조와 cascade layer 순서를 유지한다.
- 새 SCSS partial은 현재 DOM/TS consumer와 독립 책임이 있을 때만 추가하고 `scripts/validate-project.mjs` allow-list와 frontend 문서를 같은 변경에서 갱신한다.
- `public/`만 웹루트다. `resources/data`와 `resources/views`는 공개 URL 아래에 두지 않는다.
- 콘텐츠 변경은 JSON으로 처리한다. 실제 동시 쓰기, 검색, 인증 또는 사용자 데이터 요구가 생기기 전에는 DB를 추가하지 않는다.
- `public/build/`과 `.release/`는 생성물이다. 직접 수정하거나 Git에 커밋하지 않는다.
- 루트 `index.html`과 `src/`를 다시 만들지 않는다. entry는 `public/index.php`와 `resources/ts/app.ts`다.
- 새 library는 현재 consumer와 측정 가능한 가치가 있을 때만 추가한다.
- TypeScript는 `strict`, `noUnusedLocals`, `noUnusedParameters`를 유지하고 bootstrap 비동기 실패를 고정 event code로 처리한다.
- Three.js renderer는 하나만 유지하고 geometry, material, texture, listener, observer, RAF를 owner가 `dispose()`한다.
- Blender asset은 GLB를 기본으로 하며 실제 모델이 생기기 전에는 runtime import하지 않는다.
- 모바일은 `svh`, `dvh`, safe-area, reduced-motion, coarse-pointer/native-scroll 경계를 유지한다.

## Delivery

- Docker base는 `Dockerfile`의 PHP 8.2/Node digest를 사용한다. tag 또는 digest 변경은 build·browser·container 검증과 함께 수행한다.
- production image에는 Node, npm, 원본 TS/SCSS, 테스트와 문서를 포함하지 않는다.
- 카페24 패키지는 `.release/cafe24/www`와 `.release/cafe24/app`만 배포한다. `www/index.php`는 마지막에 전송한다.
- 카페24 배포 workflow는 `main`, GitHub Environment 승인, 고정 host key와 SFTP key가 모두 준비된 경우에만 수동 실행한다.
- GitHub Actions는 최소 권한과 full commit SHA 고정을 유지한다. secret을 workflow, log, artifact, JSON에 넣지 않는다.
- branch protection의 required status check는 `Required` 하나로 설정한다.

## Security

- 공개 surface는 `GET /`과 hashed assets뿐이다. 인증, upload, webhook, form 처리와 DB write는 없다.
- production 오류는 고정 사용자 메시지와 고정 log event만 사용한다. 경로·stack·원문 exception을 노출하지 않는다.
- CSP, framing 차단, MIME sniffing 차단, referrer policy와 권한 policy를 유지한다.
- `resources/`, `.git`, `.github`, `node_modules`, `.release`를 웹루트에 업로드하지 않는다.

## Change discipline

- 시작 시 현재 파일과 참조를 `rg`로 확인하고 사용자 변경을 보존한다.
- 구조, runtime, Docker, CI 또는 배포 방식 변경 시 관련 코드와 `README.md`, `docs/DEPLOYMENT.md`, `docs/GITHUB-AUTOMATION.md`, `docs/SECURITY.md`를 같은 변경에서 갱신한다.
- 제거 시 import, type, selector, test, docs와 package 참조까지 제거하고 잔존 참조 0을 확인한다.
- PHP·JSON·Markdown·TS·SCSS는 UTF-8을 유지하고 patch 방식으로 편집한다.

## Required verification

```bash
make verify
docker compose config --quiet
make up
make browser
make package
```

추가로 PHP 8.2 확인, 전체 PHP lint, HTTP 200, security/cache header, JSON parse, 배포 manifest hash를 검증한다.

## Official basis

- PHP official image: https://hub.docker.com/_/php/
- Docker Compose services/healthcheck: https://docs.docker.com/reference/compose-file/services/
- Docker multi-stage build: https://docs.docker.com/build/building/multi-stage/
- GitHub Actions secure use: https://docs.github.com/en/actions/reference/security/secure-use
- GitHub workflow artifacts: https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts
- 카페24 PHP 8.2와 `www` 설치 위치: https://help.cafe24.com/faq/web-hosting/introduce/setup-management/autobahn-hosting-auto-install/
- 카페24 기본 index 경로: https://help.cafe24.com/faq/web-hosting/introduce/connection-error/site_not_loading_error_guide/
- 카페24 SFTP 안내: https://help.cafe24.com/faq/web-hosting/introduce/setup-management/ftp_sftp_connection_filezilla/
