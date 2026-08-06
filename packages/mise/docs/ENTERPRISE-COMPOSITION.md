---
id: mise.docs.enterprise-composition
title: MISE Enterprise Composition
description: Container, Factory, Object Host와 Clock의 고급 조립
locale: ko
route: /ko/enterprise-composition
section: webgl
order: 44
status: stable
---

# Enterprise Composition

이 문서는 MISE의 Container, Factory, Object Host, Clock과 type module 경계를 설명한다.
규범 우선순위는 [`ARCHITECTURE.md`](./ARCHITECTURE.md)가 소유한다.

## 1. 채택 모델

```text
Provider
→ Registry
→ immutable Plan
→ ContainerBuilder
→ sealed Container
→ ApplicationFactory
→ explicit constructor/context injection
→ Runtime / Scene / Object
```

Container는 Composition Root의 조립 도구다. Scene, Driver, Object가 runtime 중 dependency를
검색하는 Service Locator가 아니다.

## 2. Restricted Container

고급 composition consumer는 별도 subpath를 사용한다.

```ts
import {
  MiseContainerBuilder,
  createMiseToken,
} from "mise-webgl/container";

const renderer = createMiseToken<RendererPort>("renderer");
const container = new MiseContainerBuilder()
  .singleton(renderer, () => new CustomRenderer())
  .compile();
const scope = container.createScope();
const instance = scope.resolve(renderer);
```

규칙:

- token은 generic `MiseToken<T>`다.
- token ID는 진단용이고 lookup은 token identity로 수행한다.
- binding은 `value`, `singleton`, `scoped`, `transient` 중 하나다.
- compile 이후 builder mutation은 실패한다.
- duplicate, missing, cycle, disposed scope resolution은 고정 `MiseError` code로 실패한다.
- `resolve()`는 `application`, `container`, `factory` layer에서만 허용한다.
- Container cache는 GPU/DOM ownership이 아니다.
- resolved resource는 Composition Root가 `ResourceOwner`에 명시적으로 연결한다.

### Lifetime

| Lifetime | Cache | 권장 대상 |
|---|---|---|
| value | Container 전체 | compiled Plan, logger option |
| singleton | Container 전체 | Clock, Quality policy |
| scoped | Container scope | application assembly |
| transient | 없음 | 추가 Renderer, Viewport, Changer |

`scoped`는 instance identity를 제어한다. dispose ownership은 계속 ResourceScope가 소유한다.

## 3. Application Factory

`createMise()`는 public Facade다. 내부 `MiseApplicationFactory`는 다음 책임만 가진다.

1. Provider를 선언 순서대로 Registry에 등록
2. Registry를 immutable Plan으로 compile
3. Plan capability에서 Health expected profile 생성
4. Container binding compile
5. `MiseRuntimeFactory`로 explicit graph 생성
6. Container와 Factory collaboration mark

Factory가 생성한 Runtime에는 Container가 전달되지 않는다.

## 4. Product Object Factory

구체 Three.js Object는 Host 제품이 소유한다. MISE package는 generic lifecycle contract만
제공한다.

```ts
const planetFactory = defineObjectFactory({
  id: "space.planet",
  create(context, props: PlanetProps) {
    return new Planet(context.scope, props);
  },
});

const scene = defineScene({
  id: "space",
  drive: auto({
    duration: 8,
    loop: true,
    reducedMotion: { mode: "pause" },
  }),
  objects: [planetFactory],
  async create(context) {
    const planet = await context.objects.create(planetFactory, planetProps);
    return createSceneInstance(planet);
  },
});
```

보장:

- Scene은 사용할 factory ID를 `objects`에 먼저 선언한다.
- 미선언 factory 사용은 `MISE_OBJECT_FACTORY_UNDECLARED`다.
- factory마다 child ResourceScope를 만든다.
- sync/async factory를 동일하게 처리한다.
- abort 전후를 검사한다.
- 실패·abort 시 Object와 child resource를 rollback한다.
- 성공 시 Object dispose가 child resource보다 먼저 실행된다.
- 첫 생성은 `scene.object-factory` Health collaboration을 mark한다.

MISE package에 Planet, Terrain, Particle 같은 제품 Object를 넣지 않는다.

## 5. Clock

Clock은 별도 subpath에서도 사용할 수 있다.

```ts
import { MiseClock } from "mise-webgl/clock";

const clock = new MiseClock({ maxDelta: 0.1 });
const tick = clock.sample(requestAnimationFrameTimestamp);
```

`FrameTick`:

| Field | 의미 |
|---|---|
| `time` | RAF timestamp 초 |
| `rawDelta` | 실제 timestamp 간격 |
| `delta` | maxDelta로 clamp한 simulation 간격 |
| `elapsed` | clamp한 delta의 누적 |
| `frame` | 전달 frame 순번 |

FrameLoop 규칙:

- Clock의 입력은 RAF callback timestamp 하나다.
- 첫 frame, idle 뒤 재개, suspension 뒤 재개는 delta 0이다.
- background 복귀 spike는 `rawDelta`로 관찰하되 simulation에는 clamp된 `delta`를 사용한다.
- demand lease가 없으면 다음 RAF를 예약하지 않는다.
- test는 timestamp를 직접 주입한다.

Three.js `Clock`은 공식 문서상 r183부터 deprecated이므로 MISE Clock은 Three.js Clock을
감싸지 않는다.

## 6. Type Module

`Contracts.ts`는 호환 facade다. canonical type source는 `src/types`다.

```text
types/
├─ ApplicationTypes.ts
├─ DriverTypes.ts
├─ FrameTypes.ts
├─ HealthTypes.ts
├─ ObjectTypes.ts
├─ PageTypes.ts
├─ ProviderTypes.ts
├─ RendererTypes.ts
├─ ResourceTypes.ts
├─ SceneTypes.ts
└─ StageTypes.ts
```

Consumer는 deep path를 import하지 않는다.

```ts
import type { FrameState, SceneInstance } from "mise-webgl";
```

## 7. God Object 방지

Architecture Gate가 다음을 자동 검사한다.

- production TS 파일 450줄 이하
- catch-all module 이름 0
- `Contracts.ts`는 re-export facade
- relative import unresolved 0
- dependency cycle 0
- forbidden layer direction 0
- Container import는 composition layer만 허용
- Container resolution은 composition layer만 허용

긴 파일을 임의로 쪼개는 것이 목표가 아니다. lifecycle owner와 변경 이유가 다른 책임을
독립 module로 분리하는 것이 목표다.

현재 책임:

| Module | 책임 |
|---|---|
| `MiseRuntime` | Stage lifecycle orchestration |
| `MisePlan` | immutable Plan snapshot과 Adapter 접근 |
| `MisePlanValidation` | Plan 교차 정의 불변식 검증 |
| `Define` | public definition helper와 구조 snapshot |
| `DriverConfig` | custom Driver 설정 검증·immutable snapshot |
| `MiseStageBuilder` | candidate Stage graph 생성·rollback |
| `MiseStageLayout` | View 측정·render order·debug snapshot |
| `MiseObjectHost` | product Object 생성·rollback·ownership |
| `MiseClock` | timestamp normalization |
| `MiseApplicationFactory` | composition |

## 8. Health 자동 파생

expected profile:

```text
Plan capabilities
+ Container/Factory/Clock core capabilities
+ declared Scene Object factories
+ optional Host profile
```

Object factory가 없는 Scene은 `scene.object-factory`를 요구하지 않는다. 선언된 factory가
실제로 생성되지 않으면 Health는 pending을 유지한다.

## 9. 검증

필수:

```bash
npm run typecheck
npm run lint:architecture
npm test
npm run api:check
npm run lint:public-docs
```

Container:

- typed value
- singleton/scoped/transient identity
- duplicate/missing/cycle/sealed
- report가 instance를 노출하지 않음

Clock:

- first/resume delta 0
- raw/clamped delta
- elapsed/frame
- invalid input

Object Host:

- declared/undeclared factory
- async abort
- rollback
- reverse disposal
- Health mark

## 10. 공식 근거와 MISE 결정

공식 근거:

- Laravel Container binding/lifetime:
  https://laravel.com/docs/13.x/container
- TypeScript generic contract:
  https://www.typescriptlang.org/docs/handbook/2/generics.html
- TypeScript module boundary:
  https://www.typescriptlang.org/docs/handbook/2/modules.html
- HTML animation frame timestamp:
  https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames
- Three.js Clock deprecation:
  https://threejs.org/docs/pages/Clock.html

MISE 결정:

- Container를 composition layer로 제한
- reflection/decorator/auto-wiring 배제
- Container cache와 ResourceScope ownership 분리
- Object declaration과 Health expected profile 연결
- production TS 450줄 budget

이 결정은 외부 framework 규칙의 복제가 아니라 MISE의 장기 WebGL lifecycle에 맞춘
로컬 architecture contract다.
