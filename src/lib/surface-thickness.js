import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { mesh } from './modeling.js';
import { faceRegionNames, remapFaceRegions } from './face-regions.js';

const allowedShellAttributes = new Set(['position', 'normal', 'uv']);

function finiteNumber(value, label) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
  return value;
}
function validateSource(source, label = 'solidifyGeometry', { allowGroups = false } = {}) {
  if (!source?.isBufferGeometry) throw new Error(`${label} needs a Three.js BufferGeometry`);
  const position = source.getAttribute('position');
  if (!position || position.itemSize !== 3 || !position.count) throw new Error(`${label} needs XYZ positions`);
  if (!source.index || source.index.count % 3) throw new Error(`${label} needs indexed triangle geometry`);
  if (!allowGroups && source.groups?.length) throw new Error(`${label} does not yet transfer material groups`);
  if (source.drawRange?.start !== 0 || source.drawRange?.count !== Infinity) throw new Error(`${label} needs the full geometry draw range`);
  if (source.getAttribute('skinIndex') || source.getAttribute('skinWeight')) throw new Error(`${label} does not transfer skin weights`);
  if (Object.values(source.morphAttributes ?? {}).some(list => list?.length)) throw new Error(`${label} does not transfer morph targets`);
  const uv = source.getAttribute('uv');
  if (uv && (uv.itemSize !== 2 || uv.count !== position.count)) throw new Error(`${label} needs one UV pair per position`);
  return { position, uv };
}
function sourceNormals(source, position) {
  const existing = source.getAttribute('normal');
  if (existing) {
    if (existing.itemSize !== 3 || existing.count !== position.count) throw new Error('solidifyGeometry needs one XYZ normal per position');
    return existing;
  }
  const clone = source.clone();
  clone.computeVertexNormals();
  const normals = clone.getAttribute('normal').clone();
  clone.dispose();
  return normals;
}
function boundaryData(index) {
  const edges = new Map();
  const add = (a, b, triangleIndex) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    const found = edges.get(key);
    if (found) {
      found.count++; found.faces.push(triangleIndex);
      if (found.count > 2) throw new Error('solidifyGeometry needs manifold triangle edges');
    } else edges.set(key, { a, b, count: 1, faces: [triangleIndex] });
  };
  for (let i = 0; i < index.count; i += 3) {
    const triangleIndex = i / 3;
    const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
    if (a === b || b === c || c === a) throw new Error('solidifyGeometry rejects degenerate triangles');
    add(a, b, triangleIndex); add(b, c, triangleIndex); add(c, a, triangleIndex);
  }
  const boundary = [...edges.values()].filter(edge => edge.count === 1);
  if (!boundary.length) return { boundary, loops: [] };
  const next = new Map(), incoming = new Map();
  for (const edge of boundary) {
    if (next.has(edge.a) || incoming.has(edge.b)) throw new Error('solidifyGeometry needs consistently wound manifold boundaries');
    next.set(edge.a, edge.b); incoming.set(edge.b, edge.a);
  }
  for (const edge of boundary) if (!incoming.has(edge.a) || !next.has(edge.b)) throw new Error('solidifyGeometry boundary must form closed loops');
  const remaining = new Set(boundary.map(edge => edge.a));
  const loops = [];
  while (remaining.size) {
    const start = remaining.values().next().value, loop = [start];
    let current = start;
    for (let guard = 0; guard <= boundary.length; guard++) {
      remaining.delete(current);
      const target = next.get(current);
      if (target === start) break;
      if (target === undefined || loop.includes(target)) throw new Error('solidifyGeometry boundary traversal failed');
      loop.push(target); current = target;
      if (guard === boundary.length) throw new Error('solidifyGeometry boundary traversal exceeded edge count');
    }
    loops.push(loop);
  }
  return { boundary, loops };
}
function resolvedThickness(spec, index, position, normal) {
  const value = typeof spec === 'function' ? spec(index, position.clone(), normal.clone()) : spec;
  if (!Number.isFinite(value) || value <= 0) throw new Error('solidifyGeometry thickness must stay positive');
  return value;
}
function vec3At(array, index) { return new THREE.Vector3(array[index * 3], array[index * 3 + 1], array[index * 3 + 2]); }
function pushVec3(array, value) { array.push(value.x, value.y, value.z); }
function edgeSideNormal(outerA, innerA, outerB) {
  const normal = innerA.clone().sub(outerA).cross(outerB.clone().sub(outerA));
  if (normal.lengthSq() < 1e-20) throw new Error('solidifyGeometry produced a degenerate rim');
  return normal.normalize();
}

/**
 * Add physical thickness to an indexed triangle surface by offsetting copies along its vertex normals.
 * This is intentionally a simple normal-offset shell, not a self-intersection/even-thickness solver.
 * `offset` follows Blender-like semantics: -1 keeps the outer surface fixed, 0 centers thickness,
 * +1 keeps the inner surface fixed. `rim` may be false, 'sharp', or 'smooth'.
 */
export function solidifyGeometry(source, { thickness = 0.01, offset = 0, rim = 'sharp', preserveRegions = true, regionPrefix = null } = {}) {
  const { position, uv } = validateSource(source);
  finiteNumber(offset, 'solidifyGeometry offset');
  if (offset < -1 || offset > 1) throw new Error('solidifyGeometry offset must be in -1..1');
  if (![false, 'sharp', 'smooth'].includes(rim)) throw new Error("solidifyGeometry rim must be false, 'sharp', or 'smooth'");
  if (typeof preserveRegions !== 'boolean') throw new Error('solidifyGeometry preserveRegions must be boolean');
  if (regionPrefix != null && (typeof regionPrefix !== 'string' || !regionPrefix.length)) throw new Error('solidifyGeometry regionPrefix must be a non-empty face-region prefix');
  const normal = sourceNormals(source, position), index = source.index;
  const { boundary, loops } = boundaryData(index);
  const sourceCount = position.count, positions = [], normals = [], uvs = uv ? [] : null, thicknesses = [];
  const outerFactor = (1 + offset) * 0.5, innerFactor = (1 - offset) * 0.5;
  for (let i = 0; i < sourceCount; i++) {
    const p = new THREE.Vector3().fromBufferAttribute(position, i), n = new THREE.Vector3().fromBufferAttribute(normal, i).normalize();
    const t = resolvedThickness(thickness, i, p, n); thicknesses.push(t);
    pushVec3(positions, p.clone().addScaledVector(n, t * outerFactor)); pushVec3(normals, n);
    if (uv) uvs.push(uv.getX(i), uv.getY(i));
  }
  for (let i = 0; i < sourceCount; i++) {
    const p = new THREE.Vector3().fromBufferAttribute(position, i), n = new THREE.Vector3().fromBufferAttribute(normal, i).normalize(), t = thicknesses[i];
    pushVec3(positions, p.clone().addScaledVector(n, -t * innerFactor)); pushVec3(normals, n.multiplyScalar(-1));
    if (uv) uvs.push(uv.getX(i), uv.getY(i));
  }
  const indices = [], faceSources = [], sourceTriangleCount = index.count / 3, outerIndexCount = index.count;
  for (let i = 0; i < index.count; i += 3) { indices.push(index.getX(i), index.getX(i + 1), index.getX(i + 2)); faceSources.push(i / 3); }
  const innerStart = indices.length;
  for (let i = 0; i < index.count; i += 3) { indices.push(sourceCount + index.getX(i), sourceCount + index.getX(i + 2), sourceCount + index.getX(i + 1)); faceSources.push(i / 3); }
  const rimStart = indices.length;

  if (rim === 'sharp') {
    for (const edge of boundary) {
      const oa = vec3At(positions, edge.a), ob = vec3At(positions, edge.b), ia = vec3At(positions, sourceCount + edge.a), ib = vec3At(positions, sourceCount + edge.b);
      const sideNormal = edgeSideNormal(oa, ia, ob), base = positions.length / 3;
      for (const point of [oa, ia, ob, ib]) { pushVec3(positions, point); pushVec3(normals, sideNormal); }
      if (uvs) uvs.push(0, 1, 0, 0, 1, 1, 1, 0);
      indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
      faceSources.push(edge.faces[0], edge.faces[0]);
    }
  } else if (rim === 'smooth') {
    const boundaryFace = new Map(boundary.map(edge => [`${edge.a}:${edge.b}`, edge.faces[0]]));
    for (const loop of loops) {
      const edgeNormals = loop.map((vertex, i) => {
        const nextVertex = loop[(i + 1) % loop.length];
        return edgeSideNormal(vec3At(positions, vertex), vec3At(positions, sourceCount + vertex), vec3At(positions, nextVertex));
      });
      const vertexNormals = loop.map((_, i) => {
        const result = edgeNormals[(i + loop.length - 1) % loop.length].clone().add(edgeNormals[i]);
        return result.lengthSq() > 1e-20 ? result.normalize() : edgeNormals[i].clone();
      });
      const distances = [0]; let perimeter = 0;
      for (let i = 0; i < loop.length; i++) {
        perimeter += vec3At(positions, loop[i]).distanceTo(vec3At(positions, loop[(i + 1) % loop.length]));
        distances.push(perimeter);
      }
      const base = positions.length / 3;
      for (let i = 0; i <= loop.length; i++) {
        const sourceVertex = loop[i % loop.length], sideNormal = vertexNormals[i % loop.length];
        pushVec3(positions, vec3At(positions, sourceVertex)); pushVec3(normals, sideNormal);
        pushVec3(positions, vec3At(positions, sourceCount + sourceVertex)); pushVec3(normals, sideNormal);
        if (uvs) { const u = perimeter > 1e-20 ? distances[i] / perimeter : 0; uvs.push(u, 1, u, 0); }
      }
      for (let i = 0; i < loop.length; i++) {
        const a = base + i * 2, nextPair = a + 2;
        indices.push(a, a + 1, nextPair, nextPair, a + 1, nextPair + 1);
        const sourceFace = boundaryFace.get(`${loop[i]}:${loop[(i + 1) % loop.length]}`);
        if (!Number.isInteger(sourceFace)) throw new Error('solidifyGeometry could not resolve smooth-rim face provenance');
        faceSources.push(sourceFace, sourceFace);
      }
    }
  }

  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  result.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  if (uvs) result.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  result.setIndex(indices);
  result.computeBoundingBox(); result.computeBoundingSphere();
  const invalidatedAttributes = Object.keys(source.attributes).filter(name => !allowedShellAttributes.has(name));
  result.userData = {
    ...source.userData,
    solidify: {
      sourceVertices: sourceCount,
      boundaryEdges: boundary.length,
      boundaryLoops: loops.length,
      rim,
      offset,
      variableThickness: typeof thickness === 'function',
      topologyChanged: true,
      preservedFaceRegions: preserveRegions ? faceRegionNames(source) : [],
      generatedFaceRegions: regionPrefix == null ? [] : [ `${regionPrefix}.outer`, `${regionPrefix}.inner`, ...(rim ? [`${regionPrefix}.rim`] : []) ],
      preservedAttributes: uv ? ['uv'] : [],
      invalidatedAttributes,
      rejectedDependencies: ['skin weights', 'morph targets', 'material groups'],
      exactEvenThickness: false,
      ranges: { outer: [0, outerIndexCount], inner: [innerStart, index.count], rim: [rimStart, indices.length - rimStart] },
    },
  };
  if (faceSources.length !== result.index.count / 3) throw new Error('solidifyGeometry internal face provenance count mismatch');
  const targetRegions = {};
  if (regionPrefix != null) {
    targetRegions[`${regionPrefix}.outer`] = Array.from({ length: sourceTriangleCount }, (_, i) => i);
    targetRegions[`${regionPrefix}.inner`] = Array.from({ length: sourceTriangleCount }, (_, i) => sourceTriangleCount + i);
    if (rim) targetRegions[`${regionPrefix}.rim`] = Array.from({ length: faceSources.length - sourceTriangleCount * 2 }, (_, i) => sourceTriangleCount * 2 + i);
  }
  if (preserveRegions || Object.keys(targetRegions).length) {
    remapFaceRegions(source, result, targetFace => faceSources[targetFace], {
      sourceRegions: preserveRegions ? null : [],
      targetRegions,
      clone: false,
    });
  } else if (result.userData.faceRegions) {
    result.userData = { ...result.userData };
    delete result.userData.faceRegions;
  }
  return result;
}

/** Apply an angle-based split-normal finish after topology construction. Angle is authored in degrees. */
export function creaseNormals(source, { angle = 60 } = {}) {
  validateSource(source, 'creaseNormals', { allowGroups: true });
  finiteNumber(angle, 'creaseNormals angle');
  if (angle <= 0 || angle >= 180) throw new Error('creaseNormals angle must be in 0..180 degrees');
  const invalidatedAttributes = source.getAttribute('tangent') ? ['tangent'] : [];
  const working = source.clone();
  working.deleteAttribute('tangent');
  const result = toCreasedNormals(working, THREE.MathUtils.degToRad(angle));
  if (result !== working) working.dispose();
  result.computeBoundingBox(); result.computeBoundingSphere();
  result.userData = {
    ...source.userData,
    creaseNormals: { angleDegrees: angle, topologyChanged: Boolean(source.index), invalidatedAttributes },
  };
  return result;
}

export function solidify(geometry, options = {}) {
  const { thickness, offset, rim, preserveRegions, regionPrefix, ...meshOptions } = options;
  return mesh(solidifyGeometry(geometry, { thickness, offset, rim, preserveRegions, regionPrefix }), meshOptions);
}
