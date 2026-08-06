# MISE WebGL

MISE는 Three.js/WebGL 경험을 Scene 단위로 구성하고 Scroll·Auto 진행, DOM motion, 자원 수명과 단일 frame loop를 통제하는 TypeScript 프레임워크다.

## Install

```bash
npm install mise-webgl three
```

문서: https://devcrop.github.io/mise-webgl/

필요한 Adapter만 설치한다.

```bash
npm install gsap lenis @barba/core
npm install --save-dev lil-gui
```

## Imports

```ts
import {
  auto,
  createMise,
  defineExperience,
  defineObjectFactory,
  defineProvider,
  defineScene,
  defineSurface,
  defineTrack,
  defineView,
} from "mise-webgl";
import { ThreeRenderer } from "mise-webgl/three";
import "mise-webgl/styles.css";
```

GLB 로더는 초기 렌더러 번들에서 분리된 `mise-webgl/blender` subpath를 필요할 때
동적 import한다.

```ts
const { BlenderModelLoader } = await import("mise-webgl/blender");
```

제품 Object는 `defineObjectFactory`로 선언하고 Scene의 `objects`에 등록한 뒤
`context.objects.create()`로 생성한다. 조립 확장이 필요한 maintainer는
`mise-webgl/container`, deterministic timing이 필요한 consumer는
`mise-webgl/clock` subpath를 사용한다. Container는 Composition Root 밖에서
Service Locator로 사용하지 않는다.

`createMise()`는 `[data-mise-surface]`가 없으면 canvas와 fallback을 native DOM으로 생성한다. 문구만 Host에서 설정한다.

```ts
createMise({
  providers,
  logger,
  initialExperience: "space",
  surface: {
    fallbackText: "WebGL을 사용할 수 없어 정적 화면을 표시합니다.",
  },
}).mount();
```

Renderer는 필수다. Motion·Navigation·Scroll을 등록하지 않으면 내장 Null Port를 사용한다. `initialExperience`는 Page/Navigation 없이 bare canvas에서 시작할 Experience ID다. 기본 `initialExperienceRoot`는 `surface`이며, fixed canvas와 document-flow Scroll Driver를 함께 쓸 때만 `body`를 선택한다. 실제로 필요한 Adapter만 별도 subpath에서 등록한다.

기존 `defineExperience({ scenes })`는 단일 canvas API다. 배경 canvas와 section
Three.js 영역을 동시에 실행할 때는 `defineSurface`·`defineView`·`defineTrack`으로
Stage를 선언한다. 기본은 한 compositor canvas의 여러 View이며, 실제 별도
canvas/context가 필요한 section만 isolated Surface로 둔다. 전체 예제는
[`docs/EXAMPLES.md §3`](./docs/EXAMPLES.md#3-배경-compositor--section-canvas-stage)에 있다.

Sass consumer:

```scss
@use "pkg:mise-webgl/styles.scss";
```

SSR markup이 필요하면 `mise-webgl/surface.html`의 data contract를 사용한다. Playground는 `mise-webgl/playground`와 `mise-webgl/playground.css`를 개발 환경에서만 동적 import한다. `lil-gui`는 Playground를 선택한 consumer만 설치하는 optional peer다. Inspector는 framework container에 `autoPlace: false`로 mount하고 touch style 기본값을 유지하며, 별도 RAF를 만드는 `Controller.listen()`은 사용하지 않는다.

Root entry는 optional Adapter package를 import하지 않는다. 제품 Scene, Shader, asset과 DOM selector는 Host application이 소유한다. MISE Surface selector는 package가 소유한다.

전체 규격과 주제별 탐색은 package 내부
[`docs/README.md`](./docs/README.md) 한 곳에서 시작한다. 현재 package는 license
결정 전 accidental publish를 막기 위해 `private: true`와 `UNLICENSED`를 유지한다.

## Maintainer Gates

```bash
npm run verify:framework
npm run test:mutation
# 저장소 root에서 tarball + external fixture + WebGL dogfood
npm run package:mise
```

공개 API를 의도적으로 변경한 경우 review 뒤 `npm run api:update`로 `etc/mise-webgl.api.md`를 갱신한다. 이 report와 검증 script는 유지보수 자산이며 publish tarball에는 포함하지 않는다.
`package:mise`가 publint, ATTW, NodeNext/Sass/Vite consumer와 실제 WebGL
resource plateau까지 통과한 tarball만 release candidate로 취급한다. license 승인,
registry 이름 소유권과 npm 인증 확인 전에는 `private: true`, `UNLICENSED` 잠금을
해제하지 않는다.
