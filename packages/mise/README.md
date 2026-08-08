# MISE WebGL

MISE는 Three.js/WebGL 경험을 Scene 단위로 구성하고 Scroll·Auto 진행, DOM motion, 자원 수명과 단일 frame loop를 통제하는 TypeScript 프레임워크다.

| | |
|---|---|
| Docs | https://devcrop.github.io/mise-webgl/ |
| Getting started | https://devcrop.github.io/mise-webgl/ko/getting-started/ |
| npm | `npm install mise-webgl three` |

## Compatibility

| Tool | Version |
|---|---|
| Node.js | `>=22.12.0 <23` (권장 `22.22.2`) |
| npm | `>=10.8.0` |
| TypeScript | `^7.0.2` |
| three | `^0.185.0` (required peer) |
| gsap / lenis / @barba/core | optional peers — [`package.json`](./package.json) |

## Install

```bash
npm install mise-webgl three
```

선택 Adapter:

```bash
npm install gsap lenis @barba/core
npm install --save-dev lil-gui
```

## Minimal Host (copy-paste)

```ts
import {
  createMise,
  createMiseLogger,
  defineExperience,
  defineProvider,
  defineScene,
  scroll,
} from "mise-webgl";
import { ConsoleLogSink } from "mise-webgl/console";
import { ThreeRenderer } from "mise-webgl/three";
import { Mesh, MeshNormalMaterial, PerspectiveCamera, Scene, BoxGeometry } from "three";
import "mise-webgl/styles.css";

const journey = defineExperience({
  id: "journey",
  scenes: [
    defineScene({
      id: "orbit",
      drive: scroll({
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
      }),
      create() {
        const scene = new Scene();
        const camera = new PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.z = 3;
        const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshNormalMaterial());
        scene.add(mesh);
        return {
          scene,
          camera,
          mount(): void {},
          frame(state) {
            mesh.rotation.y = state.progress * Math.PI * 2;
            return "idle" as const;
          },
          resize(viewport): void {
            camera.aspect = viewport.width / viewport.height;
            camera.updateProjectionMatrix();
          },
          dispose(): void {
            mesh.geometry.dispose();
            mesh.material.dispose();
            scene.clear();
          },
        };
      },
    }),
  ],
});

createMise({
  providers: [
    defineProvider({
      register(registry) {
        registry.renderer.use(() => new ThreeRenderer());
        registry.experiences.add(journey);
      },
    }),
  ],
  initialExperience: "journey",
  initialExperienceRoot: "body",
  logger: createMiseLogger({ sink: new ConsoleLogSink() }),
  surface: {
    fallbackText: "WebGL을 사용할 수 없어 정적 화면을 표시합니다.",
  },
}).mount();
```

Scroll Scene을 쓰면 document에 스크롤 높이가 필요하다 (`body { min-height: 300svh; }`).
Vite에서는 `src/vite-env.d.ts`에 `/// <reference types="vite/client" />`를 둬
`mise-webgl/styles.css` import가 typecheck되도록 한다.

전체 설치·Vite 절차·import 표는 [`docs/GETTING-STARTED.md`](./docs/GETTING-STARTED.md).

## Imports

| Path | 용도 |
|---|---|
| `mise-webgl` | `createMise`, definitions, `scroll`/`auto` |
| `mise-webgl/three` | `ThreeRenderer` (필수) |
| `mise-webgl/console` | `ConsoleLogSink` |
| `mise-webgl/lenis` | Scroll Port |
| `mise-webgl/gsap` | Motion Port |
| `mise-webgl/barba` | Navigation Port |
| `mise-webgl/blender` | GLB loader (동적 import 권장) |
| `mise-webgl/playground` | Dev Inspector |
| `mise-webgl/styles.css` | Surface CSS |
| `mise-webgl/styles.scss` | Sass `@use "pkg:mise-webgl/styles.scss"` |
| `mise-webgl/surface.html` | SSR Surface contract |

GLB:

```ts
const { BlenderModelLoader } = await import("mise-webgl/blender");
```

Renderer는 필수다. Motion·Navigation·Scroll을 등록하지 않으면 Null Port를 쓴다.
`initialExperience`는 Page 없이 bare canvas에서 시작할 Experience ID다.
고정 canvas + document scroll이면 `initialExperienceRoot: "body"`를 쓴다.

배경 canvas와 section WebGL을 동시에 쓰려면 `defineSurface`·`defineView`·`defineTrack`
Stage 형태를 사용한다. 예: [`docs/EXAMPLES.md`](./docs/EXAMPLES.md).

제품 Scene·Shader·asset·DOM selector는 Host가 소유한다. Kernel deep import는
하지 않는다.

## Docs map

| 목적 | 문서 |
|---|---|
| npm 첫 사용 | [`docs/GETTING-STARTED.md`](./docs/GETTING-STARTED.md) |
| Host 적용·확장 | [`docs/ADOPTION.md`](./docs/ADOPTION.md) |
| API BAD/BASE/GOOD | [`docs/API-GUIDE.md`](./docs/API-GUIDE.md) |
| 전체 예시 | [`docs/EXAMPLES.md`](./docs/EXAMPLES.md) |
| 규범 | [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) |
| 문서 지도 | [`docs/README.md`](./docs/README.md) |

## Version pin

| 환경 | 정책 |
|---|---|
| production | `"mise-webgl": "0.2.2"` exact |
| development | `"^0.2.2"` + lockfile |

참조 Host: 저장소 `examples/host-consumer`.

## Maintainer Gates

```bash
npm run verify:framework
npm run test:mutation
npm run package:mise
```

공개 API 변경 시 review 뒤 `npm run api:update`로 `etc/mise-webgl.api.md`를 갱신한다.
`package:mise`가 publint·ATTW·consumer·WebGL dogfood까지 통과한 tarball만 RC로 취급한다.
