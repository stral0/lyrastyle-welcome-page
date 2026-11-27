// Shared GLSL (ES 3.00) prelude strings. Concatenate into shaders as needed.
export const HASH = /* glsl */`
float hash11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
vec3 hash33(vec3 p3){ p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }
// interleaved gradient noise: per-pixel jitter for sampled loops / dithering
float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(.06711056, .00583715)))); }
`;
export const NOISE = /* glsl */`
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
`;
export const COLOR = /* glsl */`
vec3 toLinear(vec3 c){ return mix(c / 12.92, pow((c + .055) / 1.055, vec3(2.4)), step(.04045, c)); }
vec3 toSRGB(vec3 c){ c = max(c, 0.); return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c)); }
float luma(vec3 c){ return dot(c, vec3(.2126, .7152, .0722)); }
`;
// Full-screen pass: vertex + fragment header. Fragment gets vUv (0..1), writes fragColor.
export const PASS_VS = /* glsl */`
in vec3 position; out vec2 vUv;
void main(){ vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }
`;
export const PASS_FS_HEAD = /* glsl */`
precision highp float; precision highp sampler2D;
in vec2 vUv; out vec4 fragColor;
uniform vec2 uRes; uniform float uTime;
` + HASH + NOISE + COLOR;
