import * as THREE from 'three';
import { mesh } from './modeling.js';

function validateSource(source) {
  if (!source?.isBufferGeometry) throw new Error('surfaceBoundaryLoops needs a Three.js BufferGeometry');
  const position = source.getAttribute('position');
  if (!position || position.itemSize !== 3 || !position.count) throw new Error('surfaceBoundaryLoops needs XYZ positions');
  if (!source.index || source.index.count % 3) throw new Error('surfaceBoundaryLoops needs indexed triangle geometry');
  return position;
}
function sourceNormals(source, position) {
  const existing = source.getAttribute('normal');
  if (existing) {
    if (existing.itemSize !== 3 || existing.count !== position.count) throw new Error('surfaceBoundaryLoops needs one XYZ normal per position');
    return existing;
  }
  const copy = source.clone(); copy.computeVertexNormals();
  const normals = copy.getAttribute('normal').clone(); copy.dispose(); return normals;
}
function orderedBoundaryLoops(index) {
  const edges = new Map();
  const add = (a, b) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`, found = edges.get(key);
    if (found) { found.count++; if (found.count > 2) throw new Error('surfaceBoundaryLoops needs manifold triangle edges'); }
    else edges.set(key, { a, b, count: 1 });
  };
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
    if (a === b || b === c || c === a) throw new Error('surfaceBoundaryLoops rejects degenerate triangles');
    add(a, b); add(b, c); add(c, a);
  }
  const boundary = [...edges.values()].filter(edge => edge.count === 1);
  const next = new Map(), incoming = new Map();
  for (const edge of boundary) {
    if (next.has(edge.a) || incoming.has(edge.b)) throw new Error('surfaceBoundaryLoops needs consistently wound manifold boundaries');
    next.set(edge.a, edge.b); incoming.set(edge.b, edge.a);
  }
  for (const edge of boundary) if (!incoming.has(edge.a) || !next.has(edge.b)) throw new Error('surfaceBoundaryLoops boundary must form closed loops');
  const remaining = new Set(boundary.map(edge => edge.a)), loops = [];
  while (remaining.size) {
    const start = remaining.values().next().value, loop = [start]; let current = start;
    for (let guard = 0; guard <= boundary.length; guard++) {
      remaining.delete(current); const target = next.get(current);
      if (target === start) break;
      if (target === undefined || loop.includes(target)) throw new Error('surfaceBoundaryLoops traversal failed');
      loop.push(target); current = target;
      if (guard === boundary.length) throw new Error('surfaceBoundaryLoops traversal exceeded edge count');
    }
    loops.push(loop);
  }
  return loops;
}

/** Return ordered boundary loops with source positions/normals. Loops preserve source winding;
 * holes therefore retain the opposite orientation of outer boundaries. */
export function surfaceBoundaryLoops(source) {
  const position = validateSource(source), normal = sourceNormals(source, position);
  return orderedBoundaryLoops(source.index).map(indices => ({
    indices: [...indices],
    points: indices.map(i => new THREE.Vector3().fromBufferAttribute(position, i)),
    normals: indices.map(i => new THREE.Vector3().fromBufferAttribute(normal, i).normalize()),
  }));
}

export function roundBoundaryProfile({ radius = 0.01, segments = 8, aspect = 1 } = {}) {
  if (!(Number.isFinite(radius) && radius > 0)) throw new Error('roundBoundaryProfile radius must be positive');
  if (!(Number.isFinite(aspect) && aspect > 0)) throw new Error('roundBoundaryProfile aspect must be positive');
  if (!Number.isInteger(segments) || segments < 3 || segments > 64) throw new Error('roundBoundaryProfile segments must be an integer in 3..64');
  return Array.from({ length: segments }, (_, i) => {
    const a = Math.PI * 2 * i / segments; return [Math.cos(a) * radius, Math.sin(a) * radius * aspect];
  });
}
function normalizedProfile(profile) {
  if (!Array.isArray(profile) || profile.length < 3) throw new Error('boundaryProfileGeometry profile needs at least three points');
  const points = profile.map((p, i) => {
    if (!Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite)) throw new Error(`boundary profile point ${i} needs two finite numbers`);
    return new THREE.Vector2(...p);
  });
  if (points[0].distanceTo(points.at(-1)) < 1e-12) points.pop();
  if (points.length < 3) throw new Error('boundaryProfileGeometry profile needs three distinct points');
  for (let i = 0; i < points.length; i++) if (points[i].distanceTo(points[(i + 1) % points.length]) < 1e-12) throw new Error('boundaryProfileGeometry profile contains duplicate adjacent points');
  return points;
}
function frameAt(loop, i) {
  const n = loop.normals[i].clone().normalize();
  const previous = loop.points[(i + loop.points.length - 1) % loop.points.length], next = loop.points[(i + 1) % loop.points.length];
  const tangent = next.clone().sub(previous).addScaledVector(n, -next.clone().sub(previous).dot(n));
  if (tangent.lengthSq() < 1e-18) throw new Error('boundaryProfileGeometry cannot frame a degenerate boundary vertex');
  tangent.normalize(); const outward = tangent.clone().cross(n);
  if (outward.lengthSq() < 1e-18) throw new Error('boundaryProfileGeometry cannot determine boundary outward direction');
  return { normal: n, outward: outward.normalize() };
}

/** Sweep a closed 2D profile around every open boundary of an indexed triangle surface.
 * Profile X points outward from the surface chart, Y follows the source normal. The source mesh
 * is never modified; this is additive trim/piping, not an arbitrary mesh bevel or weld. */
export function boundaryProfileGeometry(source, { profile = roundBoundaryProfile(), offset = [0, 0] } = {}) {
  if (!Array.isArray(offset) || offset.length !== 2 || !offset.every(Number.isFinite)) throw new Error('boundaryProfileGeometry offset needs two finite numbers');
  const loops = surfaceBoundaryLoops(source), section = normalizedProfile(profile), positions = [], normals = [], uvs = [], indices = [];
  const ring = section.length + 1;
  let vertexBase = 0;
  for (const loop of loops) {
    const distance = [0]; let perimeter = 0;
    for (let i = 0; i < loop.points.length; i++) { perimeter += loop.points[i].distanceTo(loop.points[(i + 1) % loop.points.length]); distance.push(perimeter); }
    const loopStart = vertexBase;
    for (let i = 0; i <= loop.points.length; i++) {
      const k = i % loop.points.length, frame = frameAt(loop, k), u = perimeter > 1e-18 ? distance[i] / perimeter : 0;
      for (let j = 0; j < ring; j++) {
        const p = section[j % section.length], localX = p.x + offset[0], localY = p.y + offset[1];
        const world = loop.points[k].clone().addScaledVector(frame.outward, localX).addScaledVector(frame.normal, localY);
        positions.push(world.x, world.y, world.z); uvs.push(u, j / section.length); vertexBase++;
      }
    }
    for (let i = 0; i < loop.points.length; i++) for (let j = 0; j < section.length; j++) {
      const a = loopStart + i * ring + j, b = a + 1, c = loopStart + (i + 1) * ring + j, d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices); geometry.computeVertexNormals();
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  geometry.userData.boundaryProfile = { loops: loops.length, profilePoints: section.length, topologyChanged: true, sourceUnchanged: true };
  return geometry;
}
export function boundaryProfile(source, options = {}) {
  const { profile, offset, ...meshOptions } = options;
  return mesh(boundaryProfileGeometry(source, { profile, offset }), meshOptions);
}
