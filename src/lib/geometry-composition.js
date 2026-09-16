import * as THREE from 'three';
import { defineFaceRegions, faceRegionNames, faceRegionTriangles } from './face-regions.js';

const PART_RE = /^[A-Za-z][A-Za-z0-9_.:/-]*$/;
const DEG = Math.PI / 180;

function finiteVector(value, label, fallback) {
  const v = value ?? fallback;
  const a = typeof v === 'number' ? [v, v, v] : v;
  if (!Array.isArray(a) || a.length !== 3 || !a.every(Number.isFinite)) throw new Error(`${label} must contain three finite numbers`);
  return a;
}

function transformMatrix(part) {
  if (part.matrix != null) {
    if (!part.matrix?.isMatrix4) throw new Error(`geometry part '${part.name}' matrix must be a THREE.Matrix4`);
    return part.matrix.clone();
  }
  const position = finiteVector(part.position, `geometry part '${part.name}' position`, [0, 0, 0]);
  const rotation = finiteVector(part.rotation, `geometry part '${part.name}' rotation`, [0, 0, 0]);
  const scale = finiteVector(part.scale, `geometry part '${part.name}' scale`, [1, 1, 1]);
  if (scale.some(n => n <= 0)) throw new Error(`geometry part '${part.name}' scale must be positive`);
  const euler = new THREE.Euler(rotation[0] * DEG, rotation[1] * DEG, rotation[2] * DEG, 'XYZ');
  return new THREE.Matrix4().compose(
    new THREE.Vector3().fromArray(position),
    new THREE.Quaternion().setFromEuler(euler),
    new THREE.Vector3().fromArray(scale),
  );
}

function validatePart(part, names) {
  if (!part || typeof part !== 'object' || !part.geometry?.isBufferGeometry) throw new Error('composeGeometries parts need { name, geometry }');
  if (typeof part.name !== 'string' || !PART_RE.test(part.name)) throw new Error(`invalid geometry part name '${part.name}'`);
  if (names.has(part.name)) throw new Error(`duplicate geometry part name '${part.name}'`);
  names.add(part.name);
  const geometry = part.geometry;
  const position = geometry.getAttribute('position');
  if (!position || position.itemSize !== 3 || !position.count || position.isInterleavedBufferAttribute) throw new Error(`geometry part '${part.name}' needs ordinary XYZ positions`);
  if (!geometry.index || geometry.index.count % 3) throw new Error(`geometry part '${part.name}' needs indexed triangles`);
  if (geometry.morphAttributes && Object.keys(geometry.morphAttributes).length) throw new Error(`geometry part '${part.name}' morph attributes are not supported by composition`);
  if (geometry.morphTargetsRelative) throw new Error(`geometry part '${part.name}' morph targets are not supported by composition`);
  for (const name of ['skinIndex', 'skinWeight', 'tangent']) if (geometry.getAttribute(name)) throw new Error(`geometry part '${part.name}' ${name} needs an explicit composition contract`);
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    if (attribute.isInterleavedBufferAttribute) throw new Error(`geometry part '${part.name}' attribute '${name}' is interleaved`);
    if (attribute.count !== position.count) throw new Error(`geometry part '${part.name}' attribute '${name}' is not point-domain`);
  }
  const materialOffset = part.materialOffset ?? 0;
  if (!Number.isInteger(materialOffset) || materialOffset < 0) throw new Error(`geometry part '${part.name}' materialOffset must be a nonnegative integer`);
  return { geometry, position, materialOffset, matrix: transformMatrix(part) };
}

function schemaFor(geometry) {
  return Object.keys(geometry.attributes).sort().map(name => {
    const a = geometry.getAttribute(name);
    return { name, itemSize: a.itemSize, normalized: a.normalized, ArrayType: a.array.constructor };
  });
}

function assertCompatible(parts) {
  const expected = schemaFor(parts[0].geometry);
  for (const part of parts.slice(1)) {
    const actual = schemaFor(part.geometry);
    if (actual.length !== expected.length || actual.some((a, i) => {
      const b = expected[i];
      return a.name !== b.name || a.itemSize !== b.itemSize || a.normalized !== b.normalized || a.ArrayType !== b.ArrayType;
    })) throw new Error(`geometry part '${part.name}' attributes are incompatible with '${parts[0].name}'`);
  }
  return expected;
}

function copyAttribute(schema, parts, totalVertices) {
  const array = new schema.ArrayType(totalVertices * schema.itemSize);
  let vertexOffset = 0;
  for (const part of parts) {
    const source = part.geometry.getAttribute(schema.name);
    array.set(source.array, vertexOffset * schema.itemSize);
    vertexOffset += part.position.count;
  }
  return new THREE.BufferAttribute(array, schema.itemSize, schema.normalized);
}

function transformPartAttributes(output, parts, schema) {
  let offset = 0;
  const position = output.getAttribute('position');
  const normal = output.getAttribute('normal');
  for (const part of parts) {
    const count = part.position.count;
    const p = new THREE.Vector3();
    const n = new THREE.Vector3();
    const normalMatrix = normal ? new THREE.Matrix3().getNormalMatrix(part.matrix) : null;
    for (let i = 0; i < count; i++) {
      p.fromBufferAttribute(position, offset + i).applyMatrix4(part.matrix);
      position.setXYZ(offset + i, p.x, p.y, p.z);
      if (normal) {
        n.fromBufferAttribute(normal, offset + i).applyNormalMatrix(normalMatrix);
        normal.setXYZ(offset + i, n.x, n.y, n.z);
      }
    }
    offset += count;
  }
  for (const item of schema) output.getAttribute(item.name).needsUpdate = true;
}

/**
 * Compose separately owned indexed triangle geometries into one geometry while retaining
 * construction identity. Part transforms use meters and degrees, matching modeling.js.
 * Compatible point attributes are copied exactly; topology semantics live in named face regions,
 * independent from material draw groups.
 */
export function composeGeometries(rawParts, {
  regionPrefix = 'part',
  preserveRegions = true,
  preserveGroups = true,
} = {}) {
  if (!Array.isArray(rawParts) || rawParts.length < 1) throw new Error('composeGeometries needs at least one part');
  if (regionPrefix != null && (typeof regionPrefix !== 'string' || !PART_RE.test(regionPrefix))) throw new Error('composeGeometries regionPrefix must be a safe region name or null');
  if (typeof preserveRegions !== 'boolean' || typeof preserveGroups !== 'boolean') throw new Error('composeGeometries preserve options must be boolean');

  const names = new Set();
  const parts = rawParts.map(part => ({ name: part.name, ...validatePart(part, names) }));
  const schema = assertCompatible(parts);
  const totalVertices = parts.reduce((sum, part) => sum + part.position.count, 0);
  const totalIndices = parts.reduce((sum, part) => sum + part.geometry.index.count, 0);
  const output = new THREE.BufferGeometry();
  for (const item of schema) output.setAttribute(item.name, copyAttribute(item, parts, totalVertices));
  transformPartAttributes(output, parts, schema);

  const IndexArray = totalVertices > 65535 ? Uint32Array : Uint16Array;
  const indices = new IndexArray(totalIndices);
  const composition = [];
  const regionFaces = new Map();
  let vertexOffset = 0, indexOffset = 0, faceOffset = 0;
  for (const part of parts) {
    const source = part.geometry.index;
    for (let i = 0; i < source.count; i++) indices[indexOffset + i] = source.getX(i) + vertexOffset;
    const faceCount = source.count / 3;
    const entry = { name: part.name, firstVertex: vertexOffset, vertexCount: part.position.count, firstFace: faceOffset, faceCount };
    composition.push(entry);

    if (preserveRegions) {
      for (const regionName of faceRegionNames(part.geometry)) {
        const list = regionFaces.get(regionName) || [];
        list.push(...faceRegionTriangles(part.geometry, regionName).map(face => face + faceOffset));
        regionFaces.set(regionName, list);
      }
    }
    if (regionPrefix != null) {
      const regionName = `${regionPrefix}.${part.name}`;
      if (regionFaces.has(regionName)) throw new Error(`generated part region '${regionName}' collides with inherited region`);
      regionFaces.set(regionName, Array.from({ length: faceCount }, (_, i) => faceOffset + i));
    }

    if (preserveGroups) {
      if (part.geometry.groups.length) {
        for (const group of part.geometry.groups) output.addGroup(indexOffset + group.start, group.count, (group.materialIndex ?? 0) + part.materialOffset);
      } else output.addGroup(indexOffset, source.count, part.materialOffset);
    }
    vertexOffset += part.position.count;
    indexOffset += source.count;
    faceOffset += faceCount;
  }
  output.setIndex(new THREE.BufferAttribute(indices, 1));
  output.userData = { geometryComposition: { version: 1, parts: composition } };
  const definitions = Object.fromEntries([...regionFaces.entries()]);
  const finalGeometry = definitions && Object.keys(definitions).length ? defineFaceRegions(output, definitions, { clone: false }) : output;
  finalGeometry.computeBoundingBox();
  finalGeometry.computeBoundingSphere();
  return finalGeometry;
}
