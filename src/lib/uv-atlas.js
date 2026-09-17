import * as THREE from 'three';

const META = 'uvCharts';
const EPS = 1e-12;

function geometryState(geometry) {
  if (!geometry?.isBufferGeometry) throw new Error('UV atlas tools need a Three.js BufferGeometry');
  const position = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  if (!position || position.itemSize !== 3 || !geometry.index || geometry.index.count % 3) throw new Error('UV atlas tools need indexed triangles');
  if (!uv || uv.itemSize !== 2 || uv.count !== position.count) throw new Error('UV atlas tools need one UV per vertex');
  const triangleCount = geometry.index.count / 3;
  const metadata = geometry.userData?.[META];
  if (!metadata || metadata.version !== 1 || metadata.faceOrder !== 'preserved' || metadata.triangleCount !== triangleCount || !Array.isArray(metadata.charts) || !metadata.charts.length) {
    throw new Error('UV atlas tools need projectFaceRegionUVs provenance metadata');
  }
  return { position, uv, triangleCount, metadata };
}

function rectangle(value, label, { unit = false } = {}) {
  if (!Array.isArray(value) || value.length !== 4 || !value.every(Number.isFinite) || value[2] <= value[0] || value[3] <= value[1]) {
    throw new Error(`${label} must be [u0, v0, u1, v1] with positive area`);
  }
  if (unit && value.some(v => v < 0 || v > 1)) throw new Error(`${label} must stay inside 0..1`);
  return [...value];
}

function expandRanges(ranges, triangleCount, label) {
  if (!Array.isArray(ranges) || !ranges.length) throw new Error(`${label} has no face provenance; re-project it with the current UV chart API`);
  const faces = [];
  for (const range of ranges) {
    if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isInteger) || range[0] < 0 || range[1] <= range[0] || range[1] > triangleCount) {
      throw new Error(`${label} face provenance is invalid`);
    }
    for (let face = range[0]; face < range[1]; face++) faces.push(face);
  }
  return faces;
}

function state(geometry) {
  const base = geometryState(geometry);
  const owner = new Int32Array(base.triangleCount); owner.fill(-1);
  const charts = base.metadata.charts.map((chart, index) => {
    const faces = expandRanges(chart.faceRanges, base.triangleCount, `UV chart ${index}`);
    for (const face of faces) {
      if (owner[face] !== -1) throw new Error(`UV chart provenance overlaps on triangle ${face}`);
      owner[face] = index;
    }
    return { ...chart, index, faces, atlas: rectangle(chart.atlas, `UV chart ${index} atlas`) };
  });
  return { ...base, owner, charts };
}

function uvTriangle(geometry, uv, face) {
  return [0, 1, 2].map(corner => {
    const vertex = geometry.index.getX(face * 3 + corner);
    return [uv.getX(vertex), uv.getY(vertex)];
  });
}

function positionTriangle(geometry, position, face) {
  return [0, 1, 2].map(corner => new THREE.Vector3().fromBufferAttribute(position, geometry.index.getX(face * 3 + corner)));
}

function polygonArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    sum += a[0] * b[1] - a[1] * b[0];
  }
  return sum * .5;
}

function bounds(triangles) {
  let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity;
  for (const triangle of triangles) for (const [u, v] of triangle) {
    u0 = Math.min(u0, u); v0 = Math.min(v0, v); u1 = Math.max(u1, u); v1 = Math.max(v1, v);
  }
  return [u0, v0, u1, v1];
}

function boundsOverlap(a, b) {
  return Math.min(a[2], b[2]) - Math.max(a[0], b[0]) > EPS && Math.min(a[3], b[3]) - Math.max(a[1], b[1]) > EPS;
}

function cross(a, b, p) {
  return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
}

// Sutherland-Hodgman clipping is exact enough here because both polygons are triangles.
function overlapArea(subject, clip) {
  let polygon = subject.map(p => [...p]);
  const sign = Math.sign(polygonArea(clip)) || 1;
  for (let edge = 0; edge < 3 && polygon.length; edge++) {
    const a = clip[edge], b = clip[(edge + 1) % 3], input = polygon;
    polygon = [];
    for (let i = 0; i < input.length; i++) {
      const s = input[i], e = input[(i + 1) % input.length];
      const fs = sign * cross(a, b, s), fe = sign * cross(a, b, e);
      const ins = fs >= -EPS, ine = fe >= -EPS;
      if (ins && ine) polygon.push(e);
      else if (ins !== ine) {
        const d = fs - fe;
        if (Math.abs(d) > EPS) {
          const t = fs / d;
          polygon.push([s[0] + (e[0] - s[0]) * t, s[1] + (e[1] - s[1]) * t]);
        }
        if (ine) polygon.push(e);
      }
    }
  }
  return polygon.length >= 3 ? Math.abs(polygonArea(polygon)) : 0;
}

function triangleAngles(points) {
  const p = points.map(point => point.isVector3 ? point : new THREE.Vector3(point[0], point[1], 0));
  const sides = [p[1].distanceTo(p[2]), p[2].distanceTo(p[0]), p[0].distanceTo(p[1])];
  return sides.map((opposite, i) => {
    const a = sides[(i + 1) % 3], b = sides[(i + 2) % 3];
    if (!(a > EPS && b > EPS)) return 0;
    return Math.acos(THREE.MathUtils.clamp((a * a + b * b - opposite * opposite) / (2 * a * b), -1, 1));
  });
}

function metrics(geometry, s, chart) {
  const uvTriangles = chart.faces.map(face => uvTriangle(geometry, s.uv, face));
  const occupied = bounds(uvTriangles);
  let surfaceArea = 0, uvArea = 0, angleSq = 0, maxAngle = 0, degenerateUvFaces = 0;
  const densities = [];
  for (let i = 0; i < chart.faces.length; i++) {
    const p = positionTriangle(geometry, s.position, chart.faces[i]);
    const area3 = new THREE.Triangle(...p).getArea();
    const area2 = Math.abs(polygonArea(uvTriangles[i]));
    if (!(area3 > EPS)) throw new Error(`UV chart ${chart.index} contains zero-area source triangle ${chart.faces[i]}`);
    surfaceArea += area3; uvArea += area2;
    if (!(area2 > EPS)) { degenerateUvFaces++; continue; }
    const a3 = triangleAngles(p), a2 = triangleAngles(uvTriangles[i]);
    const error = Math.max(...a3.map((a, corner) => Math.abs(a - a2[corner])));
    maxAngle = Math.max(maxAngle, error); angleSq += error * error * area3;
    densities.push([area2 / area3, area3]);
  }
  const texelDensity = surfaceArea > EPS ? uvArea / surfaceArea : 0;
  let maxAreaStretchRatio = null, rmsAreaLog2 = null;
  if (!degenerateUvFaces && texelDensity > EPS) {
    let maxRatio = 1, logSq = 0;
    for (const [density, weight] of densities) {
      const ratio = density / texelDensity;
      maxRatio = Math.max(maxRatio, ratio, 1 / ratio);
      logSq += Math.log2(ratio) ** 2 * weight;
    }
    maxAreaStretchRatio = maxRatio;
    rmsAreaLog2 = Math.sqrt(logSq / surfaceArea);
  }
  const [u0, v0, u1, v1] = chart.atlas;
  let outsideAtlasCorners = 0;
  for (const tri of uvTriangles) for (const [u, v] of tri) if (u < u0 - EPS || u > u1 + EPS || v < v0 - EPS || v > v1 + EPS) outsideAtlasCorners++;
  return {
    index: chart.index, faceCount: chart.faces.length, atlas: [...chart.atlas], occupiedBounds: occupied,
    surfaceArea, uvArea, texelDensity, degenerateUvFaces,
    maxAngleErrorDeg: THREE.MathUtils.radToDeg(maxAngle), rmsAngleErrorDeg: THREE.MathUtils.radToDeg(Math.sqrt(angleSq / surfaceArea)),
    maxAreaStretchRatio, rmsAreaLog2, outsideAtlasCorners, uvTriangles,
  };
}

/** Inspect authored semantic UV charts without changing geometry or UVs. */
export function inspectUvCharts(geometry) {
  const s = state(geometry);
  const charts = s.charts.map(chart => metrics(geometry, s, chart));
  const overlapPairs = [];
  for (let a = 0; a < charts.length; a++) for (let b = a + 1; b < charts.length; b++) {
    if (!boundsOverlap(charts[a].occupiedBounds, charts[b].occupiedBounds)) continue;
    let area = 0;
    for (const ta of charts[a].uvTriangles) for (const tb of charts[b].uvTriangles) area += overlapArea(ta, tb);
    if (area > EPS) overlapPairs.push({ charts: [a, b], area });
  }
  const clean = charts.map(({ uvTriangles, ...chart }) => chart);
  return {
    chartCount: clean.length,
    charts: clean,
    overlapPairCount: overlapPairs.length,
    overlapPairs,
    atlasArea: clean.reduce((sum, chart) => sum + chart.uvArea, 0),
    outsideUnitCharts: clean.filter(chart => chart.occupiedBounds.some((value, i) => i < 2 ? value < -EPS : value > 1 + EPS)).map(chart => chart.index),
  };
}

function packingItems(geometry, s, density) {
  const report = inspectUvCharts(geometry);
  return s.charts.map((chart, index) => {
    const info = report.charts[index], [u0, v0, u1, v1] = chart.atlas;
    const normalize = density === 'equalize' && info.texelDensity > EPS ? 1 / Math.sqrt(info.texelDensity) : 1;
    return { index, source: [u0, v0, u1, v1], width: (u1 - u0) * normalize, height: (v1 - v0) * normalize };
  });
}

function orient(items, target, rotate) {
  const width = target[2] - target[0], height = target[3] - target[1];
  return items.map(item => {
    if (!rotate) return { ...item, rotated: false, packWidth: item.width, packHeight: item.height };
    const normalScore = Math.max(item.width / width, item.height / height);
    const rotatedScore = Math.max(item.height / width, item.width / height);
    return rotatedScore + EPS < normalScore
      ? { ...item, rotated: true, packWidth: item.height, packHeight: item.width }
      : { ...item, rotated: false, packWidth: item.width, packHeight: item.height };
  }).sort((a, b) => b.packHeight - a.packHeight || b.packWidth - a.packWidth || a.index - b.index);
}

function shelf(items, target, margin, scale) {
  const [u0, v0, u1, v1] = target;
  let x = u0 + margin, y = v0 + margin, rowHeight = 0;
  const placed = [];
  for (const item of items) {
    const width = item.packWidth * scale, height = item.packHeight * scale;
    if (width + 2 * margin > u1 - u0 + EPS || height + 2 * margin > v1 - v0 + EPS) return null;
    if (x + width + margin > u1 + EPS) { x = u0 + margin; y += rowHeight + margin; rowHeight = 0; }
    if (y + height + margin > v1 + EPS) return null;
    placed.push({ ...item, atlas: [x, y, x + width, y + height] });
    x += width + margin; rowHeight = Math.max(rowHeight, height);
  }
  return placed;
}

/** Deterministically move/scale/cardinal-rotate complete authored charts into one target rectangle. */
export function packUvCharts(geometry, { target = [0, 0, 1, 1], margin = .02, rotate = true, density = 'preserve' } = {}) {
  const s = state(geometry);
  const tile = rectangle(target, 'UV pack target', { unit: true });
  if (!Number.isFinite(margin) || margin < 0 || margin * 2 >= Math.min(tile[2] - tile[0], tile[3] - tile[1])) {
    throw new Error('UV pack margin must be a non-negative UV distance smaller than half the target extent');
  }
  if (typeof rotate !== 'boolean') throw new Error('UV pack rotate must be boolean');
  if (!['preserve', 'equalize'].includes(density)) throw new Error("UV pack density must be 'preserve' or 'equalize'");
  const items = orient(packingItems(geometry, s, density), tile, rotate);
  const targetArea = (tile[2] - tile[0]) * (tile[3] - tile[1]);
  const rawArea = items.reduce((sum, item) => sum + item.packWidth * item.packHeight, 0);
  let low = 0, high = Math.sqrt(targetArea / rawArea);
  for (const item of items) high = Math.min(high, (tile[2] - tile[0]) / item.packWidth, (tile[3] - tile[1]) / item.packHeight);
  if (!shelf(items, tile, margin, 0)) throw new Error('UV pack margin leaves no room for chart rectangles');
  for (let i = 0; i < 42; i++) {
    const mid = (low + high) / 2;
    if (shelf(items, tile, margin, mid)) low = mid; else high = mid;
  }
  const placements = shelf(items, tile, margin, low);
  if (!placements) throw new Error('UV pack failed to place chart rectangles');
  const byIndex = new Map(placements.map(item => [item.index, item]));

  // Packing assumes projection gave each chart independent UV vertices. Reject older ambiguous artifacts.
  const vertexOwner = new Int32Array(s.position.count); vertexOwner.fill(-2);
  for (let face = 0; face < s.triangleCount; face++) for (let corner = 0; corner < 3; corner++) {
    const vertex = geometry.index.getX(face * 3 + corner), domain = s.owner[face];
    if (vertexOwner[vertex] === -2) vertexOwner[vertex] = domain;
    else if (vertexOwner[vertex] !== domain) throw new Error('UV chart packing needs independently split chart vertices; re-project with the current UV chart API');
  }

  const output = geometry.clone();
  const values = new Float32Array(s.uv.array);
  const touched = new Uint8Array(s.position.count);
  for (const chart of s.charts) {
    const placement = byIndex.get(chart.index), [su0, sv0, su1, sv1] = chart.atlas, [du0, dv0, du1, dv1] = placement.atlas;
    for (const face of chart.faces) for (let corner = 0; corner < 3; corner++) {
      const vertex = geometry.index.getX(face * 3 + corner);
      if (touched[vertex]) continue;
      touched[vertex] = 1;
      let a = (s.uv.getX(vertex) - su0) / (su1 - su0), b = (s.uv.getY(vertex) - sv0) / (sv1 - sv0);
      if (placement.rotated) [a, b] = [b, 1 - a];
      values[vertex * 2] = du0 + a * (du1 - du0);
      values[vertex * 2 + 1] = dv0 + b * (dv1 - dv0);
    }
  }
  output.setAttribute('uv', new THREE.BufferAttribute(values, 2));
  if (geometry.getAttribute('tangent')) output.computeTangents();
  const charts = s.metadata.charts.map((chart, index) => ({ ...chart, atlas: [...byIndex.get(index).atlas], packedRotation: byIndex.get(index).rotated ? 90 : 0 }));
  const packedArea = placements.reduce((sum, item) => sum + (item.atlas[2] - item.atlas[0]) * (item.atlas[3] - item.atlas[1]), 0);
  output.userData = { ...output.userData, [META]: { ...s.metadata, charts, pack: { version: 1, target: [...tile], margin, rotate, density, uniformScale: low, occupancy: packedArea / targetArea } } };
  return output;
}
