# Docker·카페24 배포

## 1. 보장 범위

로컬 Docker는 다음 production 계약을 고정한다.

- PHP 8.2 + Apache `mod_php`
- `php.ini-production`, OPcache, 오류 화면 비활성화
- 웹루트 `/var/www/app/public`
- Vite production build만 제공
- DB·Composer·Node production runtime 없음
- read-only container filesystem과 HTTP healthcheck

카페24 공식 문서는 PHP 8.2 지원과 기본 index 경로 `/www/index.php`를 확인해 준다. 다만 공유 웹호스팅의 OS, Apache minor version, 허용 모듈과 PHP patch version은 계정별로 달라질 수 있다. 따라서 Docker는 application 계약을 재현하지만 카페24 내부 서버 전체와 byte-for-byte 동일하다고 주장하지 않는다.

배포 전 나의서비스관리에서 실제 계정의 PHP가 8.2인지 확인한다. SSH 사용 가능 계정이라면 카페24가 안내하는 PHP 8.2 CLI 경로 `/usr/local/php82/bin/php`로 `phpversion()`을 확인할 수 있다.

## 2. 로컬 production 실행

Docker Desktop을 실행한 뒤:

```bash
make up
```

- URL: `http://localhost:8080`
- 상태: `make ps`
- 로그: `make logs`
- 종료: `make down`

`make up`은 소스 bind mount 없이 image를 다시 build한다. 따라서 HMR 개발 서버가 아니라 실제 배포 bundle과 PHP 설정을 확인한다.

포트 충돌 시:

```bash
PORT=18080 make up
```

Windows PowerShell에서는:

```powershell
$env:PORT = "18080"
make up
```

## 3. 카페24 패키지

```bash
make package
```

결과:

```text
.release/cafe24/
├─ www/
│  ├─ index.php
│  ├─ .htaccess
│  └─ build/
├─ app/
│  └─ resources/
│     ├─ data/
│     └─ views/
├─ RELEASE.json
├─ manifest.sha256
└─ deploy.sftp
```

- `www/`: 카페24 공개 웹루트
- `app/`: 웹루트 밖 PHP view와 JSON
- `manifest.sha256`: 업로드 대상 파일 무결성
- `deploy.sftp`: GitHub Actions가 사용하는 비파괴 업로드 순서

`index.php`는 새 app·asset을 먼저 올린 뒤 마지막에 교체된다. workflow는 기존 hashed asset을 자동 삭제하지 않는다. 새 배포 확인 후 오래된 asset만 별도 정리한다.

## 4. 최초 수동 업로드

1. 카페24 FTP/SFTP 접속정보와 PHP 8.2를 확인한다.
2. 원격 계정 root에 `.release/cafe24/app`을 업로드한다.
3. `.release/cafe24/www`의 **내용**을 원격 `/www`에 업로드한다.
4. 디렉터리 755, 파일 644를 확인한다.
5. HTTPS URL과 브라우저 console을 확인한다.
6. 새 배포물을 별도 로컬 위치에 백업한다.

`resources`, `node_modules`, `.git`, `.github`, 원본 TS/SCSS를 `/www`에 올리지 않는다.

## 5. DB 정책

현재 데이터는 `resources/data/portfolio.json` 하나가 원본이다. 다음 조건에서는 JSON을 유지한다.

- 관리자 없이 Git으로만 수정
- 한 명의 작업자
- 동시 write 없음
- 개인정보·주문·결제·회원 상태 없음

관리자 편집, 동시 write, 검색/필터 대량화, 고객정보 또는 audit 요구가 생기면 그 변경에서 DB와 인증·backup·migration을 함께 설계한다. 현재 Docker와 카페24 배포에는 DB service와 credential이 없다.

## 6. 공식 근거

- [카페24 PHP 8.2 지원과 `www` 설치 위치](https://help.cafe24.com/faq/web-hosting/introduce/setup-management/autobahn-hosting-auto-install/)
- [카페24 기본 `/www/index.php`](https://help.cafe24.com/faq/web-hosting/introduce/connection-error/site_not_loading_error_guide/)
- [카페24 FTP/SFTP 접속](https://help.cafe24.com/faq/web-hosting/introduce/setup-management/ftp_sftp_connection_filezilla/)
- [카페24 PHP 8.2 CLI 경로](https://help.cafe24.com/faq/wordpress/managed-wordpress/ftp-db/wp_cli_usage_managed_wordpress)
- [PHP Docker Official Image](https://hub.docker.com/_/php/)
- [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Compose healthcheck](https://docs.docker.com/reference/compose-file/services/#healthcheck)
