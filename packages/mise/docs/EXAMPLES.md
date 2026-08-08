---
id: mise.docs.examples
title: MISE Examples, Playground And Debugging
description: canvas 앱, Scene, Playground와 logging 예시
locale: ko
route: /ko/examples
section: guides
order: 100
status: stable
---

# Examples·Playground·Debugging

npm 설치와 최소 Host는 [`GETTING-STARTED.md`](./GETTING-STARTED.md)를 먼저 본다.
이 문서는 그 다음 단계의 전체 예시·Stage·Playground·logging을 모은다.

## 1. canvas-only 전체 흐름

```html
<canvas data-mise-surface data-mise-canvas aria-hidden="true"></canvas>
```

```css
body {
  min-height: 300svh;
  min-height: 300dvh;
}
```

```ts
import {
  createMise,
  createMiseLogger,
  defineExperience,
  defineObjectFactory,
  defineProvider,
  defineScene,
  scroll,
} from "mise-webgl";
import { ConsoleLogSink } from "mise-webgl/console";
import { LenisScrollPort } from "mise-webgl/lenis";
import { ThreeRenderer } from "mise-webgl/three";
import "mise-webgl/styles.css";

const planetFactory = defineObjectFactory({
  id: "space.planet",
  create(context, props: PlanetProps) {
    return new Planet(context.scope, props);
  },
});

const experience = defineExperience({
  id: "space",
  scenes: [
    defineScene({
      id: "orbit",
      drive: scroll({
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
      }),
      objects: [planetFactory],
      create: createOrbitScene,
    }),
  ],
});

const provider = defineProvider({
  register(registry) {
    registry.experiences.add(experience);
    registry.renderer.use(() => new ThreeRenderer(import.meta.env.DEV));
    registry.scroll.use((frames, onScroll, logger) =>
      new LenisScrollPort(frames, onScroll, logger));
  },
});

const logger = createMiseLogger({
  sink: new ConsoleLogSink(),
  level: import.meta.env.DEV ? "debug" : "warning",
});

createMise({
  providers: [provider],
  initialExperience: "space",
  initialExperienceRoot: "body",
  logger,
}).mount();
```

## 2. Scene 조립

```ts
export async function createOrbitScene(
  context: SceneCreateContext,
): Promise<SceneInstance> {
  const scene = new Scene();
  const camera = new PerspectiveCamera();
  const [earth, moon] = await Promise.all([
    context.objects.create(planetFactory, earthProps),
    context.objects.create(planetFactory, moonProps),
  ]);
  scene.add(earth.root, moon.root);

  return {
    scene,
    camera,
    mount() {},
    frame(state) {
      earth.frame(state);
      moon.frame(state);
      return "idle";
    },
    resize(viewport) {
      camera.aspect = viewport.width / viewport.height;
      camera.updateProjectionMatrix();
    },
    dispose() {
      scene.clear();
    },
  };
}
```

`initialExperienceRoot: "body"`를 선택해 fixed canvas 자체가 아닌 document
flow의 `body`를 trigger로 사용한다. 그러면 resize·orientation change 뒤에도
기준점이 유지된다. 기본값 `surface`는 canvas-local Experience를 위한
backward-compatible 계약이다. Scene object와 Shader는
`window.scrollY`를 읽지 않고 `state.progress`만 사용한다. Scroll snapshot이
one-shot render를 요청하므로 Scene은 시간 기반 변화가 없으면 `idle`을 반환한다.
coarse pointer와 reduced-motion에서 `LenisScrollPort`는 native scroll로 전환한다.
`planetFactory`는 Scene definition에 선언되어야 하며 Object Host가 각 Object의
child Scope, abort와 역순 dispose를 소유한다. Scene은 생성된 Object의 의미 API만
호출하고 Container나 `dispose()`를 직접 호출하지 않는다.

## 3. 배경 compositor + section canvas Stage

기본 선택은 배경 canvas 한 개에 section View를 scissor로 합성하는 방식이다.
독립 해상도·DOM stacking·context 장애 격리가 실제 요구인 section만 별도 canvas를
사용한다.

```html
<canvas data-mise-surface data-mise-canvas aria-hidden="true"></canvas>

<main>
  <section data-space-view="earth">
    <h2>Earth</h2>
  </section>

  <section>
    <canvas data-product-canvas aria-hidden="true"></canvas>
  </section>
</main>
```

```css
[data-space-view] {
  position: relative;
  min-height: 100svh;
  min-height: 100dvh;
}

[data-product-canvas] {
  display: block;
  width: 100%;
  height: min(70svh, 48rem);
}
```

추가 section canvas에는 기본 Surface 전용 `[data-mise-canvas]` 속성을 붙이지
않는다. 그 selector의 fixed fullscreen style을 복제하지 말고 Host layout이
section canvas의 크기만 소유한다.

```ts
import {
  defineExperience,
  defineSurface,
  defineTrack,
  defineView,
} from "mise-webgl";

export const articleStage = defineExperience({
  id: "article",
  surfaces: [
    defineSurface({
      id: "background",
      target: { kind: "default" },
      mode: "compositor",
    }),
    defineSurface({
      id: "product",
      target: { kind: "selector", selector: "[data-product-canvas]" },
      mode: "isolated",
    }),
  ],
  views: [
    defineView({
      id: "background",
      surface: "background",
      target: { kind: "surface" },
      order: 0,
      clear: "all",
    }),
    defineView({
      id: "earth",
      surface: "background",
      target: { kind: "selector", selector: "[data-space-view='earth']" },
      order: 1,
      clear: "depth",
    }),
    defineView({
      id: "product",
      surface: "product",
      target: { kind: "surface" },
      order: 0,
      clear: "all",
    }),
  ],
  tracks: [
    defineTrack({
      id: "background",
      view: "background",
      root: "experience",
      activation: "always",
      scenes: [backgroundScene],
    }),
    defineTrack({
      id: "earth",
      view: "earth",
      root: "view",
      activation: "visible",
      scenes: [earthScene],
    }),
    defineTrack({
      id: "product",
      view: "product",
      root: "view",
      activation: "visible",
      scenes: [productScene],
    }),
  ],
});
```

```ts
createMise({
  providers: [provider],
  initialExperience: "article",
  initialExperienceRoot: "body",
  logger,
}).mount();
```

`body` root가 필요한 이유는 fixed 기본 canvas의 형제인 section selector를
Experience root 안에서 찾아야 하기 때문이다. Runtime은 한 RAF와 Scroll
snapshot으로 모든 Track을 update한 다음 Surface/View order로 render한다.
offscreen `visible` Track은 Scene 생성을 미루며, 한 isolated Surface의 context
loss는 다른 compositor pass를 중단하지 않는다.

### BAD / BASE / GOOD

```text
BAD  section마다 createMise + canvas + RAF + scroll listener
BAD  한 Scene에서 querySelector/getBoundingClientRect + renderer.setScissor
BASE 단일 배경만 있으면 기존 defineExperience({ scenes }) 유지
GOOD background compositor + section View, 필요한 section만 isolated Surface
```

## 4. Playground

Playground는 `lil-gui`를 개발 의존성으로 설치하고 개발 환경에서만 동적
import한다.

```bash
npm install --save-dev lil-gui
```

```ts
if (import.meta.env.DEV) {
  const [{ DevInspector }] = await Promise.all([
    import("mise-webgl/playground"),
    import("mise-webgl/playground.css"),
  ]);
  providers.push(defineProvider({
    register(registry) {
      registry.debug.use((frames) => new DevInspector({
        invalidate: () => frames.invalidate(),
      }));
    },
  }));
}
```

제품 tuning이 필요하면 `DevInspectorOptions.folders`에 number·boolean·string·color
control을 선언한다. control은 제품 semantic getter/setter만 호출한다. raw
uniform을 연결하지 않고 lil-gui `listen()`을 사용하지 않는다. Inspector는
MISE snapshot 5Hz에서 display를 갱신하며 control commit만 shared FrameLoop에
invalidation을 요청한다.

Inspector에서 확인할 항목:

- active Scene과 lifecycle.
- Driver kind, progress, velocity, frame time, quality와 DPR.
- render calls, triangles, geometry, texture, program.
- Stage Surface ready/fallback·View 수와 Track visible/hidden/deferred 상태.
- Health missing collaboration.
- optional semantic control과 commit mode.

context loss/restore는 lifecycle log와 browser Gate, dispose 뒤 terminal resource는
RC dogfood Gate에서 확인한다. Inspector의 Surface 상태는 현재 fallback 경계를
표시하지만 context restore의 내부 epoch나 원문 오류는 노출하지 않는다.

## 5. Error logging

```ts
try {
  await operation();
} catch (error) {
  logger.error("asset.load_failed", {
    type: error instanceof Error ? error.name : typeof error,
  });
}
```

production log에는 원문 exception, stack, local path, DOM, 전체 URL/query, asset token을 넣지 않는다. event code는 lifecycle 전환에만 사용하고 frame마다 기록하지 않는다. 사용자 메시지는 고정 문구로 분리한다.

권장 level:

| Level | 용도 |
|---|---|
| debug | prepare, cancel, dispose 같은 개발 lifecycle |
| info/success | mount·activate 완료 |
| warning | post-commit hook, fallback, recoverable dispose 실패 |
| error | mount, renderer, required asset의 복구 불가 실패 |

## 6. Debug 절차

1. Health report의 missing key를 확인한다.
2. active Scene과 Driver sample을 확인한다.
3. reduced-motion, visibility, BFCache, context loss 상태를 확인한다.
4. resource 수치를 전환 전후 비교한다.
5. source map으로 owner 파일을 찾는다.
6. 고정 event code로 최초 실패 경계를 찾는다.

## 7. 완료 Gate

- strict typecheck.
- architecture cycle/forbidden direction 0.
- lifecycle와 ownership 단위 테스트.
- public API report review.
- tarball consumer build.
- 실제 browser에서 canvas, reduced-motion, coarse pointer, context loss.
- compositor View order/scissor, isolated Surface 장애 격리, visible Track 지연 생성.
- Scene 반복 전환 후 resource plateau.
- app dispose 후 geometry·texture·program terminal 0.
