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

function localTransform(local = {}, label = 'surfaceMount') {
  return {
    position: vector3(local.position, `${label} local.position`, [0, 0, 0]),
    rotation: vector3(local.rotation, `${label} local.rotation`, [0, 0, 0]),
    scale: scale3(local.scale ?? [1, 1, 1], `${label} local.scale`),
  };
}

function validateGeometry(geometry, label) {
  if (!geometry?.isBufferGeometry) throw new Error(`${label} needs a Three.js BufferGeometry`);
  const position = geometry.getAttribute('position');
  if (!position || position.itemSize !== 3 || !position.count) throw new Error(`${label} needs XYZ positions`);
  if (!geometry.index || geometry.index.count % 3) throw new Error(`${label} needs indexed triangle geometry`);
  return position;
}

/**
 * Deterministic indexed-topology fingerprint used by persistent anchors.
 * Positions are intentionally excluded so ordinary form edits keep the same signature.
 * The two 32-bit accumulators are a practical guard against applying an anchor to a
 * topology constructor's output without an explicit remap; this is not a cryptographic hash.
 */
export function surfaceTopologySignature(geometry) {
  const position = validateGeometry(geometry, 'surfaceTopologySignature');
  const index = geometry.index;
  let a = 0x811c9dc5 >>> 0;
  let b = 0x9e3779b9 >>> 0;
  const mix = (value) => {
    const v = value >>> 0;
    a = Math.imul((a ^ v) >>> 0, 0x01000193) >>> 0;
    b = Math.imul((b ^ ((v + 0x85ebca6b) >>> 0)) >>> 0, 0xc2b2ae35) >>> 0;
  };
  mix(position.count);
  mix(index.count);
  for (let i = 0; i < index.count; i++) mix(index.getX(i));
  return `${position.count}:${index.count}:${a.toString(16).padStart(8, '0')}${b.toString(16).padStart(8, '0')}`;
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
    local: localTransform(local),
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

function smoothNormal(geometry, indices, barycoord, faceNormal) {
  const attr = geometry.getAttribute('normal');
  if (!attr || attr.itemSize !== 3 || attr.count !== geometry.getAttribute('position')?.count) return faceNormal.clone();
  const [ia, ib, ic] = indices;
  const a = new THREE.Vector3().fromBufferAttribute(attr, ia).multiplyScalar(barycoord.x);
  const b = new THREE.Vector3().fromBufferAttribute(attr, ib).multiplyScalar(barycoord.y);
  const c = new THREE.Vector3().fromBufferAttribute(attr, ic).multiplyScalar(barycoord.z);
  const result = a.add(b).add(c);
  if (result.lengthSq() < 1e-20) return faceNormal.clone();
  result.normalize();
  if (result.dot(faceNormal) < 0) result.multiplyScalar(-1);
  return result;
}

function fallbackTangent(geometry, indices, normal) {
  const attr = geometry.getAttribute('position');
  const points = indices.map(i => new THREE.Vector3().fromBufferAttribute(attr, i));
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
  if (!best || bestLength < 1e-20) throw new Error('surface attachment could not construct a tangent frame');
  return best.normalize();
}

function tangentFromHint(geometry, indices, normal, tangentHint) {
  let tangent = new THREE.Vector3().fromArray(tangentHint);
  tangent.addScaledVector(normal, -tangent.dot(normal));
  if (tangent.lengthSq() < 1e-20) return fallbackTangent(geometry, indices, normal);
  return tangent.normalize();
}

function tangentWeights(geometry, indices, tangent) {
  const position = geometry.getAttribute('position');
  const a = new THREE.Vector3().fromBufferAttribute(position, indices[0]);
  const e1 = new THREE.Vector3().fromBufferAttribute(position, indices[1]).sub(a);
  const e2 = new THREE.Vector3().fromBufferAttribute(position, indices[2]).sub(a);
  const d11 = e1.dot(e1), d12 = e1.dot(e2), d22 = e2.dot(e2);
  const det = d11 * d22 - d12 * d12;
  if (Math.abs(det) < 1e-20) throw new Error('surfaceAnchor cannot bind a degenerate triangle tangent basis');
  const t1 = tangent.dot(e1), t2 = tangent.dot(e2);
  const u = (t1 * d22 - t2 * d12) / det;
  const v = (t2 * d11 - t1 * d12) / det;
  return [-u - v, u, v];
}

function tangentFromWeights(geometry, indices, weights, normal) {
  const position = geometry.getAttribute('position');
  const tangent = new THREE.Vector3();
  for (let i = 0; i < 3; i++) tangent.addScaledVector(new THREE.Vector3().fromBufferAttribute(position, indices[i]), weights[i]);
  tangent.addScaledVector(normal, -tangent.dot(normal));
  if (tangent.lengthSq() < 1e-20) return fallbackTangent(geometry, indices, normal);
  return tangent.normalize();
}

function localMatrix(local) {
  const localQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(
    local.rotation[0] * DEG,
    local.rotation[1] * DEG,
    local.rotation[2] * DEG,
    'XYZ',
  ));
  return new THREE.Matrix4().compose(
    new THREE.Vector3().fromArray(local.position),
    localQuaternion,
    new THREE.Vector3().fromArray(local.scale),
  );
}

function resolvedPose({ point, normal, tangent, offset, local, hit, constraint, diagnostics }) {
  const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
  tangent = new THREE.Vector3().crossVectors(bitangent, normal).normalize();
  const position = point.clone().addScaledVector(normal, offset);
  const basis = new THREE.Matrix4().makeBasis(tangent, bitangent, normal);
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(basis);
  const baseMatrix = new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1));
  const matrix = baseMatrix.clone().multiply(localMatrix(local));
  const resolvedPosition = new THREE.Vector3();
  const resolvedQuaternion = new THREE.Quaternion();
  const resolvedScale = new THREE.Vector3();
  matrix.decompose(resolvedPosition, resolvedQuaternion, resolvedScale);
  return {
    matrix,
    position: resolvedPosition,
    quaternion: resolvedQuaternion,
    scale: resolvedScale,
    frame: { origin: point.clone(), tangent, bitangent, normal },
    hit,
    constraint,
    diagnostics,
  };
}

/** Resolve one nearest-surface mount against the current support geometry.
 * The returned matrix maps component-local coordinates into support-local coordinates.
 * Pass a prebuilt triangleSpatialIndex as `index` when resolving many mounts on one support.
 */
export function resolveSurfaceMount(geometry, rawConstraint, { index = null } = {}) {
  validateGeometry(geometry, 'resolveSurfaceMount');
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

  const normal = constraint.normalMode === 'smooth'
    ? smoothNormal(geometry, hit.indices, hit.barycoord, hit.normal)
    : hit.normal.clone();
  const tangent = tangentFromHint(geometry, hit.indices, normal, constraint.tangentHint);
  return resolvedPose({
    point: hit.point,
    normal,
    tangent,
    offset: constraint.offset,
    local: constraint.local,
    hit,
    constraint,
    diagnostics: { reusedIndex: Boolean(index), normalMode: constraint.normalMode, binding: 'nearest-surface' },
  });
}

/** Apply a resolved nearest-surface mount to an independently editable Object3D. */
export function attachSurfaceMount(object, geometry, constraint, options = {}) {
  if (!object?.isObject3D) throw new Error('attachSurfaceMount needs a Three.js Object3D');
  const pose = resolveSurfaceMount(geometry, constraint, options);
  pose.matrix.decompose(object.position, object.quaternion, object.scale);
  object.updateMatrix();
  return object;
}

/**
 * Validate/normalize a persistent barycentric surface anchor. Anchors bind one exact indexed
 * triangle and one barycentric point on that triangle; they are JSON-safe construction data.
 * Resolve them only against supports that retain the recorded face/corner topology.
 */
export function surfaceAnchor({
  triangleIndex,
  indices,
  barycoord,
  tangentWeights: rawTangentWeights,
  topologySignature = null,
  normalMode = 'smooth',
  offset = 0,
  local = {},
} = {}) {
  if (!Number.isInteger(triangleIndex) || triangleIndex < 0) throw new Error('surfaceAnchor triangleIndex must be a non-negative integer');
  if (!Array.isArray(indices) || indices.length !== 3 || indices.some(i => !Number.isInteger(i) || i < 0)) {
    throw new Error('surfaceAnchor indices must contain three non-negative integers');
  }
  if (new Set(indices).size !== 3) throw new Error('surfaceAnchor indices must identify three distinct vertices');
  const bary = vector3(barycoord, 'surfaceAnchor barycoord');
  if (bary.some(value => value < -1e-8 || value > 1 + 1e-8) || Math.abs(bary[0] + bary[1] + bary[2] - 1) > 1e-6) {
    throw new Error('surfaceAnchor barycoord must be triangle weights summing to one');
  }
  const weights = vector3(rawTangentWeights, 'surfaceAnchor tangentWeights');
  if (Math.abs(weights[0] + weights[1] + weights[2]) > 1e-6 || weights.every(value => Math.abs(value) < 1e-12)) {
    throw new Error('surfaceAnchor tangentWeights must form a non-zero affine direction summing to zero');
  }
  if (!['smooth', 'face'].includes(normalMode)) throw new Error("surfaceAnchor normalMode must be 'smooth' or 'face'");
  if (!Number.isFinite(offset)) throw new Error('surfaceAnchor offset must be finite');
  if (topologySignature != null && (typeof topologySignature !== 'string' || !/^\d+:\d+:[0-9a-f]{16}$/.test(topologySignature))) {
    throw new Error('surfaceAnchor topologySignature must be null or a valid indexed-topology signature');
  }
  return {
    triangleIndex,
    indices: indices.slice(),
    barycoord: bary,
    tangentWeights: weights,
    topologySignature,
    normalMode,
    offset,
    local: localTransform(local, 'surfaceAnchor'),
  };
}

/**
 * Bind nearest-surface authoring intent once into a persistent exact-face anchor. The returned
 * anchor follows that same barycentric spot through same-topology support edits instead of
 * performing another nearest-surface search on every rebuild.
 */
export function bindSurfaceAnchor(geometry, rawConstraint, options = {}) {
  const pose = resolveSurfaceMount(geometry, rawConstraint, options);
  const anchor = surfaceAnchor({
    triangleIndex: pose.hit.triangleIndex,
    indices: pose.hit.indices,
    barycoord: pose.hit.barycoord.toArray(),
    tangentWeights: tangentWeights(geometry, pose.hit.indices, pose.frame.tangent),
    topologySignature: surfaceTopologySignature(geometry),
    normalMode: pose.constraint.normalMode,
    offset: pose.constraint.offset,
    local: pose.constraint.local,
  });
  return anchor;
}

/**
 * Remap one persistent anchor through a topology constructor that knows exactly which
 * target triangle and corner order came from the source triangle. `cornerMap[targetCorner]`
 * gives the corresponding source-anchor corner. This keeps barycentric coordinates and the
 * affine tangent weights attached to their semantic source corners when winding changes.
 */
export function remapSurfaceAnchor(rawAnchor, targetGeometry, {
  triangleIndex,
  cornerMap = [0, 1, 2],
} = {}) {
  const position = validateGeometry(targetGeometry, 'remapSurfaceAnchor');
  const anchor = surfaceAnchor(rawAnchor);
  if (!Number.isInteger(triangleIndex) || triangleIndex < 0 || triangleIndex >= targetGeometry.index.count / 3) {
    throw new Error('remapSurfaceAnchor triangleIndex must identify a target triangle');
  }
  if (!Array.isArray(cornerMap) || cornerMap.length !== 3
    || cornerMap.some(i => !Number.isInteger(i) || i < 0 || i > 2)
    || new Set(cornerMap).size !== 3) {
    throw new Error('remapSurfaceAnchor cornerMap must be a permutation of [0, 1, 2]');
  }
  const offset = triangleIndex * 3;
  const indices = [
    targetGeometry.index.getX(offset),
    targetGeometry.index.getX(offset + 1),
    targetGeometry.index.getX(offset + 2),
  ];
  if (indices.some(i => i >= position.count)) throw new Error('remapSurfaceAnchor target triangle references an invalid vertex');
  return surfaceAnchor({
    ...anchor,
    triangleIndex,
    indices,
    barycoord: cornerMap.map(i => anchor.barycoord[i]),
    tangentWeights: cornerMap.map(i => anchor.tangentWeights[i]),
    topologySignature: surfaceTopologySignature(targetGeometry),
  });
}

/** Resolve a persistent anchor against a same-topology support rebuild. */
export function resolveSurfaceAnchor(geometry, rawAnchor) {
  const position = validateGeometry(geometry, 'resolveSurfaceAnchor');
  const anchor = surfaceAnchor(rawAnchor);
  if (anchor.topologySignature != null && anchor.topologySignature !== surfaceTopologySignature(geometry)) {
    throw new Error('surfaceAnchor topology changed: indexed topology signature differs; remap or rebind explicitly');
  }
  const triangleCount = geometry.index.count / 3;
  if (anchor.triangleIndex >= triangleCount) throw new Error('surfaceAnchor topology changed: recorded triangle no longer exists; rebind explicitly');
  const offset = anchor.triangleIndex * 3;
  const currentIndices = [geometry.index.getX(offset), geometry.index.getX(offset + 1), geometry.index.getX(offset + 2)];
  if (!currentIndices.every((value, i) => value === anchor.indices[i])) {
    throw new Error('surfaceAnchor topology changed: recorded triangle corners differ; rebind explicitly');
  }
  if (anchor.indices.some(i => i >= position.count)) throw new Error('surfaceAnchor topology changed: recorded vertex no longer exists; rebind explicitly');
  const vertices = anchor.indices.map(i => new THREE.Vector3().fromBufferAttribute(position, i));
  const triangle = new THREE.Triangle(...vertices);
  if (triangle.getArea() <= Number.EPSILON) throw new Error('surfaceAnchor support triangle became degenerate');
  const barycoord = new THREE.Vector3().fromArray(anchor.barycoord);
  const point = vertices[0].clone().multiplyScalar(barycoord.x)
    .addScaledVector(vertices[1], barycoord.y)
    .addScaledVector(vertices[2], barycoord.z);
  const faceNormal = triangle.getNormal(new THREE.Vector3());
  const normal = anchor.normalMode === 'smooth'
    ? smoothNormal(geometry, anchor.indices, barycoord, faceNormal)
    : faceNormal.clone();
  const tangent = tangentFromWeights(geometry, anchor.indices, anchor.tangentWeights, normal);
  const hit = {
    point: point.clone(),
    distance: 0,
    distanceSq: 0,
    barycoord,
    triangleIndex: anchor.triangleIndex,
    indices: anchor.indices.slice(),
    normal: faceNormal,
    groupIndices: [],
    regionNames: [],
  };
  return resolvedPose({
    point,
    normal,
    tangent,
    offset: anchor.offset,
    local: anchor.local,
    hit,
    constraint: anchor,
    diagnostics: { normalMode: anchor.normalMode, binding: 'barycentric-anchor', exactFace: true },
  });
}

/** Apply a persistent same-topology surface anchor to an independently editable Object3D. */
export function attachSurfaceAnchor(object, geometry, anchor) {
  if (!object?.isObject3D) throw new Error('attachSurfaceAnchor needs a Three.js Object3D');
  const pose = resolveSurfaceAnchor(geometry, anchor);
  pose.matrix.decompose(object.position, object.quaternion, object.scale);
  object.updateMatrix();
  return object;
}
