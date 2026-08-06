---
id: mise.docs.verification
title: MISE Framework Verification
description: framework, package, browser와 device 합격 Gate
locale: ko
route: /ko/verification
section: guides
order: 80
status: stable
---

# MISE Framework Verification

이 package 문서는 MISE를 독립 NPM framework로 판정하는 Gate다. Host 제품의 배포 Gate와 별개다.

## 1. 판정 원칙

- 실행하지 않은 검사는 PASS가 아니다.
- 문서상 설계와 실제 package 증거를 분리한다.
- 한 도구의 PASS로 다른 실패 영역을 대신하지 않는다.
- 실패 seed·fixture·API diff는 재현 가능한 artifact로 남긴다.
- 100점은 아래 모든 Gate가 현재 commit에서 통과했다는 뜻이다.

## 2. 필수 Gate

| ID | Gate | 필수 증거 |
|---|---|---|
| `V-01` | UTF-8·Markdown | fatal UTF-8 decode, 내부 링크 0 broken |
| `V-02` | Architecture | cycle 0, forbidden direction 0, deep import 0, source >450줄 0 |
| `V-03` | Compiler | strict package typecheck PASS |
| `V-04` | Public type | positive·negative type fixtures PASS |
| `V-05` | API | reviewed API report, unexpected diff 0, undocumented 0, warning 0 |
| `V-06` | Unit | Plan, Container, Factory Host, Clock, Changer, Driver, Frame, Scope, Health PASS |
| `V-07` | Property/model | lifecycle random sequence invariant PASS |
| `V-08` | Mutation | target score ≥ 95 또는 survivor별 승인 근거 |
| `V-09` | Package | clean build, `npm pack`, publint, HTML·CSS·SCSS assets PASS |
| `V-10` | Resolution | ESM NodeNext·Bundler·Sass `pkg:` fixture PASS |
| `V-11` | Tree shaking | root import가 optional Adapter vendor를 load하지 않음 |
| `V-12` | Browser | mount, Scene/Page transition, abort, dispose, mobile DPR·buffer·회전 PASS |
| `V-13` | WebGL | context loss·restore·fallback PASS |
| `V-14` | Frame | duplicate RAF 0, idle RAF 0, resume delta 0 |
| `V-15` | Resource | 반복 전환 뒤 ledger와 renderer info plateau |
| `V-16` | Debug | production root graph에 Playground 0, lil-gui `listen()` 0, destroy·semantic invalidation PASS |
| `V-17` | Device | 지원 matrix의 실제 기기 결과 |
| `V-18` | Dogfood | RC tarball을 실제 Host에 설치해 build·browser PASS |
| `V-19` | Dead code | unused file·export·dependency 0 |

## 3. Architecture 검사

필수 규칙:

```text
kernel -> host                 forbidden
kernel -> concrete adapter     forbidden
host experience -> kernel      forbidden
host experience -> adapter     forbidden
adapter -> kernel deep path     forbidden
adapter -> root facade          forbidden
production -> test             forbidden
circular                        forbidden
unresolved local               forbidden
non-composition -> container   forbidden
non-composition resolve()      forbidden
Contracts.ts declaration       forbidden
production TS > 450 lines      forbidden
catch-all module name          forbidden
```

Package export map도 Kernel deep import를 runtime과 type resolution 양쪽에서 차단해야 한다.
Architecture command는 self-test 뒤 실제 graph의 module·internal edge 수를 출력해야 한다. 둘 중 하나가 0이면 violation 0이어도 실패다.

MISE Surface 검사:

```text
HTML template data contract
= runtime DOM data contract
= Surface SCSS selectors
```

Host selector·token·component framework 의존이 하나라도 있으면 실패다.

## 4. Type 검사

Positive fixture:

- literal Experience/Scene ID 보존
- readonly Scene order
- generic Container token의 resolve type 보존
- `defineObjectFactory` input/output type 보존
- custom object가 작은 Port를 구조적으로 구현
- root와 각 Adapter subpath의 정상 import
- NodeNext와 Bundler resolution

Negative fixture:

- invalid Driver spec
- 중복 ID를 정적으로 검출 가능한 범위
- Kernel deep import
- required option에 명시적 `undefined`
- PageKey와 SceneKey 교환
- readonly definition mutation
- compile 전 원본·nested Driver option mutation이 Plan snapshot에 전파되지 않음
- Container duplicate·missing·cycle
- Scene 미선언 Object factory 생성

Plan security fixture:

- ID는 ASCII safe identifier 128자 이하
- selector는 control character 없이 512자 이하
- Experience 64, Page 64 상한
- Experience당 Surface 8, View 32, Track 32 상한
- Track당 Scene 64, Scene당 Object factory 256 상한
- 모든 상한 초과는 Renderer·Driver·Scene 생성 전에 stable error로 거부

## 5. Lifecycle model

### Scene

명령:

```text
prepare A
activate A
prepare B
abort B
prepare C
fail before
fail action
fail after
clear
dispose
```

불변식:

- active Scene 최대 1
- stale epoch commit 0
- pre-commit 실패 시 기존 active 유지
- discarded incoming Scope 정리
- post-commit 실패 시 committed state 유지
- dispose 중복 효과 0

### Stage

명령:

```text
activate simple Experience
activate compositor Stage
View enter/leave viewport
isolated Surface context lost/restored
replace Stage
dispose
```

불변식:

- 기존 `scenes` form은 default Surface·View·Track과 동일하게 동작
- Application RAF·Scroll snapshot 각각 1
- 물리 Surface마다 canvas·Renderer 각각 1
- View render 순서 `Surface ID → order → View ID`
- visible Track은 첫 진입 전 Scene create 0
- offscreen Track update/render 0
- context loss Surface만 render/recreate 중지, 다른 Surface render 계속
- 한 View의 Track 최대 1, isolated Surface의 whole-Surface View 정확히 1
- Stage 교체·dispose 뒤 Track Driver와 추가 Renderer 잔존 0

### Frame

명령:

```text
invalidate
acquire continuous
release
suspend
resume
tick
dispose
```

불변식:

- 예약 RAF 최대 1
- suspension·dispose 중 예약 0
- 첫 frame·resume delta 0
- `rawDelta`는 실제 간격, `delta`는 0.1초 이하, `elapsed`는 clamp delta 누적
- pause 동안 elapsed catch-up 0, frame 순번 단조 증가
- continuous lease 0이며 invalidation이 없으면 idle

### Object Factory

명령:

```text
declare factory
create declared object
request undeclared factory
abort during async create
dispose Scene
```

불변식:

- Scene이 선언한 factory만 생성 가능
- create마다 독립 child Scope
- abort 전·후 candidate commit 0
- 실패·abort 시 Object와 child Scope 잔존 0
- Scene dispose 시 Object 역순 정리
- Container가 Object context에 노출되지 않음

### Resource

명령:

```text
own
borrow
lease
child
cleanup failure
dispose twice
```

불변식:

- cleanup 역순
- borrow dispose 0
- lease release 1회 효과
- 일부 cleanup 실패 후 나머지 계속
- aggregate failure는 stable error로 전달
- GLB cross-origin/query/non-GLB URL 거부
- GLB 외부 child URI, redirect, unsupported media type 거부
- GLB 32 MiB streaming budget과 GLB 2.0 header 검증
- abort가 fetch 전송과 stale commit을 모두 중단

## 6. Package 검사 순서

```text
clean install
→ package typecheck
→ architecture/dead-code
→ unit/property
→ library build
→ API report drift
→ mutation
→ npm pack
→ publint
→ code type resolution 검사
→ external fixture install
→ fixture typecheck
→ HTML marker 검사
→ Sass NodePackageImporter compile
→ fixture Vite build
→ Playwright
→ Host dogfood
```

검사는 source directory가 아니라 생성된 tarball을 대상으로 반복한다.

Source package의 canonical command:

```text
npm run verify:framework
npm run test:mutation
```

API signature를 의도적으로 변경한 경우에만 review 뒤 `npm run api:update`를 실행한다. production Gate는 update하지 않고 `api:check`로 unexpected diff를 실패시킨다. 이어서 `lint:public-docs`가 생성된 report의 `(undocumented)`와 `Warning:`을 각각 0으로 강제한다. API review entry와 `etc/mise-webgl.api.md`는 source review 자산이며 tarball에 포함하지 않는다.

추가 contract 검사:

- auto reduced-motion `pause`, `complete`, `shorten`의 progress·demand
- Auto Driver가 RAF timestamp jump와 reduced-motion pause 뒤 catch-up하지 않음
- Browser Application·Runtime·Surface cleanup 하나가 실패해도 후속 disposer가
  정확히 한 번 실행되고 aggregate error가 마지막에 전달됨
- Host Health key가 Provider boot reporter로 `pending → healthy`가 됨
- custom Driver self/mutual cycle·depth budget 거부와 비순환 공유 참조 허용
- Quality `high ↔ medium ↔ low`, hysteresis, cooldown, resume-spike 무시
- motion을 사용하지 않는 Page가 기본 Health profile을 영구 pending으로 만들지 않음
- core composition Health가 Container·Factory·Clock 실제 조립 지점을 관측함
- Object factory가 선언된 Plan만 `scene.object-factory`를 expected로 파생함
- compositor viewport/scissor/clear 순서와 isolated Surface 장애 격리
- partial pass 뒤 no-pass render가 전체 drawing-buffer viewport를 복원함
- offscreen visible Track Scene 지연 생성과 진입 후 단일 mount
- package `docs` 전체 포함과 내부 상대 링크
- Root plan acceptance criteria와 portable enterprise composition 문서가 구현·Gate와 동기화됨
- license 승인 전 `private: true`, `UNLICENSED`, public `publishConfig` 부재
- mutation wrapper가 Stryker setup probe를 실행 전·후 제거하고 중단 뒤 다음
  실행에서도 stale probe를 정리함
- canonical package Gate가 생성된 tarball fixture를 대상으로 WebGL dogfood와
  10회 전환 resource plateau를 자동 실행함
- logger가 credential·개인정보·URL·경로를 Sink 전에 제거하고 collection 64개,
  전체 node 256개를 넘는 context를 축약함

## 6.1 재귀 5-pass review

같은 결과를 다섯 번 반복 실행하는 대신 서로 다른 오류 class를 순서대로 닫는다.

1. **Boundary/API:** dependency direction, cycle, unresolved import, export map, API warning·diff.
2. **Lifecycle/concurrency:** mount rollback, async epoch/abort, navigation await, retry latch, dispose 멱등.
3. **Resource/WebGL/performance:** RAF·lease, listener, geometry/material/texture/skeleton/bitmap, context restore.
4. **Package/docs/security:** dead code, audit, tarball allow-list, external fixture, UTF-8, link와 logging redaction.
5. **Recursive clean Gate:** clean install 상태에서 앞 Gate와 build/browser/device/dogfood를 다시 실행한다.

각 pass는 앞 pass의 source·test·문서 변경을 입력으로 다시 검사한다. pass 5가 browser/device/dogfood 증거 없이 끝나면 전체 완료가 아니라 환경 의존 미검증으로 기록한다.

## 6.2 규칙 추적성

`ARCHITECTURE.md`의 규칙 ID는 family별로 연속되어야 하며 중복할 수
없다. 문서 validator는 아래 15개 family의 존재, 번호 연속성과 이 표의
Gate 연결을 검사한다.

| 규칙 family | 주 증거 Gate |
|---|---|
| `ARC` | `V-02`, `V-19` |
| `API` | `V-03`–`V-05`, `V-10`, `V-11` |
| `TYP` | `V-03`–`V-05`, `V-10` |
| `IOC` | `V-02`, `V-06`, `V-19` |
| `LIF` | `V-06`–`V-08`, `V-12` |
| `DRV` | `V-06`–`V-08`, `V-14` |
| `FRM` | `V-06`–`V-08`, `V-14` |
| `REN` | `V-06`, `V-12`–`V-15`, `V-17` |
| `RES` | `V-06`–`V-08`, `V-15` |
| `SHD` | `V-12`, `V-13`, `V-15`, `V-17` |
| `DOM` | `V-06`, `V-12`, `V-17` |
| `HLT` | `V-06`, `V-07`, `V-12` |
| `DBG` | `V-06`, `V-11`, `V-16` |
| `TST` | `V-01`–`V-19` Gate 설계와 실패 판정 |
| `NPM` | `V-03`–`V-05`, `V-09`–`V-11`, `V-18`, `V-19` |

이 표는 규칙을 PASS로 선언하지 않는다. 각 release는 연결된 Gate의 실제
결과를 별도 증거에 기록해야 한다.

## 7. 성능·자원 증거

최소 측정:

- idle 5초간 RAF callback 수
- Scene 전환 10회 전후 Scope ledger
- RC fixture geometry·material `created === disposed`, terminal active owner 0
- `renderer.info.memory.geometries`
- `renderer.info.memory.textures`
- `renderer.info.programs`
- active listener·observer·timer·frame lease 수
- context loss·restore 뒤 동일 지표
- Surface별 render call·drawing-buffer 크기와 전체 active WebGL context 수

내부 cache 때문에 일부 수치가 0으로 복귀하지 않을 수 있다. 합격 기준은 설명 가능한 baseline과 반복 후 지속 증가 0이다.

## 8. 100점

| 영역 | 배점 | 만점 조건 |
|---|---:|---|
| Architecture | 20 | `V-02`, `V-19` |
| Public API·Type | 20 | `V-03`–`V-05`, `V-10` |
| Lifecycle·OOP | 20 | `V-06`–`V-08` |
| WebGL·Performance | 15 | `V-12`–`V-15`, `V-17` |
| Debug·Health | 10 | capability Health, `V-16` |
| NPM Package | 10 | `V-09`, `V-11`, `V-18` |
| Docs·Examples | 5 | `V-01`, 규칙·구현·test 동기화 |

한 영역의 필수 Gate가 미실행이면 그 영역은 만점이 아니다. 전체 100점은 필수 Gate 19개가 모두 PASS일 때만 기록한다.

## 9. Release 기록 형식

```text
version:
commit:
date:
node:
typescript:
three:
browsers:
devices:
api-report:
tarball-sha256:
gate-results:
known-limits:
```

결과는 secret, 원문 stack, 사용자 경로와 전체 URL/query를 포함하지 않는다.

## 10. 증거 소유권

이 문서는 합격 기준과 기록 형식만 소유한다. 특정 날짜·version·commit의 PASS/FAIL, 테스트 개수, Host 결과와 미완료 항목은 release artifact 또는 Host 검증 문서에 기록한다.

MISE 공식 문서 세트에는 현재 상태 snapshot을 고정하지 않는다. 이 원칙으로 오래된 성공 기록이 새 release의 증거처럼 해석되는 것을 막는다.
