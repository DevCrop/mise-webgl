# mise-php documentation

## Scope

- PHP 8.2 strict type Component·Props·Slot 계약
- framework-neutral Component renderer 경계
- Composer 없는 명시적 bootstrap

## Boundary

- Controller와 Model은 literal structural HTML을 출력하지 않는다.
- 최종 HTML은 등록된 Component template만 소유한다.
- text·attribute·URL은 renderer 정책에서 context별로 처리한다.
- `mise-webgl` runtime과 제품 request object를 참조하지 않는다.

제품군의 canonical 규칙은 MISE Web Foundation의
`WEB-FOUNDATION.md`와 `HTML-COMPONENTS.md`가 소유한다.
