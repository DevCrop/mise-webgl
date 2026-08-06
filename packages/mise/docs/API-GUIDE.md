---
id: mise.docs.webgl-api
title: MISE WebGL API Guide
description: Scene 중심 WebGL public API와 resource lifecycle 사용 기준
locale: ko
route: /ko/webgl
section: webgl
order: 40
status: rc
---

# API 사용 기준

## 1. BASE API

최소 canvas 앱은 Renderer, Experience, Scene과 `initialExperience`만 등록한다. Motion, Navigation, Scroll은 사용하지 않으면 내부 Null Port가 안전하게 대체한다.

```ts
const provider = defineProvider({
  register(registry) {
    registry.renderer.use(() => new ThreeRenderer());
    registry.experiences.add(spaceExperience);
  },
});

createMise({
  providers: [provider],
  initialExperience: "space",
  logger,
}).mount();
```

`initialExperience`는 bare canvas처럼 `main[data-page]`가 없는 앱의 초기 진입에 사용한다. `initialExperienceRoot`는 기본 `surface`다. fixed canvas를 유지하면서 `body` 높이를 Scroll Driver trigger로 사용할 때만 `body`를 명시한다. Page routing이 필요한 앱은 `definePage`와 Navigation adapter를 선택한다.

## 2. 주요 type과 사용 시점

| Type/API | 사용 시점 | 입력/반환 |
|---|---|---|
| `defineProvider` | composition 등록 | Registrar에 definition/factory만 등록 |
| `MiseBootContext` | Provider runtime boot | `scope`, 제한된 `health` reporter |
| `MiseHealthReporter` | Host Health evidence | expected collaboration `mark()` |
| `defineExperience` | 단일 Track 또는 동시 Stage | `id` + `scenes`, 또는 `surfaces/views/tracks` |
| `defineSurface` | 물리 canvas·Renderer·context 경계 | `id`, `target`, `mode` |
| `defineView` | Surface 내부 render 영역 | `id`, Surface 참조, target, order, clear |
| `defineTrack` | 독립 Scene 순서·Changer·Driver 수명 | `id`, View 참조, root, activation, scenes |
| `defineScene` | 독립 preload/dispose 경계 | `id`, `drive`, `create`, optional hooks |
| `defineObjectFactory` | typed 제품 Object 생성 | `id`, `(context, props) → object` |
| `SceneCreateContext` | Scene 자원 생성 | `root`, `scope`, `signal`, reduced-motion, debug, `objects` |
| `SceneTransitionContext` | before/after hook | `from`, `to`, `signal` |
| `SceneInstance` | runtime Scene | scene, camera, mount/frame/resize/dispose |
| `ResourceOwner` | 자원 수명 | own, borrow, lease, child, listen |
| `FrameState` | frame update | time, rawDelta, delta, elapsed, frame, progress, direction, velocity, quality |
| `FrameDemand` | 다음 frame 요구 | `idle` 또는 `next` |
| `DebugStageSnapshot` | 개발 Stage 관찰 | Surface availability·View 수·Track visibility/mount |
| `DevInspectorOptions` | 선택적 Playground 조립 | title, width, semantic folders, MISE invalidation |
| `PlaygroundFolderDefinition` | 제품별 tuning 그룹 | stable ID, title, typed scalar controls |
| `ThreeRendererOptions` | Three adapter 출력 정책 | shader 진단, output buffer type, tone mapping, exposure |
| `scroll` | DOM 구간 진행 | trigger/start/end |
| `auto` | 시간 진행 | duration/loop/reduced-motion policy |
| `defineDriver` | pointer/audio/network 같은 custom 진행 | JSON형 option만 허용 |

`scroll()`과 `auto()`의 `kind`는 helper가 소유한다. TypeScript type을 우회한
JavaScript 입력에 동명 property가 있어도 각각 `scroll`, `auto`로 정규화한다.

기존 `defineExperience({ id, scenes })`는 계속 유효하다. Plan은 이를
`default Surface → default View → default Track`으로 정규화한다. 배경 canvas와
section WebGL을 동시에 실행할 때만 Stage form을 사용한다.

### Host Health profile

제품 전용 collaboration을 필수로 만들 때는 profile 선언과 실제 Provider boot
evidence를 함께 둔다.

```ts
const assetsProvider = defineProvider({
  register() {},
  async boot({ scope, health }) {
    const assets = await loadAssets();
    scope.use(() => assets.dispose());
    health.mark("host.assets");
  },
});

const app = createMise({
  providers: [assetsProvider, rendererProvider],
  healthProfile: ["host.assets"],
  logger,
});
```

BAD: profile key만 추가하고 mark 경로를 만들지 않는다.

BASE: core capability Health만 사용한다.

GOOD: Provider가 자원 소유권을 등록한 뒤 같은 boot boundary에서 Host key를 mark한다.

### Object Factory

```ts
const trailFactory = defineObjectFactory({
  id: "journey.trail",
  create(context, props: TrailProps) {
    return new Trail(context.scope, props);
  },
});

const journey = defineScene({
  id: "journey",
  drive: scroll({
    trigger: "[data-journey]",
    start: "top top",
    end: "bottom bottom",
  }),
  objects: [trailFactory],
  async create(context) {
    const trail = await context.objects.create(trailFactory, trailProps);
    return createJourneyInstance(trail);
  },
});
```

Factory를 Scene에 선언하지 않고 생성하면 실패한다. Container는 Scene에 전달되지 않는다.
고급 composition API는 `mise-webgl/container`, Clock은 `mise-webgl/clock`에 격리한다.

### Three Renderer Adapter

Three.js 출력 형식과 tone mapping은 Host composition root에서만 설정한다.

```ts
import {
  ACESFilmicToneMapping,
  HalfFloatType,
} from "three";
import {
  ThreeRenderer,
  type ThreeRendererOptions,
} from "mise-webgl/three";

const options = {
  checkShaderErrors: import.meta.env.DEV,
  outputBufferType: HalfFloatType,
  toneMapping: ACESFilmicToneMapping,
  toneMappingExposure: 0.1,
} satisfies ThreeRendererOptions;

registry.renderer.use(() => new ThreeRenderer(options));
```

Scene과 Object는 Renderer를 참조하지 않는다. 기존 `new ThreeRenderer(boolean)`은
호환되지만 새 코드는 options object를 사용한다. vendor 기준은
[Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)다.

### Playground Adapter

Playground는 개발 의존성으로 설치하고 development branch에서만 import한다.

```bash
npm install --save-dev lil-gui
```

```ts
import {
  DevInspector,
  type PlaygroundFolderDefinition,
} from "mise-webgl/playground";

const folders = [{
  id: "ocean",
  title: "Ocean",
  controls: [{
    kind: "number",
    id: "distortion",
    label: "Distortion",
    get: () => oceanController.distortion,
    set: (value) => oceanController.setDistortion(value),
    min: 0,
    max: 8,
    step: 0.1,
  }],
}] satisfies readonly PlaygroundFolderDefinition[];

registry.debug.use((frames) => new DevInspector({
  folders,
  invalidate: () => frames.invalidate(),
}));
```

control은 제품의 semantic method만 호출한다. raw Shader uniform, renderer와
Object3D를 전달하지 않는다. `commit: "finish"`는 render target 재생성 같은
비싼 변경에 사용한다. lil-gui `listen()`은 별도 RAF를 생성하므로 사용하지
않는다. MISE가 5Hz 이하 snapshot에서 display를 갱신한다. 공식 vendor 계약은
[lil-gui 문서](https://lil-gui.georgealways.com/)를 따른다.

### Stage Props

| 정의 | 핵심 Props | 선택 기준 |
|---|---|---|
| Surface | `target`, `mode` | 기본 canvas는 `default`; 별도 context가 필요할 때만 `isolated` |
| View | `surface`, `target`, `order`, `clear` | Surface 전체 또는 selector 영역의 render pass |
| Track | `view`, `root`, `activation`, `scenes` | 배경은 `always`; offscreen 지연 생성은 `visible` |

한 View에는 한 Track만 연결한다. `clear`는 첫 pass의 `all`, 후속 독립 3D pass의
`depth`, 의도적으로 buffer를 공유할 때만 `none`을 사용한다. 전체 다중 Surface
코드는 [`EXAMPLES.md §3`](./EXAMPLES.md#3-배경-compositor-section-canvas-stage)을
단일 예제로 사용한다.

## 3. Props 규칙

Props는 초기 생성 설정이며 readonly data다.

```ts
interface EarthProps {
  readonly radius: number;
  readonly axialTilt: number;
  readonly palette: Readonly<{
    land: string;
    ocean: string;
  }>;
}
```

- DOM, `Object3D`, renderer, logger, loader singleton을 Props에 넣지 않는다.
- 단위가 모호한 숫자는 이름에 `Seconds`, `Radians`, `Pixels`를 붙인다.
- optional이 실제로 “없음”을 의미할 때만 `?`를 쓴다.
- runtime 변경은 `setProgress`, `setQuality`, `frame` 같은 semantic method로 표현한다.
- Driver option은 serializable JSON형 data만 사용한다.

## 4. BAD / BASE / GOOD API

| 수준 | 코드/설계 | 판정 |
|---|---|---|
| BAD | deep import로 Kernel class 생성 | package 경계·SemVer 우회 |
| BAD | `window.mise`, 전역 renderer, Service Locator | 숨은 dependency |
| BAD | Provider에서 object/GLB/DOM 생성 | registration side effect |
| BAD | `any`, mutable definition, vendor instance 공개 | 계약 불명 |
| BAD | section마다 `createMise()`·RAF·Scroll Port 생성 | scheduler·listener·Health 중복 |
| BAD | 모든 section에 실제 canvas/context 생성 | GPU memory·context 수 증가 |
| BAD | Scene이 DOM rect·다른 Track·renderer를 직접 참조 | lifecycle·layout 경계 붕괴 |
| BASE | public facade + explicit Provider + readonly definition | 안전한 최소선 |
| BASE | Scene scope에 자원 등록 | lifecycle 정합 |
| BASE | 단일 canvas면 기존 `scenes` form 유지 | 불필요한 Stage 복잡도 없음 |
| GOOD | capability별 optional adapter + constructor injection | 교체·테스트 용이 |
| GOOD | type-only Port + stable error code + API report | package 독립성 |
| GOOD | 기본 compositor + 필요한 경우만 isolated Surface | context 비용과 격리 균형 |
| GOOD | `visible` Track + 명시적 clear/order + scoped selector | 지연 생성·결정적 render |

## 5. 비Three 로직과 UI

- 수학·상태 규칙: `domain/`, browser/Three import 금지.
- analytics·storage·input adapter: `platform/`.
- DOM component: `ui/components/`.
- 페이지 골격: `ui/layouts/`.
- 여러 component의 상태 조립: feature-level controller 또는 provider.
- MISE Provider: Experience, custom Driver, replaceable adapter 등록에만 사용.
- 범용 container는 만들지 않는다. composition root에서 constructor parameter로 연결한다.

React/Vue 같은 UI framework를 쓰더라도 component tree가 Three Scene graph를 소유하게 하지 않는다. UI는 semantic command와 readonly snapshot으로 Scene controller와 협력한다.

## 6. API 변경 검수

- public symbol이 실제 외부 consumer에 필요한가.
- 기존 signature와 declaration을 깨는가.
- API report가 의도한 diff만 포함하는가.
- root entry가 optional vendor package를 끌어오지 않는가.
- 문서 예제가 tarball consumer에서 typecheck/build 되는가.
- error code, lifecycle event, test와 문서가 같은 변경에 포함됐는가.
