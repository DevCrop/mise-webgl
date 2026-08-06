---
id: mise.docs.lifecycle-recipes
title: MISE Lifecycle Recipes
description: before, after, Promise와 abort transaction 예시
locale: ko
route: /ko/lifecycle-recipes
section: webgl
order: 43
status: stable
---

# Lifecycle와 Promise 설계

## 1. 전환 transaction

Scene 전환은 `prepare → beforeEnter → mount → beforeLeave → commit → dispose outgoing → afterLeave → afterEnter` 순서다.

- `create`, `beforeEnter`, `beforeLeave`는 pre-commit이다. reject하면 새 Scene을 정리하고 기존 active Scene을 유지한다.
- `afterLeave`, `afterEnter`는 post-commit이다. reject는 warning으로 격리하며 이미 commit된 Scene을 rollback하지 않는다.
- post-commit hook을 기다리는 동안 최신 전환이 pre-commit에서 실패하면 기존 committed Scene과 그 성공 결과를 유지한다.
- 네 hook은 동일한 frozen `SceneTransitionContext`를 받는다.
- `context.signal.aborted`는 더 최신 전환이 현재 작업을 대체했다는 뜻이다.
- hook은 `void | Promise<void>`를 반환한다. fire-and-forget promise를 만들지 않는다.

```ts
const intro = defineScene({
  id: "intro",
  drive: auto({
    duration: 2,
    loop: false,
    reducedMotion: { mode: "complete" },
  }),
  async create(context) {
    const model = await loader.load("/assets/intro.glb", {
      signal: context.signal,
    });
    context.scope.own(model);
    return createIntroInstance(model);
  },
  async beforeEnter({ signal }) {
    await prepareAudio(signal);
  },
  afterEnter() {
    analytics.sceneViewed("intro");
  },
});
```

## 2. before intro와 after intro

`beforeEnter`는 진입을 성공시키기 위해 반드시 끝나야 하는 준비에만 쓴다. 핵심 GLB, 필수 decoder, camera prerequisite가 예다. 분석 로그, prefetch, 비필수 audio는 `afterEnter` 또는 별도 background service에 둔다.

`beforeLeave`는 commit 전에 완료해야 하는 저장·확인에만 쓴다. 시각 fade만 필요하면 Scene의 Driver/Effect가 소유하는 것이 우선이다.

`afterEnter`와 `afterLeave`는 이미 상태가 확정된 뒤의 알림이다. 여기서 실패해도 상태를 되돌리지 않는다.

## 3. 다중 Track과 Surface 복구

각 Track은 별도 SceneChanger와 transition epoch를 가진다. 같은 frame에서 여러
Track 전환이 시작될 수 있지만 hook 순서는 Track 내부에서만 보장한다.

```text
Track background: beforeEnter → commit → afterEnter
Track section:    beforeEnter → commit → afterEnter
```

두 Track 사이의 완료 순서를 전제로 제품 로직을 작성하지 않는다. 반드시 함께
성공해야 하는 데이터 준비는 Scene hook끼리 호출하지 말고 Experience 활성화 전
Host orchestration 또는 공유 CPU asset promise에서 완료한다. GPU resource와
commit은 Track/Surface별로 유지한다.

Surface context restore는 그 Surface의 active Track마다 `recreate()`를 수행한다.
한 Track 재생성이 reject되면 해당 Surface를 fallback으로 유지하고 다른 Surface의
Scene·FrameLoop는 계속 실행한다. restore hook에서 다른 Track을 clear하거나
전역 suspension을 획득하지 않는다.

## 4. BAD / BASE / GOOD

| 수준 | 예 | 결과 |
|---|---|---|
| BAD | hook 안에서 `void fetch()` 후 즉시 반환 | reject 유실, 순서 불명 |
| BAD | `afterEnter` 실패 시 이전 Scene 복원 | dispose된 state를 되살릴 위험 |
| BAD | boolean `isLoading`, `isEntering`, `isLeaving`를 독립 변경 | 불가능 상태 발생 |
| BAD | 한 Track hook이 다른 Track의 SceneChanger를 호출 | epoch·rollback 경계 결합 |
| BASE | hook promise를 반환하고 signal을 확인 | 순서와 stale 차단 확보 |
| GOOD | 필수 prepare만 pre-commit, 부수 효과는 post-commit | transaction 경계 명확 |
| GOOD | resource는 먼저 scope에 등록하고 다음 await 수행 | 중간 실패에도 rollback 가능 |

## 5. Promise 규칙

- 작업 생성 직후 cleanup 소유권을 등록한다.
- `await` 뒤에는 signal 또는 owner active 상태를 확인한다.
- `AbortError`와 stale transition은 정상 취소로 취급한다.
- 원문 exception, URL, 경로를 production log에 넣지 않는다.
- 사용자에게 필요한 실패는 stable error code로 변환한다.
- 무기한 promise를 lifecycle hook에 두지 않는다. timeout은 제품 정책으로 명시한다.

## 6. 검증 시나리오

1. `create` reject: 기존 Scene 유지, candidate scope dispose.
2. `beforeEnter` reject: mount/commit 없음.
3. `beforeLeave` reject: 기존 Scene 유지.
4. 새 전환이 이전 load를 대체: 이전 signal abort, 늦은 결과 dispose.
5. `afterEnter` reject: 새 Scene active 유지, warning 1회.
6. hook 내부 `clear()`: stale epoch가 active 상태를 복구하지 않음.
7. post-commit hook 대기 중 대체 전환 reject: committed Scene과 성공 결과 유지.
8. 중복 `dispose()`: side effect 1회.
9. Track A 전환 중 Track B reject: A transaction과 active Scene 유지.
10. isolated Surface restore reject: 해당 Surface fallback, 다른 Surface render 유지.
