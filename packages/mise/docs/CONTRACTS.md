---
id: mise.docs.contracts
title: MISE Implementation Contracts
description: MISE 구현, Adapter와 확장 review 계약
locale: ko
route: /ko/contracts
section: reference
order: 70
status: stable
---

# MISE Implementation Contracts

이 package 문서는 구현자와 Adapter 작성자를 위한 **비규범 review checklist**다. 규범의 원문과 rule ID는 [`ARCHITECTURE.md`](./ARCHITECTURE.md)가 소유한다. 충돌하거나 해석이 갈리면 이 목록을 수정하며 새 규칙을 여기서 만들지 않는다.

## 1. Composition

- Composition Root만 Host Provider, MISE factory와 Adapter Provider를 함께 import한다.
- Provider는 등록만 하고 DOM·renderer·asset을 만들지 않는다.
- Restricted Container는 Registry compile 뒤 Application Factory 안에서만 graph를 조립한다.
- Container는 generic token과 `value | singleton | scoped | transient` lifetime만 제공하며 reflection·decorator·string key·auto wiring을 제공하지 않는다.
- Container와 `resolve()`를 Scene·Driver·Object·Port context에 전달하지 않는다.
- Container cache는 객체 identity만 관리한다. listener·GPU·DOM·frame lease 정리는 `ResourceScope`가 소유한다.
- Renderer는 필수다. Motion·Navigation·Scroll은 필요할 때만 등록하며 부재 시 Null Port가 사용된다.
- 모든 Provider 등록 후 `Registry.compile()`을 한 번 호출한다. 이 호출이 등록을 닫고 immutable Plan을 생성한다.
- boot 이후 registration과 runtime Service Locator를 금지한다.
- Plan compile은 빈 ID·empty Experience, 중복 Surface·View·Track·Scene ID,
  끊어진 Surface/View 참조, 한 View의 중복 Track, View가 없는 Surface,
  둘 이상의 default Surface, isolated Surface의 복수/부분 View, 유효하지 않은
  mode·target·clear·root·activation, 미등록 Driver와 유효하지 않은 built-in
  Driver option을 거부한다.
- Plan은 Experience·Surface·View·Track·Scene·Drive·Page를 detached
  snapshot으로 복제하고 nested Driver option까지 freeze한다.
- ID는 128자 safe identifier, selector는 control character 없는 512자 이하로 제한한다.
- Plan은 Experience 64, Page 64, Experience당 Surface 8·View 32·Track 32,
  Track당 Scene 64, Scene당 Object factory 256을 상한으로 한다.
- compile 이후 caller의 원본 definition 변경이 Plan을 바꾸면 실패다.
- Plan compile 실패는 renderer 생성 전 발생해야 한다.

## 2. Public API

- Root runtime value API는 `createMise`, `createMiseLogger`, `resolveBrowserLogLevel`, `MiseError`, `MiseAggregateError`, `defineProvider`, `defineExperience`, `defineSurface`, `defineView`, `defineTrack`, `definePage`, `defineScene`, `defineObjectFactory`, `defineDriver`, `scroll`, `auto`로 제한한다.
- Port와 definition은 type-only export한다.
- public 함수·Port signature가 참조하는 named type은 같은 public entry에서 export한다.
- Kernel constructor와 mutable Registry를 export하지 않는다.
- Adapter와 Playground는 명시적 subpath만 사용한다.
- default export와 wildcard export를 금지한다.
- public signature는 vendor concrete type을 필요한 범위 이상 노출하지 않는다.
- 모든 export type·class·함수와 public member는 TSDoc summary를 가진다.
- 호출 가능한 parameter는 `@param`, 의미 있는 반환값은 `@returns`, public failure contract는 `@throws`로 설명한다.
- committed API report의 `(undocumented)`와 `Warning:`은 각각 0이어야 한다.

## 3. Type

- `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `isolatedDeclarations`를 package source와 public declaration Gate에 적용한다.
- `skipLibCheck: true`는 vendor declaration 재검사 비용만 줄인다. MISE source·생성 declaration·tarball consumer 검증을 생략하는 근거로 사용할 수 없다.
- public `any`를 금지하고 외부 입력은 `unknown`에서 검증한다.
- Port는 작은 구조적 interface로 둔다.
- 상태는 boolean 조합 대신 discriminated union으로 표현한다.
- 내부 ID는 실제 오교환 위험이 있을 때만 opaque type을 쓴다.
- definition helper는 literal ID와 readonly tuple inference를 유지한다.
- 계약 type은 `src/types/*Types.ts`, definition helper 구현은 `src/definitions/Define.ts`가 소유하고 `Contracts.ts`는 re-export만 수행한다.

## 4. Lifecycle

- 단순 Experience의 Scene order는 기존 readonly `scenes`가 소유한다.
- Stage Experience는 Track의 readonly `scenes`가 순서를 소유한다.
- Track은 하나의 View와 독립 SceneChanger·Driver session을 소유한다.
- Track끼리 Scene instance, Changer 또는 Driver를 직접 참조하지 않는다.
- 독립 preload·abort·dispose가 필요하면 Scene, 같은 자원 수명의 변화면 Segment다.
- Cue 순서는 `before → action → after`다.
- Scene `create`와 네 hook은 같은 전환의 AbortSignal을 사용한다.
- Scene이 제품 Object factory를 선언하면 Object Host만 해당 factory를 생성할 수 있다.
- Object factory는 Scene child scope, transition signal과 immutable create context를 받는다.
- factory 완료 전 abort되면 반환 Object와 child scope를 즉시 rollback한다.
- Scene은 Object의 `dispose()`를 직접 호출하지 않는다. Object Host가 역순·멱등 정리를 소유한다.
- 네 hook은 `void | Promise<void>`를 반환하며 Changer가 await한다.
- 모든 async prepare는 AbortSignal과 transition epoch를 확인한다.
- commit은 Changer 한 곳에서만 수행한다.
- pre-commit 실패 시 이전 active를 유지한다.
- 늦게 완료된 GLB 결과는 abort를 확인하고 즉시 폐기한다.
- Experience activation이 commit되지 않으면 candidate Driver를 전부 정리하고 이전 Driver session을 유지한다.
- post-commit 실패 시 새 active를 임의 rollback하지 않는다.
- post-commit hook 대기 중 더 최신 전환이 실패해도 이미 commit된 Scene의 성공 결과를 stale로 오판하지 않는다.
- dispose는 중복 호출 안전해야 한다.

## 5. Frame

- FrameLoop과 RAF owner는 Application에 각각 하나다.
- renderer와 canvas owner는 실제 Surface마다 각각 하나다.
- View와 Track은 Renderer나 RAF를 새로 만들지 않는다.
- Scene·Effect·Adapter는 자체 RAF를 생성하지 않는다.
- Clock은 단일 FrameLoop가 RAF timestamp에서만 읽는다. Three.js `Clock`과 별도 TimeSource Port는 사용하지 않는다.
- 첫 frame과 resume 직후 delta는 0이다.
- `rawDelta`는 RAF 간 실제 초, `delta`는 최대 0.1초로 clamp한 simulation 초, `elapsed`는 clamp delta 누적, `frame`은 전달 순번이다.
- negative·non-finite timestamp는 안전한 0 또는 stable error로 처리하고 background catch-up을 금지한다.
- update와 render phase를 분리한다.
- update가 끝난 뒤 Surface별 View order로 render pass를 실행한다.
- 보이지 않는 View는 Scene frame과 draw call을 실행하지 않는다.
- 정지 상태에서는 continuous frame lease를 모두 반납한다.
- Debug Port가 비활성이면 frame hot path에서 renderer stats·Health report·Debug snapshot을 만들지 않는다.

## 6. Driver

- Auto Driver 진행은 절대 RAF `time`이 아니라 실제 sample 동안의 simulation
  `delta`만 누적한다. visibility·BFCache suspension과 reduced-motion pause 뒤
  숨겨진 시간을 따라잡지 않는다.
- live reduced-motion 전환은 normal timeline을 보존하고 `shorten` timeline은
  진입마다 0에서 별도로 시작한다.
- custom Driver 설정은 순환 참조와 지원 depth/node budget을
  `MISE_DRIVER_INVALID`로 거부한다.

- Driver는 입력을 `progress`, `velocity`, `direction`, `delta`로 정규화한다.
- `DriveSample`은 현재 frame에서만 유효한 snapshot이다. consumer는 참조 동일성에 의존하거나 다음 frame까지 보관하지 않는다.
- Scroll Driver는 camera나 Scene object를 직접 알지 않는다.
- Driver selector는 Experience root 안에서만 해석한다. fixed Surface 밖의 document-flow trigger가 필요하면 Host가 `initialExperienceRoot: "body"`를 명시하며 기본값은 `surface`다.
- Auto Driver는 동일한 Scene instance 계약을 사용한다.
- Auto Driver는 `pause | complete | shorten(duration)` reduced-motion policy를 필수로 선언한다.
- reduced-motion `shorten`은 한 번 완료하며 원본 loop를 반복하지 않는다.
- reduced-motion 상태는 mount 시 snapshot이 아니라 `MediaQueryList` change를 반영하는 live readonly state다.
- 자동 Scene 전환 실패는 같은 선택을 frame마다 재시도하지 않는다. active 선택으로 복귀하거나 명시적 refresh가 있어야 retry한다.
- custom Driver는 등록된 factory를 통해서만 생성한다.
- custom Driver option은 immutable JSON형 data만 허용하고 class instance·함수·DOM object·non-finite number를 거부한다.
- Scroll·custom Driver는 공통 `sample.active`로 Scene 후보를 제공하고,
  동시에 active이면 Experience 선언 순서상 마지막 후보가 이긴다.
- Scene 전환 시 Driver listener와 lease를 Scope가 정리한다.

## 7. Renderer·Viewport·Quality

- viewport/scissor pass 다음 no-pass render는 전체 drawing-buffer viewport를
  복원한 뒤 렌더링한다.

- Renderer는 Port 뒤에 둔다.
- 하나의 compositor Surface는 viewport·scissor가 다른 여러 View를 순서대로
  렌더할 수 있다.
- isolated Surface는 독립 canvas·Renderer·context를 소유하지만 Application의
  FrameLoop과 Scroll Port를 공유한다.
- View clear policy는 `all | depth | none` 중 하나이며 암묵적인 전역 clear에
  의존하지 않는다.
- resize는 CSS size와 device pixel ratio를 분리한다.
- pixel ratio는 viewport 크기, coarse-pointer capability와 drawing-buffer
  pixel 예산을 사용하는 Quality 정책으로 clamp한다.
- resize·VisualViewport·screen orientation·pointer capability 변경은 한
  animation frame으로 coalesce한다.
- Quality는 `high → medium → low` 단계 저하와 역방향 회복을 모두 지원한다.
- Quality는 분리된 threshold, sample-window cooldown과 background delta 필터를 사용한다.
- UA 문자열 기반 iOS/Samsung 분기 대신 capability와 측정을 사용한다.
- WebGL context loss 시 해당 Surface의 pass만 중지하고 restore/fallback
  transaction을 수행한다.
- context restore는 해당 Surface에 연결된 Track Scene만 재생성한다.
- 한 Surface의 장애가 다른 Surface나 전역 FrameLoop를 suspend하면 실패다.
- Scene 전환 전 필요한 program은 가능한 범위에서 사전 compile한다.

## 8. Resource·Asset

- Application·Runtime·Surface·Scope dispose는 일부 cleanup이 실패해도 나머지를
  모두 시도하고 마지막에 `MiseAggregateError`로 보고한다.

- 모든 자원은 own·borrow·lease 중 하나다.
- Scope child와 cleanup은 역순으로 정리한다.
- listener, observer, timer, frame lease와 animation context도 자원이다.
- Scene graph에서 제거한 것만으로 dispose 완료로 보지 않는다.
- shared asset은 ref-count lease로 관리한다.
- 하나의 GLB owner가 공유 geometry·material·texture·skeleton과 owned `ImageBitmap`을 정리할 때 각 자원을 정확히 한 번 dispose/close한다.
- 실제 asset consumer 전에는 AssetStore abstraction을 만들지 않는다.
- GLB를 기본 교환 형식으로 사용하고 decoder는 Adapter에서 주입한다.
- runtime loader는 query/hash 없는 same-origin `.glb`, 32 MiB byte budget, GLB 2.0
  header와 embedded-only resource policy를 강제한다.
- GLB 외부 buffer·image URI, redirect와 unsupported media type을 허용하면 실패다.
- Host asset catalog는 MISE adapter 호출 전에도 제품 허용 경로·확장자를 검증한
  branded URL 또는 동등한 nominal type을 사용한다. 일반 texture loader는 Host
  플랫폼 경계가 소유하고 lifecycle abort 뒤 pending·late 결과를 정리한다.
- Provider·Driver·Port·Object factory와 Shader module은 build에 포함된 신뢰 코드다.
  remote module URL과 runtime JSON module path를 실행하지 않는다.

## 9. Shader

- effect별 `.vert.glsl`, `.frag.glsl`, TS owner를 분리한다.
- uniform 변경은 Effect owner method를 통해서만 한다.
- frame 중 material define과 program variant를 바꾸지 않는다.
- compile 실패는 stable error code와 제품 fallback으로 처리한다.
- Effect dispose가 material, owned texture와 listener를 정리한다.
- arbitrary query나 사용자 입력으로 shader module을 import하지 않는다.

## 10. DOM·Motion·Navigation

- 단순 Host의 Surface는 기존 `[data-mise-surface]`를 hydrate하거나 native
  DOM으로 한 번만 생성하며 ID `default`로 정규화한다.
- Stage Surface는 `target.kind: "default" | "selector"`로 canvas를 resolve한다.
- View는 `target.kind: "surface" | "selector"`로 Surface 전체 또는 section
  anchor를 가리킨다.
- DOM boundary만 Scroll·refresh·Surface viewport 변경 시 Surface snapshot과
  View rect를 batch 측정한다. 정지된 continuous frame에서 다시 읽지 않으며
  Scene·Driver·Renderer는 selector query나 `getBoundingClientRect()`를 직접
  호출하지 않는다.
- layout이 dirty일 때 한 application frame에서 read phase를 한 번 실행한 뒤
  update와 render를 수행한다.
- runtime 생성 Surface만 dispose하며 Host가 제공한 SSR Surface는 제거하지 않는다.
- canvas·fallback·Inspector selector는 MISE HTML·TS·SCSS가 함께 소유한다.
- Host는 문구와 `--mise-*` custom property만 확장한다.
- DOM query는 create/activate 경계에서 수행하고 frame hot path에서 반복하지 않는다.
- listener는 ResourceOwner에 등록한다.
- GSAP context는 lifecycle Scope와 함께 revert한다.
- Lenis frame은 MISE scheduler 하나에 연결한다.
- Barba hook은 PageChanger 호출만 하고 Scene 내부를 직접 조작하지 않는다.
- `afterChange`는 `PageChanger.mount()` Promise를 반환해 navigation 완료가 page mount 완료보다 앞서지 않게 한다.
- reduced-motion에서는 의미를 유지한 대체 경로를 제공한다.
- reduced-motion이 실행 중 켜지면 GSAP animation과 frame lease를 즉시 정리한다.

## 11. Health·Debug

- `healthProfile`로 추가한 Host key는 Provider
  `boot({ health }: MiseBootContext)`에서 `health.mark(key)`로 관측한다.
- `MiseHealthReporter`는 expected key mark만 허용하며 내부 HealthCheck resolve,
  report 변경과 Service Locator 기능을 제공하지 않는다.

- Health는 실제 협력 호출 지점만 mark한다.
- 중복 mark는 멱등이다.
- expected profile 밖 mark는 report를 변경하지 않으며 healthy callback은 정확히 한 번만 실행한다.
- core expected set은 compiled capability에서 생성한다.
- `application.container`, `application.factory`, `runtime.clock`은 core composition에서 관측한다.
- `scene.object-factory`는 Scene definition이 Object factory를 선언한 경우에만 expected set에 포함한다.
- `page.motion`은 실제 호출 시 관측하되 모든 Page의 기본 expected key로 강제하지 않는다.
- 제품 profile은 framework core에 하드코딩하지 않는다.
- Debug Adapter 미등록은 internal Null Object로 대체하고 다른 optional Adapter의 부재처럼 compile 실패로 취급하지 않는다.
- Inspector는 상태를 읽지만 commit·resolve·dispose를 직접 실행하지 않는다.
- Playground는 별도 subpath와 lazy import를 사용한다.
- Debug factory는 shared `FrameControl`을 주입받고 semantic control commit 뒤 `invalidate()`만 요청한다.
- lil-gui는 optional peer이며 `autoPlace: false`로 MISE container에 mount한다.
- lil-gui `listen()`은 별도 RAF를 생성하므로 금지하고 5Hz 이하 snapshot에서 `updateDisplay()`만 호출한다.
- Playground control은 scalar `get/set`만 받고 Object3D·renderer·raw uniform을 받지 않는다.
- Playground dispose는 `GUI.destroy()`와 container 제거를 모두 완료한다.
- hot path log와 raw exception·stack·DOM·전체 URL을 금지한다.
- logger는 message와 context를 모두 sanitize한다. sanitizer·sink 실패가 application lifecycle을 중단하면 실패다.
- logger context는 collection 64개와 전체 node 256개를 상한으로 하며 credential,
  개인정보, session, 전체 URL/query와 절대 경로를 Sink 전에 제거한다.

## 12. Package

- Host app과 publish package의 `package.json`·tsconfig·Vite config를 분리한다.
- runtime dependency는 peer-only로 유지하고 UI component framework를 추가하지 않는다.
- required vendor는 peer, optional Adapter vendor는 optional peer로 둔다.
- 모든 peer는 library bundle에서 external 처리한다.
- export map은 허용 subpath를 열거한다.
- HTML·CSS·SCSS asset subpath를 각각 열거하고 root JS와 분리한다.
- Sass conditional export와 precompiled CSS를 동시에 제공한다.
- `sideEffects: false`는 실제 import side effect 0을 검증한 뒤에만 사용한다.
- tarball 자체를 publint, type resolver와 external fixture로 검사한다.
- 모든 code subpath는 하나의 API Extractor review entry와 committed API report로 drift를 검사한다.
- architecture graph는 module/edge 수가 0이면 실패하며 cycle·forbidden direction·unresolved relative import를 검사한다.
- architecture graph는 Container import/resolve 경계, `Contracts.ts` facade, production TS 파일 450줄 상한과 catch-all module 이름을 함께 검사한다.
- Knip unused file·export·dependency 0과 Stryker mutation score 95 이상을 commercial Gate로 둔다.
- fixture는 HTML marker와 Sass `pkg:` compile을 검사한다.
- RC tarball을 실제 Host 제품에 재설치한 뒤 stable release한다.

## 13. Extension 판정

새 abstraction은 다음 네 조건을 모두 만족할 때만 추가한다.

1. 실제 consumer가 둘 이상이거나 교체 가능한 boundary다.
2. lifecycle owner가 명확하다.
3. public API 증가보다 중복·결합 감소가 크다.
4. 실패·dispose·type test를 작성할 수 있다.

하나라도 충족하지 않으면 제품 내부 concrete 구현으로 유지한다.

## 14. Security basis

- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [Khronos glTF 2.0 specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)
