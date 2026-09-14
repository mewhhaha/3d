import { THREE, mesh } from './modeling.js';
export const DETAIL = Object.freeze({
  draft: Object.freeze({ radial: 32, rings: 32, strands: 18, textureSize: 128 }),
  studio: Object.freeze({ radial: 64, rings: 64, strands: 36, textureSize: 256 }),
  fine: Object.freeze({ radial: 128, rings: 128, strands: 64, textureSize: 512 }),
});
export function detail(level = 'studio') {
  if (!Object.hasOwn(DETAIL, level)) throw new Error(`Unknown detail level: ${level}`);
  return DETAIL[level];
}
const finite = (x, name) => { if (!Number.isFinite(x)) throw new Error(`${name} must be finite`); return x; };
const count = (x, name, min = 2, max = 512) => {
  if (!Number.isInteger(x) || x < min || x > max) throw new Error(`${name} must be an integer in ${min}..${max}`);
  return x;
};
export const gaussian = (x, center, width) => {
  if (!(width > 0)) throw new Error('Gaussian width must be positive');
  return Math.exp(-0.5 * ((x - center) / width) ** 2);
};
// Explicit UV patches. U x V determines outward winding.
export function patchGeometry({ sample, uSegments = 64, vSegments = 64, wrapU = false, wrapV = false }) {
  count(uSegments, 'uSegments'); count(vSegments, 'vSegments');
  if (typeof sample !== 'function') throw new Error('sample(u, v) is required');
  const positions = [], uvs = [], indices = [];
  for (let j = 0; j <= vSegments; j++) for (let i = 0; i <= uSegments; i++) {
    const point = sample(i / uSegments, j / vSegments);
    if (!Array.isArray(point) || point.length !== 3 || !point.every(Number.isFinite)) throw new Error('Surface returned an invalid point');
    positions.push(...point); uvs.push(i / uSegments, j / vSegments);
  }
  const row = uSegments + 1;
  for (let j = 0; j < vSegments; j++) for (let i = 0; i < uSegments; i++) {
    const a = j * row + i;
    indices.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const normals = geometry.attributes.normal;
  const average = (a, b) => {
    const n = new THREE.Vector3().fromBufferAttribute(normals, a).add(new THREE.Vector3().fromBufferAttribute(normals, b)).normalize();
    normals.setXYZ(a, n.x, n.y, n.z); normals.setXYZ(b, n.x, n.y, n.z);
  };
  if (wrapU) for (let j = 0; j <= vSegments; j++) average(j * row, j * row + uSegments);
  if (wrapV) for (let i = 0; i <= uSegments; i++) average(i, vSegments * row + i);
  return geometry;
}
export function patch({ sample, uSegments, vSegments, wrapU, wrapV, ...options }) {
  return mesh(patchGeometry({ sample, uSegments, vSegments, wrapU, wrapV }), options);
}
// Profiles: [height, halfWidth, halfDepth, centerZ?, centerX?].
export function profileAt(sections, y) {
  let i = 0;
  while (i < sections.length - 2 && y > sections[i + 1][0]) i++;
  const a = sections[i], b = sections[i + 1];
  const t = THREE.MathUtils.clamp((y - a[0]) / (b[0] - a[0]), 0, 1);
  return [1, 2, 3, 4].map(k => {
    const p = sections[Math.max(0, i - 1)], q = sections[Math.min(sections.length - 1, i + 2)];
    const av = a[k] || 0, bv = b[k] || 0;
    const m0 = ((b[k] || 0) - (p[k] || 0)) / (b[0] - p[0]) * (b[0] - a[0]);
    const m1 = ((q[k] || 0) - (a[k] || 0)) / (q[0] - a[0]) * (b[0] - a[0]);
    const value = (2*t**3 - 3*t*t + 1)*av + (t**3 - 2*t*t + t)*m0 + (-2*t**3 + 3*t*t)*bv + (t**3 - t*t)*m1;
    return k < 3 ? Math.max(0.00001, value) : value;
  });
}
export function loft({ sections, radialSegments = 64, heightSegments = 64, deform, ...options }) {
  if (!Array.isArray(sections) || sections.length < 2) throw new Error('loft needs at least two sections');
  sections.forEach((s, i) => {
    if (s.length < 3 || s.length > 5 || !s.every(Number.isFinite) || s[1] <= 0 || s[2] <= 0 || (i && s[0] <= sections[i - 1][0])) throw new Error('Invalid or unordered loft sections');
  });
  const y0 = sections[0][0], y1 = sections.at(-1)[0];
  const geometry = patchGeometry({ uSegments: radialSegments, vSegments: heightSegments, wrapU: true,
    sample(u, v) {
      const y = y0 + (y1 - y0) * v, [rx, rz, cz, cx] = profileAt(sections, y), angle = u * Math.PI * 2;
      const p = [cx + rx * Math.sin(angle), y, cz + rz * Math.cos(angle)];
      return deform ? deform(p, { u, v, angle }) : p;
    },
  });
  // Side and caps occupy separate charts.
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, 0.2 + uv.getY(i) * 0.8);
  const p = [...geometry.attributes.position.array], n = [...geometry.attributes.normal.array], t = [...uv.array], idx = [...geometry.index.array];
  const ring = radialSegments + 1;
  for (const top of [false, true]) {
    const offset = p.length / 3, start = top ? heightSegments * ring : 0;
    let center = new THREE.Vector3();
    for (let i = 0; i < radialSegments; i++) center.add(new THREE.Vector3(...p.slice((start + i) * 3, (start + i) * 3 + 3)));
    center.divideScalar(radialSegments);
    const uc = top ? 0.75 : 0.25;
    p.push(...center.toArray()); n.push(0, top ? 1 : -1, 0); t.push(uc, 0.1);
    for (let i = 0; i <= radialSegments; i++) {
      p.push(...p.slice((start + i) * 3, (start + i) * 3 + 3)); n.push(0, top ? 1 : -1, 0);
      t.push(uc + 0.085*Math.sin(i/radialSegments*Math.PI*2), 0.1 + 0.085*Math.cos(i/radialSegments*Math.PI*2));
      if (i < radialSegments) idx.push(...(top ? [offset, offset+i+1, offset+i+2] : [offset, offset+i+2, offset+i+1]));
    }
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(t, 2)); geometry.setIndex(idx);
  return mesh(geometry, options);
}
export function ellipsoid({ radii = [1, 1, 1], segments = 48, ...options } = {}) {
  if (radii.length !== 3 || !radii.every(n => Number.isFinite(n) && n > 0)) throw new Error('Positive ellipsoid radii required');
  count(segments, 'segments', 8, 256);
  const g = new THREE.SphereGeometry(1, segments, Math.floor(segments/2));
  g.scale(...radii); return mesh(g, options);
}
// Variable-radius tubes for locks, seams, fingers and folds. Ends are open.
export function sweep({ points, radii = 0.02, segments = 48, sides = 8, closed = false, ...options }) {
  count(segments, 'segments'); count(sides, 'sides', 3, 64);
  if (!Array.isArray(points) || points.length < 2 || !points.every(p => p.length === 3 && p.every(Number.isFinite))) throw new Error('Invalid sweep path');
  const values = typeof radii === 'number' ? [radii, radii] : radii;
  if (!Array.isArray(values) || values.length < 2 || !values.every(r => Number.isFinite(r) && r > 0)) throw new Error('Positive radii required');
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), closed, 'centripetal');
  const frames = curve.computeFrenetFrames(segments, closed);
  return patch({ uSegments: sides, vSegments: segments, wrapU: true, wrapV: closed,
    sample(u, v) {
      const k = Math.min(values.length - 2, Math.floor(v*(values.length - 1))), f = v*(values.length - 1)-k;
      const r = THREE.MathUtils.lerp(values[k], values[k+1], f), i = Math.round(v*segments), a = u*Math.PI*2;
      return curve.getPointAt(v).addScaledVector(frames.normals[i], -r*Math.cos(a)).addScaledVector(frames.binormals[i], -r*Math.sin(a)).toArray();
    }, ...options,
  });
}
export function displace(geometry, field, amount = 0.01) {
  finite(amount, 'amount');
  const g = geometry.clone(); if (!g.attributes.normal) g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const point = new THREE.Vector3().fromBufferAttribute(p, i), normal = new THREE.Vector3().fromBufferAttribute(n, i);
    const d = finite(field(point.clone(), uv ? [uv.getX(i), uv.getY(i)] : null), 'displacement') * amount;
    point.addScaledVector(normal, d); p.setXYZ(i, point.x, point.y, point.z);
  }
  g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere(); return g;
}
