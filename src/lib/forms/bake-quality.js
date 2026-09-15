import * as THREE from 'three';
import { tangentFrame } from './surface.js';
import { normalSampler } from './fair.js';

const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) * 180 / Math.PI;
function sequence(index, base) {
  let value = 0, fraction = 1;
  while (index > 0) { fraction /= base; value += (index % base) * fraction; index = Math.floor(index / base); }
  return value;
}
/** Bilinear, level-zero sampling of a linear RGBA8 normal map, at arbitrary UVs. */
export function sampleNormalMap(texture, u, v) {
  const { width, height, data } = texture.image || {};
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
      !(data instanceof Uint8Array || data instanceof Uint8ClampedArray) || data.length !== width * height * 4)
    throw new Error('Expected an RGBA8 DataTexture');
  if (texture.colorSpace !== THREE.NoColorSpace || texture.flipY)
    throw new Error('Expected a linear, unflipped normal map');
  if (![u, v].every(Number.isFinite)) throw new Error('Expected finite UV coordinates');
  const address = (i, n, wrapping) => {
    if (wrapping === THREE.RepeatWrapping) return ((i % n) + n) % n;
    if (wrapping !== THREE.ClampToEdgeWrapping) throw new Error('Unsupported wrapping mode');
    return Math.min(n - 1, Math.max(0, i));
  };
  const x = u * width - .5, y = v * height - .5, ix = Math.floor(x), iy = Math.floor(y);
  const result = new THREE.Vector3();
  for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
    const i = 4 * (address(iy + dy, height, texture.wrapT) * width + address(ix + dx, width, texture.wrapS));
    const w = (dx ? x - ix : 1 - (x - ix)) * (dy ? y - iy : 1 - (y - iy));
    result.addScaledVector(new THREE.Vector3(data[i] / 127.5 - 1, data[i + 1] / 127.5 - 1, data[i + 2] / 127.5 - 1), w);
  }
  return result.normalize();
}
/**
 * Independent surface-area sampling of a normal bake against the actual high mesh.
 * Unlike texel-center encoding error, this includes bilinear filtering and high-mesh
 * tessellation. Rest pose only; no mipmaps, silhouette, BRDF or image-likeness score.
 */
export function measureBake(low, high, texture, { samples = 2048 } = {}) {
  if (!Number.isInteger(samples) || samples < 16 || samples > 100000) throw new Error('Expected 16..100000 samples');
  if (!low.attributes.position || !low.attributes.uv || !low.attributes.normal || !low.attributes.tangent)
    throw new Error('Low geometry needs positions, UVs, normals and tangents');
  if (high.index) throw new Error('High normal sampler expects non-indexed UV corners');
  const sourceNormal = normalSampler(high), faces = []; let totalArea = 0;
  const p = low.attributes.position, uv = low.attributes.uv;
  const count = (low.index?.count || p.count) / 3;
  for (let tri = 0; tri < count; tri++) {
    const ids = [0, 1, 2].map(k => low.index ? low.index.getX(tri * 3 + k) : tri * 3 + k);
    const q = ids.map(i => new THREE.Vector3().fromBufferAttribute(p, i));
    const area = q[1].sub(q[0]).cross(q[2].sub(q[0])).length() * .5;
    const [a, b, c] = ids.map(i => [uv.getX(i), uv.getY(i)]);
    const uvArea = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (area < 1e-15 || Math.abs(uvArea) < 1e-14) continue;
    totalArea += area; faces.push({ tri, ids, cumulative: totalArea });
  }
  if (!faces.length) throw new Error('Cannot measure an empty UV surface');
  const baseErrors = [], bakedErrors = [];
  for (let i = 1; i <= samples; i++) {
    const area = sequence(i, 2) * totalArea; let left = 0, right = faces.length - 1;
    while (left < right) { const mid = (left + right) >>> 1; if (faces[mid].cumulative < area) left = mid + 1; else right = mid; }
    const face = faces[left], s = Math.sqrt(sequence(i, 3)), t = sequence(i, 5);
    const weights = [1 - s, s * (1 - t), s * t]; let u = 0, v = 0;
    for (let k = 0; k < 3; k++) { u += uv.getX(face.ids[k]) * weights[k]; v += uv.getY(face.ids[k]) * weights[k]; }
    const n = sourceNormal(u, v), frame = tangentFrame(low, face.tri, weights), local = sampleNormalMap(texture, u, v);
    const restored = frame.t.clone().multiplyScalar(local.x).addScaledVector(frame.b, local.y).addScaledVector(frame.n, local.z).normalize();
    baseErrors.push(angle(frame.n, n)); bakedErrors.push(angle(restored, n));
  }
  const summary = values => {
    const sorted = [...values].sort((a, b) => a - b);
    return { meanDegrees: values.reduce((sum, v) => sum + v, 0) / samples,
      p95Degrees: sorted[Math.min(samples - 1, Math.ceil(.95 * samples) - 1)], maxDegrees: sorted.at(-1) };
  };
  const base = summary(baseErrors), baked = summary(bakedErrors);
  return { samples, surfaceArea: totalArea, textureSize: [texture.image.width, texture.image.height], base, baked,
    meanImprovement: base.meanDegrees ? 1 - baked.meanDegrees / base.meanDegrees : null,
    method: 'Deterministic area-weighted rest-surface samples; bilinear level-zero normal lookup versus corresponding high mesh normals',
    limitations: 'Not a silhouette, mipmapping, pose, material or photographic-likeness metric' };
}
