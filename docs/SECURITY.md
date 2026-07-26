# Security contract

## 1. 공개 surface

| Surface | 계약 |
|---|---|
| `GET /` | 공개, 인증 없음, HTML, JSON read-only SSR |
| `/build/*` | content-hashed 정적 CSS/JS, 장기 immutable cache |
| `/assets/*` | 향후 GLB·이미지 정적 asset |

POST, upload, form 처리, session, cookie, 인증, webhook, API와 DB write는 없다. 정의되지 않은 기능을 PHP나 n8n으로 우회 추가하지 않는다.

## 2. 데이터

- `portfolio.json`에는 공개 가능한 포트폴리오 콘텐츠만 넣는다.
- 고객 개인정보, secret, token, 주소, 전화번호, 비공개 계약정보를 넣지 않는다.
- HTML 출력은 `escape()`를 통과한다.
- 외부 URL을 추가할 경우 HTTP/HTTPS allow-list 검증을 함께 추가한다.

## 3. HTTP

production은 다음을 적용한다.

- CSP: self origin 기본, object 차단, framing 차단
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- strict-origin referrer policy
- camera, microphone, geolocation 비활성화
- index `no-store`, hashed asset immutable cache
- directory listing과 dotfile HTTP 접근 차단

카페24에서 `.htaccess` header module이 제한되더라도 PHP가 HTML 응답의 핵심 보안 header를 다시 설정한다.

## 4. 오류와 log

- 사용자에게 stack, 파일 경로와 exception message를 노출하지 않는다.
- production log는 고정 event `bootstrap_failed`만 남긴다.
- JSON 원문, 개인정보, secret과 SFTP 정보를 log에 남기지 않는다.

## 5. Container

- production image는 PHP/Apache와 필요한 PHP/view/JSON/build 파일만 포함한다.
- source는 root 소유, runtime filesystem은 read-only다.
- `no-new-privileges`를 사용한다.
- PHP version과 Node builder는 digest로 고정한다.
- production PHP 설정과 OPcache를 사용한다.

## 6. 배포 secret

- GitHub Environment secret만 사용한다.
- private key와 known_hosts를 artifact에 포함하지 않는다.
- PR code에서 production secret workflow를 실행하지 않는다.
- host key mismatch를 우회하지 않는다.
- 배포 key는 가능하면 해당 계정·경로 전용으로 만들고 정기 회전한다.

## 7. 출시 gate

```bash
make verify
make up
make browser
make package
```

추가 확인:

- dependency audit high 이상 0
- PHP 8.2와 PHP lint
- Docker health `healthy`
- `/` HTTP 200
- CSP/security/cache header
- `.release`에 secret과 개발 source 없음
- 카페24 HTTPS와 실제 기기 smoke test

## 8. 공식 근거

- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [PHP configuration](https://www.php.net/manual/en/configuration.file.php)
- [PHP OPcache](https://www.php.net/manual/en/book.opcache.php)
- [Docker build best practices](https://docs.docker.com/build/building/best-practices/)
- [GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use)
