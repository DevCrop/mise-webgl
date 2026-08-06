---
id: mise.docs.objects-shaders-assets
title: MISE Objects, Shaders And Assets
description: Object, Shader, GLB, cache와 ownership 기준
locale: ko
route: /ko/objects-shaders-assets
section: webgl
order: 42
status: stable
---

# 객체·Shader·GLB 관리

이 문서는 제품의 Three.js 객체, Shader, GLB 자산을 MISE lifecycle에 연결하는 실전 기준이다. 규범 rule ID는 [`ARCHITECTURE.md`](./ARCHITECTURE.md)가 소유한다.

## 1. 책임 지도

```text
Experience/Stage: Surface·View·Track graph와 Scene 순서
Surface: canvas·Renderer·WebGL context와 GPU resource 경계
Track: 한 View의 독립 SceneChanger·Driver 수명
Scene: Scene graph, camera, object 조립과 수명
Object Host: 선언된 factory의 abort-safe 생성과 역순 정리
Object Factory: typed props를 Object owner로 변환하는 생성 정책
Object owner: Earth·Moon 같은 한 시각 객체
Effect owner: ShaderMaterial, uniform, texture와 variant
Loader adapter: GLB 해석과 안전한 폐기
Asset catalog: URL·버전·예산 metadata
ResourceOwner: own·borrow·lease와 역순 dispose
```

Provider는 definition과 factory를 등록할 뿐 객체, material, texture, GLB를 생성하지 않는다. runtime Service Locator나 범용 ObjectManager도 만들지 않는다.

## 2. 권장 파일 구조

```text
src/
├─ App.ts
├─ app/
│  └─ Providers.ts
├─ experiences/
│  └─ space/
│     ├─ SpaceExperience.ts
│     ├─ SpaceProvider.ts
│     ├─ assets/
│     │  └─ SpaceAssets.ts
│     ├─ scenes/
│     │  └─ orbit/
│     │     └─ OrbitScene.ts
│     ├─ factories/
│     │  └─ SpaceObjectFactories.ts
│     ├─ objects/
│     │  ├─ Earth.ts
│     │  └─ Moon.ts
│     └─ effects/
│        └─ atmosphere/
│           ├─ AtmosphereEffect.ts
│           ├─ Atmosphere.vert.glsl
│           └─ Atmosphere.frag.glsl
├─ domain/
│  └─ OrbitMath.ts
├─ platform/
│  └─ AnalyticsPort.ts
└─ ui/
   ├─ components/
   └─ layouts/
```

- `objects`: Three.js object graph와 해당 object 전용 update/dispose.
- `factories`: `defineObjectFactory`로 Object props와 생성 전략을 선언한다.
- `effects`: Shader source, material, uniforms, semantic method.
- `assets`: URL과 metadata만 둔다. 로딩된 Three object를 전역 export하지 않는다.
- Host catalog는 root-relative product path와 asset 종류별 확장자를 allow-list로
  검증하고 nominal/branded URL을 factory에 전달한다. 외부 URL과 query/hash를
  일반 string 상태로 Three Loader에 전달하지 않는다.
- `domain`: DOM·Three.js·browser import가 없는 순수 규칙.
- `platform`: analytics, input, storage 같은 외부 API adapter.
- `ui`: DOM component와 layout. Scene graph와 분리한다.
- `shared`: 실제 consumer가 둘 이상 생긴 뒤에만 추출한다.

Pointer·keyboard 입력은 `platform` adapter가 canvas 또는 document listener를 Scene scope에 등록하고 semantic command를 object에 전달한다. Raycaster와 pointer normalization은 input adapter나 Scene controller가 소유하며 object가 전역 event를 직접 읽지 않는다. 키보드로 필요한 의미와 조작은 별도 HTML control로 제공한다.

## 3. Earth·Moon 관리 기준

같은 Scene에서 함께 보이는 Earth와 Moon은 Scene이 조립하고 각 object owner가
자신의 자원을 소유한다. 생성은 Scene에 선언된 typed Object Factory를 통해서만
수행한다.

```ts
import {
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
} from "three";
import type { FrameState, ResourceOwner } from "mise-webgl";

interface PlanetProps {
  readonly radius: number;
  readonly color: string;
  readonly rotationSpeed: number;
}

export class Planet {
  readonly root: Mesh;
  private disposed = false;

  constructor(scope: ResourceOwner, private readonly props: PlanetProps) {
    const geometry = scope.own(new SphereGeometry(props.radius, 64, 32));
    const material = scope.own(new MeshStandardMaterial({ color: props.color }));
    this.root = new Mesh(geometry, material);
  }

  frame(state: FrameState): void {
    if (state.reducedMotion) return;
    this.root.rotation.y += state.delta * this.props.rotationSpeed;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.root.removeFromParent();
  }
}
```

```ts
import { defineObjectFactory, defineScene, scroll } from "mise-webgl";

export const planetFactory = defineObjectFactory({
  id: "space.planet",
  create(context, props: PlanetProps) {
    return new Planet(context.scope, props);
  },
});

export const orbitScene = defineScene({
  id: "orbit",
  drive: scroll({
    trigger: "body",
    start: "top top",
    end: "bottom bottom",
  }),
  objects: [planetFactory],
  create: createOrbitScene,
});
```

Object Host가 factory마다 child scope를 만들고, geometry와 material은 해당 scope가,
graph 연결은 Object owner가 정리한다. transition abort 전·후에는 후보 Object와
scope를 즉시 rollback한다. Scene은 Object `dispose()`를 직접 호출하지 않는다.
Container는 factory context에 노출되지 않는다.

여러 구간에서 같은 행성이 계속 보여야 한다면 우선 한 Scene 안의 Segment 또는 progress 구간으로 모델링한다. 서로 다른 Scene에 동일한 `Object3D` instance를 붙이지 않는다. Three.js object는 parent가 하나이므로 마지막 `add()`가 이전 parent에서 제거하기 때문이다.

정말 여러 Scene에서 같은 원본 자산이 필요하면 immutable asset payload를 공유하고, Scene마다 `Object3D`·material·uniform state를 생성한다. 공유 GPU 자원은 명시적 ref-count `ResourceLease`가 있을 때만 공유한다.

여러 Surface는 WebGL context가 다르다. URL·ArrayBuffer·catalog 같은 immutable
CPU source는 공유할 수 있지만 geometry·material·texture·render target·compiled
program lease는 Surface/Renderer context별로 분리한다. 한 Surface의 context
restore가 다른 Surface의 GPU owner를 dispose하거나 재생성하면 안 된다.

## 4. Shader 관리 기준

Effect owner만 uniform을 변경한다. Scene은 `material.uniforms.uTime.value`를 쓰지 않고 `effect.frame(state)`나 `effect.setProgress(value)`를 호출한다.

```ts
import { ShaderMaterial } from "three";
import type { FrameState, ResourceOwner } from "mise-webgl";
import vertexShader from "./Atmosphere.vert.glsl?raw";
import fragmentShader from "./Atmosphere.frag.glsl?raw";

interface AtmosphereProps {
  readonly color: string;
  readonly intensity: number;
}

export class AtmosphereEffect {
  readonly material: ShaderMaterial;

  constructor(scope: ResourceOwner, props: AtmosphereProps) {
    this.material = scope.own(new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: props.intensity },
      },
      transparent: true,
    }));
  }

  frame(state: FrameState): void {
    if (state.reducedMotion) return;
    this.material.uniforms.uTime!.value = state.time;
  }

  setIntensity(value: number): void {
    this.material.uniforms.uIntensity!.value = Math.max(0, value);
  }
}
```

Props는 JSON형 초기 설정, method는 runtime 명령으로 구분한다. frame 중 `defines`, shader source, transparency처럼 program variant를 바꾸지 않는다. variant가 필요하면 초기 생성 시 고정하거나 material을 미리 두 개 생성하고 전환한다.

## 5. GLB 저장·로딩·해제

GLB 원본은 제품 asset 영역이나 동일 출처 CDN이 소유한다. framework package에 브랜드 모델을 넣지 않는다. catalog에는 URL, 크기, 버전, LOD만 둔다.

```ts
export const spaceAssets = Object.freeze({
  earth: {
    url: "/assets/models/earth.v3.glb",
    bytes: 1_800_000,
    lod: "medium",
  },
});
```

```ts
import type { SceneCreateContext } from "mise-webgl";
import { BlenderModelLoader } from "mise-webgl/blender";

export async function loadEarth(context: SceneCreateContext) {
  const loader = new BlenderModelLoader();
  const model = await loader.load("/assets/models/earth.v3.glb", {
    signal: context.signal,
  });
  return context.scope.own(model);
}
```

`BlenderModelLoader`는 query/hash 없는 same-origin `.glb`만 fetch하며 redirect를
따르지 않는다. `signal`은 fetch 전송과 stale commit을 모두 중단한다. 응답은 32 MiB
streaming budget, media type, GLB 2.0 magic/version/declared length를 통과해야 한다.
GLB 내부 resource는 `blob:`과 `data:`만 허용하므로 외부 buffer·image URI는 실패한다.
성공한 graph의 geometry, material, texture, skeleton과 owned `ImageBitmap`은 중복 없이
폐기한다.

일반 image·cube texture는 Host 플랫폼 Loader가 별도 `LoadingManager`로 요청 직전
URL을 재검증한다. Scene abort 뒤 Loader transport가 즉시 취소되지 않더라도 lifecycle
promise는 중단하고 pending 또는 늦게 완료된 texture를 dispose해야 한다.

Khronos glTF 사양상 GLB도 외부 resource를 참조할 수 있으므로 확장자를 확인하는
것만으로 embedded asset이 보장되지 않는다. repository catalog는 runtime byte 검증과
별도로 build 단계에서 node, triangle, material, texture dimension과 animation budget을
검사한다.

loader disposer가 현재 graph를 순회해 resource를 찾는다면 loaded mesh의 material을
새 material로 덮어쓰지 않는다. 원본 owner graph는 분리해 보존하고 effect가
geometry를 borrow해 별도 mesh를 만든다. effect child Scope가 새 material을 먼저
폐기하고 asset owner가 원본 geometry·material을 나중에 폐기하도록 Scope 생성
순서를 고정한다.

GLB를 수정해야 할 때:

- Draco 또는 Meshopt decoder는 concrete loader adapter에서 주입한다.
- KTX2 transcoder 경로와 renderer support 감지는 adapter가 소유한다.
- animation mixer와 action은 Scene/Object scope가 소유하고 dispose 시 stop/uncache한다.
- cloned skinned mesh는 skeleton clone 정책과 texture/material ownership을 문서화한다.
- preload는 다음 Scene 진입 확률과 asset budget이 근거가 있을 때만 한다.

## 6. Cache와 lease

기본값은 Scene-local load다. 두 개 이상의 동시 consumer와 측정된 reload 비용이 생긴 뒤에만 cache를 도입한다.

Cache entry는 `loading | ready | failed` 상태와 ref-count를 가진다. `acquire()`는 `ResourceLease<T>`를 반환하고 Scene scope는 `scope.lease(lease)`로 사용한다. 마지막 `release()`만 GPU 자원을 정리한다. 실패 promise를 영구 cache하지 않으며 retry/backoff는 제품 정책으로 둔다.

Stage cache는 다음 둘을 구분한다.

- CPU cache key: canonical asset URL + version/decoder option. Surface 간 공유 가능.
- GPU lease key: CPU asset key + Surface/Renderer identity + quality/variant. 다른
  context와 공유 금지.

offscreen `visible` Track은 첫 진입 전 GPU lease를 acquire하지 않는다. 한 번
mount된 Track은 Experience 종료까지 lease를 유지하여 짧은 스크롤 왕복에서
upload/dispose thrash를 만들지 않는다.

## 7. BAD / BASE / GOOD

| 수준 | 예 | 판정 |
|---|---|---|
| BAD | 전역 `window.earth`, singleton Scene, 모든 texture를 재귀 dispose | owner 불명확, Scene 전환과 충돌 |
| BAD | Provider `register()`에서 GLB load | compile 전 side effect, rollback 불가 |
| BAD | Scene이 raw uniform을 여러 곳에서 변경 | 의미와 variant 제어 분산 |
| BAD | 모든 GLB를 시작 시 preload | 메모리·모바일 데이터 예산 무시 |
| BAD | 다른 Surface/Renderer에 같은 GPU lease를 그대로 공유 | context restore·dispose 결합 |
| BAD | loaded mesh material을 교체하고 traversal disposer에 원본 정리를 기대 | graph에서 사라진 원본 material leak |
| BASE | Scene이 object를 생성하고 scope에 geometry/material 등록 | 단일 Scene에는 충분 |
| BASE | Effect class가 material과 uniform을 소유 | Shader 책임이 한 곳 |
| GOOD | Object/Effect child scope + semantic API + 테스트 가능한 props | 확장과 정리가 명확 |
| GOOD | asset catalog + abort-aware load + 실제 공유 시 ref-count lease | stale commit·중복 dispose 방지 |
| GOOD | Surface 간 CPU source 공유 + context별 GPU lease | 중복 network와 context 결합 방지 |
| GOOD | 원본 graph 보존 + geometry borrow + effect Scope 우선 dispose | leak·이중 dispose 없이 재질 확장 |

## 8. 검수표

- 모든 resource가 own·borrow·lease 중 하나인가.
- 같은 `Object3D`를 여러 Scene parent에 공유하지 않는가.
- Shader owner 외부에서 raw uniform을 쓰지 않는가.
- frame hot path에서 shader variant·DOM query·asset load를 하지 않는가.
- GLB URL, decoder, preload, cache, clone, dispose 책임이 각각 한 곳인가.
- 다중 Surface에서 CPU cache와 context별 GPU lease를 구분했는가.
- Scene 전환 취소 후 늦게 끝난 model이 즉시 폐기되는가.
- 10회 진입·퇴장 후 geometry·texture·program 수가 plateau로 돌아오는가.
- reduced-motion과 low quality에서 effect/LOD 정책이 명시됐는가.

## 9. 공식 근거

- [Khronos glTF 2.0 specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)
- [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)
- [Three.js LoadingManager](https://threejs.org/docs/pages/LoadingManager.html)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
