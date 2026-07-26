# Frontend Rules

## 목표

구조는 작게 유지하되 브라우저 수명주기, WebGL 자원, 모바일 viewport와 오류 복구를 명시적으로 관리한다.

## TypeScript

- `strict`를 유지한다.
- `any`로 브라우저·Three.js 타입 오류를 우회하지 않는다.
- JSON 입력은 `PortfolioData` 계약으로 검사한다.
- import 시점에 listener, renderer와 timer를 생성하지 않는다.
- 생성한 listener, RAF와 GPU 자원은 생성한 객체가 `dispose()`한다.
- 오류 로그에는 토큰, 개인정보, 원본 폼 데이터와 전체 URL query를 넣지 않는다.

## DOM

- SSR이나 별도 프레임워크 없이 정적 HTML shell과 TypeScript 렌더링만 사용한다.
- 대화형 요소는 `button`, 이동은 `a`, 상세 화면은 native `dialog`를 사용한다.
- WebGL은 장식 계층이며 콘텐츠와 탐색의 필수 조건이 아니다.
- 확대를 막는 viewport 설정을 추가하지 않는다.

## Motion

- `prefers-reduced-motion: reduce`에서는 지속 RAF를 중지하고 정적 frame만 표시한다.
- background tab과 BFCache 진입 중 RAF를 중지한다.
- 복귀 시 viewport를 다시 측정하고 필요한 frame만 재개한다.

## Viewport

- 본문 첫 화면은 `svh`를 사용해 모바일 browser toolbar 변화 중 layout jump를 줄인다.
- 실제 보이는 화면 측정이 필요한 runtime에는 `VisualViewport`를 사용한다.
- `viewport-fit=cover` 사용 시 `safe-area-inset-*`를 padding에 반영한다.
- Samsung Internet 또는 iOS toolbar 높이를 고정 pixel로 추정하지 않는다.
- user-agent 대신 viewport, pointer, reduced-motion과 WebGL capability를 기준으로 분기한다.

## 근거

- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport
- https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion
- https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/

