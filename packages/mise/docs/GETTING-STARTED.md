---
id: mise.docs.getting-started
title: Getting Started
description: 다른 프로젝트에서 mise-webgl을 npm으로 설치하고 첫 canvas 앱을 띄우는 절차
locale: ko
route: /ko/getting-started
section: guides
order: 10
status: stable
---

# Getting Started

다른 Host 프로젝트에서 `mise-webgl`을 npm으로 설치해 쓰는 최소 경로다.
완료 후 제품 구조를 잡으려면 [`ADOPTION.md`](./ADOPTION.md), 전체 예시는
[`EXAMPLES.md`](./EXAMPLES.md)를 본다.

## 1. 요구 사항

| Tool | Version |
|---|---|
| Node.js | `>=22.12.0 <23` (권장 `22.22.2`) |
| npm | `>=10.8.0` |
| TypeScript | `^7.0.2` (권장) |
| three | `^0.185.0` (required peer) |

Vite·esbuild·Webpack 등 ESM bundler를 가정한다. Root entry는 ESM-only다.

## 2. 설치

```bash
npm install mise-webgl three
```

Scroll·Motion·SPA Navigation이 필요하면 peer를 추가로 설치한다.

```bash
npm install lenis gsap @barba/core
```

개발 Inspector만 쓸 때:

```bash
npm install --save-dev lil-gui
```

| Import | Peer | 역할 |
|---|---|---|
| `mise-webgl` | — | Kernel·definitions·logger |
| `mise-webgl/three` | `three` | WebGL Renderer (필수) |
| `mise-webgl/lenis` | `lenis` | Scroll Port (선택) |
| `mise-webgl/gsap` | `gsap` | Motion Port (선택) |
| `mise-webgl/barba` | `@barba/core` | Navigation Port (선택) |
| `mise-webgl/console` | — | browser console LogSink |
| `mise-webgl/blender` | `three` | GLB loader (동적 import) |
| `mise-webgl/playground` | `lil-gui` | Dev Inspector |
| `mise-webgl/styles.css` | — | Surface 기본 스타일 |

## 3. 5분 최소 앱 (Vite)

### HTML

`index.html` body에 Surface contract를 둔다. 없으면 `createMise().mount()`가
native canvas를 만들지만, SSR·정적 HTML과 맞출 때는 명시하는 편이 안전하다.

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MISE host</title>
  </head>
  <body>
    <canvas data-mise-surface data-mise-canvas aria-hidden="true"></canvas>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

### CSS

Scroll Scene을 쓰려면 document에 스크롤 높이가 필요하다.

```css
html,
body {
  margin: 0;
  min-height: 300svh;
  min-height: 300dvh;
  background: #0b0f14;
}
```

### Vite CSS 타입

`mise-webgl/styles.css` side-effect import를 TypeScript가 허용하려면 Vite client
타입을 한 번 선언한다.

```ts
// src/vite-env.d.ts
/// <reference types="vite/client" />
```

다른 bundler는 `declare module "*.css";` shim을 추가한다.

### TypeScript

아래 코드는 copy-paste로 typecheck·실행 가능한 최소 Host다.

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

const provider = defineProvider({
  register(registry) {
    registry.renderer.use(() => new ThreeRenderer());
    registry.experiences.add(journey);
  },
});

createMise({
  providers: [provider],
  initialExperience: "journey",
  initialExperienceRoot: "body",
  logger: createMiseLogger({ sink: new ConsoleLogSink() }),
  surface: {
    fallbackText: "WebGL을 사용할 수 없어 정적 화면을 표시합니다.",
  },
}).mount();
```

### 실행

```bash
npx vite
```

페이지를 스크롤하면 박스가 `state.progress`에 맞춰 회전한다. Scene은
`window.scrollY`를 읽지 않는다.

## 4. 코드가 하는 일

```text
createMise()
  └─ defineProvider
       ├─ renderer → ThreeRenderer   (필수)
       └─ experiences → defineExperience
            └─ scenes → defineScene
                 ├─ drive → scroll() | auto() | defineDriver()
                 └─ create() → SceneInstance { scene, camera, mount, frame, resize, dispose }
```

| API | Host가 할 일 |
|---|---|
| `defineProvider` | Composition Root에서 Renderer·Experience·선택 Port 등록 |
| `defineExperience` | Scene 순서(또는 Stage surfaces/views/tracks) 선언 |
| `defineScene` | 한 preload/dispose 경계의 WebGL 내용 |
| `scroll` / `auto` | progress 소스. Scene은 `FrameState.progress`만 소비 |
| `createMise().mount()` | Surface·FrameLoop·Health 시작 |
| `dispose()` on Scene | 생성한 geometry·material·listener 정리 |

Motion·Scroll·Navigation을 등록하지 않으면 Null Port가 들어가므로 최소 앱은
Renderer만 있으면 된다.

## 5. 자주 쓰는 확장

### Lenis scroll

```ts
import { LenisScrollPort } from "mise-webgl/lenis";

registry.scroll.use((frames, onScroll, logger) =>
  new LenisScrollPort(frames, onScroll, logger));
```

### Auto intro Scene

```ts
import { auto } from "mise-webgl";

defineScene({
  id: "intro",
  drive: auto({ duration: 4, loop: false }),
  create: createIntroScene,
});
```

### GLB 로드

```ts
const { BlenderModelLoader } = await import("mise-webgl/blender");
const loader = new BlenderModelLoader();
const model = await loader.load(url, context.signal);
context.scope.use(() => model.dispose());
```

### 개발 Inspector

```ts
if (import.meta.env.DEV) {
  const [{ DevInspector }] = await Promise.all([
    import("mise-webgl/playground"),
    import("mise-webgl/playground.css"),
  ]);
  registry.debug.use((frames) =>
    new DevInspector({ invalidate: () => frames.invalidate() }));
}
```

## 6. Host에 두면 안 되는 것 / 둬야 하는 것

| Host 소유 | `mise-webgl` 소유 |
|---|---|
| 제품 Scene·Shader·asset URL | Provider·Plan·lifecycle |
| DOM selector·콘텐츠 | Surface data contract·기본 SCSS |
| CMS·URL·SSR routing | FrameLoop·ResourceOwner·Health |
| Analytics·브랜드 문구 | public Port·Adapter subpath |

Kernel deep import(`mise-webgl/dist/...`)는 사용하지 않는다. 공개 entry와
문서화된 subpath만 import한다.

권장 디렉터리:

```text
src/
├─ main.ts                 # Composition Root = createMise(...)
├─ experiences/
│  └─ journey/
│     ├─ JourneyProvider.ts
│     └─ scenes/
│        └─ OrbitScene.ts
└─ styles/
```

## 7. 버전 고정

| 환경 | 정책 |
|---|---|
| production | exact pin (`"mise-webgl": "0.2.0"`) |
| development | caret (`"^0.2.0"`) + lockfile |
| automation | Dependabot/Renovate PR + Host typecheck CI |

참조 Host 예제: 저장소 `examples/host-consumer`.

## 8. 다음 문서

| 목적 | 문서 |
|---|---|
| 제품에 붙이는 전체 절차 | [`ADOPTION.md`](./ADOPTION.md) |
| BAD/BASE/GOOD API | [`API-GUIDE.md`](./API-GUIDE.md) |
| canvas·Stage·Playground 예시 | [`EXAMPLES.md`](./EXAMPLES.md) |
| before/after·abort | [`LIFECYCLE-RECIPES.md`](./LIFECYCLE-RECIPES.md) |
| Object·Shader·GLB | [`OBJECTS-SHADERS-ASSETS.md`](./OBJECTS-SHADERS-ASSETS.md) |
| 규범·도메인 | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| package 문서 지도 | [`README.md`](./README.md) |

공식 문서 사이트: https://devcrop.github.io/mise-webgl/ko/getting-started/
