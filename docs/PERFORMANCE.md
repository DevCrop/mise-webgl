# WebGL Performance And Debugging

## Runtime 정책

```text
초기 DPR cap
→ 2초 frame sample
→ 평균 frame > 22ms
→ quality scale 단계 하향
→ 최소 DPR 0.75
```

- fine pointer DPR 상한은 1.5다.
- coarse pointer DPR 상한은 1.25다.
- frame delta는 50ms로 제한해 background 복귀 후 큰 animation jump를 방지한다.
- `renderer.info`에서 draw call, triangle, geometry와 texture 수를 수집한다.
- `?debug=1` 또는 development 환경에서 FPS, frame time, DPR, GPU 통계와 Web Vitals를 표시한다.

수치는 현재 장면의 로컬 budget이다. Blender 모델과 후처리가 추가되면 실제 기기 측정 후 조정한다.

## WebGL 장애

- renderer 생성 실패 시 정적 CSS 배경과 전체 콘텐츠를 유지한다.
- `webglcontextlost`에서 기본 처리를 막고 RAF를 중지한다.
- `webglcontextrestored` 후 페이지를 다시 초기화해 GPU 자원을 재생성한다.
- 종료 시 geometry, material과 renderer를 명시적으로 `dispose()`한다.

WebGL context 복원 후 이전 GPU 자원이 유효하지 않다는 브라우저 규칙:

- https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextrestored_event

Three.js 자원과 진단:

- https://threejs.org/manual/en/how-to-dispose-of-objects.html
- https://threejs.org/docs/pages/WebGLRenderer.html
- https://threejs.org/manual/en/rendering-on-demand.html

## 품질 Gate

- Production build 성공
- TypeScript 오류 0
- runtime `pageerror` 0
- WebGL fallback에서도 콘텐츠 접근 가능
- LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1을 실제 사용자의 75 percentile 목표로 관리
- 성능 회귀는 Lighthouse와 실제 기기 Performance trace로 확인

Core Web Vitals 근거:

- https://web.dev/articles/vitals
- https://developer.chrome.com/docs/lighthouse

