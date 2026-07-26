# Debugging Runbook

## 실행

```text
npm run dev
→ http://localhost:5173/?debug=1
```

debug panel:

```text
FPS / frame ms
DPR
draw calls / triangles
geometry / texture
LCP / INP / CLS
```

## 로딩 문제

1. Network에서 HTML, JS, JSON과 3D asset 상태를 확인한다.
2. Console의 `runtime.error`, `runtime.unhandled_rejection`을 확인한다.
3. WebGL 없이도 HTML 콘텐츠가 표시되는지 확인한다.
4. Blender asset은 파일 크기, texture 경로와 glTF loader 오류를 분리한다.

## Frame 저하

1. debug panel에서 frame time과 DPR 하향 여부를 확인한다.
2. `renderer.info`에서 draw call, triangle, geometry, texture 증가를 확인한다.
3. Chrome Performance trace에서 main thread long task와 GPU frame을 확인한다.
4. texture 해상도, overdraw, transparent material, post-processing과 shader를 한 항목씩 끈다.
5. desktop 결과로 모바일 성능을 판단하지 않고 실제 Galaxy/iPhone에서 재측정한다.

## WebGL Context

1. `webgl.context_lost` 발생 여부를 확인한다.
2. static fallback에서 콘텐츠가 유지되는지 확인한다.
3. context 복원 후 reload와 renderer 재초기화를 확인한다.
4. 반복 전환 뒤 `renderer.info.memory`가 계속 증가하면 dispose 누락을 조사한다.

## Mobile Viewport

1. 주소창·하단 toolbar를 열고 닫는다.
2. 세로·가로 회전한다.
3. pinch zoom과 200% text zoom을 확인한다.
4. CTA와 dialog close가 safe area 및 keyboard에 가려지지 않는지 확인한다.

## 테스트

```text
npm run build
npm run test:browser
```

자동화 통과 후 `DEVICE-MATRIX.md`의 실제 기기 Gate를 수행한다.

