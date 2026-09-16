import * as THREE from 'three';

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

/**
 * Transfer explicitly selected continuous per-vertex Float32 attributes from the closest point on
 * an indexed source triangle surface to every target vertex using barycentric interpolation.
 * The target is cloned and the source/target inputs remain unchanged.
 *
 * This intentionally rejects UVs, normals, tangents and skin data: those are corner-, direction-,
 * or discrete-index semantics that a generic closest-surface interpolation cannot preserve safely.
 */
export function transferSurfaceAttributes(source, target, {
  attributes = [],
  maxDistance = Infinity,
} = {}) {
  const sourcePosition = validateGeometry(source, 'transferSurfaceAttributes', { requireIndex: true });
  const targetPosition = validateGeometry(target, 'transferSurfaceAttributes target');
  if (!Array.isArray(attributes) || !attributes.length) throw new Error('transferSurfaceAttributes needs at least one attribute name');
  if (!(maxDistance === Infinity || (Number.isFinite(maxDistance) && maxDistance >= 0))) throw new Error('transferSurfaceAttributes maxDistance must be non-negative or Infinity');
  const names = [...new Set(attributes)];
  const sourceAttributes = new Map(names.map(name => [name, validateAttribute(source, name, sourcePosition)]));
  for (const name of names) if (target.hasAttribute(name)) throw new Error(`transferSurfaceAttributes target already has '${name}'`);

  const index = source.index;
  const triangles = [];
  for (let i = 0; i < index.count; i += 3) {
    const ia = index.getX(i), ib = index.getX(i + 1), ic = index.getX(i + 2);
    if (ia === ib || ib === ic || ic === ia) throw new Error('transferSurfaceAttributes source contains a degenerate indexed triangle');
    triangles.push({
      indices: [ia, ib, ic],
      triangle: new THREE.Triangle(
        new THREE.Vector3().fromBufferAttribute(sourcePosition, ia),
        new THREE.Vector3().fromBufferAttribute(sourcePosition, ib),
        new THREE.Vector3().fromBufferAttribute(sourcePosition, ic),
      ),
    });
  }

  const output = target.clone();
  const arrays = new Map([...sourceAttributes].map(([name, attribute]) => [name, new Float32Array(targetPosition.count * attribute.itemSize)]));
  const point = new THREE.Vector3(), closest = new THREE.Vector3(), candidate = new THREE.Vector3(), bary = new THREE.Vector3();
  let sumDistance = 0, maxObserved = 0;

  for (let vertex = 0; vertex < targetPosition.count; vertex++) {
    point.fromBufferAttribute(targetPosition, vertex);
    let best = null, bestDistanceSq = Infinity;
    for (const entry of triangles) {
      entry.triangle.closestPointToPoint(point, candidate);
      const distanceSq = point.distanceToSquared(candidate);
      if (distanceSq < bestDistanceSq) {
        bestDistanceSq = distanceSq;
        best = entry;
        closest.copy(candidate);
      }
    }
    const distance = Math.sqrt(bestDistanceSq);
    if (!best || distance > maxDistance) throw new Error(`transferSurfaceAttributes target vertex ${vertex} is ${distance.toFixed(6)} from the source, beyond maxDistance ${maxDistance}`);
    if (THREE.Triangle.getBarycoord(closest, best.triangle.a, best.triangle.b, best.triangle.c, bary) === null) {
      throw new Error('transferSurfaceAttributes could not compute barycentric coordinates on the closest source triangle');
    }
    sumDistance += distance; maxObserved = Math.max(maxObserved, distance);
    const [ia, ib, ic] = best.indices;
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
  output.userData = {
    ...target.userData,
    attributeTransfer: {
      mode: 'nearest-face-barycentric',
      attributes: names,
      sourceTriangles: triangles.length,
      targetVertices: targetPosition.count,
      maxDistanceLimit: maxDistance,
      meanDistance: targetPosition.count ? sumDistance / targetPosition.count : 0,
      maxDistance: maxObserved,
      sourceUnchanged: true,
      targetUnchanged: true,
      rejectedSemantics: [...rejectedSemanticAttributes],
      acceleration: 'brute-force',
    },
  };
  return output;
}
