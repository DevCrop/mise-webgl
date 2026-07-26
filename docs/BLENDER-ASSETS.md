# Blender To Three.js Asset Rules

## 기본 형식

- 웹 전달 형식은 `.glb`를 기본으로 한다.
- `.blend`는 제작 원본이며 브라우저에 직접 전달하지 않는다.
- 별도 파일 수정이 필요한 경우만 `.gltf + .bin + textures`를 사용한다.
- Base64 embedded `.gltf`는 Blender 공식 문서상 가장 비효율적인 형식이므로 사용하지 않는다.

## Blender Export

- 필요한 Collection 또는 Selected Objects만 export한다.
- glTF 좌표 규약에 맞춰 `Y Up`을 사용한다.
- modifier 적용 여부를 결과 mesh 기준으로 검토한다.
- Principled BSDF의 base color, metallic, roughness, normal, emissive 중심으로 제한한다.
- 조명·후처리 의존 효과는 export 후 Three.js에서 다시 검증한다.
- animation은 필요한 Action/NLA Track만 포함한다.

## Geometry

Blender 공식 문서에 따라 quads와 n-gons는 glTF export에서 triangle로 변환된다. 불연속 UV와 flat-shaded edge는 정점이 분리되어 Blender 표시보다 vertex 수가 증가할 수 있다.

따라서 export 이후 실제 `.glb`의 triangle, vertex, material, texture와 animation 수를 측정한다.

## Texture

- 색상 texture와 non-color texture의 color-space 설정을 구분한다.
- normal map은 tangent-space를 사용한다.
- 모바일에서 필요하지 않은 초고해상도 texture를 포함하지 않는다.
- 동일 채널을 공유할 수 있으면 occlusion/roughness/metallic packing을 검토한다.

## Loading

- 첫 viewport에 필수인 asset과 지연 가능한 asset을 분리한다.
- model load 실패 시 HTML 콘텐츠와 CSS fallback을 유지한다.
- 전환·교체된 geometry, material, texture와 animation resource를 dispose한다.

## 공식 근거

- https://docs.blender.org/manual/en/3.3/addons/import_export/scene_gltf2.html
- https://threejs.org/manual/en/loading-3d-models.html
- https://threejs.org/manual/en/load-gltf.html
- https://threejs.org/manual/en/cleanup.html

