import * as THREE from 'three';

function validateIndexedTriangles(geometry) {
  if (!geometry?.isBufferGeometry) throw new Error('triangleSpatialIndex needs a Three.js BufferGeometry');
  const position = geometry.getAttribute('position');
  if (!position || position.itemSize !== 3 || !position.count) throw new Error('triangleSpatialIndex needs XYZ positions');
  if (!geometry.index || geometry.index.count % 3) throw new Error('triangleSpatialIndex needs indexed triangles');
  return position;
}

function triangleGroups(geometry, indexOffset) {
  if (!geometry.groups?.length) return [];
  const groups = [];
  for (let i = 0; i < geometry.groups.length; i++) {
    const group = geometry.groups[i];
    if (indexOffset >= group.start && indexOffset + 2 < group.start + group.count) groups.push(i);
  }
  return groups;
}

function largestAxis(size) {
  if (size.x >= size.y && size.x >= size.z) return 'x';
  if (size.y >= size.z) return 'y';
  return 'z';
}

function buildNode(entries, leafSize) {
  const bounds = new THREE.Box3();
  const centroidBounds = new THREE.Box3();
  for (const entry of entries) {
    bounds.union(entry.bounds);
    centroidBounds.expandByPoint(entry.centroid);
  }
  if (entries.length <= leafSize) return { bounds, entries };
  const axis = largestAxis(centroidBounds.getSize(new THREE.Vector3()));
  entries.sort((a, b) => a.centroid[axis] - b.centroid[axis] || a.triangleIndex - b.triangleIndex);
  const middle = Math.floor(entries.length / 2);
  return {
    bounds,
    left: buildNode(entries.slice(0, middle), leafSize),
    right: buildNode(entries.slice(middle), leafSize),
  };
}

function normalizeGroupFilter(groupIndices) {
  if (groupIndices == null) return null;
  if (!Array.isArray(groupIndices) || !groupIndices.length || groupIndices.some(i => !Number.isInteger(i) || i < 0)) {
    throw new Error('triangleSpatialIndex groupIndices must be a non-empty array of non-negative integers');
  }
  return new Set(groupIndices);
}

function acceptsGroup(entry, groups) {
  if (!groups) return true;
  return entry.groupIndices.some(index => groups.has(index));
}

/**
 * Build a deterministic median-split AABB hierarchy over indexed source triangles.
 * The index owns immutable triangle snapshots; rebuild it after source positions change.
 */
export function triangleSpatialIndex(geometry, { leafSize = 8 } = {}) {
  const position = validateIndexedTriangles(geometry);
  if (!Number.isInteger(leafSize) || leafSize < 1) throw new Error('triangleSpatialIndex leafSize must be a positive integer');
  const entries = [];
  for (let offset = 0, triangleIndex = 0; offset < geometry.index.count; offset += 3, triangleIndex++) {
    const ia = geometry.index.getX(offset), ib = geometry.index.getX(offset + 1), ic = geometry.index.getX(offset + 2);
    if (ia === ib || ib === ic || ic === ia) throw new Error('triangleSpatialIndex source contains a degenerate indexed triangle');
    const a = new THREE.Vector3().fromBufferAttribute(position, ia);
    const b = new THREE.Vector3().fromBufferAttribute(position, ib);
    const c = new THREE.Vector3().fromBufferAttribute(position, ic);
    const triangle = new THREE.Triangle(a, b, c);
    if (triangle.getArea() <= Number.EPSILON) throw new Error('triangleSpatialIndex source contains a zero-area triangle');
    entries.push({
      triangleIndex,
      indexOffset: offset,
      indices: [ia, ib, ic],
      triangle,
      normal: triangle.getNormal(new THREE.Vector3()),
      bounds: new THREE.Box3().setFromPoints([a, b, c]),
      centroid: new THREE.Vector3().addVectors(a, b).add(c).multiplyScalar(1 / 3),
      groupIndices: triangleGroups(geometry, offset),
    });
  }
  const root = buildNode(entries.slice(), leafSize);
  const stats = { triangles: entries.length, leafSize, queries: 0, triangleTests: 0, nodeTests: 0 };

  function closestPoint(pointLike, {
    maxDistance = Infinity,
    groupIndices = null,
    normal = null,
    minNormalDot = -1,
  } = {}) {
    const point = pointLike?.isVector3 ? pointLike : new THREE.Vector3().fromArray(pointLike ?? []);
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) throw new Error('triangleSpatialIndex query needs a finite point');
    if (!(maxDistance === Infinity || (Number.isFinite(maxDistance) && maxDistance >= 0))) throw new Error('triangleSpatialIndex maxDistance must be non-negative or Infinity');
    if (!Number.isFinite(minNormalDot) || minNormalDot < -1 || minNormalDot > 1) throw new Error('triangleSpatialIndex minNormalDot must be between -1 and 1');
    const groups = normalizeGroupFilter(groupIndices);
    let queryNormal = null;
    if (normal != null) {
      queryNormal = normal?.isVector3 ? normal.clone() : new THREE.Vector3().fromArray(normal);
      if (!Number.isFinite(queryNormal.x) || !Number.isFinite(queryNormal.y) || !Number.isFinite(queryNormal.z) || queryNormal.lengthSq() < 1e-20) {
        throw new Error('triangleSpatialIndex normal must be a finite non-zero direction');
      }
      queryNormal.normalize();
    } else if (minNormalDot > -1) {
      throw new Error('triangleSpatialIndex minNormalDot needs a query normal');
    }

    stats.queries++;
    let best = null;
    let bestDistanceSq = maxDistance === Infinity ? Infinity : maxDistance * maxDistance;
    const candidate = new THREE.Vector3();
    const stack = [root];
    while (stack.length) {
      const node = stack.pop();
      stats.nodeTests++;
      const boxDistance = node.bounds.distanceToPoint(point);
      if (boxDistance * boxDistance > bestDistanceSq) continue;
      if (node.entries) {
        for (const entry of node.entries) {
          if (!acceptsGroup(entry, groups)) continue;
          if (queryNormal && entry.normal.dot(queryNormal) < minNormalDot) continue;
          stats.triangleTests++;
          entry.triangle.closestPointToPoint(point, candidate);
          const distanceSq = point.distanceToSquared(candidate);
          if (distanceSq < bestDistanceSq || (distanceSq === bestDistanceSq && best && entry.triangleIndex < best.entry.triangleIndex)) {
            bestDistanceSq = distanceSq;
            best = { entry, point: candidate.clone() };
          } else if (distanceSq === bestDistanceSq && !best) {
            best = { entry, point: candidate.clone() };
          }
        }
      } else {
        const leftDistance = node.left.bounds.distanceToPoint(point);
        const rightDistance = node.right.bounds.distanceToPoint(point);
        const first = leftDistance <= rightDistance ? node.left : node.right;
        const second = first === node.left ? node.right : node.left;
        stack.push(second, first);
      }
    }
    if (!best) return null;
    const barycoord = THREE.Triangle.getBarycoord(
      best.point,
      best.entry.triangle.a,
      best.entry.triangle.b,
      best.entry.triangle.c,
      new THREE.Vector3(),
    );
    if (!barycoord) throw new Error('triangleSpatialIndex could not compute barycentric coordinates');
    return {
      point: best.point,
      distance: Math.sqrt(bestDistanceSq),
      distanceSq: bestDistanceSq,
      barycoord,
      triangleIndex: best.entry.triangleIndex,
      indices: best.entry.indices.slice(),
      normal: best.entry.normal.clone(),
      groupIndices: best.entry.groupIndices.slice(),
    };
  }

  return {
    geometry,
    rootBounds: root.bounds.clone(),
    triangleCount: entries.length,
    leafSize,
    closestPoint,
    diagnostics() { return { ...stats }; },
  };
}
