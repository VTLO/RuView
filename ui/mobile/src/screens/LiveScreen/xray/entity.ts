import * as THREE from 'three';
import { xrayMaterial } from './materials';

/*
 * The sensed "entity": a radiograph-like human silhouette whose details are deliberately off.
 * Faceless elongated skull, arms a little too long, four over-long fingers, a heart that beats
 * slightly out of step, viscera that slowly writhe, and rare involuntary twitches.
 */

const SKIN = 0xe6ecee;
const BONE = 0xffffff;
const ORGAN = 0xc15632;
const HEART = 0xff6a3d;

// COCO-17 rest pose (metres, Y-up). Arms deliberately long: wrists hang near mid-thigh.
export const BASE_POSE: [number, number, number][] = [
  [0.0, 1.73, 0.04], [-0.03, 1.77, 0.05], [0.03, 1.77, 0.05], [-0.08, 1.75, -0.01], [0.08, 1.75, -0.01],
  [-0.19, 1.45, 0.0], [0.19, 1.45, 0.0], [-0.25, 1.08, 0.03], [0.25, 1.08, 0.03], [-0.27, 0.7, 0.03],
  [0.27, 0.7, 0.03], [-0.1, 0.95, 0.0], [0.1, 0.95, 0.0], [-0.11, 0.5, 0.02], [0.11, 0.5, 0.02],
  [-0.11, 0.05, 0.0], [0.11, 0.05, 0.0],
];

export const BONES: [number, number][] = [
  [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], [5, 11], [6, 12], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
];

// Flesh segments: [jointA, jointB, radiusA, radiusB]
const LIMBS: [number, number, number, number][] = [
  [5, 7, 0.048, 0.038], [7, 9, 0.036, 0.026], [6, 8, 0.048, 0.038], [8, 10, 0.036, 0.026],
  [11, 13, 0.07, 0.048], [13, 15, 0.046, 0.03], [12, 14, 0.07, 0.048], [14, 16, 0.046, 0.03],
];

const FINGERS = 4;
const VERTEBRAE = 14;
const RIBS = 6;

const unitCapsule = new THREE.CapsuleGeometry(0.5, 1, 6, 14); // radius 0.5, total height 2
const UP = new THREE.Vector3(0, 1, 0);
const tv1 = new THREE.Vector3();
const tv2 = new THREE.Vector3();
const tq = new THREE.Quaternion();

/** Stretch a unit capsule between a and b with an average radius r. */
export function placeSegment(m: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, r: number) {
  tv1.subVectors(b, a);
  const len = Math.max(1e-4, tv1.length());
  m.position.addVectors(a, b).multiplyScalar(0.5);
  m.scale.set(r * 2, len / 2, r * 2);
  m.quaternion.copy(tq.setFromUnitVectors(UP, tv1.multiplyScalar(1 / len)));
}

function torsoGeometry(): THREE.BufferGeometry {
  // Lathe profile (radius, height): hips, pinched waist, ribcage, narrow shoulders.
  const prof = [[0.0, -0.3], [0.12, -0.29], [0.155, -0.2], [0.125, -0.06], [0.15, 0.08], [0.17, 0.18], [0.15, 0.26], [0.06, 0.3], [0.0, 0.3]];
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 28);
  g.scale(1, 1, 0.6);
  return g;
}

type Part = { mesh: THREE.Mesh; base: number };

export interface Entity {
  root: THREE.Group;
  parts: Part[];
  head: THREE.Mesh; skull: THREE.Mesh; neck: THREE.Mesh; torso: THREE.Mesh;
  limbs: THREE.Mesh[]; fingers: THREE.Mesh[]; palms: THREE.Mesh[]; feet: THREE.Mesh[];
  lungs: THREE.Mesh[]; heart: THREE.Mesh; gut: THREE.Mesh; pelvis: THREE.Mesh;
  vertebrae: THREE.Mesh[]; ribs: THREE.Mesh[]; glint: THREE.Mesh;
  bones: THREE.LineSegments;
  smoothKps: THREE.Vector3[]; targetKps: THREE.Vector3[]; pose: THREE.Vector3[];
  fadeIn: number;
  twitch: { next: number; until: number; joint: number; offset: THREE.Vector3; headRoll: number };
}

export function createEntity(scene: THREE.Scene): Entity {
  const root = new THREE.Group();
  scene.add(root);
  const parts: Part[] = [];
  const add = (geo: THREE.BufferGeometry, color: number, base: number, opts?: Parameters<typeof xrayMaterial>[1]) => {
    const mesh = new THREE.Mesh(geo, xrayMaterial(color, opts));
    mesh.frustumCulled = false;
    root.add(mesh);
    parts.push({ mesh, base });
    return mesh;
  };
  const skin = (geo: THREE.BufferGeometry, base = 0.9) => add(geo, SKIN, base, { rim: 1.1, fill: 0.035, power: 2.4 });

  const headGeo = new THREE.SphereGeometry(0.1, 28, 22);
  headGeo.scale(0.9, 1.24, 0.98); // too tall, slightly narrow — no face at all
  const head = skin(headGeo, 1);
  const skull = add(new THREE.SphereGeometry(0.075, 18, 14).scale(0.92, 1.18, 1), BONE, 0.35, { rim: 0.8, fill: 0.01, power: 3 });
  const neck = skin(unitCapsule, 0.8);
  const torso = skin(torsoGeometry(), 1);
  const limbs = LIMBS.map(() => skin(unitCapsule));
  const palms = [0, 1].map(() => skin(unitCapsule, 0.85));
  const fingers = Array.from({ length: FINGERS * 2 }, () => skin(unitCapsule, 0.7));
  const feet = [0, 1].map(() => skin(unitCapsule, 0.8));

  const organ = (geo: THREE.BufferGeometry, color = ORGAN, base = 0.75) => add(geo, color, base, { rim: 1.3, fill: 0.08, power: 1.8 });
  const lungs = [0, 1].map(() => organ(new THREE.SphereGeometry(1, 18, 14), ORGAN, 0.55));
  const heart = organ(new THREE.SphereGeometry(1, 16, 12), HEART, 1);
  const gut = organ(new THREE.TorusKnotGeometry(0.055, 0.013, 120, 8, 3, 7), ORGAN, 0.6);
  const pelvis = add(new THREE.TorusGeometry(0.1, 0.012, 6, 28), BONE, 0.45, { rim: 1, fill: 0.05, power: 2 });
  const vertebrae = Array.from({ length: VERTEBRAE }, () => add(new THREE.SphereGeometry(0.014, 8, 6), BONE, 0.5, { rim: 1, fill: 0.15 }));
  const ribs = Array.from({ length: RIBS }, (_, i) => add(new THREE.TorusGeometry(0.12 - Math.abs(i - 2) * 0.008, 0.004, 4, 32, Math.PI * 1.55), BONE, 0.4, { rim: 1, fill: 0.08, power: 1.5 }));
  // A single ember where one eye might be — it only shows itself now and then.
  const glint = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), new THREE.MeshBasicMaterial({ color: ORGAN, transparent: true, opacity: 0 }));
  root.add(glint);

  const bonesGeo = new THREE.BufferGeometry();
  bonesGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BONES.length * 6), 3));
  const bones = new THREE.LineSegments(bonesGeo, new THREE.LineBasicMaterial({ color: BONE, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  bones.frustumCulled = false;
  root.add(bones);

  const kp = () => BASE_POSE.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  return {
    root, parts, head, skull, neck, torso, limbs, fingers, palms, feet, lungs, heart, gut, pelvis, vertebrae, ribs, glint, bones,
    smoothKps: kp(), targetKps: kp(), pose: kp(), fadeIn: 0,
    twitch: { next: 3 + Math.random() * 4, until: 0, joint: 0, offset: new THREE.Vector3(), headRoll: 0 },
  };
}

export type Drive = { t: number; breathHz: number; breathAmp: number; heartHz: number; motion: string; motionPower: number; phase: number; xOff: number; active: boolean };

/** Procedural target pose from the sensing features. */
export function computeTargets(e: Entity, d: Drive) {
  for (let i = 0; i < 17; i++) {
    const [bx, by, bz] = BASE_POSE[i];
    let x = bx + d.xOff, y = by, z = bz;
    if (d.active) {
      const br = Math.sin(d.t * d.breathHz * Math.PI * 2 + d.phase);
      if (i >= 5 && i <= 10) y += br * d.breathAmp;
      if (i <= 4) y += br * d.breathAmp * 0.3;
      x += Math.sin(d.t * 0.31 + d.phase) * 0.005;
      z += Math.cos(d.t * 0.23 + d.phase) * 0.003;
      if (d.motion === 'active') {
        const ph = d.t * (1.6 + d.motionPower * 2) + d.phase;
        const wa = 0.03 + d.motionPower * 0.06;
        const sw: Record<number, number> = { 13: 0, 14: Math.PI, 15: -0.2, 16: Math.PI - 0.2, 7: Math.PI, 8: 0, 9: Math.PI, 10: 0 };
        if (i in sw) z += Math.sin(ph + sw[i]) * wa * (i >= 13 ? 0.75 : 0.4);
      } else {
        // Idle: an almost imperceptible lean, as if listening.
        if (i <= 4) x += Math.sin(d.t * 0.13 + d.phase) * 0.012;
      }
    }
    e.targetKps[i].set(x, y, z);
  }
  for (let i = 0; i < 17; i++) e.smoothKps[i].lerp(e.targetKps[i], 0.05);
}

function updateTwitch(e: Entity, t: number) {
  const tw = e.twitch;
  if (t > tw.next) {
    tw.until = t + 0.08 + Math.random() * 0.12;
    tw.joint = [0, 9, 10, 7, 8][Math.floor(Math.random() * 5)];
    tw.offset.set((Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.04, (Math.random() - 0.5) * 0.05);
    tw.headRoll = (Math.random() - 0.5) * 0.7;
    tw.next = t + 4 + Math.random() * 7;
  }
  const on = t < tw.until;
  for (let i = 0; i < 17; i++) e.pose[i].copy(e.smoothKps[i]);
  if (on) e.pose[tw.joint].add(tw.offset);
  return on;
}

/** Position every part from the current pose; returns whether a twitch is in progress. */
export function updateEntity(e: Entity, d: Drive, alpha: number): boolean {
  const twitching = updateTwitch(e, d.t);
  const k = e.pose;
  e.parts.forEach(({ mesh, base }) => { (mesh.material as THREE.ShaderMaterial).opacity = alpha * base; });

  // Head & skull — faceless, slow uncanny tilt, snaps during a twitch.
  const hp = tv2.copy(k[0]).add(tv1.set(0, 0.07, -0.01));
  e.head.position.copy(hp);
  e.head.rotation.set(0.08, Math.sin(d.t * 0.17 + d.phase) * 0.25, Math.sin(d.t * 0.11) * 0.1 + (twitching ? e.twitch.headRoll : 0));
  e.skull.position.copy(hp).add(tv1.set(0.004, 0.01, -0.005));
  e.skull.rotation.copy(e.head.rotation);
  const glintOn = Math.sin(d.t * 0.7 + d.phase) > 0.93 || twitching;
  e.glint.position.copy(hp).add(tv1.set(0.034, 0.012, 0.09).applyEuler(e.head.rotation));
  (e.glint.material as THREE.MeshBasicMaterial).opacity = glintOn ? alpha : 0;

  const shoulderMid = new THREE.Vector3().addVectors(k[5], k[6]).multiplyScalar(0.5);
  const hipMid = new THREE.Vector3().addVectors(k[11], k[12]).multiplyScalar(0.5);
  placeSegment(e.neck, tv1.copy(shoulderMid).add(tv2.set(0, 0.02, 0)), new THREE.Vector3().copy(hp).add(tv2.set(0, -0.08, 0)), 0.042);

  const tc = new THREE.Vector3().addVectors(shoulderMid, hipMid).multiplyScalar(0.5);
  const breath = Math.sin(d.t * d.breathHz * Math.PI * 2 + d.phase);
  e.torso.position.copy(tc).add(tv1.set(0, 0.03, 0));
  e.torso.scale.set(1, (shoulderMid.y - hipMid.y + 0.12) / 0.6, 1 + breath * 0.025);

  // Organs
  e.lungs.forEach((l, i) => {
    const s = 1 + breath * 0.07;
    l.position.copy(tc).add(tv1.set(i === 0 ? -0.06 : 0.068, 0.1, 0.005));
    l.scale.set(0.062 * s, 0.115 * s, 0.05 * s);
  });
  const hb = (d.t * d.heartHz) % 1;
  const beat = Math.exp(-hb * 18) + 0.55 * Math.exp(-Math.max(0, hb - 0.23) * 22) * (hb > 0.23 ? 1 : 0);
  e.heart.position.copy(tc).add(tv1.set(-0.025, 0.06, 0.035));
  e.heart.scale.set(0.034 * (1 + beat * 0.22), 0.042 * (1 + beat * 0.22), 0.03 * (1 + beat * 0.22));
  (e.heart.material as THREE.ShaderMaterial).opacity = alpha * (0.55 + beat * 0.6);
  e.gut.position.copy(tc).add(tv1.set(0.005, -0.12, 0.012));
  e.gut.rotation.set(Math.PI / 2 + Math.sin(d.t * 0.4) * 0.15, d.t * 0.25, Math.sin(d.t * 0.33) * 0.2);
  e.gut.scale.set(1, 1, 0.6 + Math.sin(d.t * 0.9) * 0.05);
  e.pelvis.position.copy(hipMid).add(tv1.set(0, 0.02, 0));
  e.pelvis.rotation.set(Math.PI / 2.3, 0, 0);

  // Spine & ribs
  const neckBase = tv2.copy(shoulderMid).add(tv1.set(0, 0.04, -0.04));
  e.vertebrae.forEach((v, i) => {
    const f = i / (VERTEBRAE - 1);
    v.position.lerpVectors(neckBase, hipMid, f);
    v.position.z -= 0.045 + Math.sin(f * Math.PI) * 0.02;
  });
  e.ribs.forEach((r, i) => {
    r.position.copy(tc).add(tv1.set(0, 0.17 - i * 0.045, -0.005));
    r.rotation.set(Math.PI / 2 + 0.25, 0, -Math.PI * 0.275);
    r.scale.set(1 + breath * 0.02, 0.62, 1);
  });

  // Limbs, over-long hands with four fingers, feet
  LIMBS.forEach(([a, b, ra, rb], i) => placeSegment(e.limbs[i], k[a], k[b], (ra + rb) / 2));
  [[7, 9], [8, 10]].forEach(([el, wr], h) => {
    const dir = tv1.subVectors(k[wr], k[el]).normalize();
    const palmEnd = new THREE.Vector3().copy(k[wr]).addScaledVector(dir, 0.08);
    placeSegment(e.palms[h], k[wr], palmEnd, 0.022);
    const side = new THREE.Vector3(h === 0 ? -1 : 1, 0, 0).cross(dir).cross(dir).normalize();
    for (let f = 0; f < FINGERS; f++) {
      const spread = (f - (FINGERS - 1) / 2) * 0.012;
      const curl = Math.sin(d.t * 0.6 + f + h * 2) * 0.006;
      const base = new THREE.Vector3().copy(palmEnd).addScaledVector(side, spread);
      const tip = new THREE.Vector3().copy(base).addScaledVector(dir, 0.13 + (f === 1 ? 0.025 : 0)).addScaledVector(side, spread * 0.8 + curl);
      placeSegment(e.fingers[h * FINGERS + f], base, tip, 0.0065);
    }
  });
  [[13, 15], [14, 16]].forEach(([, an], f) => {
    placeSegment(e.feet[f], tv1.copy(k[an]).add(tv2.set(0, -0.02, -0.02)), new THREE.Vector3().copy(k[an]).add(tv2.set(0, -0.035, 0.15)), 0.03);
  });

  const p = e.bones.geometry.attributes.position as THREE.BufferAttribute;
  BONES.forEach(([a, b], i) => {
    p.setXYZ(i * 2, k[a].x, k[a].y, k[a].z);
    p.setXYZ(i * 2 + 1, k[b].x, k[b].y, k[b].z);
  });
  p.needsUpdate = true;
  (e.bones.material as THREE.LineBasicMaterial).opacity = alpha * 0.35;
  return twitching;
}
