---
id: mise.docs.adoption
title: MISE Adoption And Extraction
description: Host 적용, 분리, 확장과 교체 절차
locale: ko
route: /ko/adoption
section: guides
order: 90
status: stable
---

# MISE Adoption And Extraction

이 package 문서는 MISE를 Host 제품에 적용하고 독립 NPM package로 추출하는 절차다.

## 1. 목표 경계

```text
Host Composition Root
  ├─ mise-webgl
  ├─ mise-webgl/three
  ├─ mise-webgl/blender
  ├─ 선택 Adapter subpath
  └─ Host Providers

Host Experience
  └─ mise-webgl public contracts

MISE Kernel
  └─ public Ports
```

Host Experience는 MISE Kernel 경로와 concrete Adapter를 알지 않는다. MISE Kernel은 Host 경로를 알지 않는다.

## 2. 적용 순서

1. Composition Root 하나를 정한다.
2. Renderer·Motion·Scroll·Navigation Adapter를 선택한다.
3. Host Provider를 만든다.
4. Experience와 readonly Scene order를 선언한다.
5. Scene마다 Scroll·Auto·custom Driver를 선택한다.
6. Scene resource를 ResourceOwner에 등록한다.
7. Health Profile은 실제 Host collaboration만 추가한다.
8. browser lifecycle과 fallback을 검증한다.

## 3. Host 예시

Page routing이 없는 canvas-only Host는 Renderer와 Experience만 등록한다.

```ts
const provider = defineProvider({
  register(registrar) {
    registrar.renderer.use(() => new ThreeRenderer());
    registrar.experiences.add(journey);
  },
});

createMise({
  providers: [provider],
  initialExperience: "journey",
  logger,
}).mount();
```

Motion·Navigation·Scroll은 선택 capability다. 등록하지 않으면 내장 Null Port가 사용된다.

```ts
import {
  createMise,
  createMiseLogger,
  defineExperience,
  definePage,
  defineProvider,
  defineScene,
  scroll,
} from "mise-webgl";
import { ThreeRenderer } from "mise-webgl/three";
import { LenisScrollPort } from "mise-webgl/lenis";
import { GsapMotionPort } from "mise-webgl/gsap";
import { BarbaNavigationPort } from "mise-webgl/barba";
import { ConsoleLogSink } from "mise-webgl/console";
import "mise-webgl/styles.css";

const journey = defineExperience({
  id: "journey",
  scenes: [
    defineScene({
      id: "terrain",
      drive: scroll({
        trigger: "[data-journey]",
        start: "top top",
        end: "bottom bottom",
      }),
      create: createTerrainScene,
    }),
  ],
});
const journeyPage = definePage({
  id: "journey",
  create: createJourneyPage,
});

const experienceProvider = defineProvider({
  register(registrar) {
    registrar.experiences.add(journey);
    registrar.pages.add(journeyPage);
  },
});
const platform = defineProvider({
  register(registrar) {
    registrar.renderer.use(() => new ThreeRenderer());
    registrar.motion.use((frames) => new GsapMotionPort(frames));
    registrar.scroll.use((frames, onScroll, logger) =>
      new LenisScrollPort(frames, onScroll, logger));
    registrar.navigation.use((root, lifecycle, logger) =>
      new BarbaNavigationPort(root, lifecycle, logger));
  },
});

const app = createMise({
  logger: createMiseLogger({ sink: new ConsoleLogSink() }),
  providers: [platform, experienceProvider],
  surface: {
    fallbackText: "WebGL is unavailable. Static content remains available.",
  },
});

app.mount(document);
```

`createJourneyPage`는 `MisePageContext.scenes.activate("journey", root)`를 호출하고 자신이 만든 motion·DOM resource를 `leave()`와 `dispose()`에서 정리해야 한다. SSR의 `main[data-page]` 값은 등록한 Page ID와 일치해야 한다.

이 구성 형태는 Host composition root와 tarball fixture 양쪽에서 compile되어야 한다.

Sass를 직접 구성하는 Host는 CSS import 대신 다음 entry 하나를 사용한다.

```scss
@use "pkg:mise-webgl/styles.scss";
```

Browser Application은 Surface가 없으면 native DOM으로 생성한다. SSR Surface가 필요하면 `mise-webgl/surface.html`의 data contract를 렌더링하며 두 방식을 동시에 중복 적용하지 않는다.

### 배경 + section WebGL Host

다음 순서로 확장한다.

1. 기존 `default` canvas와 배경 Scene은 그대로 둔다.
2. 일반 section effect는 같은 compositor Surface의 selector View로 추가한다.
3. 별도 canvas·해상도·stacking·pointer·context 격리가 필요한 section만
   isolated Surface로 승격한다.
4. section Track은 `root: "view"`, `activation: "visible"`을 기본으로 한다.
5. fixed canvas의 형제 section을 찾는 Stage는 `initialExperienceRoot: "body"`를
   명시한다.

이 확장은 기존 Scene·object·Shader owner를 이동시키지 않는다. Experience
definition만 `scenes` form에서 `surfaces/views/tracks` form으로 확장하고, 각
Track의 Scene 배열에 기존 factory를 재배치한다. 제품 DOM selector와 section
canvas layout은 Host가 소유한다. MISE 기본 `[data-mise-canvas]` selector는
fullscreen Surface 전용이므로 추가 section canvas에 복제하지 않는다.

## 4. 제품 코드 위치

MISE 밖:

```text
src/
├─ CompositionRoot.ts
├─ experiences/
│  └─ journey/
│     ├─ JourneyProvider.ts
│     ├─ JourneyExperience.ts
│     └─ scenes/
│        └─ terrain/
│           ├─ TerrainScene.ts
│           ├─ GlowTail.ts
│           ├─ CameraRig.ts
│           └─ shaders/
└─ styles/
```

MISE package로 이동하면 안 되는 제품 요소:

- 브랜드 Scene
- 제품 DOM selector
- MISE Surface 내부 selector override
- 제품 Shader와 uniform 의미
- 실제 콘텐츠·asset key
- 제품별 analytics
- 특정 URL과 SSR routing

## 5. 확장 예시

### Scroll Scene

```ts
const terrainScene = defineScene({
  id: "terrain",
  drive: scroll({
    trigger: "[data-terrain]",
    start: "top top",
    end: "bottom bottom",
  }),
  create: createTerrainScene,
});
```

Scene은 scroll source를 모르고 `FrameState.progress`만 소비한다.

### Auto Scene

```ts
const introScene = defineScene({
  id: "intro",
  drive: auto({
    duration: 4,
    loop: false,
    reducedMotion: { mode: "complete" },
  }),
  create: createIntroScene,
});
```

같은 Scene factory를 다른 Driver로 교체해도 visual code는 유지되어야 한다.

### DOM과 ResourceOwner

```ts
function createScene(context: SceneCreateContext): SceneInstance {
  const panel = context.root.querySelector<HTMLElement>("[data-panel]");
  const timeline = createPanelTimeline(panel);

  context.scope.use(() => timeline.revert());
  if (panel) context.scope.listen(panel, "click", handlePanelClick);

  return createThreeSceneInstance();
}
```

DOM listener와 Timeline도 Scene resource다. Shader Effect는 raw uniform 대신 owner method만 공개한다. 새 Renderer는 Renderer Port 뒤에 별도 Adapter로 추가한다. Asset Store는 첫 shared asset consumer가 생긴 뒤 ref-count lease와 함께 도입한다.

## 6. 저장소 내부에서 package로 추출

### Step 1 — Port 정리

- public contract에서 concrete FrameLoop와 ResourceScope를 제거한다.
- logger와 debug concrete implementation을 Composition Root로 이동한다.
- dependency cycle과 Kernel → infrastructure import를 0으로 만든다.

### Step 2 — Plan 고정

- Registry를 registration-only Registrar로 제한한다.
- validation 후 immutable Plan을 생성한다.
- runtime resolve를 제거한다.
- Health expected set을 capability에서 생성한다.

### Step 3 — 물리 분리

- 독립 `package.json`, tsconfig, build config를 만든다.
- Host 제품이 workspace package public entry만 import하게 한다.
- MISE package가 Host source alias를 사용하지 않는지 검사한다.

### Step 4 — tarball 검증

- architecture·dead-code·API drift·unit/property/mutation Gate를 실행한다.
- package build와 declaration을 생성한다.
- package CSS와 SCSS·HTML asset을 생성·포함한다.
- tarball을 만든다.
- clean external fixture에 tarball을 설치한다.
- NodeNext·Bundler·Vite·browser와 Sass `pkg:` compile·HTML data contract를 검사한다.

### Step 5 — dogfood

- Host 제품의 workspace link를 RC tarball 설치로 바꾼다.
- 제품 type·unit·build·browser·device Gate를 실행한다.
- 실제 WebGL에서 반복 Scene 전환 전후 renderer resource plateau와 terminal
  dispose를 확인한다.
- package와 Host 양쪽의 알려진 제한을 기록한다.

## 7. 분리 가능성 검사

다음 검색 결과가 0이어야 한다.

```text
MISE source -> Host directory import
MISE package.json -> Host workspace dependency
MISE tests -> Host private fixture
MISE docs -> Host 문서가 없으면 해석 불가능한 규칙
Host Experience -> MISE kernel deep import
```

이 문서 디렉터리를 별도 저장소로 복사한 뒤 모든 내부 Markdown 링크가 유지되어야 한다.

## 8. Version 정책

- 공개 계약 변경은 API report와 migration note가 필요하다.
- lifecycle 순서 변경은 breaking change다.
- Port required member 추가는 breaking change다.
- 새 optional Adapter subpath는 non-breaking 후보다.
- 지원 Three.js·TypeScript 범위 축소는 breaking change다.
- experimental API는 안정 API와 별도 subpath 또는 명시적 표식을 사용한다.

## 9. 철수와 교체

Host는 Port 경계 때문에 다음을 제품 Scene 변경 없이 교체할 수 있어야 한다.

- Three renderer Adapter
- GSAP motion Adapter
- Lenis scroll Adapter
- Barba navigation Adapter
- Debug sink
- FrameControl을 소비하는 motion·scroll Adapter

교체 시 public Driver sample, lifecycle order와 ResourceOwner 의미는 유지한다.

운영체제 reduced-motion preference는 mount 뒤에도 변경될 수 있다. Host와 Scene은 자체 listener를 중복 등록하지 않고 framework가 전달하는 live `ReducedMotionState`를 읽는다.
