import * as THREE from 'three';
import type { SensingFrame } from '@/types/sensing';
import { computeTargets, createEntity, updateEntity, type Entity } from './entity';
import { xrayUniforms } from './materials';

/*
 * Framework-free Live scene (plain DOM + three.js). Mounted directly by the web app and bundled
 * into a self-contained WebView page for native (see scripts/build-live-webview.js).
 */

export type XraySceneOptions = {
  getFrame: () => SensingFrame | null;
  onReady?: () => void;
  onFps?: (fps: number) => void;
};

const MAX_ENTITIES = 3;
const GS = 20;

export function mountXrayScene(container: HTMLElement, opts: XraySceneOptions): () => void {
  const W = () => container.clientWidth || window.innerWidth;
  const H = () => container.clientHeight || window.innerHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(W(), H());
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.06);
  const camera = new THREE.PerspectiveCamera(42, W() / H(), 0.05, 100);

  // Floor: dark grid with the RF signal field under it
  const grid = new THREE.GridHelper(20, 40, 0x6b2e1a, 0x161616);
  scene.add(grid);
  const cellGeo = new THREE.PlaneGeometry(0.38, 0.38);
  const cellMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
  const field = new THREE.InstancedMesh(cellGeo, cellMat, GS * GS);
  field.rotation.x = -Math.PI / 2;
  field.position.y = 0.003;
  const dum = new THREE.Object3D();
  const black = new THREE.Color(0x000000);
  for (let z = 0; z < GS; z++) for (let x = 0; x < GS; x++) {
    dum.position.set((x - GS / 2) * 0.4, (z - GS / 2) * 0.4, 0);
    dum.updateMatrix();
    field.setMatrixAt(z * GS + x, dum.matrix);
    field.setColorAt(z * GS + x, black);
  }
  scene.add(field);

  // Sensor nodes and expanding RF rings
  const nodeGeo = new THREE.OctahedronGeometry(0.07, 0);
  const nodes = Array.from({ length: 8 }, () => {
    const m = new THREE.Mesh(nodeGeo, new THREE.MeshBasicMaterial({ color: 0xc15632, wireframe: true }));
    m.visible = false; scene.add(m); return m;
  });
  const rings = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.006, 4, 64), new THREE.MeshBasicMaterial({ color: 0xc15632, transparent: true, opacity: 0.1 }));
    m.rotation.x = Math.PI / 2; m.position.y = 0.01; scene.add(m); return m;
  });

  // Dust drifting through the beam
  const NP = 500;
  const dustPos = new Float32Array(NP * 3);
  for (let i = 0; i < NP; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 8; dustPos[i * 3 + 1] = Math.random() * 3; dustPos[i * 3 + 2] = (Math.random() - 0.5) * 8;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0x9a9a9a, size: 0.012, transparent: true, opacity: 0.35 })));

  const entities: Entity[] = Array.from({ length: MAX_ENTITIES }, () => createEntity(scene));

  // HUD sprite
  const hudC = document.createElement('canvas'); hudC.width = 640; hudC.height = 128;
  const hudT = new THREE.CanvasTexture(hudC);
  const hud = new THREE.Sprite(new THREE.SpriteMaterial({ map: hudT, transparent: true, depthWrite: false }));
  hud.scale.set(2.6, 0.52, 1); hud.position.set(0, 2.45, 0); scene.add(hud);

  // Orbit: mouse + touch
  const cam = { angle: 0.35, r: 3.1, y: 1.25, drag: false, lx: 0, ly: 0 };
  const el = renderer.domElement;
  const down = (x: number, y: number) => { cam.drag = true; cam.lx = x; cam.ly = y; };
  const move = (x: number, y: number) => {
    if (!cam.drag) return;
    cam.angle -= (x - cam.lx) * 0.006; cam.y = Math.max(0.3, Math.min(3.2, cam.y + (y - cam.ly) * 0.006));
    cam.lx = x; cam.ly = y;
  };
  const up = () => { cam.drag = false; };
  const onMouseDown = (e: MouseEvent) => down(e.clientX, e.clientY);
  const onMouseMove = (e: MouseEvent) => move(e.clientX, e.clientY);
  const onTouchStart = (e: TouchEvent) => down(e.touches[0].clientX, e.touches[0].clientY);
  const onTouchMove = (e: TouchEvent) => move(e.touches[0].clientX, e.touches[0].clientY);
  const onWheel = (e: WheelEvent) => { cam.r = Math.max(1.4, Math.min(8, cam.r + e.deltaY * 0.003)); };
  el.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', up);
  el.addEventListener('touchstart', onTouchStart, { passive: true });
  el.addEventListener('touchmove', onTouchMove, { passive: true });
  el.addEventListener('touchend', up);
  el.addEventListener('wheel', onWheel, { passive: true });
  const onResize = () => { camera.aspect = W() / H(); camera.updateProjectionMatrix(); renderer.setSize(W(), H()); };
  window.addEventListener('resize', onResize);

  const color = new THREE.Color();
  let animId = 0;
  let frames = 0;
  let fpsT = performance.now();
  let flickerUntil = 0;

  const animate = () => {
    animId = requestAnimationFrame(animate);
    const t = performance.now() * 0.001;
    const fr = opts.getFrame();

    if (!cam.drag) cam.angle += 0.0008;
    camera.position.set(Math.sin(cam.angle) * cam.r, cam.y, Math.cos(cam.angle) * cam.r);
    camera.lookAt(0, 1.0, 0);

    const pres = fr?.classification?.presence ?? false;
    const motion = fr?.classification?.motion_level ?? 'absent';
    const conf = fr?.classification?.confidence ?? 0;
    const mPow = fr?.features?.motion_band_power ?? 0;
    const bPow = fr?.features?.breathing_band_power ?? 0;
    const rssi = fr?.features?.mean_rssi ?? -80;
    const vs = fr?.vital_signs as Record<string, unknown> | undefined;
    const brBpm = Number(vs?.breathing_bpm ?? vs?.breathing_rate_bpm ?? 14);
    const hrBpm = Number(vs?.hr_proxy_bpm ?? vs?.heart_rate_bpm ?? 72);
    const count = pres && conf > 0.2 ? Math.min(MAX_ENTITIES, Math.max(1, Number(fr?.estimated_persons ?? 1))) : 0;

    // Signal dropouts: brief flicker, more likely when the link is weak
    if (t > flickerUntil && Math.random() < 0.004 + Math.max(0, -60 - rssi) * 0.0004) flickerUntil = t + 0.05 + Math.random() * 0.1;
    xrayUniforms.uTime.value = t;
    xrayUniforms.uFlicker.value = t < flickerUntil ? 0.35 + Math.random() * 0.3 : 0.92 + Math.sin(t * 23) * 0.04;

    let anyTwitch = false;
    entities.forEach((e, i) => {
      const active = i < count;
      e.fadeIn = active ? Math.min(1, e.fadeIn + 0.012) : Math.max(0, e.fadeIn - 0.008);
      e.root.visible = e.fadeIn > 0.01;
      if (!e.root.visible) return;
      const drive = {
        t, active, motion, motionPower: mPow, phase: i * 2.094, xOff: (i - (count - 1) / 2) * 0.9,
        breathHz: Math.max(0.1, brBpm / 60), breathAmp: 0.004 + bPow * 0.01, heartHz: Math.max(0.5, hrBpm / 60) * (1 + i * 0.07),
      };
      computeTargets(e, drive);
      anyTwitch = updateEntity(e, drive, e.fadeIn) || anyTwitch;
    });

    rings.forEach((m, i) => {
      const ph = (t * 0.35 + i / 3) % 1;
      m.scale.setScalar(0.4 + ph * 3);
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - ph) * (pres ? 0.16 : 0.05);
    });
    (fr?.nodes ?? []).forEach((n, i) => {
      if (i >= nodes.length) return;
      const [px, py, pz] = n.position;
      nodes[i].position.set(px * 2, py + 0.12, pz * 2); nodes[i].rotation.y = t * 0.5 + i; nodes[i].visible = true;
    });
    for (let i = (fr?.nodes ?? []).length; i < nodes.length; i++) nodes[i].visible = false;

    const sf = fr?.signal_field;
    if (sf?.values?.length) {
      const gx = sf.grid_size[0], gz = sf.grid_size[2];
      for (let zi = 0; zi < Math.min(gz, GS); zi++) for (let xi = 0; xi < Math.min(gx, GS); xi++) {
        const v = sf.values[zi * gx + xi] || 0;
        if (v < 0.5) { const s = v * 2; color.setRGB(0.76 * s, 0.34 * s, 0.2 * s); }
        else { const s = (v - 0.5) * 2; color.setRGB(0.76 + 0.24 * s, 0.34 + 0.66 * s, 0.2 + 0.8 * s); }
        field.setColorAt(zi * GS + xi, color);
      }
      if (field.instanceColor) field.instanceColor.needsUpdate = true;
    }

    const dp = dustGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < NP; i++) {
      const y = dp.getY(i) + 0.0015 + Math.sin(t + i) * 0.0004;
      dp.setY(i, y > 3 ? 0 : y);
    }
    dp.needsUpdate = true;

    drawHud(hudC, { rssi, conf, count, motion, anyTwitch, t, nodes: (fr?.nodes ?? []).length, source: fr?.source });
    hudT.needsUpdate = true;

    renderer.render(scene, camera);
    frames++;
    if (performance.now() - fpsT >= 1000) { opts.onFps?.(frames); frames = 0; fpsT = performance.now(); }
  };

  animate();
  opts.onReady?.();

  return () => {
    cancelAnimationFrame(animId);
    el.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', up);
    el.removeEventListener('touchstart', onTouchStart);
    el.removeEventListener('touchmove', onTouchMove);
    el.removeEventListener('touchend', up);
    el.removeEventListener('wheel', onWheel);
    window.removeEventListener('resize', onResize);
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      mats.forEach((mat) => mat.dispose());
    });
    renderer.dispose();
    if (el.parentElement === container) container.removeChild(el);
  };
}

type HudState = { rssi: number; conf: number; count: number; motion: string; anyTwitch: boolean; t: number; nodes: number; source?: string };

function drawHud(c: HTMLCanvasElement, s: HudState) {
  const ctx = c.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.font = 'bold 15px "SF Mono", Menlo, monospace';
  ctx.fillStyle = '#C15632';
  ctx.fillText(`VTLO_EYESOFGOD  [${(s.source || '--').toUpperCase()}]`, 12, 22);
  ctx.font = '12px "SF Mono", Menlo, monospace';
  ctx.fillStyle = '#A8A8A8';
  ctx.fillText(`NODES ${s.nodes}   RSSI ${s.rssi.toFixed(1)} dBm   CONF ${(s.conf * 100).toFixed(0)}%`, 12, 44);
  if (s.count > 0) {
    const label = s.anyTwitch ? 'SIGNATURE SHIFT' : s.motion === 'active' ? 'MOVING' : 'STILL';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`LIFEFORM: HUMANOID?  ${s.count > 1 ? `x${s.count}` : ''}`, 12, 66);
    ctx.fillStyle = s.anyTwitch || Math.sin(s.t * 2) > 0 ? '#C15632' : '#5A5A5A';
    ctx.fillText(`CLASS: UNRESOLVED   STATE: ${label}`, 12, 86);
  }
}
