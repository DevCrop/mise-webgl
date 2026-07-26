# Portfolio Lite

PHP 8.2 SSR과 Vite 기반 TypeScript·SCSS·Three.js를 결합한 JSON-only 단일 페이지 포트폴리오다. 데이터베이스, Composer, 관리자와 production Node 런타임은 없다.

## 가장 빠른 실행

Docker Desktop을 켠 뒤 실행한다.

```bash
make up
```

화면은 `http://localhost:8080`에서 확인한다. 이 컨테이너는 production build가 포함된 PHP 8.2/Apache 이미지이며 소스 bind mount를 사용하지 않는다.

```bash
make logs
make browser
make down
```

## 수정 위치

- 프로필·작품 JSON: `resources/data/portfolio.json`
- PHP entry: `public/index.php`
- PHP view: `resources/views/`
- TypeScript entry: `resources/ts/app.ts`
- Sass 7–1 entry: `resources/scss/style.scss`
- Three.js/WebGL: `resources/ts/graphics/`
- Blender GLB loader: `resources/ts/graphics/assets/BlenderModelLoader.ts`

## 개발과 검증

```bash
make setup
make dev
make watch
make verify
make package
```

- `make dev`: PHP `localhost:8080` + Vite HMR `localhost:5173`
- `make verify`: typecheck, 단위 테스트, production build
- `make package`: `.release/cafe24/`에 `www/`와 비공개 `app/` 배포물을 생성

## 문서

- `AGENTS.md`: 프로젝트 강제 규칙과 검증 명령
- `docs/FRONTEND-BOILERPLATE.md`: 브라우저 구조
- `docs/DEPLOYMENT.md`: Docker와 카페24 배포
- `docs/GITHUB-AUTOMATION.md`: CI와 수동 production 배포
- `docs/SECURITY.md`: 공개 surface와 보안 기준
- `docs/OPERATIONS.md`: 장애 확인과 rollback
- `docs/PERFORMANCE.md`, `docs/DEVICE-MATRIX.md`: 성능·기기 검증
