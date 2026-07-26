# Frontend boilerplate

## Runtime ownership

```text
public/index.php
  → resources/data/portfolio.json
  → resources/views/layouts/app.php
  → Vite development entry or production manifest

resources/ts/app.ts
  → Barba page lifecycle
  → PageRegistry
  → Swiper page component
  → Lenis fine-pointer scroll / native touch scroll
  → one persistent Three.js WebGLRenderer
  → SceneDirector → GLSL scene
```

- PHP는 JSON 로드, UTF-8 escape, Vite asset 연결과 HTML만 담당한다.
- TypeScript owner는 자신이 만든 listener, RAF, Swiper, Lenis, Three.js 자원을 `dispose()`한다.
- iOS/Galaxy 및 reduced-motion 환경에서는 Lenis 대신 native scroll을 사용한다.
- WebGL canvas와 renderer는 브라우저 수명 동안 하나만 유지한다.

## Sass structure

```text
resources/scss/style.scss
├─ abstract/
│  ├─ _tokens.scss
│  └─ _mixins.scss
├─ base/
│  ├─ _reset.scss
│  └─ _global.scss
├─ layouts/_site.scss
├─ components/_carousel.scss
└─ pages/_home.scss
```

`style.scss`가 8개 파일과 cascade layer 순서를 소유한다. Swiper 기본 CSS는 TypeScript entry에서 package import한다. 새 partial은 현재 DOM/TS consumer와 독립 책임이 있을 때만 추가하고 validator allow-list를 함께 갱신한다. 빈 폴더, `index.scss`, 범용 utility 묶음과 placeholder partial은 만들지 않는다.

현재 dark WebGL palette, fluid typography, `svh`/`dvh`, safe-area와 reduced-motion만 공통 기반으로 유지한다. modal, drawer, toast처럼 현재 화면이 소비하지 않는 UI는 필요 시 해당 기능과 함께 추가한다.

## Blender and models

- Blender export는 glTF 2.0 binary `.glb`를 기본으로 한다.
- scale/rotation을 적용하고 불필요한 mesh, material, texture와 animation을 제거한 뒤 export한다.
- 모델은 `public/assets/models/`에 두고 필요 page/scene에서 `BlenderModelLoader`를 동적 import한다.
- 첫 화면을 모델 download로 차단하지 않는다. 정적/GLSL fallback을 먼저 렌더링한다.
- loader가 반환한 `dispose()`를 scene disposal 시 반드시 호출한다.
- Draco/KTX2를 실제 사용하기 전에는 decoder를 포함하지 않는다. 도입 시 decoder 경로와 구형 iOS/Galaxy 실기기 비용을 별도 측정한다.

## Official basis

- [Vite backend integration](https://vite.dev/guide/backend-integration.html)
- [Vite production build](https://vite.dev/guide/build)
- [Sass `@use`](https://sass-lang.com/documentation/at-rules/use/)
- [Barba markup](https://barba.js.org/docs/getstarted/markup/)
- [Swiper modules](https://swiperjs.com/get-started)
- [Lenis](https://github.com/darkroomengineering/lenis)
- [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)
- [Three.js ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial.html)
- [Blender glTF exporter](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html)
