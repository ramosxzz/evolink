import * as THREE from "three";
import { medalIconNodes } from "@/lib/medal-icons";

// Procedural 3D medals: a turned coin (rim, edge, bail) whose faces carry an
// embossed relief (laurel wreath, beaded ring and the achievement icon) built
// from a height map. The height map becomes a normal map for the lighting, a
// roughness map (polished relief, satin field) and a cavity map that darkens
// the grooves. Stills for lists come from one shared renderer; the large
// celebration medal runs live on its own canvas.

export type MedalTier = "bronze" | "prata" | "ouro" | "diamante";

type Metal = { color: [number, number, number]; roughness: number; iridescence?: number; clearcoat?: number };

// Base colors in linear RGB, close to real metal reflectance.
const metals: Record<MedalTier, Metal> = {
  bronze: { color: [0.74, 0.34, 0.14], roughness: 0.26 },
  prata: { color: [0.92, 0.93, 0.95], roughness: 0.18 },
  ouro: { color: [1.0, 0.6, 0.16], roughness: 0.18 },
  diamante: { color: [0.8, 0.9, 1.0], roughness: 0.15, iridescence: 0.85, clearcoat: 1 },
};

const MAP_SIZE = 1024;
const FIELD_RADIUS = 0.87;
const THICKNESS = 0.032;

// Height maps ------------------------------------------------------------------

function iconSvg(icon: string) {
  const nodes = medalIconNodes[icon] ?? medalIconNodes.medal;
  const body = nodes.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([key, value]) => `${key}="${value}"`).join(" ")}/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawLaurel(ctx: CanvasRenderingContext2D, center: number, radius: number) {
  const leaf = (x: number, y: number, angle: number, length: number, width: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, length);
    gradient.addColorStop(0, "rgb(170,170,170)");
    gradient.addColorStop(1, "rgb(90,90,90)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, length, width, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  for (const side of [-1, 1]) {
    // Branch from the bottom up each side, leaves in pairs along it.
    ctx.strokeStyle = "rgb(110,110,110)";
    ctx.lineWidth = radius * 0.018;
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.78, Math.PI / 2 + side * 0.18, Math.PI / 2 + side * 2.35, side < 0);
    ctx.stroke();
    for (let index = 0; index < 11; index++) {
      const t = index / 10;
      const angle = Math.PI / 2 + side * (0.28 + t * 2.0);
      const size = radius * (0.085 - t * 0.03);
      const baseX = center + Math.cos(angle) * radius * 0.78;
      const baseY = center + Math.sin(angle) * radius * 0.78;
      const tangent = angle + side * Math.PI / 2;
      for (const offset of [-1, 1]) {
        const tilt = tangent - side * offset * 0.55;
        leaf(baseX + Math.cos(tilt) * size * 0.8, baseY + Math.sin(tilt) * size * 0.8, tilt, size, size * 0.38);
      }
    }
  }
}

function drawBeads(ctx: CanvasRenderingContext2D, center: number, radius: number, count: number, ringRadius: number, bead: number) {
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * Math.PI * 2;
    const x = center + Math.cos(angle) * radius * ringRadius;
    const y = center + Math.sin(angle) * radius * ringRadius;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, bead);
    gradient.addColorStop(0, "rgb(190,190,190)");
    gradient.addColorStop(1, "rgb(60,60,60)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, bead, 0, Math.PI * 2);
    ctx.fill();
  }
}

async function drawFront(ctx: CanvasRenderingContext2D, icon: string, tier: MedalTier) {
  const size = MAP_SIZE;
  const center = size / 2;
  const radius = size / 2;
  drawBeads(ctx, center, radius, 72, 0.935, radius * 0.018);
  drawLaurel(ctx, center, radius);
  if (tier === "diamante" || tier === "ouro") {
    // Three small stars above the icon for the top tiers.
    ctx.fillStyle = "rgb(200,200,200)";
    for (const [dx, scale] of [[-0.16, 0.8], [0, 1], [0.16, 0.8]] as const) {
      const cx = center + dx * radius;
      const cy = center - radius * 0.56 + (dx === 0 ? -radius * 0.02 : 0);
      const outer = radius * 0.045 * scale;
      ctx.beginPath();
      for (let point = 0; point < 10; point++) {
        const r = point % 2 === 0 ? outer : outer * 0.45;
        const a = -Math.PI / 2 + (point * Math.PI) / 5;
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
  // Raised medallion under the icon, then the icon on top of it.
  ctx.strokeStyle = "rgb(120,120,120)";
  ctx.lineWidth = radius * 0.022;
  ctx.beginPath();
  ctx.arc(center, center, radius * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvg(icon))}`);
  const iconSize = radius * 0.74;
  ctx.drawImage(image, center - iconSize / 2, center - iconSize / 2, iconSize, iconSize);
}

function drawBack(ctx: CanvasRenderingContext2D, tier: MedalTier) {
  const size = MAP_SIZE;
  const center = size / 2;
  const radius = size / 2;
  drawBeads(ctx, center, radius, 72, 0.935, radius * 0.018);
  ctx.strokeStyle = "rgb(120,120,120)";
  ctx.lineWidth = radius * 0.02;
  ctx.beginPath();
  ctx.arc(center, center, radius * 0.8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgb(210,210,210)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${radius * 0.26}px system-ui, sans-serif`;
  ctx.fillText("EVOLINK", center, center - radius * 0.06);
  ctx.font = `700 ${radius * 0.1}px system-ui, sans-serif`;
  ctx.fillStyle = "rgb(150,150,150)";
  ctx.fillText({ bronze: "BRONZE", prata: "PRATA", ouro: "OURO", diamante: "DIAMANTE" }[tier], center, center + radius * 0.2);
}

/** Box blur so the relief gets rounded, beveled edges instead of steps. */
function blur(values: Float32Array, size: number, radius: number) {
  const temp = new Float32Array(values.length);
  const span = radius * 2 + 1;
  for (let y = 0; y < size; y++) {
    let sum = 0;
    for (let x = -radius; x <= radius; x++) sum += values[y * size + Math.min(size - 1, Math.max(0, x))];
    for (let x = 0; x < size; x++) {
      temp[y * size + x] = sum / span;
      sum += values[y * size + Math.min(size - 1, x + radius + 1)] - values[y * size + Math.max(0, x - radius)];
    }
  }
  const out = new Float32Array(values.length);
  for (let x = 0; x < size; x++) {
    let sum = 0;
    for (let y = -radius; y <= radius; y++) sum += temp[Math.min(size - 1, Math.max(0, y)) * size + x];
    for (let y = 0; y < size; y++) {
      out[y * size + x] = sum / span;
      sum += temp[Math.min(size - 1, y + radius + 1) * size + x] - temp[Math.max(0, y - radius) * size + x];
    }
  }
  return out;
}

type FaceMaps = { normal: THREE.Texture; roughness: THREE.Texture; cavity: THREE.Texture };

function buildMaps(canvas: HTMLCanvasElement, baseRoughness: number): FaceMaps {
  const size = canvas.width;
  const source = canvas.getContext("2d")!.getImageData(0, 0, size, size).data;
  const raw = new Float32Array(size * size);
  for (let index = 0; index < raw.length; index++) raw[index] = source[index * 4] / 255;
  const height = blur(blur(raw, size, 2), size, 1);
  const wide = blur(height, size, 5);

  const normal = new Uint8Array(size * size * 4);
  const rough = new Uint8Array(size * size * 4);
  const cavity = new Uint8Array(size * size * 4);
  const strength = 9;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = y * size + x;
      const left = height[y * size + Math.max(0, x - 1)];
      const right = height[y * size + Math.min(size - 1, x + 1)];
      const up = height[Math.max(0, y - 1) * size + x];
      const down = height[Math.min(size - 1, y + 1) * size + x];
      // Canvas rows grow downwards while texture V grows upwards.
      const du = (right - left) * strength;
      const dv = (up - down) * strength;
      const length = Math.hypot(du, dv, 1);
      normal[index * 4] = ((-du / length) * 0.5 + 0.5) * 255;
      normal[index * 4 + 1] = ((-dv / length) * 0.5 + 0.5) * 255;
      normal[index * 4 + 2] = ((1 / length) * 0.5 + 0.5) * 255;
      normal[index * 4 + 3] = 255;

      // Proof finish: frosted relief over a polished field with fine turned rings.
      const distance = Math.hypot(x - size / 2, y - size / 2);
      const rings = Math.sin(distance * 1.6) * 0.03;
      const relief = Math.min(1, height[index] * 2.2);
      const r = Math.min(1, Math.max(0.05, baseRoughness - 0.02 + rings * (1 - relief) + relief * 0.3));
      rough[index * 4 + 1] = r * 255;
      rough[index * 4 + 3] = 255;

      const crevice = Math.max(0, wide[index] - height[index]);
      const shade = Math.max(0.55, 1 - crevice * 1.8);
      cavity[index * 4] = cavity[index * 4 + 1] = cavity[index * 4 + 2] = shade * 255;
      cavity[index * 4 + 3] = 255;
    }
  }
  const texture = (data: Uint8Array, color = false) => {
    const map = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    map.flipY = true;
    map.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    map.anisotropy = 4;
    map.generateMipmaps = true;
    map.minFilter = THREE.LinearMipmapLinearFilter;
    map.magFilter = THREE.LinearFilter;
    map.needsUpdate = true;
    return map;
  };
  return { normal: texture(normal), roughness: texture(rough), cavity: texture(cavity, true) };
}

const faceCache = new Map<string, Promise<{ front: FaceMaps; back: FaceMaps }>>();

function faceMaps(icon: string, tier: MedalTier) {
  const key = `${icon}:${tier}`;
  let pending = faceCache.get(key);
  if (!pending) {
    pending = (async () => {
      const make = async (draw: (ctx: CanvasRenderingContext2D) => void | Promise<void>) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = MAP_SIZE;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
        await draw(ctx);
        return buildMaps(canvas, metals[tier].roughness);
      };
      return { front: await make(ctx => drawFront(ctx, icon, tier)), back: await make(ctx => drawBack(ctx, tier)) };
    })();
    faceCache.set(key, pending);
  }
  return pending;
}

// Geometry ---------------------------------------------------------------------

let rimGeometry: THREE.LatheGeometry | null = null;
let fieldGeometry: THREE.CircleGeometry | null = null;
let bailGeometry: THREE.TorusGeometry | null = null;

function geometries() {
  if (!rimGeometry) {
    // Rim cross-section: inner wall, rounded crown, straight edge, mirrored.
    const half: THREE.Vector2[] = [];
    half.push(new THREE.Vector2(FIELD_RADIUS - 0.012, THICKNESS - 0.004));
    for (let step = 0; step <= 12; step++) {
      const angle = Math.PI - (step / 12) * Math.PI;
      half.push(new THREE.Vector2(0.935 + Math.cos(angle) * 0.055, THICKNESS + 0.03 + Math.sin(angle) * 0.022));
    }
    for (let step = 1; step <= 6; step++) {
      const angle = (step / 6) * (Math.PI / 2);
      half.push(new THREE.Vector2(0.99 + Math.sin(angle) * 0.01, THICKNESS + 0.03 - (1 - Math.cos(angle)) * 0.03));
    }
    const points = [...half, ...half.slice().reverse().map(point => new THREE.Vector2(point.x, -point.y))];
    rimGeometry = new THREE.LatheGeometry(points, 160);
    rimGeometry.rotateX(Math.PI / 2);
    fieldGeometry = new THREE.CircleGeometry(FIELD_RADIUS, 160);
    bailGeometry = new THREE.TorusGeometry(0.09, 0.026, 24, 48);
  }
  return { rim: rimGeometry, field: fieldGeometry!, bail: bailGeometry! };
}

function metalMaterial(tier: MedalTier, extra: THREE.MeshPhysicalMaterialParameters = {}) {
  const metal = metals[tier];
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color().setRGB(...metal.color, THREE.LinearSRGBColorSpace),
    metalness: 1,
    roughness: metal.roughness,
    iridescence: metal.iridescence ?? 0,
    iridescenceIOR: 1.5,
    iridescenceThicknessRange: [300, 520],
    clearcoat: metal.clearcoat ?? 0,
    clearcoatRoughness: 0.08,
    ...extra,
  });
}

export async function buildMedal(icon: string, tier: MedalTier) {
  const maps = await faceMaps(icon, tier);
  const { rim, field, bail } = geometries();
  const group = new THREE.Group();
  const rimMaterial = metalMaterial(tier, { roughness: metals[tier].roughness * 0.7, side: THREE.DoubleSide });
  group.add(new THREE.Mesh(rim, rimMaterial));

  const faceMaterial = (face: FaceMaps) => metalMaterial(tier, {
    normalMap: face.normal,
    normalScale: new THREE.Vector2(1.5, 1.5),
    roughnessMap: face.roughness,
    roughness: 1,
    map: face.cavity,
  });
  const front = new THREE.Mesh(field, faceMaterial(maps.front));
  front.position.z = THICKNESS;
  group.add(front);
  const back = new THREE.Mesh(field, faceMaterial(maps.back));
  back.position.z = -THICKNESS;
  back.rotation.y = Math.PI;
  group.add(back);

  const loop = new THREE.Mesh(bail, rimMaterial);
  loop.position.y = 1.075;
  loop.rotation.y = Math.PI / 2;
  group.add(loop);

  const dispose = () => {
    rimMaterial.dispose();
    (front.material as THREE.Material).dispose();
    (back.material as THREE.Material).dispose();
  };
  return { group, dispose };
}

// Scene ------------------------------------------------------------------------

/** Photo studio for reflections: softboxes over a dark room give metals contrast. */
function studioScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x4a5057);
  const box = (width: number, height: number, intensity: number, color: number, position: [number, number, number]) => {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    panel.position.set(...position);
    panel.lookAt(0, 0, 0);
    scene.add(panel);
  };
  // The faces look at the camera, so they mirror what is behind it: two large
  // front softboxes with a darker band between them: the polished field
  // mirrors the band while the frosted relief catches the light (proof look).
  box(12, 4.5, 2.4, 0xffffff, [0, 3.2, 7]);
  box(12, 2.5, 1.1, 0xfff6ea, [0, -2.8, 7]);
  box(9, 4, 2.6, 0xffffff, [0, 7, 1]);       // overhead key for the rim
  box(2.5, 9, 2.0, 0xfff1e0, [-7, 0.5, 2]);  // warm left strip
  box(2.5, 9, 1.5, 0xe8f1ff, [7, 0, 2]);     // cool right strip
  box(6, 2, 1.0, 0xffffff, [0, 2, -6]);      // back rim
  return scene;
}

export function createStage(renderer: THREE.WebGLRenderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = studioScene();
  const environment = pmrem.fromScene(studio, 0.02).texture;
  pmrem.dispose();
  studio.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); (object.material as THREE.Material).dispose(); } });
  scene.environment = environment;
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-2.5, 3, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xfff1dd, 0.7);
  fill.position.set(3, -1, 2);
  scene.add(fill);
  // The coin (radius 1) fills 80% of the frame; the bail fits above it.
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  camera.position.set(0, 0, 1.25 / Math.tan(THREE.MathUtils.degToRad(15)));
  return { scene, camera, dispose: () => environment.dispose() };
}

// Stills -----------------------------------------------------------------------

const STILL_SIZE = 384;
let still: { renderer: THREE.WebGLRenderer; stage: ReturnType<typeof createStage> } | null = null;
let queue: Promise<unknown> = Promise.resolve();
const stills = new Map<string, Promise<string>>();

export function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Object URL of a transparent PNG of the medal, slightly turned to show depth. */
export function medalImage(icon: string, tier: MedalTier) {
  const key = `${icon}:${tier}`;
  let pending = stills.get(key);
  if (!pending) {
    pending = queue.then(async () => {
      if (!still) {
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(1);
        renderer.setSize(STILL_SIZE, STILL_SIZE, false);
        still = { renderer, stage: createStage(renderer) };
      }
      const { renderer, stage } = still;
      const medal = await buildMedal(icon, tier);
      medal.group.rotation.set(0.1, -0.38, 0);
      stage.scene.add(medal.group);
      renderer.render(stage.scene, stage.camera);
      const blob = await new Promise<Blob | null>(resolve => renderer.domElement.toBlob(resolve, "image/png"));
      stage.scene.remove(medal.group);
      medal.dispose();
      if (!blob) throw new Error("Falha ao renderizar a medalha");
      return URL.createObjectURL(blob);
    });
    queue = pending.catch(() => undefined);
    stills.set(key, pending);
  }
  return pending;
}

// Live -------------------------------------------------------------------------

/** Renders an interactive medal on a canvas: entrance spin, idle sway, drag to turn. */
export async function mountLiveMedal(canvas: HTMLCanvasElement, icon: string, tier: MedalTier, options: { spin: boolean; reduceMotion: boolean }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const resize = () => renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  resize();
  const stage = createStage(renderer);
  const medal = await buildMedal(icon, tier);
  stage.scene.add(medal.group);

  let frame = 0;
  let disposed = false;
  const start = performance.now();
  const spinDuration = options.spin && !options.reduceMotion ? 2400 : 0;
  let drag: { x: number; y: number; rotY: number; rotX: number } | null = null;
  let offsetY = 0;
  let offsetX = 0;
  let velocity = 0;

  const onDown = (event: PointerEvent) => {
    canvas.setPointerCapture(event.pointerId);
    drag = { x: event.clientX, y: event.clientY, rotY: offsetY, rotX: offsetX };
  };
  const onMove = (event: PointerEvent) => {
    if (!drag) return;
    const next = drag.rotY + (event.clientX - drag.x) * 0.012;
    velocity = next - offsetY;
    offsetY = next;
    offsetX = Math.max(-0.6, Math.min(0.6, drag.rotX + (event.clientY - drag.y) * 0.008));
  };
  const onUp = () => { drag = null; };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  const ease = (t: number) => 1 - Math.pow(1 - t, 4);
  const draw = (now: number) => {
    if (disposed) return;
    const elapsed = now - start;
    const spinT = spinDuration ? Math.min(1, elapsed / spinDuration) : 1;
    if (!drag) {
      velocity *= 0.94;
      offsetY += velocity;
      offsetX *= 0.92;
    }
    const sway = options.reduceMotion ? 0 : Math.sin(elapsed / 1400) * 0.28 * spinT;
    medal.group.rotation.y = (1 - ease(spinT)) * -Math.PI * 4 - 0.3 + sway + offsetY;
    medal.group.rotation.x = 0.08 + offsetX;
    renderer.render(stage.scene, stage.camera);
    frame = requestAnimationFrame(draw);
  };
  // First frame right away, so the medal shows even if animation frames are paused.
  draw(performance.now());

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onUp);
    medal.dispose();
    stage.dispose();
    renderer.dispose();
  };
}
