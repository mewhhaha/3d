import * as THREE from 'three';
import { faceRegionVertexMask } from './face-regions.js';
import { reflectPoint, reflectDirection } from './symmetry.js';

const finite3 = (value, label) => {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) {
    throw new Error(`${label} must contain three finite numbers`);
  }
  return value.slice();
};

function validateGeometry(geometry) {
  if (!geometry?.isBufferGeometry) throw new Error('geometry sculpt needs a Three.js BufferGeometry');
  const position = geometry.getAttribute('position');
  if (!position || position.itemSize !== 3 || !position.count) throw new Error('geometry sculpt needs XYZ positions');
  if (!geometry.index || geometry.index.count % 3) throw new Error('geometry sculpt needs indexed triangles');
  if (geometry.getAttribute('skinIndex') || geometry.getAttribute('skinWeight')) {
    throw new Error('geometry sculpt is a pre-rig edit; skin attributes require an explicit rig/refit stage');
  }
  if (Object.values(geometry.morphAttributes || {}).some(list => Array.isArray(list) && list.length)) {
    throw new Error('geometry sculpt does not rewrite morph targets; sculpt before authoring morphs');
  }
  return position;
}

function falloffValue(mode, t) {
  if (t >= 1) return 0;
  if (mode === 'constant') return 1;
  if (mode === 'linear') return 1 - t;
  if (mode === 'smooth') return (1 - t * t) ** 3;
  throw new Error(`unknown geometry sculpt falloff '${mode}'`);
}

function selectionValue(selection, meta) {
  let value;
  if (typeof selection === 'function') value = selection(meta);
  else if (ArrayBuffer.isView(selection) || Array.isArray(selection)) value = selection[meta.index];
  else throw new Error('selection must be a function or one weight per vertex');
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error('selection weights must be finite values in 0..1');
  return value;
}

function normalAttribute(geometry) {
  const existing = geometry.getAttribute('normal');
  if (existing?.itemSize === 3 && existing.count === geometry.getAttribute('position').count) return existing;
  const temp = geometry.clone();
  temp.computeVertexNormals();
  const normals = temp.getAttribute('normal').clone();
  temp.dispose();
  return normals;
}

/** Geometry-local compact radial selection. Radius may be scalar or XYZ for an ellipsoid. */
export function radialSelection({ center = [0, 0, 0], radius = 1, falloff = 'smooth' } = {}) {
  const c = finite3(center, 'radial selection center');
  const r = typeof radius === 'number' ? [radius, radius, radius] : finite3(radius, 'radial selection radius');
  if (!r.every(value => value > 0)) throw new Error('radial selection radius must be positive');
  if (!['smooth', 'linear', 'constant'].includes(falloff)) throw new Error('radial selection falloff must be smooth, linear or constant');
  return ({ position }) => {
    const d = Math.sqrt(position.reduce((sum, value, axis) => sum + ((value - c[axis]) / r[axis]) ** 2, 0));
    return falloffValue(falloff, d);
  };
}

/** Compact Euclidean falloff around an authored geometry-local polyline. */
export function pathSelection({ points, radius = 0.1, falloff = 'smooth', closed = false } = {}) {
  if (!Array.isArray(points) || points.length < 2) throw new Error('path selection needs at least two points');
  const authored = points.map((point, index) => finite3(point, `path selection point ${index}`));
  const radii = typeof radius === 'number'
    ? authored.map(() => radius)
    : Array.isArray(radius) && radius.length === authored.length && radius.every(Number.isFinite)
      ? radius.slice()
      : null;
  if (!radii || !radii.every(value => value > 0)) throw new Error('path selection radius must be positive or one positive radius per point');
  if (!['smooth', 'linear', 'constant'].includes(falloff)) throw new Error('path selection falloff must be smooth, linear or constant');
  const segmentCount = authored.length - 1 + (closed ? 1 : 0);
  const segments = Array.from({ length: segmentCount }, (_, index) => {
    const next = (index + 1) % authored.length;
    const line = new THREE.Line3(new THREE.Vector3(...authored[index]), new THREE.Vector3(...authored[next]));
    if (line.distanceSq() <= Number.EPSILON) throw new Error('path selection cannot contain zero-length segments');
    return { line, radius0: radii[index], radius1: radii[next] };
  });
  const closest = new THREE.Vector3();
  return ({ position }) => {
    const point = new THREE.Vector3(...position);
    let best = Infinity;
    for (const segment of segments) {
      const t = segment.line.closestPointToPointParameter(point, true);
      segment.line.at(t, closest);
      const localRadius = THREE.MathUtils.lerp(segment.radius0, segment.radius1, t);
      const normalized = point.distanceTo(closest) / localRadius;
      if (normalized < best) best = normalized;
    }
    return falloffValue(falloff, best);
  };
}

/** Evaluate any selection in an authored local frame. Rotation is XYZ degrees; scale must be positive. */
export function framedSelection(selection, { origin = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1] } = {}) {
  const o = finite3(origin, 'selection frame origin');
  const r = finite3(rotation, 'selection frame rotation');
  const s = finite3(scale, 'selection frame scale');
  if (!s.every(value => value > 0)) throw new Error('selection frame scale must be positive');
  const radians = r.map(THREE.MathUtils.degToRad);
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...radians, 'XYZ'));
  const localToGeometry = new THREE.Matrix4().compose(new THREE.Vector3(...o), quaternion, new THREE.Vector3(...s));
  const geometryToLocal = localToGeometry.clone().invert();
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(geometryToLocal);
  return meta => {
    const position = new THREE.Vector3(...meta.position).applyMatrix4(geometryToLocal).toArray();
    const normal = new THREE.Vector3(...meta.normal).applyNormalMatrix(normalMatrix).normalize().toArray();
    return selectionValue(selection, { ...meta, position, normal });
  };
}

/** Union a selection with a reflected copy across a geometry-local axis or explicit symmetry plane. */
export function symmetrySelection(selection, plane = 'x') {
  return meta => Math.max(
    selectionValue(selection, meta),
    selectionValue(selection, {
      ...meta,
      position: reflectPoint(meta.position, plane),
      normal: reflectDirection(meta.normal, plane),
    }),
  );
}

/** Geometry-local normal-facing selection with a soft threshold. */
export function facingSelection(direction = [0, 0, 1], { minDot = 0 } = {}) {
  const d = new THREE.Vector3(...finite3(direction, 'facing selection direction'));
  if (d.lengthSq() <= Number.EPSILON) throw new Error('facing selection direction cannot be zero');
  if (!Number.isFinite(minDot) || minDot < -1 || minDot >= 1) throw new Error('facing selection minDot must be in [-1, 1)');
  d.normalize();
  return ({ normal }) => THREE.MathUtils.clamp((new THREE.Vector3(...normal).dot(d) - minDot) / (1 - minDot), 0, 1);
}

/** Convert named face semantics to point-domain brush weights without changing topology. */
export function faceRegionSelection(geometry, regionNames, { match = 'any' } = {}) {
  validateGeometry(geometry);
  return faceRegionVertexMask(geometry, regionNames, { match });
}

export function intersectSelections(...selections) {
  if (!selections.length) throw new Error('intersectSelections needs at least one selection');
  return meta => selections.reduce((weight, selection) => weight * selectionValue(selection, meta), 1);
}

export function unionSelections(...selections) {
  if (!selections.length) throw new Error('unionSelections needs at least one selection');
  return meta => Math.max(...selections.map(selection => selectionValue(selection, meta)));
}

export function invertSelection(selection) {
  return meta => 1 - selectionValue(selection, meta);
}

/** Resolve a selection into one deterministic Float32 weight per vertex. */
export function selectionWeights(geometry, selection) {
  const position = validateGeometry(geometry);
  const normal = normalAttribute(geometry);
  const weights = new Float32Array(position.count);
  for (let index = 0; index < position.count; index++) {
    weights[index] = selectionValue(selection, {
      index,
      position: [position.getX(index), position.getY(index), position.getZ(index)],
      normal: [normal.getX(index), normal.getY(index), normal.getZ(index)],
    });
  }
  return weights;
}

function operation(kind, selection, options = {}) {
  if (typeof selection !== 'function' && !ArrayBuffer.isView(selection) && !Array.isArray(selection)) {
    throw new Error(`${kind} needs a selection`);
  }
  return Object.freeze({ kind, selection, ...options });
}

export const pullVertices = (selection, offset) => operation('pull', selection, { offset: finite3(offset, 'pull offset') });

export function inflateVertices(selection, distance) {
  if (!Number.isFinite(distance)) throw new Error('inflate distance must be finite');
  return operation('inflate', selection, { distance });
}

export function smoothVertices(selection, { strength = 0.35, iterations = 2, preserveBoundary = true } = {}) {
  if (!Number.isFinite(strength) || strength < 0 || strength > 1) throw new Error('smooth strength must be in 0..1');
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 100) throw new Error('smooth iterations must be 1..100');
  return operation('smooth', selection, { strength, iterations, preserveBoundary: Boolean(preserveBoundary) });
}

function adjacency(geometry, vertexCount) {
  const neighbors = Array.from({ length: vertexCount }, () => new Set());
  const edgeCounts = new Map();
  const addEdge = (a, b) => {
    neighbors[a].add(b); neighbors[b].add(a);
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
  };
  for (let offset = 0; offset < geometry.index.count; offset += 3) {
    const a = geometry.index.getX(offset), b = geometry.index.getX(offset + 1), c = geometry.index.getX(offset + 2);
    addEdge(a, b); addEdge(b, c); addEdge(c, a);
  }
  const boundary = new Uint8Array(vertexCount);
  for (const [key, count] of edgeCounts) if (count === 1) {
    const [a, b] = key.split(':').map(Number); boundary[a] = 1; boundary[b] = 1;
  }
  return { neighbors, boundary };
}

function writePositions(attribute, points) {
  for (let index = 0; index < points.length; index++) attribute.setXYZ(index, ...points[index]);
  attribute.needsUpdate = true;
}

/**
 * Clone-and-edit indexed BufferGeometry in geometry-local space. Topology and ordinary point/corner
 * attributes are retained; normals/tangents are rebuilt after position edits. This is intentionally
 * a pre-rig, pre-morph authoring stage, not a remesher or deformation system.
 */
export function sculptGeometry(geometry, ...operations) {
  const sourcePosition = validateGeometry(geometry);
  const ops = operations.flat();
  if (!ops.length) throw new Error('sculptGeometry needs at least one operation');
  for (const op of ops) if (!op || !['pull', 'inflate', 'smooth'].includes(op.kind)) throw new Error('unknown geometry sculpt operation');

  const output = geometry.clone();
  const position = output.getAttribute('position');
  const graph = adjacency(output, position.count);
  let touched = 0;

  for (const op of ops) {
    const iterations = op.kind === 'smooth' ? op.iterations : 1;
    for (let step = 0; step < iterations; step++) {
      output.computeVertexNormals();
      const normal = output.getAttribute('normal');
      const before = Array.from({ length: position.count }, (_, index) => [position.getX(index), position.getY(index), position.getZ(index)]);
      const after = before.map(point => point.slice());
      for (let index = 0; index < position.count; index++) {
        const meta = {
          index,
          position: before[index].slice(),
          normal: [normal.getX(index), normal.getY(index), normal.getZ(index)],
        };
        const weight = selectionValue(op.selection, meta);
        if (weight === 0 || (op.kind === 'smooth' && op.preserveBoundary && graph.boundary[index])) continue;
        let delta;
        if (op.kind === 'pull') delta = op.offset;
        else if (op.kind === 'inflate') delta = meta.normal.map(value => value * op.distance);
        else {
          const neighbors = [...graph.neighbors[index]];
          if (!neighbors.length) continue;
          delta = before[index].map((value, axis) => {
            const average = neighbors.reduce((sum, neighbor) => sum + before[neighbor][axis], 0) / neighbors.length;
            return (average - value) * op.strength;
          });
        }
        after[index] = before[index].map((value, axis) => value + weight * delta[axis]);
        if (!after[index].every(Number.isFinite)) throw new Error('geometry sculpt produced invalid coordinates');
        touched++;
      }
      writePositions(position, after);
    }
  }

  output.computeVertexNormals();
  if (geometry.getAttribute('tangent')) {
    if (!output.getAttribute('uv')) throw new Error('geometry sculpt cannot rebuild tangents without UVs');
    output.computeTangents();
  }
  output.computeBoundingBox();
  output.computeBoundingSphere();
  output.userData = {
    ...output.userData,
    geometrySculpt: {
      version: 1,
      coordinateSpace: 'geometry-local',
      operations: ops.map(op => op.kind),
      touchedVertexSteps: touched,
      topologyPreserved: true,
      normals: 'recomputed',
      tangents: geometry.getAttribute('tangent') ? 'recomputed' : 'absent',
    },
  };
  if (sourcePosition.count !== output.getAttribute('position').count || geometry.index.count !== output.index.count) {
    throw new Error('geometry sculpt unexpectedly changed topology');
  }
  return output;
}
