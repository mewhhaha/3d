import * as THREE from 'three';

const META = 'uvCharts';
const EPS = 1e-9;

function validateGeometry(geometry) {
  if (!geometry?.isBufferGeometry) throw new Error('chartTexture needs a Three.js BufferGeometry');
  const metadata = geometry.userData?.[META];
  if (!metadata || metadata.version !== 1 || !Array.isArray(metadata.charts) || !metadata.charts.length) {
    throw new Error('chartTexture needs projectFaceRegionUVs provenance metadata');
  }
  return metadata;
}

function sizeValue(value) {
  const size = value ?? 256;
  if (!Number.isInteger(size) || size < 16 || size > 2048 || (size & (size - 1))) {
    throw new Error('chartTexture size must be a power of two from 16 through 2048');
  }
  return size;
}

function unit2(value, label) {
  if (!Array.isArray(value) || value.length !== 2 || !value.every(Number.isFinite)) throw new Error(`${label} must contain two finite numbers`);
  return [...value];
}

function positive2(value, label) {
  const out = unit2(value, label);
  if (!(out[0] > 0 && out[1] > 0)) throw new Error(`${label} values must be positive`);
  return out;
}

function parseColor(value, label) {
  if (typeof value === 'string') {
    if (!/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)) throw new Error(`${label} must be #rrggbb or #rrggbbaa`);
    const rgb = [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16) / 255);
    return [...rgb, value.length === 9 ? parseInt(value.slice(7, 9), 16) / 255 : 1];
  }
  if (!Array.isArray(value) || ![3, 4].includes(value.length) || !value.every(Number.isFinite) || value.some(v => v < 0 || v > 1)) {
    throw new Error(`${label} must be #rrggbb, #rrggbbaa, or 0..1 RGB(A)`);
  }
  return [value[0], value[1], value[2], value[3] ?? 1];
}

const srgbToLinear = x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4;
const linearToSrgb = x => x <= .0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - .055;
const clamp01 = x => Math.max(0, Math.min(1, x));

function colorForBlend(color, colorSpace) {
  const rgba = [...color];
  if (colorSpace === 'srgb') for (let i = 0; i < 3; i++) rgba[i] = srgbToLinear(rgba[i]);
  return rgba;
}

function chartLookup(geometry, metadata) {
  const byName = new Map();
  const charts = metadata.charts.map((raw, index) => {
    if (!Array.isArray(raw.atlas) || raw.atlas.length !== 4 || !raw.atlas.every(Number.isFinite) || raw.atlas[2] <= raw.atlas[0] || raw.atlas[3] <= raw.atlas[1]) {
      throw new Error(`UV chart ${index} atlas metadata is invalid`);
    }
    return { ...raw, index };
  });
  const faceRegions = geometry.userData?.faceRegions;
  if (faceRegions?.version === 1 && faceRegions.triangleCount === metadata.triangleCount && faceRegions.regions && typeof faceRegions.regions === 'object') {
    const rangeKey = ranges => JSON.stringify(ranges);
    const byRanges = new Map(charts.map(chart => [rangeKey(chart.faceRanges), chart]));
    for (const [name, ranges] of Object.entries(faceRegions.regions)) {
      const chart = byRanges.get(rangeKey(ranges));
      if (chart) byName.set(name, chart);
    }
  }
  return { charts, byName };
}

function resolveChart(ref, lookup, label) {
  if (Number.isInteger(ref) && ref >= 0 && ref < lookup.charts.length) return lookup.charts[ref];
  if (typeof ref === 'string' && lookup.byName.has(ref)) return lookup.byName.get(ref);
  if (typeof ref === 'string') throw new Error(`${label} references unknown chart '${ref}'; project one named face region per chart or use its index`);
  throw new Error(`${label} chart must be a semantic chart name or numeric index`);
}

function localFromAtlas(chart, u, v) {
  const [u0, v0, u1, v1] = chart.atlas;
  const p = (u - u0) / (u1 - u0), q = (v - v0) / (v1 - v0);
  const rotation = ((chart.packedRotation ?? 0) % 360 + 360) % 360;
  if (rotation === 0) return [p, q];
  if (rotation === 90) return [1 - q, p];
  if (rotation === 180) return [1 - p, 1 - q];
  if (rotation === 270) return [q, 1 - p];
  throw new Error(`UV chart ${chart.index} has unsupported packed rotation ${chart.packedRotation}`);
}

function rotatePoint(point, center, degrees) {
  if (!degrees) return [point[0] - center[0], point[1] - center[1]];
  const radians = -THREE.MathUtils.degToRad(degrees), c = Math.cos(radians), s = Math.sin(radians);
  const x = point[0] - center[0], y = point[1] - center[1];
  return [x * c - y * s, x * s + y * c];
}

function segmentDistance(point, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], px = point[0] - a[0], py = point[1] - a[1];
  const denom = dx * dx + dy * dy;
  const t = denom > EPS ? clamp01((px * dx + py * dy) / denom) : 0;
  return Math.hypot(point[0] - (a[0] + dx * t), point[1] - (a[1] + dy * t));
}

function primitive(layer, label) {
  const shape = layer.shape ?? 'fill';
  if (!['fill', 'rect', 'ellipse', 'line'].includes(shape)) throw new Error(`${label} shape must be fill, rect, ellipse, or line`);
  const rotation = layer.rotation ?? 0;
  if (!Number.isFinite(rotation)) throw new Error(`${label} rotation must be finite degrees`);
  if (shape === 'fill') return () => true;
  if (shape === 'rect') {
    const center = unit2(layer.center ?? [.5, .5], `${label} center`), size = positive2(layer.size ?? [1, 1], `${label} size`);
    return point => { const p = rotatePoint(point, center, rotation); return Math.abs(p[0]) <= size[0] / 2 + EPS && Math.abs(p[1]) <= size[1] / 2 + EPS; };
  }
  if (shape === 'ellipse') {
    const center = unit2(layer.center ?? [.5, .5], `${label} center`), radius = positive2(layer.radius ?? [.5, .5], `${label} radius`);
    return point => { const p = rotatePoint(point, center, rotation); return (p[0] / radius[0]) ** 2 + (p[1] / radius[1]) ** 2 <= 1 + EPS; };
  }
  const from = unit2(layer.from ?? [.1, .5], `${label} from`), to = unit2(layer.to ?? [.9, .5], `${label} to`), width = layer.width ?? .05;
  if (!Number.isFinite(width) || width <= 0) throw new Error(`${label} width must be positive`);
  return point => segmentDistance(point, from, to) <= width / 2 + EPS;
}

function compileLayers(geometry, metadata, layers, colorSpace) {
  if (!Array.isArray(layers) || !layers.length) throw new Error('chartTexture needs at least one layer');
  const lookup = chartLookup(geometry, metadata);
  return layers.map((layer, index) => {
    const label = `chartTexture layer ${index}`;
    if (!layer || typeof layer !== 'object' || Array.isArray(layer)) throw new Error(`${label} must be an object`);
    const chart = resolveChart(layer.chart, lookup, label);
    const color = colorForBlend(parseColor(layer.color ?? '#ffffff', `${label} color`), colorSpace);
    const opacity = layer.opacity ?? 1;
    if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) throw new Error(`${label} opacity must be from 0 through 1`);
    return { chart, chartRef: layer.chart, color, opacity, contains: primitive(layer, label) };
  });
}

/** Rasterize simple procedural detail in semantic chart-local coordinates into an exportable RGBA8 DataTexture. */
export function chartTexture(geometry, { size = 256, background = '#00000000', colorSpace = 'srgb', name = 'Semantic chart texture', layers } = {}) {
  const metadata = validateGeometry(geometry), dimension = sizeValue(size);
  if (!['srgb', 'linear'].includes(colorSpace)) throw new Error("chartTexture colorSpace must be 'srgb' or 'linear'");
  if (typeof name !== 'string' || !name.trim()) throw new Error('chartTexture name must be a non-empty string');
  const bg = colorForBlend(parseColor(background, 'chartTexture background'), colorSpace);
  const compiled = compileLayers(geometry, metadata, layers, colorSpace);
  const pixels = new Float32Array(dimension * dimension * 4);
  for (let i = 0; i < dimension * dimension; i++) pixels.set(bg, i * 4);

  for (const layer of compiled) {
    const [u0, v0, u1, v1] = layer.chart.atlas;
    const x0 = Math.max(0, Math.floor(u0 * dimension)), x1 = Math.min(dimension - 1, Math.ceil(u1 * dimension) - 1);
    const y0 = Math.max(0, Math.floor(v0 * dimension)), y1 = Math.min(dimension - 1, Math.ceil(v1 * dimension) - 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const u = (x + .5) / dimension, v = (y + .5) / dimension;
      const local = localFromAtlas(layer.chart, u, v);
      if (local[0] < -EPS || local[0] > 1 + EPS || local[1] < -EPS || local[1] > 1 + EPS || !layer.contains(local)) continue;
      const i = (y * dimension + x) * 4, srcA = layer.color[3] * layer.opacity, dstA = pixels[i + 3], outA = srcA + dstA * (1 - srcA);
      if (outA <= EPS) { pixels.set([0, 0, 0, 0], i); continue; }
      for (let c = 0; c < 3; c++) pixels[i + c] = (layer.color[c] * srcA + pixels[i + c] * dstA * (1 - srcA)) / outA;
      pixels[i + 3] = outA;
    }
  }

  const bytes = new Uint8Array(pixels.length);
  for (let i = 0; i < dimension * dimension; i++) {
    for (let c = 0; c < 3; c++) {
      const value = colorSpace === 'srgb' ? linearToSrgb(clamp01(pixels[i * 4 + c])) : clamp01(pixels[i * 4 + c]);
      bytes[i * 4 + c] = Math.round(value * 255);
    }
    bytes[i * 4 + 3] = Math.round(clamp01(pixels[i * 4 + 3]) * 255);
  }
  const texture = new THREE.DataTexture(bytes, dimension, dimension, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.name = name;
  texture.colorSpace = colorSpace === 'srgb' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true; texture.flipY = false; texture.needsUpdate = true;
  texture.userData.chartTexture = { version: 1, size: dimension, colorSpace, layers: compiled.map(layer => ({ chartIndex: layer.chart.index, chartName: typeof layer.chartRef === 'string' ? layer.chartRef : null })) };
  return texture;
}
