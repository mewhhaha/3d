import * as THREE from 'three';
import { faceRegionVertexMask } from './face-regions.js';
import { triangleSpatialIndex } from './triangle-spatial-index.js';

const finite3 = (value, label) => {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) {
    throw new Error(`${label} must contain three finite numbers`);
  }
  return value.slice();
};

function validateGeometry(geometry) {
  if (!geometry?.isBufferGeometry) throw new Error('surface stroke needs a Three.js BufferGeometry');
  const position = geometry.getAttribute('position');
  if (!position || position.itemSize !== 3 || !position.count) throw new Error('surface stroke needs XYZ positions');
  if (!geometry.index || geometry.index.count % 3) throw new Error('surface stroke needs indexed triangles');
  return position;
}

function falloffValue(mode, t) {
  if (t >= 1) return 0;
  if (mode === 'constant') return 1;
  if (mode === 'linear') return 1 - t;
  if (mode === 'smooth') return (1 - t * t) ** 3;
  throw new Error(`unknown surface stroke falloff '${mode}'`);
}

/** Project an authored geometry-local polyline onto an indexed support surface. */
export function projectSurfacePath(geometry, {
  points,
  sampleSpacing = 0.04,
  closed = false,
  maxDistance = Infinity,
  regionNames = null,
  regionMatch = 'any',
  normal = null,
  minNormalDot = -1,
} = {}) {
  validateGeometry(geometry);
  if (!Array.isArray(points) || points.length < 2) throw new Error('surface path projection needs at least two points');
  const authored = points.map((point, index) => finite3(point, `surface path point ${index}`));
  if (!Number.isFinite(sampleSpacing) || sampleSpacing <= 0) throw new Error('surface path sampleSpacing must be positive');
  const segmentCount = authored.length - 1 + (closed ? 1 : 0);
  const index = triangleSpatialIndex(geometry);
  const samples = [];
  for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
    const a = new THREE.Vector3(...authored[segmentIndex]);
    const b = new THREE.Vector3(...authored[(segmentIndex + 1) % authored.length]);
    const length = a.distanceTo(b);
    if (length <= Number.EPSILON) throw new Error('surface path projection cannot contain zero-length segments');
    const steps = Math.max(1, Math.ceil(length / sampleSpacing));
    for (let step = 0; step <= steps; step++) {
      if (segmentIndex > 0 && step === 0) continue;
      if (closed && segmentIndex === segmentCount - 1 && step === steps) continue;
      const t = step / steps;
      const authoredPoint = a.clone().lerp(b, t);
      const hit = index.closestPoint(authoredPoint, { maxDistance, regionNames, regionMatch, normal, minNormalDot });
      if (!hit) throw new Error(`surface path projection missed support at segment ${segmentIndex}, sample ${step}`);
      samples.push(Object.freeze({
        point: Object.freeze(hit.point.toArray()),
        triangleIndex: hit.triangleIndex,
        indices: Object.freeze(hit.indices.slice()),
        barycoord: Object.freeze(hit.barycoord.toArray()),
        distance: hit.distance,
      }));
    }
  }
  return Object.freeze({
    schema: 1,
    coordinateSpace: 'geometry-local',
    authoredPoints: Object.freeze(authored.map(point => Object.freeze(point))),
    sampleSpacing,
    closed: Boolean(closed),
    samples: Object.freeze(samples),
  });
}

class MinHeap {
  constructor() { this.items = []; }
  push(item) {
    const items = this.items;
    items.push(item);
    let index = items.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (items[parent][0] <= item[0]) break;
      items[index] = items[parent];
      index = parent;
    }
    items[index] = item;
  }
  pop() {
    const items = this.items;
    if (!items.length) return null;
    const root = items[0];
    const last = items.pop();
    if (items.length) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        if (left >= items.length) break;
        const child = right < items.length && items[right][0] < items[left][0] ? right : left;
        if (items[child][0] >= last[0]) break;
        items[index] = items[child];
        index = child;
      }
      items[index] = last;
    }
    return root;
  }
  get size() { return this.items.length; }
}

function projectedSamplePoint(geometry, sample) {
  const position = geometry.getAttribute('position');
  const offset = sample.triangleIndex * 3;
  if (offset + 2 >= geometry.index.count) throw new Error('surface path sample triangle no longer exists; reproject the path');
  const indices = [geometry.index.getX(offset), geometry.index.getX(offset + 1), geometry.index.getX(offset + 2)];
  if (indices.some((value, axis) => value !== sample.indices[axis])) throw new Error('surface path source topology changed; reproject the path');
  const point = new THREE.Vector3();
  for (let axis = 0; axis < 3; axis++) {
    point.addScaledVector(new THREE.Vector3().fromBufferAttribute(position, indices[axis]), sample.barycoord[axis]);
  }
  return { point, indices };
}

function edgeGraph(geometry, position) {
  const graph = Array.from({ length: position.count }, () => new Map());
  const add = (a, b) => {
    const va = new THREE.Vector3().fromBufferAttribute(position, a);
    const vb = new THREE.Vector3().fromBufferAttribute(position, b);
    const length = va.distanceTo(vb);
    const prior = graph[a].get(b);
    if (prior === undefined || length < prior) graph[a].set(b, length);
    const reverse = graph[b].get(a);
    if (reverse === undefined || length < reverse) graph[b].set(a, length);
  };
  for (let offset = 0; offset < geometry.index.count; offset += 3) {
    const a = geometry.index.getX(offset);
    const b = geometry.index.getX(offset + 1);
    const c = geometry.index.getX(offset + 2);
    add(a, b);
    add(b, c);
    add(c, a);
  }
  return graph;
}

/**
 * Build a compact point mask around a projected path using shortest edge-length distance on the mesh.
 * This is an edge-geodesic approximation, not an exact continuous surface geodesic.
 */
export function surfacePathSelection(geometry, projectedPath, {
  radius = 0.1,
  falloff = 'smooth',
  regionNames = null,
  regionMatch = 'any',
} = {}) {
  const position = validateGeometry(geometry);
  if (!projectedPath || projectedPath.schema !== 1 || !Array.isArray(projectedPath.samples) || !projectedPath.samples.length) {
    throw new Error('surfacePathSelection needs a projected surface path');
  }
  if (!Number.isFinite(radius) || radius <= 0) throw new Error('surface path radius must be positive');
  if (!['smooth', 'linear', 'constant'].includes(falloff)) throw new Error('surface path falloff must be smooth, linear or constant');

  const graph = edgeGraph(geometry, position);
  const regionMask = regionNames == null ? null : faceRegionVertexMask(geometry, regionNames, { match: regionMatch });
  const eligible = vertex => regionMask == null || regionMask[vertex] > 0;
  const distances = new Float64Array(position.count);
  distances.fill(Infinity);
  const heap = new MinHeap();

  for (const sample of projectedPath.samples) {
    const resolved = projectedSamplePoint(geometry, sample);
    for (const vertexIndex of resolved.indices) {
      if (!eligible(vertexIndex)) continue;
      const vertex = new THREE.Vector3().fromBufferAttribute(position, vertexIndex);
      const distance = vertex.distanceTo(resolved.point);
      if (distance < distances[vertexIndex]) {
        distances[vertexIndex] = distance;
        heap.push([distance, vertexIndex]);
      }
    }
  }

  while (heap.size) {
    const [distance, vertex] = heap.pop();
    if (distance !== distances[vertex] || distance >= radius) continue;
    for (const [neighbor, edgeLength] of graph[vertex]) {
      if (!eligible(neighbor)) continue;
      const next = distance + edgeLength;
      if (next < distances[neighbor] && next < radius) {
        distances[neighbor] = next;
        heap.push([next, neighbor]);
      }
    }
  }

  const weights = new Float32Array(position.count);
  for (let vertex = 0; vertex < weights.length; vertex++) {
    if (!eligible(vertex)) continue;
    weights[vertex] = falloffValue(falloff, distances[vertex] / radius);
  }
  return weights;
}
