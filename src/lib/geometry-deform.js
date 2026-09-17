import * as THREE from 'three';
import { selectionWeights } from './geometry-sculpt.js';

const finite3 = (value, label) => {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) {
    throw new Error(`${label} must contain three finite numbers`);
  }
  return value.slice();
};

function validateGeometry(geometry) {
  if (!geometry?.isBufferGeometry) throw new Error('geometry deformation needs a Three.js BufferGeometry');
  const position = geometry.getAttribute('position');
  if (!position || position.itemSize !== 3 || !position.count) throw new Error('geometry deformation needs XYZ positions');
  if (!geometry.index || geometry.index.count % 3) throw new Error('geometry deformation needs indexed triangles');
  if (geometry.getAttribute('skinIndex') || geometry.getAttribute('skinWeight')) {
    throw new Error('geometry deformation is a pre-rig edit; skin attributes require an explicit rig/refit stage');
  }
  if (Object.values(geometry.morphAttributes || {}).some(list => Array.isArray(list) && list.length)) {
    throw new Error('geometry deformation does not rewrite morph targets; deform before authoring morphs');
  }
  return position;
}

/**
 * Reusable geometry-local deformation frame. The local +Y axis is the deformation axis.
 * Range is expressed in frame-local meters; positive scale keeps the frame invertible.
 */
export function deformationHandle({
  origin = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1], range = [-0.5, 0.5],
} = {}) {
  const o = finite3(origin, 'deformation handle origin');
  const r = finite3(rotation, 'deformation handle rotation');
  const s = finite3(scale, 'deformation handle scale');
  if (!s.every(value => value > 0)) throw new Error('deformation handle scale must be positive');
  if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite) || range[0] >= range[1]) {
    throw new Error('deformation handle range must be [start, end] with start < end');
  }
  return Object.freeze({
    origin: Object.freeze(o), rotation: Object.freeze(r), scale: Object.freeze(s), range: Object.freeze(range.slice()),
  });
}

function validateSelection(selection, label) {
  if (typeof selection !== 'function' && !ArrayBuffer.isView(selection) && !Array.isArray(selection)) {
    throw new Error(`${label} needs a selection`);
  }
  return selection;
}

function handleOperation(kind, selection, options) {
  validateSelection(selection, kind);
  const handle = deformationHandle(options.handle || {});
  return Object.freeze({ kind, selection, ...options, handle });
}

/** Bend around the handle-local +Z axis as position advances along local +Y. Angle is degrees. */
export function bendVertices(selection, { angle = 30, handle = deformationHandle() } = {}) {
  if (!Number.isFinite(angle) || Math.abs(angle) > 720) throw new Error('bend angle must be finite and within +/-720 degrees');
  return handleOperation('bend', selection, { angle, handle });
}

/** Twist around the handle-local +Y axis. Angle is the total rotation across the handle range, in degrees. */
export function twistVertices(selection, { angle = 45, handle = deformationHandle() } = {}) {
  if (!Number.isFinite(angle) || Math.abs(angle) > 1440) throw new Error('twist angle must be finite and within +/-1440 degrees');
  return handleOperation('twist', selection, { angle, handle });
}

/** Linearly scale the handle-local X/Z cross-section. factor -0.4 means an end scale of 0.6. */
export function taperVertices(selection, { factor = -0.25, handle = deformationHandle() } = {}) {
  if (!Number.isFinite(factor) || factor <= -1 || factor > 8) throw new Error('taper factor must be in (-1, 8]');
  return handleOperation('taper', selection, { factor, handle });
}

function matrices(handle) {
  const radians = handle.rotation.map(THREE.MathUtils.degToRad);
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...radians, 'XYZ'));
  const localToGeometry = new THREE.Matrix4().compose(
    new THREE.Vector3(...handle.origin), quaternion, new THREE.Vector3(...handle.scale),
  );
  return { localToGeometry, geometryToLocal: localToGeometry.clone().invert() };
}

function normalizedAxis(y, start, end) {
  return THREE.MathUtils.clamp((y - start) / (end - start), 0, 1);
}

function bendPoint(point, handle, angleDegrees) {
  const [start, end] = handle.range;
  if (point.y <= start || Math.abs(angleDegrees) <= 1e-12) return point.clone();
  const length = end - start;
  const total = THREE.MathUtils.degToRad(angleDegrees);
  const t = normalizedAxis(point.y, start, end);
  const theta = total * t;
  const radius = length / total;
  const center = new THREE.Vector3(
    radius * (1 - Math.cos(theta)),
    start + radius * Math.sin(theta),
    0,
  );
  const xAxis = new THREE.Vector3(Math.cos(theta), -Math.sin(theta), 0);
  const tangent = new THREE.Vector3(Math.sin(theta), Math.cos(theta), 0);
  const result = center.addScaledVector(xAxis, point.x).addScaledVector(new THREE.Vector3(0, 0, 1), point.z);
  if (point.y > end) result.addScaledVector(tangent, point.y - end);
  return result;
}

function twistPoint(point, handle, angleDegrees) {
  const [start, end] = handle.range;
  if (point.y <= start || Math.abs(angleDegrees) <= 1e-12) return point.clone();
  const t = normalizedAxis(point.y, start, end);
  const angle = THREE.MathUtils.degToRad(angleDegrees * t);
  const radial = new THREE.Vector3(point.x, 0, point.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
  return new THREE.Vector3(radial.x, point.y, radial.z);
}

function taperPoint(point, handle, factor) {
  const [start, end] = handle.range;
  if (point.y <= start || Math.abs(factor) <= 1e-12) return point.clone();
  const t = normalizedAxis(point.y, start, end);
  const crossScale = 1 + factor * t;
  return new THREE.Vector3(point.x * crossScale, point.y, point.z * crossScale);
}

function deformPoint(point, op) {
  if (op.kind === 'bend') return bendPoint(point, op.handle, op.angle);
  if (op.kind === 'twist') return twistPoint(point, op.handle, op.angle);
  if (op.kind === 'taper') return taperPoint(point, op.handle, op.factor);
  throw new Error(`unknown geometry deformation operation '${op.kind}'`);
}

/**
 * Clone-and-deform ordinary indexed BufferGeometry using reusable local handles and point selections.
 * Operations are sequential, topology is unchanged, and ordinary UV/custom attributes remain owned by the clone.
 */
export function deformGeometry(geometry, ...operations) {
  const sourcePosition = validateGeometry(geometry);
  const ops = operations.flat();
  if (!ops.length) throw new Error('deformGeometry needs at least one operation');
  for (const op of ops) if (!op || !['bend', 'twist', 'taper'].includes(op.kind)) throw new Error('unknown geometry deformation operation');

  const output = geometry.clone();
  const position = output.getAttribute('position');
  let touched = 0;

  for (const op of ops) {
    const weights = selectionWeights(output, op.selection);
    const { localToGeometry, geometryToLocal } = matrices(op.handle);
    for (let index = 0; index < position.count; index++) {
      const weight = weights[index];
      if (weight === 0) continue;
      const original = new THREE.Vector3().fromBufferAttribute(position, index);
      const local = original.clone().applyMatrix4(geometryToLocal);
      const deformedLocal = deformPoint(local, op);
      const target = deformedLocal.applyMatrix4(localToGeometry);
      const result = original.lerp(target, weight);
      if (![result.x, result.y, result.z].every(Number.isFinite)) throw new Error('geometry deformation produced invalid coordinates');
      position.setXYZ(index, result.x, result.y, result.z);
      if (result.distanceToSquared(original) > 1e-24) touched++;
    }
    position.needsUpdate = true;
    output.computeVertexNormals();
  }

  if (geometry.getAttribute('tangent')) {
    if (!output.getAttribute('uv')) throw new Error('geometry deformation cannot rebuild tangents without UVs');
    output.computeTangents();
  }
  output.computeBoundingBox();
  output.computeBoundingSphere();
  output.userData = {
    ...output.userData,
    geometryDeform: {
      version: 1,
      coordinateSpace: 'geometry-local handles with local +Y deformation axis',
      operations: ops.map(op => op.kind),
      touchedVertexOperations: touched,
      topologyPreserved: true,
      normals: 'recomputed',
      tangents: geometry.getAttribute('tangent') ? 'recomputed' : 'absent',
    },
  };
  if (sourcePosition.count !== output.getAttribute('position').count || geometry.index.count !== output.index.count) {
    throw new Error('geometry deformation unexpectedly changed topology');
  }
  return output;
}
