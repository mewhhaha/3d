import * as THREE from 'three';
import { triangleSpatialIndex } from './triangle-spatial-index.js';
import { faceRegionMembership, faceRegionNames } from './face-regions.js';

const rejectedSemanticAttributes = new Set([
  'position', 'normal', 'tangent', 'uv', 'uv1', 'skinIndex', 'skinWeight',
]);

function validateGeometry(geometry, label, { requireIndex = false } = {}) {
  if (!geometry?.isBufferGeometry) throw new Error(`${label} needs a Three.js BufferGeometry`);
  const position = geometry.getAttribute('position');
  if (!position || position.itemSize !== 3 || !position.count) throw new Error(`${label} needs XYZ positions`);
  if (requireIndex && (!geometry.index || geometry.index.count % 3)) throw new Error(`${label} source needs indexed triangles`);
  return position;
}

function validateAttribute(source, name, position) {
  if (typeof name !== 'string' || !name) throw new Error('transferSurfaceAttributes attribute names must be non-empty strings');
  if (rejectedSemanticAttributes.has(name)) throw new Error(`transferSurfaceAttributes rejects '${name}' because it needs domain-specific transfer semantics`);
  const attribute = source.getAttribute(name);
  if (!attribute) throw new Error(`transferSurfaceAttributes source is missing '${name}'`);
  if (attribute.count !== position.count) throw new Error(`transferSurfaceAttributes '${name}' must have one value per source vertex`);
  if (attribute.itemSize < 1 || attribute.itemSize > 4) throw new Error(`transferSurfaceAttributes '${name}' itemSize must be 1..4`);
  if (attribute.normalized || !(attribute.array instanceof Float32Array)) throw new Error(`transferSurfaceAttributes '${name}' must be a non-normalized Float32 vertex attribute`);
  return attribute;
}

function attributeComponent(attribute, index, component) {
  return attribute.array[index * attribute.itemSize + component];
}

function bruteForceIndex(source, sourcePosition) {
  const triangles = [];
  const regionMembership = faceRegionMembership(source);
  for (let offset = 0, triangleIndex = 0; offset < source.index.count; offset += 3, triangleIndex++) {
    const ia = source.index.getX(offset), ib = source.index.getX(offset + 1), ic = source.index.getX(offset + 2);
    if (ia === ib || ib === ic || ic === ia) throw new Error('transferSurfaceAttributes source contains a degenerate indexed triangle');
    const triangle = new THREE.Triangle(
      new THREE.Vector3().fromBufferAttribute(sourcePosition, ia),
      new THREE.Vector3().fromBufferAttribute(sourcePosition, ib),
      new THREE.Vector3().fromBufferAttribute(sourcePosition, ic),
    );
    if (triangle.getArea() <= Number.EPSILON) throw new Error('transferSurfaceAttributes source contains a zero-area triangle');
    const groupIndices = [];
    for (let groupIndex = 0; groupIndex < source.groups.length; groupIndex++) {
      const group = source.groups[groupIndex];
      if (offset >= group.start && offset + 2 < group.start + group.count) groupIndices.push(groupIndex);
    }
    triangles.push({ triangleIndex, indices: [ia, ib, ic], triangle, normal: triangle.getNormal(new THREE.Vector3()), groupIndices, regionNames: regionMembership[triangleIndex] });
  }
  const stats = { triangles: triangles.length, queries: 0, triangleTests: 0, nodeTests: 0 };
  return {
    triangleCount: triangles.length,
    closestPoint(point, { maxDistance = Infinity, groupIndices = null, regionNames = null, regionMatch = 'any', normal = null, minNormalDot = -1 } = {}) {
      const allowedGroups = groupIndices == null ? null : new Set(groupIndices);
      if (!['any', 'all'].includes(regionMatch)) throw new Error("transferSurfaceAttributes sourceRegionMatch must be 'any' or 'all'");
      const allowedRegions = regionNames == null ? null : new Set(regionNames);
      const queryNormal = normal ? normal.clone().normalize() : null;
      stats.queries++;
      let best = null, bestDistanceSq = maxDistance === Infinity ? Infinity : maxDistance * maxDistance;
      const candidate = new THREE.Vector3();
      for (const entry of triangles) {
        if (allowedGroups && !entry.groupIndices.some(index => allowedGroups.has(index))) continue;
        if (allowedRegions) {
          const accepted = regionMatch === 'all' ? [...allowedRegions].every(name => entry.regionNames.includes(name)) : entry.regionNames.some(name => allowedRegions.has(name));
          if (!accepted) continue;
        }
        if (queryNormal && entry.normal.dot(queryNormal) < minNormalDot) continue;
        stats.triangleTests++;
        entry.triangle.closestPointToPoint(point, candidate);
        const distanceSq = point.distanceToSquared(candidate);
        if (distanceSq < bestDistanceSq || (distanceSq === bestDistanceSq && (!best || entry.triangleIndex < best.entry.triangleIndex))) {
          bestDistanceSq = distanceSq;
          best = { entry, point: candidate.clone() };
        }
      }
      if (!best) return null;
      const barycoord = THREE.Triangle.getBarycoord(best.point, best.entry.triangle.a, best.entry.triangle.b, best.entry.triangle.c, new THREE.Vector3());
      return { point: best.point, distance: Math.sqrt(bestDistanceSq), distanceSq: bestDistanceSq, barycoord, triangleIndex: best.entry.triangleIndex, indices: best.entry.indices.slice(), normal: best.entry.normal.clone(), groupIndices: best.entry.groupIndices.slice(), regionNames: best.entry.regionNames.slice() };
    },
    diagnostics() { return { ...stats }; },
  };
}

/**
 * Transfer explicitly selected continuous per-vertex Float32 attributes from the closest point on
 * an indexed source triangle surface to every target vertex using barycentric interpolation.
 * The target is cloned and the source/target inputs remain unchanged.
 *
 * `acceleration: 'auto'` uses brute force for tiny jobs and a reusable AABB hierarchy once the
 * source-triangle × target-vertex candidate count becomes substantial. Group and normal-facing
 * constraints are authoring filters, not inferred semantic correspondence.
 */
export function transferSurfaceAttributes(source, target, {
  attributes = [],
  maxDistance = Infinity,
  acceleration = 'auto',
  groupIndices = null,
  sourceRegions = null,
  sourceRegionMatch = 'any',
  minNormalDot = null,
  leafSize = 8,
} = {}) {
  const sourcePosition = validateGeometry(source, 'transferSurfaceAttributes', { requireIndex: true });
  const targetPosition = validateGeometry(target, 'transferSurfaceAttributes target');
  if (!Array.isArray(attributes) || !attributes.length) throw new Error('transferSurfaceAttributes needs at least one attribute name');
  if (!(maxDistance === Infinity || (Number.isFinite(maxDistance) && maxDistance >= 0))) throw new Error('transferSurfaceAttributes maxDistance must be non-negative or Infinity');
  if (!['auto', 'brute-force', 'bvh'].includes(acceleration)) throw new Error("transferSurfaceAttributes acceleration must be 'auto', 'brute-force' or 'bvh'");
  if (groupIndices != null && (!Array.isArray(groupIndices) || !groupIndices.length || groupIndices.some(i => !Number.isInteger(i) || i < 0 || i >= source.groups.length))) {
    throw new Error('transferSurfaceAttributes groupIndices must refer to existing BufferGeometry groups');
  }
  if (!['any', 'all'].includes(sourceRegionMatch)) throw new Error("transferSurfaceAttributes sourceRegionMatch must be 'any' or 'all'");
  let regionNames = null;
  if (sourceRegions != null) {
    const requested = typeof sourceRegions === 'string' ? [sourceRegions] : sourceRegions;
    if (!Array.isArray(requested) || !requested.length || requested.some(name => typeof name !== 'string' || !name)) {
      throw new Error('transferSurfaceAttributes sourceRegions must be a name or non-empty array of names');
    }
    regionNames = [...new Set(requested)];
    const available = new Set(faceRegionNames(source));
    const missing = regionNames.filter(name => !available.has(name));
    if (missing.length) throw new Error(`transferSurfaceAttributes unknown face region${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`);
  }
  if (minNormalDot != null && (!Number.isFinite(minNormalDot) || minNormalDot < -1 || minNormalDot > 1)) {
    throw new Error('transferSurfaceAttributes minNormalDot must be between -1 and 1');
  }
  const targetNormal = minNormalDot == null ? null : target.getAttribute('normal');
  if (minNormalDot != null && (!targetNormal || targetNormal.itemSize !== 3 || targetNormal.count !== targetPosition.count)) {
    throw new Error('transferSurfaceAttributes minNormalDot needs one XYZ normal per target vertex');
  }
  const names = [...new Set(attributes)];
  const sourceAttributes = new Map(names.map(name => [name, validateAttribute(source, name, sourcePosition)]));
  for (const name of names) if (target.hasAttribute(name)) throw new Error(`transferSurfaceAttributes target already has '${name}'`);

  const sourceTriangles = source.index.count / 3;
  const candidatePairs = sourceTriangles * targetPosition.count;
  const selectedAcceleration = acceleration === 'auto' ? (candidatePairs >= 150_000 ? 'bvh' : 'brute-force') : acceleration;
  const index = selectedAcceleration === 'bvh' ? triangleSpatialIndex(source, { leafSize }) : bruteForceIndex(source, sourcePosition);

  const output = target.clone();
  const arrays = new Map([...sourceAttributes].map(([name, attribute]) => [name, new Float32Array(targetPosition.count * attribute.itemSize)]));
  const point = new THREE.Vector3(), queryNormal = new THREE.Vector3();
  let sumDistance = 0, maxObserved = 0;

  for (let vertex = 0; vertex < targetPosition.count; vertex++) {
    point.fromBufferAttribute(targetPosition, vertex);
    const normal = targetNormal ? queryNormal.fromBufferAttribute(targetNormal, vertex) : null;
    const closest = index.closestPoint(point, { maxDistance: Infinity, groupIndices, regionNames, regionMatch: sourceRegionMatch, normal, minNormalDot: minNormalDot ?? -1 });
    if (!closest) throw new Error(`transferSurfaceAttributes found no acceptable source triangle for target vertex ${vertex}`);
    const distance = closest.distance;
    if (distance > maxDistance) throw new Error(`transferSurfaceAttributes target vertex ${vertex} is ${distance.toFixed(6)} from the source, beyond maxDistance ${maxDistance}`);
    sumDistance += distance; maxObserved = Math.max(maxObserved, distance);
    const [ia, ib, ic] = closest.indices;
    const bary = closest.barycoord;
    for (const [name, attribute] of sourceAttributes) {
      const array = arrays.get(name), base = vertex * attribute.itemSize;
      for (let component = 0; component < attribute.itemSize; component++) {
        array[base + component] = bary.x * attributeComponent(attribute, ia, component)
          + bary.y * attributeComponent(attribute, ib, component)
          + bary.z * attributeComponent(attribute, ic, component);
      }
    }
  }

  for (const [name, attribute] of sourceAttributes) output.setAttribute(name, new THREE.Float32BufferAttribute(arrays.get(name), attribute.itemSize));
  const diagnostics = index.diagnostics();
  output.userData = {
    ...target.userData,
    attributeTransfer: {
      mode: 'nearest-face-barycentric',
      attributes: names,
      sourceTriangles,
      targetVertices: targetPosition.count,
      maxDistanceLimit: maxDistance,
      meanDistance: targetPosition.count ? sumDistance / targetPosition.count : 0,
      maxDistance: maxObserved,
      sourceUnchanged: true,
      targetUnchanged: true,
      rejectedSemantics: [...rejectedSemanticAttributes],
      acceleration: selectedAcceleration,
      requestedAcceleration: acceleration,
      candidatePairs,
      triangleTests: diagnostics.triangleTests,
      nodeTests: diagnostics.nodeTests,
      groupIndices: groupIndices ? [...groupIndices] : null,
      sourceRegions: regionNames,
      sourceRegionMatch: regionNames ? sourceRegionMatch : null,
      minNormalDot,
    },
  };
  return output;
}
