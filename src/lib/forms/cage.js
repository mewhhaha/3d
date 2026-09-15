import * as THREE from 'three';
import { computeTangents } from '../tangents.js';

const average = points => points[0].map((_, k) => points.reduce((s, p) => s + p[k], 0) / points.length);
const mix = (a, b, t = .5) => a.map((v, k) => v * (1 - t) + b[k] * t);
const edgeKey = (a, b) => a < b ? `${a}:${b}` : `${b}:${a}`;
const pointOK = p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);

/** A shared geometric graph; UVs belong to face corners, not welded vertices. */
export function quadCage(points, faces) {
  if (!Array.isArray(points) || !points.length || !points.every(pointOK)) throw new Error('Cage needs finite 3D points');
  const value = { points: points.map(p => p.slice()), faces: faces.map((f, i) => ({
    ...f, vertices: [...(f.vertices || f)], tag: f.tag || `Patch${i}`,
    uv: f.uv?.map(p => p.slice()) || null,
  })) };
  topology(value); return value;
}

/** Reject ambiguous edges and disconnected vertex fans instead of smoothing invalid topology. */
export function topology(cage) {
  const edges = new Map(), incident = cage.points.map(() => []), neighbors = cage.points.map(() => new Set());
  cage.faces.forEach((face, fi) => {
    const v = face.vertices;
    if (v.length !== 4 || new Set(v).size !== 4 || v.some(i => !Number.isInteger(i) || i < 0 || i >= cage.points.length)) throw new Error('Expected four distinct valid vertex IDs per quad');
    if (face.uv && (face.uv.length !== 4 || !face.uv.every(p => p.length === 2 && p.every(Number.isFinite)))) throw new Error('Invalid face-varying UVs');
    v.forEach((a, k) => {
      incident[a].push(fi);
      const b = v[(k + 1) % 4], key = edgeKey(a, b);
      if (!edges.has(key)) edges.set(key, { a, b, faces: [] });
      const e = edges.get(key);
      if (e.faces.length >= 2 || (e.faces.length && e.a === a)) throw new Error('Non-manifold or inconsistent edge winding');
      e.faces.push(fi); neighbors[a].add(b); neighbors[b].add(a);
    });
  });
  const boundary = cage.points.map(() => []);
  for (const e of edges.values()) if (e.faces.length === 1) { boundary[e.a].push(e.b); boundary[e.b].push(e.a); }
  for (let i = 0; i < cage.points.length; i++) {
    if (!incident[i].length) throw new Error('Unused cage vertex');
    if (![0, 2].includes(boundary[i].length)) throw new Error('Non-manifold vertex boundary');
    const pending = new Set(incident[i]), queue = [incident[i][0]];
    while (queue.length) {
      const fi = queue.pop(); if (!pending.delete(fi)) continue;
      const v = cage.faces[fi].vertices, k = v.indexOf(i);
      for (const j of [v[(k + 1) % 4], v[(k + 3) % 4]]) queue.push(...edges.get(edgeKey(i, j)).faces.filter(f => pending.has(f)));
    }
    if (pending.size) throw new Error('Disconnected vertex fan');
  }
  return { edges, incident, neighbors, boundary };
}

/** Extrude a named quad into a limb. Rings share IDs at the socket; no intersecting tubes. */
export function growFace(cage, tag, rings, { name = tag } = {}) {
  const found = cage.faces.map((f, i) => f.tag === tag ? i : -1).filter(i => i >= 0);
  if (found.length !== 1 || !rings.length || rings.some(r => r.length !== 4 || !r.every(pointOK))) throw new Error('growFace needs one socket and four points per ring');
  if (cage.faces.some(f => f.uv)) throw new Error('Grow topology before laying out UV charts');
  const out = quadCage(cage.points, cage.faces), face = out.faces.splice(found[0], 1)[0];
  let previous = face.vertices;
  rings.forEach((ring, station) => {
    const current = ring.map(p => { out.points.push(p.slice()); return out.points.length - 1; });
    for (let k = 0; k < 4; k++) out.faces.push({ tag: `${name}_Ring${station}_Side${k}`, vertices: [previous[k], previous[(k + 1) % 4], current[(k + 1) % 4], current[k]], uv: null });
    previous = current;
  });
  out.faces.push({ tag: `${name}_Tip`, vertices: previous, uv: null });
  topology(out); return out;
}

/** Give each control face its own padded chart, shared by every subdivision level. */
export function atlasCage(cage, { size = 1024, gutter = 4 } = {}) {
  if (!Number.isInteger(size) || size < 64 || size > 2048 || !Number.isInteger(gutter) || gutter < 2) throw new Error('Invalid atlas settings');
  const out = quadCage(cage.points, cage.faces), columns = Math.ceil(Math.sqrt(out.faces.length));
  const cell = Math.floor(size / columns);
  if (cell - 2 * gutter < 8) throw new Error('Texture budget leaves fewer than eight texels per chart');
  out.faces.forEach((f, i) => {
    const x = (i % columns) * cell, y = Math.floor(i / columns) * cell;
    const a = (x + gutter) / size, b = (y + gutter) / size;
    const c = (x + cell - gutter) / size, d = (y + cell - gutter) / size;
    f.uv = [[a, b], [c, b], [c, d], [a, d]]; f.chart = i;
  });
  out.atlas = { size, gutter, columns, cell, charts: out.faces.length };
  return out;
}

/** Catmull-Clark geometry; bilinear face-varying UV refinement keeps identical chart domains. */
export function subdivideCage(cage, levels = 1) {
  if (!Number.isInteger(levels) || levels < 0 || levels > 5 || cage.faces.length * 4 ** levels > 250000) throw new Error('Subdivision exceeds level or face budget');
  let out = quadCage(cage.points, cage.faces); out.atlas = cage.atlas;
  for (let level = 0; level < levels; level++) {
    const { edges, incident, neighbors, boundary } = topology(out);
    const centers = out.faces.map(f => average(f.vertices.map(i => out.points[i])));
    const points = out.points.map((p, i) => {
      if (boundary[i].length) return p.map((x, k) => .75 * x + .125 * (out.points[boundary[i][0]][k] + out.points[boundary[i][1]][k]));
      const n = neighbors[i].size, f = average(incident[i].map(j => centers[j]));
      const e = average([...neighbors[i]].map(j => mix(p, out.points[j])));
      return p.map((x, k) => (f[k] + 2 * e[k] + (n - 3) * x) / n);
    });
    for (const edge of edges.values()) {
      edge.id = points.length;
      points.push(edge.faces.length === 1 ? mix(out.points[edge.a], out.points[edge.b])
        : average([out.points[edge.a], out.points[edge.b], ...edge.faces.map(i => centers[i])]));
    }
    const faceOffset = points.length; points.push(...centers);
    const faces = [];
    out.faces.forEach((face, fi) => {
      const v = face.vertices, uv = face.uv, centerUV = uv && average(uv);
      for (let k = 0; k < 4; k++) faces.push({ ...face,
        vertices: [v[k], edges.get(edgeKey(v[k], v[(k + 1) % 4])).id, faceOffset + fi, edges.get(edgeKey(v[(k + 3) % 4], v[k])).id],
        uv: uv && [uv[k], mix(uv[k], uv[(k + 1) % 4]), centerUV, mix(uv[(k + 3) % 4], uv[k])],
      });
    });
    out = { points, faces, atlas: out.atlas };
  }
  return out;
}

/** Angle-weighted geometric normals, including across disconnected UV charts. */
export function cageNormals(cage) {
  const normals = cage.points.map(() => new THREE.Vector3());
  for (const f of cage.faces) for (const ids of [[f.vertices[0], f.vertices[1], f.vertices[2]], [f.vertices[0], f.vertices[2], f.vertices[3]]]) {
    const p = ids.map(i => new THREE.Vector3(...cage.points[i]));
    const normal = p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0]));
    if (normal.lengthSq() < 1e-24) throw new Error('Collapsed cage triangle');
    normal.normalize();
    for (let k = 0; k < 3; k++) normals[ids[k]].addScaledVector(normal, p[(k + 1) % 3].clone().sub(p[k]).angleTo(p[(k + 2) % 3].clone().sub(p[k])));
  }
  return normals.map(n => n.normalize());
}

/** Evaluate relief once per geometric vertex: UV seams cannot open the skin. */
export function displaceCage(cage, field) {
  if (typeof field !== 'function') throw new TypeError('Expected a displacement field');
  const out = { ...cage, points: cage.points.map(p => p.slice()) }, normals = cageNormals(cage);
  out.points.forEach((p, i) => {
    const d = field(new THREE.Vector3(...p), normals[i].clone());
    if (!Number.isFinite(d) || Math.abs(d) > .02) throw new Error('Invalid cage displacement');
    for (let k = 0; k < 3; k++) p[k] += normals[i].getComponent(k) * d;
  });
  return out;
}

export function cageGeometry(cage) {
  const normals = cageNormals(cage), positions = [], uv = [], ns = [];
  for (const f of cage.faces) {
    if (!f.uv) throw new Error('Lay out UV charts before emitting geometry');
    for (const k of [0, 1, 2, 0, 2, 3]) { const i = f.vertices[k]; positions.push(...cage.points[i]); ns.push(...normals[i].toArray()); uv.push(...f.uv[k]); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(ns, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  computeTangents(g); g.userData.atlas = cage.atlas;
  g.computeBoundingBox(); g.computeBoundingSphere(); return g;
}
