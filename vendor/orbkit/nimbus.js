// Orbkit SHDR-21 (Nimbus), by zzzzshawn. MIT; see LICENSE.
// Shader and helpers preserved from https://orbkit.zzzzshawn.cloud/r/shdr-21.json
// The React shell is replaced by the local vanilla WebGL renderer in flo-orb.js.
export const params = {
  "speed": 10.0,
  "camDist": 4.4,
  "focal": 1.8,
  "radius": 2.0,
  "scale": 0.8,
  "churn": 0.3,
  "threshold": 0.075,
  "edgeSoft": 0.8,
  "density": 3.2,
  "absorb": 1.4,
  "shadowAbsorb": 2.4,
  "shadowLift": 0.55,
  "aniso": 0.45,
  "lightSpin": 0.12,
  "power": 1.9,
  "ambient": 0.12,
  "exposure": 1.0,
  "alphaGain": 1.5
};
export const helpers = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;   // slow ambient clock (half real-time)
uniform float uAnim;   // flow clock — its speed follows the output volume
uniform float uInput;  // input volume 0..1: user speech energy
uniform float uOutput; // output volume 0..1: agent speech energy

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(11.7, 7.3);
    a *= 0.5;
  }
  return v;
}
vec2 orbUV() { return (2.0 * gl_FragCoord.xy - uRes) / min(uRes.x, uRes.y); }

// GLSL ES 1.0 has no tanh() — it arrived in ES 3.0. Shader-golf listings lean
// on it as a tone-mapper, so it ships here. Clamped against exp() overflow;
// accurate for the non-negative accumulators those shaders produce.
vec3 tanh3(vec3 x) {
  x = clamp(x, -10.0, 10.0);
  vec3 e = exp(2.0 * x);
  return (e - 1.0) / (e + 1.0);
}

`;
export const fragment = `
#define STEPS 56
#define LIGHT_STEPS 4
#define DENSITY_OCT 4
#define AA 1

const float PI = 3.14159265359;

// Volume-reactive values, resolved once per fragment in main().
float nimbusPower;
float nimbusDensity;

/*
  Density inside the sphere.

  The radial term falls to zero at the boundary, which both bounds the volume
  and gives the soft edge for free. The cos-warp folds the sample point a few
  times — the same cheap turbulence the other orbs use — and the threshold
  carves that into clumps rather than an even fog.
*/
float density(vec3 p, float animTime) {
  float shell = 1.0 - length(p) / uP_radius;
  if (shell <= 0.0) return 0.0;

  vec3 q = p * uP_scale;
  float f = 1.0;
  for (int k = 0; k < DENSITY_OCT; k++) {
    q += cos(q.yzx * f + animTime * uP_churn) / f;
    f *= 1.8;
  }

  float n = (sin(q.x) + sin(q.y) + sin(q.z)) / 3.0 * 0.5 + 0.5;
  // smoothstep against the threshold is the clump control: high threshold
  // leaves sparse wisps, low fills the sphere with even fog
  float clump = smoothstep(uP_threshold, 1.0, n);
  return clump * pow(shell, uP_edgeSoft) * nimbusDensity;
}

/*
  Henyey-Greenstein: g > 0 biases scattering forward, which is what gives the
  bloom on the limb facing the light.

  The physical form carries a 1/(4*PI) normalisation. It is dropped here and
  folded into uP_power instead — kept in, the whole term sits around 0.02 and
  the orb renders black unless power is pushed into the hundreds, which makes
  the slider useless.
*/
float phaseHG(float c, float g) {
  float g2 = g * g;
  return (1.0 - g2) / pow(max(1.0 + g2 - 2.0 * g * c, 0.0001), 1.5);
}

vec4 nimbusRender(vec2 fragCoord) {
  float animTime = uP_speed; // integrated clock

  vec2 uv = (2.0 * fragCoord - uRes) / min(uRes.x, uRes.y);
  vec3 ro = vec3(0.0, 0.0, -uP_camDist);
  vec3 rd = normalize(vec3(uv, uP_focal));

  /*
    Light direction, slowly orbiting so the shading is never static.

    The z term is kept POSITIVE — the camera looks along +z, so a light also
    pointing along +z sits behind the cloud. That is the back-lit case, where
    dot(rd, L) approaches 1 and the forward-scattering phase blooms. Put the
    light on the camera's side instead and every ray samples the phase function
    on its back-scatter tail, where it is roughly ten times smaller, and the orb
    goes muddy.
  */
  vec3 L = normalize(vec3(
    cos(animTime * uP_lightSpin) * 0.7,
    0.45,
    sin(animTime * uP_lightSpin) * 0.35 + 0.65
  ));

  float phase = phaseHG(dot(rd, L), uP_aniso);

  // Start the march at the sphere's front face instead of the camera — every
  // step before that contributes nothing, and at 56 steps they are expensive.
  float toCentre = uP_camDist;
  float tStart = max(toCentre - uP_radius, 0.0);
  float span = 2.0 * uP_radius;
  float dt = span / float(STEPS);

  float T = 1.0;
  vec3 scattered = vec3(0.0);

  for (int i = 0; i < STEPS; i++) {
    float t = tStart + (float(i) + 0.5) * dt;
    vec3 p = ro + rd * t;

    float dn = density(p, animTime);
    if (dn > 0.001) {
      // short march toward the light for self-shadowing
      float shadow = 1.0;
      float lstep = uP_radius / float(LIGHT_STEPS);
      for (int k = 1; k <= LIGHT_STEPS; k++) {
        vec3 lp = p + L * (float(k) - 0.5) * lstep;
        shadow *= exp(-density(lp, animTime) * lstep * uP_shadowAbsorb);
      }

      /*
        In-scattered light: warm where lit, cool where the volume shadows
        itself.

        The shadow term appears ONCE, inside the mix. Multiplying by it again
        as a factor — the obvious-looking thing to write — scales the shadowed
        end of the mix toward zero, so the cool colour is always multiplied
        away and the cloud comes out monochrome beige however it is tinted.
        uP_shadowLift is how much light still reaches the shadowed side.
      */
      vec3 lit = mix(uC_shadow * uP_shadowLift, uC_light, shadow);
      scattered += T * dn * dt * lit * phase * nimbusPower;

      T *= exp(-dn * dt * uP_absorb);
      if (T < 0.01) break;
    }
  }

  // a soft ambient body so the unlit side is not pure black
  float body = 1.0 - T;
  scattered += uC_shadow * body * uP_ambient;

  return vec4(scattered, body);
}

void main() {
  /*
    Agent output turns the light up; user input thickens the cloud. Both are
    AMPLITUDES. Churn is deliberately NOT volume-scaled: it multiplies the
    accumulated clock into a phase (animTime * churn), so scaling it by the
    live volume would turn every volume wobble into a phase jump the size of
    the whole clock — the cloud scrambles chaotically on each state change
    instead of gliding, and gets worse the longer the page is open.
  */
  nimbusPower = uP_power * (0.7 + 0.9 * uOutput);
  nimbusDensity = uP_density * (1.0 + 0.35 * uInput);

  vec4 acc = vec4(0.0);
#if AA > 1
  for (int mx = 0; mx < AA; mx++) {
    for (int my = 0; my < AA; my++) {
      vec2 offset = vec2(float(mx), float(my)) / float(AA) - 0.5;
      acc += nimbusRender(gl_FragCoord.xy + offset);
    }
  }
  acc /= float(AA * AA);
#else
  acc = nimbusRender(gl_FragCoord.xy);
#endif

  vec3 col = tanh3(acc.rgb * uP_exposure);
  float a = clamp(acc.a * uP_alphaGain, 0.0, 1.0);

  // Emitted/scattered light, so rgb is already premultiplied — do NOT multiply
  // by alpha again (see the same note in shdr-31).
  gl_FragColor = vec4(col, a);
}
`;
