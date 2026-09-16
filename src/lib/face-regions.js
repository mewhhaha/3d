import * as THREE from 'three';

const STORAGE_KEY = 'faceRegions';
const NAME_RE = /^[A-Za-z][A-Za-z0-9_.:/-]*$/;

function validateGeometry(geometry) {
  if (!geometry?.isBufferGeometry) throw new Error('face regions need a Three.js BufferGeometry');
  const position = geometry.getAttribute('position');
  if (!position || position.itemSize !== 3 || !position.count) throw new Error('face regions need XYZ positions');
  if (!geometry.index || geometry.index.count % 3) throw new Error('face regions need indexed triangles');
  return position;
}

function validateName(name) {
  if (typeof name !== 'string' || !NAME_RE.test(name)) {
    throw new Error(`face region name '${name}' must start with a letter and use letters, digits, ., :, /, _ or -`);
  }
  return name;
}

function triangleMeta(geometry, position, triangleIndex) {
  const offset = triangleIndex * 3;
  const indices = [geometry.index.getX(offset), geometry.index.getX(offset + 1), geometry.index.getX(offset + 2)];
  const vertices = indices.map(index => new THREE.Vector3().fromBufferAttribute(position, index));
  const triangle = new THREE.Triangle(...vertices);
  if (triangle.getArea() <= Number.EPSILON) throw new Error(`face regions found zero-area triangle ${triangleIndex}`);
  const groupIndices = [];
  for (let groupIndex = 0; groupIndex < geometry.groups.length; groupIndex++) {
    const group = geometry.groups[groupIndex];
    if (offset >= group.start && offset + 2 < group.start + group.count) groupIndices.push(groupIndex);
  }
  return {
    triangleIndex,
    indices,
    centroid: vertices[0].clone().add(vertices[1]).add(vertices[2]).multiplyScalar(1 / 3),
    normal: triangle.getNormal(new THREE.Vector3()),
    groupIndices,
  };
}

function normalizeTriangleList(value, triangleCount, name) {
  const list = Array.isArray(value) ? value : value?.triangles;
  if (!Array.isArray(list) || !list.length) throw new Error(`face region '${name}' needs a predicate or non-empty triangle list`);
  const unique = [...new Set(list)];
  if (unique.some(index => !Number.isInteger(index) || index < 0 || index >= triangleCount)) {
    throw new Error(`face region '${name}' contains an invalid triangle index`);
  }
  return unique.sort((a, b) => a - b);
}

function compress(indices) {
  const ranges = [];
  for (const index of indices) {
    const last = ranges.at(-1);
    if (last && last[1] === index) last[1] = index + 1;
    else ranges.push([index, index + 1]);
  }
  return ranges;
}

function expand(ranges, triangleCount, name) {
  const out = [];
  if (!Array.isArray(ranges)) throw new Error(`face region '${name}' metadata is invalid`);
  for (const range of ranges) {
    if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isInteger)
      || range[0] < 0 || range[1] <= range[0] || range[1] > triangleCount) {
      throw new Error(`face region '${name}' metadata is invalid`);
    }
    for (let index = range[0]; index < range[1]; index++) out.push(index);
  }
  return out;
}

function state(geometry, { allowMissing = false } = {}) {
  validateGeometry(geometry);
  const stored = geometry.userData?.[STORAGE_KEY];
  if (!stored) {
    if (allowMissing) return null;
    throw new Error('geometry has no named face regions');
  }
  const triangleCount = geometry.index.count / 3;
  if (stored.version !== 1 || stored.triangleCount !== triangleCount || !stored.regions || typeof stored.regions !== 'object') {
    throw new Error('face region metadata is stale or invalid for this topology');
  }
  return stored;
}

function normalizeRequested(geometry, regionNames) {
  const stored = state(geometry);
  const names = typeof regionNames === 'string' ? [regionNames] : regionNames;
  if (!Array.isArray(names) || !names.length) throw new Error('face region query needs at least one region name');
  const unique = [...new Set(names.map(validateName))];
  const missing = unique.filter(name => !Object.hasOwn(stored.regions, name));
  if (missing.length) throw new Error(`unknown face region${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`);
  return { stored, names: unique };
}

/**
 * Resolve named face-domain regions once from predicates or explicit triangle indices.
 * The stored metadata contains only names and compressed triangle ranges, never functions.
 */
export function defineFaceRegions(geometry, definitions, { clone = true } = {}) {
  const position = validateGeometry(geometry);
  if (!definitions || typeof definitions !== 'object' || Array.isArray(definitions) || !Object.keys(definitions).length) {
    throw new Error('defineFaceRegions needs a non-empty name -> selector object');
  }
  const triangleCount = geometry.index.count / 3;
  const regions = {};
  for (const [rawName, selector] of Object.entries(definitions)) {
    const name = validateName(rawName);
    let indices;
    if (typeof selector === 'function') {
      indices = [];
      for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex++) {
        if (selector(triangleMeta(geometry, position, triangleIndex))) indices.push(triangleIndex);
      }
      if (!indices.length) throw new Error(`face region '${name}' predicate selected no triangles`);
    } else {
      indices = normalizeTriangleList(selector, triangleCount, name);
    }
    regions[name] = compress(indices);
  }
  const output = clone ? geometry.clone() : geometry;
  output.userData = {
    ...output.userData,
    [STORAGE_KEY]: { version: 1, domain: 'face', triangleCount, regions },
  };
  return output;
}

export function faceRegionNames(geometry) {
  const stored = state(geometry, { allowMissing: true });
  return stored ? Object.keys(stored.regions).sort() : [];
}

export function faceRegionTriangles(geometry, regionNames, { match = 'any' } = {}) {
  if (!['any', 'all'].includes(match)) throw new Error("faceRegionTriangles match must be 'any' or 'all'");
  const { stored, names } = normalizeRequested(geometry, regionNames);
  const triangleCount = stored.triangleCount;
  const memberships = names.map(name => new Set(expand(stored.regions[name], triangleCount, name)));
  const result = [];
  for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex++) {
    const hits = memberships.reduce((sum, set) => sum + Number(set.has(triangleIndex)), 0);
    if ((match === 'any' && hits > 0) || (match === 'all' && hits === memberships.length)) result.push(triangleIndex);
  }
  return result;
}

/** Return resolved region names per triangle for spatial-query consumers. */
export function faceRegionMembership(geometry) {
  const stored = state(geometry, { allowMissing: true });
  const triangleCount = geometry.index.count / 3;
  const membership = Array.from({ length: triangleCount }, () => []);
  if (!stored) return membership;
  for (const [name, ranges] of Object.entries(stored.regions)) {
    for (const triangleIndex of expand(ranges, triangleCount, name)) membership[triangleIndex].push(name);
  }
  for (const names of membership) names.sort();
  return membership;
}


/**
 * Transfer named face-domain regions through a topology operation with known face provenance.
 * `mapTargetFace(targetFaceIndex)` returns one source face index, an array of source face
 * indices, or null when the target face has no source-face semantic parent. Optional
 * `targetRegions` define new target-only roles (for example an operation's outer/inner/rim faces).
 */
export function remapFaceRegions(source, target, mapTargetFace, {
  sourceRegions = null,
  targetRegions = {},
  clone = true,
} = {}) {
  validateGeometry(source);
  validateGeometry(target);
  if (typeof mapTargetFace !== 'function') throw new Error('remapFaceRegions needs a target-face mapping function');
  if (!targetRegions || typeof targetRegions !== 'object' || Array.isArray(targetRegions)) {
    throw new Error('remapFaceRegions targetRegions must be a name -> selector object');
  }
  const requested = sourceRegions == null
    ? null
    : (typeof sourceRegions === 'string' ? [sourceRegions] : sourceRegions);
  if (requested != null && !Array.isArray(requested)) throw new Error('remapFaceRegions sourceRegions must be a region name or array');
  const available = sourceRegions == null || requested.length ? faceRegionNames(source) : [];
  const names = sourceRegions == null ? available : requested;
  const uniqueNames = [...new Set(names.map(validateName))];
  const missing = uniqueNames.filter(name => !available.includes(name));
  if (missing.length) throw new Error(`unknown source face region${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`);
  const collisions = uniqueNames.filter(name => Object.hasOwn(targetRegions, name));
  if (collisions.length) throw new Error(`remapFaceRegions target region collides with source region: ${collisions.join(', ')}`);

  const sourceTriangleCount = source.index.count / 3;
  const targetTriangleCount = target.index.count / 3;
  const memberships = Object.fromEntries(uniqueNames.map(name => [name, new Set(faceRegionTriangles(source, name))]));
  const remapped = Object.fromEntries(uniqueNames.map(name => [name, []]));
  for (let targetFace = 0; targetFace < targetTriangleCount; targetFace++) {
    const raw = mapTargetFace(targetFace);
    if (raw == null) continue;
    const parents = Array.isArray(raw) ? raw : [raw];
    if (!parents.length || parents.some(face => !Number.isInteger(face) || face < 0 || face >= sourceTriangleCount)) {
      throw new Error(`remapFaceRegions mapping for target face ${targetFace} contains an invalid source face`);
    }
    for (const name of uniqueNames) {
      if (parents.some(face => memberships[name].has(face))) remapped[name].push(targetFace);
    }
  }

  const definitions = { ...remapped, ...targetRegions };
  const output = clone ? target.clone() : target;
  if (!Object.keys(definitions).length) {
    if (output.userData?.[STORAGE_KEY]) {
      output.userData = { ...output.userData };
      delete output.userData[STORAGE_KEY];
    }
    return output;
  }
  for (const [name, selector] of Object.entries(remapped)) {
    if (!selector.length) throw new Error(`remapFaceRegions source region '${name}' maps to no target faces`);
  }
  return defineFaceRegions(output, definitions, { clone: false });
}

/** Convert named face-domain regions into a point-domain selection for vertex editing/visualization. */
export function faceRegionVertexMask(geometry, regionNames, { match = 'any' } = {}) {
  const position = validateGeometry(geometry);
  const triangles = new Set(faceRegionTriangles(geometry, regionNames, { match }));
  const incident = Array.from({ length: position.count }, () => ({ selected: 0, total: 0 }));
  for (let triangleIndex = 0; triangleIndex < geometry.index.count / 3; triangleIndex++) {
    const selected = triangles.has(triangleIndex);
    for (let corner = 0; corner < 3; corner++) {
      const vertex = geometry.index.getX(triangleIndex * 3 + corner);
      incident[vertex].total++;
      if (selected) incident[vertex].selected++;
    }
  }
  const mask = new Float32Array(position.count);
  for (let vertex = 0; vertex < position.count; vertex++) {
    const item = incident[vertex];
    mask[vertex] = item.total ? item.selected / item.total : 0;
  }
  return mask;
}
