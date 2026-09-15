import * as THREE from 'three';
import { computeMikkTSpaceTangents } from 'three/addons/utils/BufferGeometryUtils.js';
import * as MikkTSpace from 'three/addons/libs/mikktspace.module.js';
await MikkTSpace.ready;
const V = (a) => a?.isVector3 ? a.clone() : new THREE.Vector3(...a);
const clamp = (t) => Math.max(0, Math.min(1, t));
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
function number(n, min, max, label) {
  if (!Number.isFinite(n) || n < min || n > max) throw new RangeError(`${label}: expected ${min}..${max}`);
  return n;
}
function count(n, min, max, label) {
  number(n, min, max, label);
  if (!Number.isInteger(n)) throw new RangeError(`${label}: expected an integer`);
  return n;
}
/** A scalar profile with zero overshoot. Values are physical, stations are 0..1. */
export function profile(stations) {
  if (!Array.isArray(stations) || stations.length < 2 || stations[0][0] !== 0 || stations.at(-1)[0] !== 1) throw new Error('profile: include stations at 0 and 1');
  const keys = stations.map(([t, value], i) => {
    number(t, 0, 1, 'station'); number(value, -1e4, 1e4, 'profile value');
    if (i && t <= stations[i - 1][0]) throw new Error('profile: stations must increase');
    return [t, value];
  });
  return (t) => {
    t = clamp(t);
    const end = keys.findIndex(([x]) => x >= t);
    if (end <= 0) return keys[0][1];
    const [a, x] = keys[end - 1], [b, y] = keys[end];
    return THREE.MathUtils.lerp(x, y, smooth((t - a) / (b - a)));
  };
}
/** Signed displacement fields are functions, so creases, pads and pores compose. */
export function layers(...fields) {
  fields = fields.flat().filter(Boolean);
  if (fields.some(f => typeof f !== 'function')) throw new TypeError('layers: expected functions');
  return (u, v) => fields.reduce((sum, field) => sum + field(u, v), 0);
}
export function mound({ at = [.5, .5], radius = [.1, .1], height = .001, wrapU = false } = {}) {
  if (at.length !== 2 || radius.length !== 2 || !at.every(Number.isFinite)) throw new Error('mound: invalid center');
  radius.forEach(r => number(r, 1e-5, 10, 'mound radius')); number(height, -.1, .1, 'mound height');
  return (u, v) => {
    let du = u - at[0]; if (wrapU) du -= Math.round(du);
    const d = (du / radius[0]) ** 2 + ((v - at[1]) / radius[1]) ** 2;
    return height * Math.exp(-d * 2);
  };
}
/** A crease is a smooth finite stroke in a chart, never an added dark tube. */
export function crease({ from, to, width = .015, depth = .00025 } = {}) {
  if (![from, to].every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))) throw new Error('crease: two UV endpoints required');
  number(width, .00001, .5, 'crease width'); number(depth, 0, .05, 'crease depth');
  const dx = to[0] - from[0], dy = to[1] - from[1], length2 = dx * dx + dy * dy;
  if (length2 < 1e-12) throw new Error('crease: zero length');
  return (u, v) => {
    const t = clamp(((u - from[0]) * dx + (v - from[1]) * dy) / length2);
    const d = ((u - from[0] - dx * t) ** 2 + (v - from[1] - dy * t) ** 2) / (width * width);
    return -depth * Math.exp(-d * 2) * Math.sin(Math.PI * t) ** 2;
  };
}
export function grain({ amplitude = .000035, frequency = 40, seed = 1 } = {}) {
  number(amplitude, 0, .01, 'grain amplitude'); count(frequency, 1, 256, 'grain frequency'); number(seed, -1e6, 1e6, 'grain seed');
  return (u, v) => amplitude * Math.sin(2 * Math.PI * frequency * u + .45 * Math.sin(2 * Math.PI * v * 9 + seed))
    * Math.sin(2 * Math.PI * (frequency - 1) * v + .5 * Math.sin(2 * Math.PI * 7 * u + seed))
    * Math.sin(Math.PI * v) ** 2;
}
/** A UV chart is a continuous shape, not a vertex array. Same shape, many samplings. */
export function surface(base, { detail = () => 0, wrapU = false, mask = () => true } = {}) {
  if (![base, detail, mask].every(f => typeof f === 'function')) throw new TypeError('surface: expected functions');
  const point = (u, v) => {
    const p = V(base(wrapU ? ((u % 1) + 1) % 1 : clamp(u), clamp(v)));
    if (!p.toArray().every(Number.isFinite)) throw new Error('surface returned a non-finite point');
    return p;
  };
  const normalOf = (fn, u, v) => {
    const h = 1e-5, lo = wrapU ? u - h : Math.max(0, u - h), hi = wrapU ? u + h : Math.min(1, u + h);
    const du = fn(hi, v).sub(fn(lo, v)), dv = fn(u, Math.min(1, v + h)).sub(fn(u, Math.max(0, v - h)));
    const n = du.normalize().cross(dv.normalize());
    if (n.lengthSq() < 1e-16) throw new Error(`Singular chart at ${u},${v}: use a cap rather than collapsed pole faces`);
    return n.normalize();
  };
  const high = (u, v) => {
    const d = detail(wrapU ? ((u % 1) + 1) % 1 : clamp(u), clamp(v));
    if (!Number.isFinite(d)) throw new Error('detail returned a non-finite displacement');
    return point(u, v).addScaledVector(normalOf(point, u, v), d);
  };
  return Object.freeze({ point, high, mask, wrapU, normal: (u, v, detailed = false) => normalOf(detailed ? high : point, u, v) });
}
/** Sample a chart with a fixed diagonal. The baked basis uses these exact triangles. */
export function tessellate(chart, { segments = [24, 24], detailed = false } = {}) {
  const [nu, nv] = segments; count(nu, 3, 512, 'U segments'); count(nv, 1, 512, 'V segments');
  const positions = [], normals = [], uv = [], indices = [];
  for (let y = 0; y <= nv; y++) for (let x = 0; x <= nu; x++) {
    const u = x / nu, v = y / nv;
    positions.push(...(detailed ? chart.high(u, v) : chart.point(u, v)).toArray());
    normals.push(...chart.normal(u, v, detailed).toArray()); uv.push(u, v);
  }
  for (let y = 0; y < nv; y++) for (let x = 0; x < nu; x++) {
    if (!chart.mask((x + .5) / nu, (y + .5) / nv)) continue;
    const a = y * (nu + 1) + x, b = a + 1, d = a + nu + 1, c = d + 1;
    indices.push(a, b, d, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(indices);
  computeMikkTSpaceTangents(g, MikkTSpace, true);
  return g;
}
/** The low surface's interpolated, orthonormal tangent frame at a UV sample. */
export function tangentFrame(g, triangle, barycentric) {
  const normal = new THREE.Vector3(), tangent = new THREE.Vector3(); let sign = 0;
  for (let k = 0; k < 3; k++) {
    const i = g.index ? g.index.getX(triangle * 3 + k) : triangle * 3 + k;
    normal.addScaledVector(new THREE.Vector3().fromBufferAttribute(g.attributes.normal, i), barycentric[k]);
    tangent.addScaledVector(new THREE.Vector3().fromBufferAttribute(g.attributes.tangent, i), barycentric[k]);
    sign += g.attributes.tangent.getW(i) * barycentric[k];
  }
  normal.normalize(); tangent.addScaledVector(normal, -tangent.dot(normal)).normalize();
  return { n: normal, t: tangent, b: new THREE.Vector3().crossVectors(normal, tangent).multiplyScalar(sign < 0 ? -1 : 1) };
}
/**
 * Bake the evaluated high surface into the ACTUAL low triangle's Mikk tangent frame.
 * This is UV-correspondence baking, not ray projection or photo texture extraction.
 * Every chart owns its UV tile; holes stay neutral. No lighting goes into the map.
 */
export function bakeNormals(chart, geometry, { size = 256 } = {}) {
  count(size, 16, 2048, 'normal map size');
  const data = new Uint8Array(size * size * 4), covered = new Uint8Array(size * size);
  for (let i = 0; i < data.length; i += 4) data.set([128, 128, 255, 255], i);
  const uv = geometry.attributes.uv, triangles = (geometry.index?.count || uv.count) / 3;
  let samples = 0, before = 0, after = 0, maxAfter = 0;
  for (let tri = 0; tri < triangles; tri++) {
    const ids = [0, 1, 2].map(k => geometry.index ? geometry.index.getX(tri * 3 + k) : tri * 3 + k);
    const [a, b, c] = ids.map(i => [uv.getX(i), uv.getY(i)]);
    const area = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(area) < 1e-12) continue;
    const xmin = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]) * size)), xmax = Math.min(size - 1, Math.ceil(Math.max(a[0], b[0], c[0]) * size));
    const ymin = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]) * size)), ymax = Math.min(size - 1, Math.ceil(Math.max(a[1], b[1], c[1]) * size));
    for (let y = ymin; y <= ymax; y++) for (let x = xmin; x <= xmax; x++) {
      const i = y * size + x; if (covered[i]) continue;
      const u = (x + .5) / size, v = (y + .5) / size;
      const w0 = ((b[1] - c[1]) * (u - c[0]) + (c[0] - b[0]) * (v - c[1])) / area;
      const w1 = ((c[1] - a[1]) * (u - c[0]) + (a[0] - c[0]) * (v - c[1])) / area;
      if (w0 < -1e-7 || w1 < -1e-7 || w0 + w1 > 1 + 1e-7) continue;
      covered[i] = 1;
      const frame = tangentFrame(geometry, tri, [w0, w1, 1 - w0 - w1]), high = chart.normal(u, v, true);
      const local = [high.dot(frame.t), high.dot(frame.b), high.dot(frame.n)];
      for (let k = 0; k < 3; k++) data[i * 4 + k] = Math.round(clamp(local[k] * .5 + .5) * 255);
      const restored = frame.t.clone().multiplyScalar(data[i * 4] / 127.5 - 1)
        .addScaledVector(frame.b, data[i * 4 + 1] / 127.5 - 1).addScaledVector(frame.n, data[i * 4 + 2] / 127.5 - 1).normalize();
      const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) * 180 / Math.PI;
      const e = angle(restored, high); before += angle(frame.n, high); after += e; maxAfter = Math.max(maxAfter, e); samples++;
    }
  }
  if (!samples) throw new Error('Cannot bake an empty UV chart');
  for (let pass = 0; pass < 2; pass++) {
    const next = covered.slice();
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = y * size + x; if (covered[i]) continue;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;
        const j = yy * size + xx; if (!covered[j]) continue;
        data.set(data.subarray(j * 4, j * 4 + 4), i * 4); next[i] = 1; break;
      }
    }
    covered.set(next);
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.NoColorSpace; texture.flipY = false; texture.wrapS = chart.wrapU ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping; texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true; texture.needsUpdate = true;
  texture.userData.bake = { method: 'UV-correspondence / evaluated high surface', samples, size, meanBaseErrorDegrees: before / samples, meanQuantizedErrorDegrees: after / samples, maxQuantizedErrorDegrees: maxAfter };
  return texture;
}
/** Material and geometry are build-owned. Keep full shape in low; bake only detail. */
export function surfaceMesh(name, chart, { mode = 'baked', segments = [24, 24], subdivision = 4, textureSize = 256, material } = {}) {
  if (!['sculpt', 'baked', 'cage'].includes(mode)) throw new Error('Unknown surface representation');
  count(subdivision, 1, 8, 'subdivision');
  const g = tessellate(chart, { segments: segments.map(n => n * (mode === 'sculpt' ? subdivision : 1)), detailed: mode === 'sculpt' });
  const mat = material?.clone() || new THREE.MeshStandardMaterial({ color: '#be957e', roughness: .68 });
  mat.normalMap = mode === 'baked' ? bakeNormals(chart, g, { size: textureSize }) : null;
  if (mat.normalMap) mat.normalMap.name = `${name}_Normal`;
  const mesh = new THREE.Mesh(g, mat); mesh.name = name; mesh.castShadow = mesh.receiveShadow = true;
  mesh.userData.surface = { representation: mode, chart: name, source: 'procedural first-principles surface', ...(mat.normalMap ? { bake: mat.normalMap.userData.bake } : {}) };
  return mesh;
}
