export const FULLSCREEN_VERTEX_SHADER = `
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

const SHARED_FRAGMENT = `
precision highp float;

uniform vec2 uResolution;
uniform vec3 uPrimary;
uniform vec3 uSecondary;
uniform vec3 uAccent;
uniform float uTime;
uniform float uProgress;

out vec4 outColor;

float noise(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
`;

export const HOME_FRAGMENT_SHADER = `${SHARED_FRAGMENT}
void main() {
  vec2 uv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
  vec2 p = uv - 0.5;
  p.x *= uResolution.x / max(uResolution.y, 1.0);
  float drift = sin(p.x * 3.2 + uTime * 0.28) * 0.08;
  float field = exp(-3.2 * length(p - vec2(0.25, 0.12 + drift)));
  float horizon = smoothstep(-0.35, 0.55, p.y + uProgress * 0.18);
  float grain = (noise(gl_FragCoord.xy + uTime) - 0.5) * 0.018;
  vec3 color = mix(uPrimary, uSecondary, horizon * 0.72);
  color += uAccent * field * (0.14 + uProgress * 0.08);
  outColor = vec4(color + grain, 1.0);
}
`;
