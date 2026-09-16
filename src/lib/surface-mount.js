import * as THREE from 'three';
import { triangleSpatialIndex } from './triangle-spatial-index.js';

const DEG = Math.PI / 180;

function vector3(value, label, fallback = null) {
  const v = value ?? fallback;
  if (!Array.isArray(v) || v.length !== 3 || !v.every(Number.isFinite)) throw new Error(`${label} must contain three finite numbers`);
  return v.slice();
}

function scale3(value, label) {
  const a = typeof value === 'number' ? [value, value, value] : value;
  const v = vector3(a, label, [1, 1, 1]);
  if (v.some(n => n <= 0)) throw new Error(`${label} must be positive`);
  return v;
}

function regionList(value) {
  if (value == null) return null;
  const list = typeof value === 'string' ? [value] : value;
  if (!Array.isArray(list) || !list.length || list.some(name => typeof name !== 'string' || !name)) {
    throw new Error('surfaceMount regionNames must be a name or non-empty array');
  }
  return [...new Set(list)];
}

/**
 * Define JSON-safe support-local attachment intent. `near` and `tangentHint` are in the
 * support geometry's local coordinates. `local` is an editable transform in the resolved
 * attachment frame, where +Z is the selected surface normal.
 */
export function surfaceMount({
  near,
  regionNames = null,
  regionMatch = 'any',
  maxDistance = null,
  queryNormal = null,
  minNormalDot = -1,
  normalMode = 'smooth',
  tangentHint = [1, 0, 0],
  offset = 0,
  local = {},
} = {}) {
  const spec = {
    near: vector3(near, 'surfaceMount near'),
    regionNames: regionList(regionNames),
    regionMatch,
    maxDistance,
    queryNormal: queryNormal == null ? null : vector3(queryNormal, 'surfaceMount queryNormal'),
    minNormalDot,
    normalMode,
    tangentHint: vector3(tangentHint, 'surfaceMount tangentHint'),
    offset,
    local: {
      position: vector3(local.position, 'surfaceMount local.position', [0, 0, 0]),
      rotation: vector3(local.rotation, 'surfaceMount local.rotation', [0, 0, 0]),
      scale: scale3(local.scale ?? [1, 1, 1], 'surfaceMount local.scale'),
    },
  };
  if (!['any', 'all'].includes(spec.regionMatch)) throw new Error("surfaceMount regionMatch must be 'any' or 'all'");
  if (!(spec.maxDistance == null || (Number.isFinite(spec.maxDistance) && spec.maxDistance >= 0))) throw new Error('surfaceMount maxDistance must be null or non-negative');
  if (!Number.isFinite(spec.minNormalDot) || spec.minNormalDot < -1 || spec.minNormalDot > 1) throw new Error('surfaceMount minNormalDot must be between -1 and 1');
  if (!['smooth', 'face'].includes(spec.normalMode)) throw new Error("surfaceMount normalMode must be 'smooth' or 'face'");
  if (!Number.isFinite(spec.offset)) throw new Error('surfaceMount offset must be finite');
  if (new THREE.Vector3().fromArray(spec.tangentHint).lengthSq() < 1e-20) throw new Error('surfaceMount tangentHint cannot be zero');
  if (spec.queryNormal && new THREE.Vector3().fromArray(spec.queryNormal).lengthSq() < 1e-20) throw new Error('surfaceMount queryNormal cannot be zero');
  if (spec.minNormalDot > -1 && !spec.queryNormal) throw new Error('surfaceMount minNormalDot needs queryNormal');
  return spec;
}

function smoothNormal(geometry, hit) {
  const attr = geometry.getAttribute('normal');
  if (!attr || attr.itemSize !== 3 || attr.count !== geometry.getAttribute('position')?.count) return hit.normal.clone();
  const [ia, ib, ic] = hit.indices;
  const a = new THREE.Vector3().fromBufferAttribute(attr, ia).multiplyScalar(hit.barycoord.x);
  const b = new THREE.Vector3().fromBufferAttribute(attr, ib).multiplyScalar(hit.barycoord.y);
  const c = new THREE.Vector3().fromBufferAttribute(attr, ic).multiplyScalar(hit.barycoord.z);
  const result = a.add(b).add(c);
  if (result.lengthSq() < 1e-20) return hit.normal.clone();
  result.normalize();
  if (result.dot(hit.normal) < 0) result.multiplyScalar(-1);
  return result;
}

function fallbackTangent(geometry, hit, normal) {
  const attr = geometry.getAttribute('position');
  const points = hit.indices.map(i => new THREE.Vector3().fromBufferAttribute(attr, i));
  const edges = [
    points[1].clone().sub(points[0]),
    points[2].clone().sub(points[0]),
    points[2].clone().sub(points[1]),
  ];
  let best = null, bestLength = -1;
  for (const edge of edges) {
    edge.addScaledVector(normal, -edge.dot(normal));
    const length = edge.lengthSq();
    if (length > bestLength) { best = edge.clone(); bestLength = length; }
  }
  if (!best || bestLength < 1e-20) throw new Error('surfaceMount could not construct a tangent frame');
  return best.normalize();
}

/** Resolve one surface mount against the current support geometry.
 * The returned matrix maps component-local coordinates into support-local coordinates.
 * Pass a prebuilt triangleSpatialIndex as `index` when resolving many mounts on one support.
 */
export function resolveSurfaceMount(geometry, rawConstraint, { index = null } = {}) {
  if (!geometry?.isBufferGeometry) throw new Error('resolveSurfaceMount needs a Three.js BufferGeometry');
  const constraint = surfaceMount(rawConstraint);
  const spatial = index ?? triangleSpatialIndex(geometry);
  if (spatial.geometry !== geometry) throw new Error('resolveSurfaceMount index belongs to a different geometry');
  const hit = spatial.closestPoint(constraint.near, {
    maxDistance: constraint.maxDistance ?? Infinity,
    regionNames: constraint.regionNames,
    regionMatch: constraint.regionMatch,
    normal: constraint.queryNormal,
    minNormalDot: constraint.minNormalDot,
  });
  if (!hit) throw new Error('surfaceMount found no matching support surface');

  const normal = constraint.normalMode === 'smooth' ? smoothNormal(geometry, hit) : hit.normal.clone();
  let tangent = new THREE.Vector3().fromArray(constraint.tangentHint);
  tangent.addScaledVector(normal, -tangent.dot(normal));
  if (tangent.lengthSq() < 1e-20) tangent = fallbackTangent(geometry, hit, normal);
  else tangent.normalize();
  const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
  tangent.crossVectors(bitangent, normal).normalize();

  const position = hit.point.clone().addScaledVector(normal, constraint.offset);
  const basis = new THREE.Matrix4().makeBasis(tangent, bitangent, normal);
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(basis);
  const baseMatrix = new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1));
  const localQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(
    constraint.local.rotation[0] * DEG,
    constraint.local.rotation[1] * DEG,
    constraint.local.rotation[2] * DEG,
    'XYZ',
  ));
  const localMatrix = new THREE.Matrix4().compose(
    new THREE.Vector3().fromArray(constraint.local.position),
    localQuaternion,
    new THREE.Vector3().fromArray(constraint.local.scale),
  );
  const matrix = baseMatrix.clone().multiply(localMatrix);
  const resolvedPosition = new THREE.Vector3();
  const resolvedQuaternion = new THREE.Quaternion();
  const resolvedScale = new THREE.Vector3();
  matrix.decompose(resolvedPosition, resolvedQuaternion, resolvedScale);
  return {
    matrix,
    position: resolvedPosition,
    quaternion: resolvedQuaternion,
    scale: resolvedScale,
    frame: { origin: hit.point.clone(), tangent, bitangent, normal },
    hit,
    constraint,
    diagnostics: { reusedIndex: Boolean(index), normalMode: constraint.normalMode },
  };
}

/** Apply a resolved support-local mount to an independently editable Object3D. */
export function attachSurfaceMount(object, geometry, constraint, options = {}) {
  if (!object?.isObject3D) throw new Error('attachSurfaceMount needs a Three.js Object3D');
  const pose = resolveSurfaceMount(geometry, constraint, options);
  pose.matrix.decompose(object.position, object.quaternion, object.scale);
  object.updateMatrix();
  return object;
}
