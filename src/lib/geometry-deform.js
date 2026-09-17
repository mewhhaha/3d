import * as THREE from 'three';
import { selectionWeights } from './geometry-sculpt.js';
import { transportedFrames } from './curve-frame.js';

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


/**
 * JSON-safe guide for broad deformation along an authored handle-local centerline.
 * Points are handle-local meters. `up` seeds transported cross-section orientation.
 */
export function deformationCurve(points, {
  up = [1, 0, 0], curveType = 'centripetal', tension = 0.5, segments = 96,
} = {}) {
  if (!Array.isArray(points) || points.length < 2 || points.length > 128) {
    throw new Error('deformation curve needs 2..128 control points');
  }
  const cleanPoints = points.map((point, index) => finite3(point, `deformation curve point ${index}`));
  for (let index = 1; index < cleanPoints.length; index++) {
    const a = cleanPoints[index - 1], b = cleanPoints[index];
    const distanceSq = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
    if (distanceSq < 1e-18) throw new Error('deformation curve consecutive points must be distinct');
  }
  const cleanUp = finite3(up, 'deformation curve up');
  if (cleanUp[0] ** 2 + cleanUp[1] ** 2 + cleanUp[2] ** 2 < 1e-18) throw new Error('deformation curve up must be non-zero');
  if (!['centripetal', 'chordal', 'catmullrom'].includes(curveType)) throw new Error('unsupported deformation curve type');
  if (!Number.isFinite(tension) || tension < 0 || tension > 1) throw new Error('deformation curve tension must be in [0, 1]');
  if (!Number.isInteger(segments) || segments < 8 || segments > 512) throw new Error('deformation curve segments must be an integer in 8..512');
  return Object.freeze({
    kind: 'deformation-curve',
    points: Object.freeze(cleanPoints.map(point => Object.freeze(point))),
    up: Object.freeze(cleanUp), curveType, tension, segments,
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


/** Carry the handle-local X/Z cross-section along an authored curve using transported frames. */
export function curveVertices(selection, { guide, handle = deformationHandle() } = {}) {
  if (!guide?.points) throw new Error('curve deformation needs a deformation curve guide');
  const normalizedGuide = deformationCurve(guide.points, guide);
  return handleOperation('curve', selection, { guide: normalizedGuide, handle });
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


function curveRuntime(guide) {
  const points = guide.points.map(point => new THREE.Vector3(...point));
  const curve = points.length === 2
    ? new THREE.LineCurve3(points[0], points[1])
    : new THREE.CatmullRomCurve3(points, false, guide.curveType, guide.tension);
  curve.arcLengthDivisions = Math.max(200, guide.segments * 4);
  curve.updateArcLengths();
  const frames = transportedFrames(curve, { segments: guide.segments, up: guide.up });
  return { curve, frames, segments: guide.segments };
}

function sampledCurveFrame(runtime, t) {
  const u = THREE.MathUtils.clamp(t, 0, 1);
  const scaled = u * runtime.segments;
  const index = Math.min(runtime.segments - 1, Math.floor(scaled));
  const alpha = u >= 1 ? 1 : scaled - index;
  const a = runtime.frames[index], b = runtime.frames[index + 1];
  const quaternion = a.quaternion.clone().slerp(b.quaternion, alpha).normalize();
  return {
    origin: runtime.curve.getPointAt(u, new THREE.Vector3()),
    normal: new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion).normalize(),
    binormal: new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).normalize(),
    tangent: new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).normalize(),
  };
}

function curvePoint(point, handle, runtime) {
  const [start, end] = handle.range;
  const t = normalizedAxis(point.y, start, end);
  const frame = sampledCurveFrame(runtime, t);
  if (point.y < start) frame.origin.addScaledVector(frame.tangent, point.y - start);
  else if (point.y > end) frame.origin.addScaledVector(frame.tangent, point.y - end);
  // curve-frame uses +X=normal, +Y=binormal, +Z=tangent. Source deformation uses +Y axial,
  // so source +Z maps to -binormal to preserve a right-handed X/Y/Z cross-section on a straight +Y guide.
  return frame.origin.clone()
    .addScaledVector(frame.normal, point.x)
    .addScaledVector(frame.binormal, -point.z);
}

function deformPoint(point, op, runtime) {
  if (op.kind === 'curve') return curvePoint(point, op.handle, runtime);
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
  for (const op of ops) if (!op || !['bend', 'twist', 'taper', 'curve'].includes(op.kind)) throw new Error('unknown geometry deformation operation');

  const output = geometry.clone();
  const position = output.getAttribute('position');
  let touched = 0;

  for (const op of ops) {
    const weights = selectionWeights(output, op.selection);
    const runtime = op.kind === 'curve' ? curveRuntime(op.guide) : null;
    const { localToGeometry, geometryToLocal } = matrices(op.handle);
    for (let index = 0; index < position.count; index++) {
      const weight = weights[index];
      if (weight === 0) continue;
      const original = new THREE.Vector3().fromBufferAttribute(position, index);
      const local = original.clone().applyMatrix4(geometryToLocal);
      const deformedLocal = deformPoint(local, op, runtime);
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
