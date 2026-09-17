import { faceRegionTriangles } from './face-regions.js';

function validateGeometry(geometry) {
  if (!geometry?.isBufferGeometry) throw new Error('material regions need a Three.js BufferGeometry');
  if (!geometry.index || geometry.index.count % 3) throw new Error('material regions need indexed triangles');
  const position = geometry.getAttribute('position');
  if (!position || position.itemSize !== 3 || !position.count) throw new Error('material regions need XYZ positions');
  return geometry.index.count / 3;
}

function materialIndex(value, label = 'material index') {
  if (!Number.isInteger(value) || value < 0 || value > 65535) throw new Error(`${label} must be an integer from 0 to 65535`);
  return value;
}

function existingFaceMaterials(geometry, triangleCount) {
  if (!geometry.groups.length) return new Int32Array(triangleCount);
  const out = new Int32Array(triangleCount);
  out.fill(-1);
  for (let groupIndex = 0; groupIndex < geometry.groups.length; groupIndex++) {
    const group = geometry.groups[groupIndex];
    const start = group.start ?? 0;
    const count = group.count ?? -1;
    const end = start + count;
    materialIndex(group.materialIndex ?? 0, `geometry group ${groupIndex} materialIndex`);
    if (!Number.isInteger(start) || !Number.isInteger(count) || start < 0 || count <= 0
      || start % 3 || count % 3 || end > geometry.index.count) {
      throw new Error(`geometry group ${groupIndex} must cover a triangle-aligned index range`);
    }
    for (let offset = start; offset < end; offset += 3) {
      const face = offset / 3;
      if (out[face] !== -1) throw new Error(`geometry groups overlap at triangle ${face}`);
      out[face] = group.materialIndex ?? 0;
    }
  }
  const missing = out.findIndex(value => value < 0);
  if (missing !== -1) throw new Error(`geometry groups leave triangle ${missing} without a material`);
  return out;
}

/** Return the material slot index assigned to each indexed triangle. */
export function faceMaterialIndices(geometry) {
  const triangleCount = validateGeometry(geometry);
  return existingFaceMaterials(geometry, triangleCount);
}

/**
 * Assign named semantic face regions to Three.js material slots without reordering topology.
 * Unassigned faces use existing material groups by default, or a numeric fallback slot.
 */
export function assignFaceMaterials(geometry, assignments, { defaultMaterial = 'existing' } = {}) {
  const triangleCount = validateGeometry(geometry);
  if (!assignments || typeof assignments !== 'object' || Array.isArray(assignments) || !Object.keys(assignments).length) {
    throw new Error('assignFaceMaterials needs a non-empty region -> material slot object');
  }
  const materials = defaultMaterial === 'existing'
    ? existingFaceMaterials(geometry, triangleCount)
    : new Int32Array(triangleCount).fill(materialIndex(defaultMaterial, 'defaultMaterial'));
  const owner = Array(triangleCount).fill(null);
  const normalized = {};

  for (const [regionName, rawSlot] of Object.entries(assignments)) {
    const slot = materialIndex(rawSlot, `material slot for '${regionName}'`);
    const triangles = faceRegionTriangles(geometry, regionName);
    normalized[regionName] = slot;
    for (const face of triangles) {
      if (owner[face] && materials[face] !== slot) {
        throw new Error(`material regions '${owner[face]}' and '${regionName}' conflict on triangle ${face}`);
      }
      owner[face] ??= regionName;
      materials[face] = slot;
    }
  }

  const output = geometry.clone();
  output.clearGroups();
  let runStart = 0;
  let runMaterial = materials[0];
  for (let face = 1; face <= triangleCount; face++) {
    const next = face < triangleCount ? materials[face] : -1;
    if (next !== runMaterial) {
      output.addGroup(runStart * 3, (face - runStart) * 3, runMaterial);
      runStart = face;
      runMaterial = next;
    }
  }
  output.userData = {
    ...output.userData,
    materialRegions: {
      version: 1,
      domain: 'face',
      triangleCount,
      defaultMaterial,
      assignments: normalized,
      groupCount: output.groups.length,
    },
  };
  return output;
}
