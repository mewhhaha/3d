import * as THREE from 'three';
import { faceRegionTriangles } from './face-regions.js';
import { remapSurfaceAnchor, surfaceAnchor, surfaceTopologySignature } from './surface-mount.js';

const META = 'uvCharts';

function validateGeometry(geometry) {
  if (!geometry?.isBufferGeometry) throw new Error('UV charts need a Three.js BufferGeometry');
  const position = geometry.getAttribute('position');
  if (!position || position.itemSize !== 3 || !position.count) throw new Error('UV charts need XYZ positions');
  if (!geometry.index || geometry.index.count % 3) throw new Error('UV charts need indexed triangles');
  if (Object.keys(geometry.morphAttributes || {}).length) throw new Error('UV chart splitting needs an explicit morph-target transfer contract');
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    if (attribute.isInterleavedBufferAttribute) throw new Error(`UV chart splitting does not support interleaved attribute '${name}'`);
  }
  return { position, triangleCount: geometry.index.count / 3 };
}

function vec3(value, label) {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) throw new Error(`${label} must contain three finite numbers`);
  return new THREE.Vector3().fromArray(value);
}

function frame(spec, label) {
  const origin = vec3(spec?.origin ?? [0, 0, 0], `${label} origin`);
  const u = vec3(spec?.uAxis ?? [1, 0, 0], `${label} uAxis`);
  const v = vec3(spec?.vAxis ?? [0, 1, 0], `${label} vAxis`);
  if (u.lengthSq() < 1e-20 || v.lengthSq() < 1e-20) throw new Error(`${label} axes must be non-zero`);
  u.normalize();
  v.addScaledVector(u, -v.dot(u));
  if (v.lengthSq() < 1e-20) throw new Error(`${label} axes must not be parallel`);
  v.normalize();
  return { origin, u, v };
}

function rectangle(value, label, { unit = false } = {}) {
  const a = value ?? [0, 0, 1, 1];
  if (!Array.isArray(a) || a.length !== 4 || !a.every(Number.isFinite) || a[2] <= a[0] || a[3] <= a[1]) {
    throw new Error(`${label} must be [u0, v0, u1, v1] with positive area`);
  }
  if (unit && a.some(n => n < 0 || n > 1)) throw new Error(`${label} must stay inside 0..1`);
  return [...a];
}

function atlas(value, label) {
  return rectangle(value, `${label} atlas`, { unit: true });
}

function chartFaces(geometry, spec, label) {
  const regions = spec.region ?? spec.regions;
  if (regions == null) throw new Error(`${label} needs region or regions`);
  return faceRegionTriangles(geometry, regions, { match: spec.match ?? 'any' });
}

function compressFaces(faces) {
  const ranges = [];
  for (const face of faces) {
    const last = ranges.at(-1);
    if (last && last[1] === face) last[1] = face + 1;
    else ranges.push([face, face + 1]);
  }
  return ranges;
}

function copyAttribute(attribute, sourceVertices) {
  const ArrayType = attribute.array.constructor;
  const array = new ArrayType(sourceVertices.length * attribute.itemSize);
  for (let target = 0; target < sourceVertices.length; target++) {
    const source = sourceVertices[target];
    for (let k = 0; k < attribute.itemSize; k++) array[target * attribute.itemSize + k] = attribute.array[source * attribute.itemSize + k];
  }
  const output = new THREE.BufferAttribute(array, attribute.itemSize, attribute.normalized);
  output.name = attribute.name;
  output.setUsage(attribute.usage);
  if ('gpuType' in attribute) output.gpuType = attribute.gpuType;
  return output;
}

function keyFor(sourceVertex, uv, domain) {
  // Chart identity is part of the seam key so independently editable islands never accidentally
  // share a target UV vertex merely because two authored rectangles currently touch or overlap.
  return `${domain}:${sourceVertex}:${uv[0].toFixed(12)}:${uv[1].toFixed(12)}`;
}

export function projectFaceRegionUVs(geometry, charts, { preserveUnassigned = true } = {}) {
  const { position, triangleCount } = validateGeometry(geometry);
  if (!Array.isArray(charts) || !charts.length) throw new Error('projectFaceRegionUVs needs at least one chart');
  const sourceUV = geometry.getAttribute('uv');
  if (sourceUV && (sourceUV.itemSize !== 2 || sourceUV.count !== position.count)) throw new Error('source UV attribute is invalid');
  const owner = new Int32Array(triangleCount); owner.fill(-1);
  const normalized = charts.map((spec, chartIndex) => {
    if (!spec || typeof spec !== 'object' || Array.isArray(spec)) throw new Error(`UV chart ${chartIndex} must be an object`);
    const label = `UV chart ${chartIndex}`;
    const faces = chartFaces(geometry, spec, label);
    const f = frame(spec.frame, label);
    const tile = atlas(spec.atlas, label);
    const padding = spec.padding ?? 0;
    if (!Number.isFinite(padding) || padding < 0 || padding >= .5) throw new Error(`${label} padding must be from 0 up to 0.5`);
    for (const face of faces) {
      if (owner[face] !== -1) throw new Error(`UV charts overlap on triangle ${face}`);
      owner[face] = chartIndex;
    }
    const projected = [];
    let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity;
    for (const face of faces) for (let corner = 0; corner < 3; corner++) {
      const vertex = geometry.index.getX(face * 3 + corner);
      const p = new THREE.Vector3().fromBufferAttribute(position, vertex).sub(f.origin);
      const u = p.dot(f.u), v = p.dot(f.v);
      projected.push([face, corner, u, v]);
      minU = Math.min(minU, u); maxU = Math.max(maxU, u); minV = Math.min(minV, v); maxV = Math.max(maxV, v);
    }
    if (!(maxU - minU > 1e-12) || !(maxV - minV > 1e-12)) throw new Error(`${label} planar projection has zero UV extent`);
    const [u0, v0, u1, v1] = tile;
    const insetU = (u1 - u0) * padding, insetV = (v1 - v0) * padding;
    const cornerUV = new Map();
    for (const [face, corner, u, v] of projected) {
      const su = (u - minU) / (maxU - minU), sv = (v - minV) / (maxV - minV);
      cornerUV.set(face * 3 + corner, [u0 + insetU + su * (u1 - u0 - 2 * insetU), v0 + insetV + sv * (v1 - v0 - 2 * insetV)]);
    }
    return {
      faces,
      faceRanges: compressFaces(faces),
      frame: { origin: f.origin.toArray(), uAxis: f.u.toArray(), vAxis: f.v.toArray() },
      atlas: [...tile],
      padding,
      cornerUV,
    };
  });

  if (!preserveUnassigned && owner.some(value => value < 0)) throw new Error('UV charts do not cover every triangle');
  if (preserveUnassigned && !sourceUV && owner.some(value => value < 0)) throw new Error('unassigned faces need source UVs or full chart coverage');

  const sourceVertices = [];
  const outputUV = [];
  const cornerToVertex = new Uint32Array(geometry.index.count);
  const cache = new Map();
  for (let offset = 0; offset < geometry.index.count; offset++) {
    const face = Math.floor(offset / 3), sourceVertex = geometry.index.getX(offset), chartIndex = owner[face];
    const uv = chartIndex >= 0
      ? normalized[chartIndex].cornerUV.get(offset)
      : [sourceUV.getX(sourceVertex), sourceUV.getY(sourceVertex)];
    const key = keyFor(sourceVertex, uv, chartIndex >= 0 ? `chart-${chartIndex}` : 'source');
    let target = cache.get(key);
    if (target == null) {
      target = sourceVertices.length; cache.set(key, target); sourceVertices.push(sourceVertex); outputUV.push(...uv);
    }
    cornerToVertex[offset] = target;
  }

  const output = geometry.clone();
  for (const name of Object.keys(output.attributes)) output.deleteAttribute(name);
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    if (name === 'uv' || name === 'tangent') continue;
    output.setAttribute(name, copyAttribute(attribute, sourceVertices));
  }
  output.setAttribute('uv', new THREE.Float32BufferAttribute(outputUV, 2));
  const IndexType = sourceVertices.length > 65535 ? Uint32Array : Uint16Array;
  output.setIndex(new THREE.BufferAttribute(new IndexType(cornerToVertex), 1));
  if (geometry.getAttribute('tangent')) output.computeTangents();
  output.computeBoundingBox(); output.computeBoundingSphere();
  output.userData = {
    ...output.userData,
    [META]: {
      version: 1,
      sourceTopologySignature: surfaceTopologySignature(geometry),
      sourceVertexCount: position.count,
      targetVertexCount: sourceVertices.length,
      triangleCount,
      faceOrder: 'preserved',
      sourceVertices,
      cornerToVertex: Array.from(cornerToVertex),
      charts: normalized.map(({ cornerUV, faces, ...item }) => ({ ...item, faceCount: faces.length })),
    },
  };
  return output;
}

/** Remap a bind-created same-face surface anchor through projectFaceRegionUVs seam splitting. */
export function remapUvChartAnchor(chartedGeometry, rawAnchor) {
  if (!chartedGeometry?.isBufferGeometry) throw new Error('remapUvChartAnchor needs a charted BufferGeometry');
  const metadata = chartedGeometry.userData?.[META];
  if (!metadata || metadata.version !== 1 || metadata.faceOrder !== 'preserved') throw new Error('remapUvChartAnchor needs projectFaceRegionUVs provenance metadata');
  const anchor = surfaceAnchor(rawAnchor);
  if (anchor.topologySignature == null || anchor.topologySignature !== metadata.sourceTopologySignature) {
    throw new Error('remapUvChartAnchor anchor belongs to a different source topology');
  }
  if (anchor.triangleIndex >= metadata.triangleCount) throw new Error('remapUvChartAnchor source triangle is outside the charted geometry');
  const offset = anchor.triangleIndex * 3;
  const sourceCorners = [0, 1, 2].map(corner => metadata.sourceVertices[metadata.cornerToVertex[offset + corner]]);
  if (sourceCorners.some((vertex, corner) => vertex !== anchor.indices[corner])) {
    throw new Error('remapUvChartAnchor face/corner provenance is inconsistent');
  }
  return remapSurfaceAnchor(anchor, chartedGeometry, { triangleIndex: anchor.triangleIndex, cornerMap: [0, 1, 2] });
}
