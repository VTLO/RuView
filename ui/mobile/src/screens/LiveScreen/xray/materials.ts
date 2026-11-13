import * as THREE from 'three';

/** Uniforms shared by every X-ray material: time for scanlines, flicker for signal dropouts. */
export const xrayUniforms = {
  uTime: { value: 0 },
  uFlicker: { value: 1 },
};

export type XrayOptions = {
  /** Strength of the glowing silhouette edge. */
  rim?: number;
  /** Base translucency across the whole surface (0 = edges only). */
  fill?: number;
  /** Fresnel exponent: higher = thinner, sharper edge. */
  power?: number;
};

const vertexShader = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vY = wp.y;
    vec4 mv = viewMatrix * wp;
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uRim;
  uniform float uFill;
  uniform float uPower;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uFlicker;
  varying vec3 vN;
  varying vec3 vV;
  varying float vY;
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower);
    float scan = 0.8 + 0.2 * sin(vY * 140.0 - uTime * 3.0);
    float a = (f * uRim + uFill) * scan * uFlicker * uOpacity;
    gl_FragColor = vec4(uColor, a);
  }
`;

/**
 * Translucent "radiograph" material: additive Fresnel rim + faint fill + moving scanlines.
 * `material.opacity` is proxied to the shader so callers can fade it like a standard material.
 */
export function xrayMaterial(color: number, opts: XrayOptions = {}): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uRim: { value: opts.rim ?? 1 },
      uFill: { value: opts.fill ?? 0.04 },
      uPower: { value: opts.power ?? 2.2 },
      uOpacity: { value: 1 },
      uTime: xrayUniforms.uTime,
      uFlicker: xrayUniforms.uFlicker,
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  Object.defineProperty(mat, 'opacity', {
    configurable: true,
    get: () => mat.uniforms.uOpacity.value as number,
    set: (v: number) => {
      mat.uniforms.uOpacity.value = v;
    },
  });
  return mat;
}
