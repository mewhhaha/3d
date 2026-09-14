import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Recipes use meters, Y up, +Z forward, and degrees. Return ordinary Three.js objects.
export { THREE };
const positive = (n, label) => {
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${label} must be positive`);
  return n;
};
const segments = (n, min = 3) => {
  if (!Number.isInteger(n) || n < min || n > 512) throw new Error('Invalid segment count');
  return n;
};
const vector = (v, label) => {
  if (!Array.isArray(v) || v.length !== 3 || !v.every(Number.isFinite)) {
    throw new Error(`${label} must contain three finite numbers`);
  }
  return v;
};
export function material(color = '#c9ced3', options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0, ...options });
}
export function transform(object, { name, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1] } = {}) {
  if (name) object.name = name;
  object.position.fromArray(vector(position, 'position'));
  object.rotation.set(...vector(rotation, 'rotation').map(THREE.MathUtils.degToRad));
  const s = typeof scale === 'number' ? [scale, scale, scale] : scale;
  vector(s, 'scale').forEach(n => positive(n, 'scale')); // Mirror geometry explicitly, not with negative scales.
  object.scale.fromArray(s);
  return object;
}
export function mesh(geometry, { material: mat, ...options } = {}) {
  const object = new THREE.Mesh(geometry, mat?.isMaterial ? mat : material(mat));
  object.name = options.name || geometry.type;
  object.castShadow = object.receiveShadow = true;
  return transform(object, options);
}
export function group(name, children = [], options = {}) {
  const result = new THREE.Group();
  const list = children.flat(Infinity).filter(Boolean);
  if (list.length) result.add(...list);
  return transform(result, { ...options, name });
}
export function repeat(count, fn) {
  if (!Number.isInteger(count) || count < 0 || count > 10000) throw new Error('Invalid repeat count');
  return Array.from({ length: count }, (_, i) => fn(i, count));
}
export function box({ size = [1, 1, 1], radius = 0, segments: detail = 3, ...options } = {}) {
  vector(size, 'size').forEach(n => positive(n, 'size'));
  if (!Number.isFinite(radius) || radius < 0 || radius > Math.min(...size) / 2) throw new Error('Invalid box radius');
  const geometry = radius > 0
    ? new RoundedBoxGeometry(...size, segments(detail, 1), radius)
    : new THREE.BoxGeometry(...size);
  return mesh(geometry, options);
}
export function cylinder({ radius = 0.5, top = radius, bottom = radius, height = 1, segments: detail = 48, open = false, ...options } = {}) {
  if (![top, bottom].every(n => Number.isFinite(n) && n >= 0) || top + bottom === 0) throw new Error('Invalid cylinder radii');
  return mesh(new THREE.CylinderGeometry(top, bottom, positive(height, 'height'), segments(detail), 1, open), options);
}
export function sphere({ radius = 0.5, segments: detail = 32, ...options } = {}) {
  return mesh(new THREE.SphereGeometry(positive(radius, 'radius'), segments(detail), Math.max(3, Math.floor(detail / 2))), options);
}
export function torus({ radius = 0.5, tube = 0.1, segments: detail = 64, ...options } = {}) {
  return mesh(new THREE.TorusGeometry(positive(radius, 'radius'), positive(tube, 'tube'), 12, segments(detail)), options);
}
export function lathe({ points, segments: detail = 64, ...options }) {
  if (!Array.isArray(points) || points.length < 2 || !points.every(p => p.length === 2 && p.every(Number.isFinite) && p[0] >= 0)) {
    throw new Error('lathe needs [radius, height] points');
  }
  return mesh(new THREE.LatheGeometry(points.map(p => new THREE.Vector2(...p)), segments(detail)), options);
}
export function extrude({ points, holes = [], depth = 0.2, bevel = 0, ...options }) {
  const path = (list, Type) => {
    if (!Array.isArray(list) || list.length < 3 || !list.every(p => p.length === 2 && p.every(Number.isFinite))) throw new Error('Invalid polygon');
    const result = new Type(list.map(p => new THREE.Vector2(...p)));
    result.closePath();
    return result;
  };
  if (!Number.isFinite(bevel) || bevel < 0) throw new Error('Invalid bevel');
  const shape = path(points, THREE.Shape);
  shape.holes = holes.map(hole => path(hole, THREE.Path));
  return mesh(new THREE.ExtrudeGeometry(shape, {
    depth: positive(depth, 'depth'), bevelEnabled: bevel > 0,
    bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, steps: 1,
  }), options);
}
export function tube({ points, radius = 0.05, closed = false, segments: detail = 64, ...options }) {
  if (!Array.isArray(points) || points.length < 2) throw new Error('tube needs at least two points');
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...vector(p, 'point'))), closed);
  return mesh(new THREE.TubeGeometry(curve, segments(detail), positive(radius, 'radius'), 12, closed), options);
}

export function defineModel(definition) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(definition.id || '')) throw new Error('Model id must be a lowercase slug');
  if (typeof definition.title !== 'string' || !definition.title.trim() || typeof definition.build !== 'function') throw new Error('Model needs title and build(parameters)');
  definition.parameters ||= {};
  for (const [key, spec] of Object.entries(definition.parameters)) {
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(key)) throw new Error(`Invalid parameter name: ${key}`);
    if (spec.type === 'number') {
      if (![spec.min, spec.max, spec.step, spec.default].every(Number.isFinite) || spec.min >= spec.max || spec.step <= 0 || spec.default < spec.min || spec.default > spec.max) throw new Error(`Invalid numeric parameter: ${key}`);
    } else if (spec.type === 'color') {
      if (!/^#[0-9a-f]{6}$/i.test(spec.default)) throw new Error(`Invalid color: ${key}`);
    } else if (spec.type === 'boolean') {
      if (typeof spec.default !== 'boolean') throw new Error(`Invalid boolean: ${key}`);
    } else if (spec.type === 'select') {
      if (!Array.isArray(spec.options) || !spec.options.length || !spec.options.every(v => typeof v === 'string') || !spec.options.includes(spec.default)) throw new Error(`Invalid selection: ${key}`);
    } else throw new Error(`Unknown parameter type: ${spec.type}`);
  }
  return definition;
}
export function parametersFor(model, values = {}) {
  return Object.fromEntries(Object.entries(model.parameters).map(([key, spec]) => {
    let value = values[key] ?? spec.default;
    if (spec.type === 'number') {
      value = Number(value);
      if (!Number.isFinite(value)) value = spec.default;
      value = THREE.MathUtils.clamp(value, spec.min, spec.max);
      value = Math.min(spec.max, spec.min + Math.round((value - spec.min) / spec.step) * spec.step);
      value = Number(value.toFixed(8));
    } else if (spec.type === 'color') {
      value = typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : spec.default;
    } else if (spec.type === 'boolean') {
      value = value === true || value === 'true' ? true : value === false || value === 'false' ? false : spec.default;
    } else if (!spec.options.includes(value)) value = spec.default;
    return [key, value];
  }));
}
export function buildModel(model, values = {}) {
  const parameters = parametersFor(model, values);
  const object = model.build(parameters);
  if (!object?.isObject3D) throw new Error(`${model.id}: build() must return a Three.js Object3D`);
  const root = group(model.id, [object]);
  root.userData = { modelId: model.id, parameters, units: 'meters', up: 'Y' };
  try { inspect(root); } catch (error) { dispose(root); throw error; }
  return root;
}
export function inspect(root) {
  let meshes = 0, vertices = 0, triangles = 0;
  const materials = new Set();
  root.updateMatrixWorld(true);
  root.traverse(node => {
    if (!node.matrixWorld.elements.every(Number.isFinite)) throw new Error(`Invalid transform: ${node.name}`);
    if (!node.isMesh) return;
    const p = node.geometry.getAttribute('position');
    if (!p || !p.count || !p.array.every(Number.isFinite)) throw new Error(`Invalid vertices: ${node.name}`);
    const index = node.geometry.index;
    if (index && !index.array.every(i => Number.isInteger(i) && i >= 0 && i < p.count)) throw new Error(`Invalid indices: ${node.name}`);
    const normal = node.geometry.getAttribute('normal');
    if (normal && !normal.array.every(Number.isFinite)) throw new Error(`Invalid normals: ${node.name}`);
    const count = index ? index.count : p.count;
    if (count % 3) throw new Error(`Incomplete triangle: ${node.name}`);
    meshes++; vertices += p.count; triangles += count / 3;
    for (const mat of Array.isArray(node.material) ? node.material : [node.material]) materials.add(mat);
  });
  if (!meshes || !triangles) throw new Error('Model has no mesh triangles');
  const bounds = new THREE.Box3().setFromObject(root, true);
  const size = bounds.getSize(new THREE.Vector3()).toArray();
  if (!size.every(Number.isFinite) || Math.max(...size) <= 0) throw new Error('Invalid model bounds');
  return { meshes, vertices, triangles, materials: materials.size, dimensions: size, min: bounds.min.toArray(), max: bounds.max.toArray() };
}
export function dispose(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set(), skeletons = new Set();
  root.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    if (node.skeleton) skeletons.add(node.skeleton);
    for (const mat of Array.isArray(node.material) ? node.material : node.material ? [node.material] : []) materials.add(mat);
  });
  for (const mat of materials) for (const value of Object.values(mat)) if (value?.isTexture) textures.add(value);
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); skeletons.forEach(s => s.dispose());
}
