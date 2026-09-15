import * as THREE from 'three';
import { mesh } from './modeling.js';
import { surface, surfaceMesh } from './forms/surface.js';

const finite = (n, label) => { if (!Number.isFinite(n)) throw new TypeError(`${label} must be finite`); return n; };
const vec = p => {
  if (!Array.isArray(p) || p.length !== 3 || !p.every(Number.isFinite)) throw new TypeError('A guide point needs three finite coordinates');
  return new THREE.Vector3(...p);
};
const unit = t => { finite(t, 'parameter'); return THREE.MathUtils.clamp(t, 0, 1); };
/** Shape-preserving cubic scalar curve. No per-station flat spots or overshoot.
 * Values have physical units; station positions are normalized. */
export function shapeProfile(stations) {
  if (!Array.isArray(stations) || stations.length < 2 || stations[0][0] !== 0 || stations.at(-1)[0] !== 1) throw new Error('Profile needs endpoints at 0 and 1');
  const keys = stations.map(([t, value], i) => {
    finite(t, 'station'); finite(value, 'value');
    if (i && t <= stations[i - 1][0]) throw new Error('Profile stations must increase');
    return [t, value];
  });
  const h = [], d = [], m = [];
  for (let i = 0; i < keys.length - 1; i++) { h.push(keys[i + 1][0] - keys[i][0]); d.push((keys[i + 1][1] - keys[i][1]) / h[i]); }
  m[0] = d[0]; m[keys.length - 1] = d.at(-1);
  for (let i = 1; i < keys.length - 1; i++) {
    const a = d[i - 1], b = d[i], w0 = 2 * h[i] + h[i - 1], w1 = h[i] + 2 * h[i - 1];
    m[i] = a * b <= 0 ? 0 : (w0 + w1) / (w0 / a + w1 / b);
  }
  return t => {
    t = unit(t); let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
    const s = (t - keys[i][0]) / h[i], s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * keys[i][1] + (s3 - 2 * s2 + s) * h[i] * m[i]
      + (-2 * s3 + 3 * s2) * keys[i + 1][1] + (s3 - s2) * h[i] * m[i + 1];
  };
}
/** Authored 3D guide, independent of render resolution. Does not depend on a camera. */
export function guideCurve(points, { closed = false } = {}) {
  if (!Array.isArray(points) || points.length < 2) throw new Error('Guide needs at least two points');
  const data = points.map(vec);
  for (let i = 1; i < data.length; i++) if (data[i].distanceToSquared(data[i - 1]) < 1e-18) throw new Error('Consecutive guide points coincide');
  const curve = new THREE.CatmullRomCurve3(data, closed, 'centripetal');
  return t => { t = unit(t); if (t === 0) return data[0].toArray(); if (t === 1) return data[closed ? 0 : data.length - 1].toArray(); return curve.getPoint(t).toArray(); };
}
/** C1 loft across ordered guides. Rail spacing, not triangle count, defines shape.
 * The output is a regular surface function (u across, v along). */
export function railSurface(rails, { closed = false } = {}) {
  if (!Array.isArray(rails) || rails.length < (closed ? 3 : 2) || rails.some(r => typeof r !== 'function')) throw new Error('Loft requires ordered guide functions');
  const n = rails.length, at = (i, v) => vec(rails[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))](v));
  return (u, v) => {
    u = unit(u); v = unit(v); const x = u * (closed ? n : n - 1), i = Math.min(Math.floor(x), closed ? n - 1 : n - 2), t = x - i;
    const a = at(i, v), b = at(i + 1, v);
    const ma = (closed || i > 0) ? b.clone().sub(at(i - 1, v)).multiplyScalar(.5) : b.clone().sub(a);
    const mb = (closed || i < n - 2) ? at(i + 2, v).sub(a).multiplyScalar(.5) : b.clone().sub(a);
    return a.multiplyScalar(2*t*t*t-3*t*t+1).addScaledVector(ma,t*t*t-2*t*t+t)
      .addScaledVector(b,-2*t*t*t+3*t*t).addScaledVector(mb,t*t*t-t*t).toArray();
  };
}
/** Restrict a surface between two authored boundary curves in its parameter domain.
 * Useful for shaped armor edges and hair partings; no vertex-selection bookkeeping. */
export function surfaceBand(support, { left = () => 0, right = () => 1, start = 0, end = 1 } = {}) {
  if (![support,left,right].every(f => typeof f === 'function') || !(start >= 0 && end <= 1 && end > start)) throw new Error('Invalid surface band');
  return (u, v) => {
    v = THREE.MathUtils.lerp(start, end, unit(v)); const a = left(v), b = right(v);
    if (![a,b].every(Number.isFinite) || a < 0 || b > 1 || a >= b) throw new Error('Band boundaries cross or leave the chart');
    return support(THREE.MathUtils.lerp(a,b,unit(u)),v);
  };
}
/** One regular chart compiles into high geometry or identical low/baked geometry.
 * Uses the existing evaluated-normal/MikkTSpace baker, not grayscale bump. */
export function compileSurface(name, support, { detail = () => 0, mode = 'cage', segments = [48,32], refinement = 3, textureSize = 256, material } = {}) {
  const chart = surface(support, { detail });
  return surfaceMesh(name, chart, { mode, segments, subdivision: refinement, textureSize, material });
}
/** Give an open chart a physical inner skin and closed rims. UVs remain on both sides.
 * This is an offset shell, not automatic intersection repair or a bevel operation. */
export function thickenSurface(name, support, { thickness = .003, segments = [32,24], material } = {}) {
  if (!(finite(thickness,'thickness') > 0)) throw new Error('Shell thickness must be positive');
  const [nu,nv] = segments;
  if (![nu,nv].every(n=>Number.isInteger(n)&&n>=2&&n<=256)) throw new Error('Shell segments must be integers 2..256');
  const chart=surface(support), positions=[], normals=[], uv=[], index=[], size=(nu+1)*(nv+1);
  for(let side=0;side<2;side++)for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){
    const u=i/nu,v=j/nv,n=chart.normal(u,v),p=chart.point(u,v).addScaledVector(n,-side*thickness);
    positions.push(...p.toArray());normals.push(...n.multiplyScalar(side?-1:1).toArray());uv.push(u,v);
  }
  const q=(a,b,c,d)=>index.push(a,b,c,a,c,d);
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+1,c=b+nu+1,d=c-1;q(a,b,c,d);q(a+size,d+size,c+size,b+size);}
  // Duplicate rim corners for hard normals, but positions coincide with the skins.
  const rim=(a,b)=>{const ids=[a,a+size,b+size,b],base=positions.length/3;
    for(const id of ids){positions.push(...positions.slice(id*3,id*3+3));normals.push(0,0,0);}
    uv.push(0,0,0,1,1,1,1,0);q(base+3,base+2,base+1,base);
  };
  for(let i=0;i<nu;i++){rim(i+1,i);const a=nv*(nu+1)+i;rim(a,a+1);}
  for(let j=0;j<nv;j++){const a=j*(nu+1);rim(a,a+nu+1);rim(a+2*nu+1,a+nu);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();
  // Restore exact differential outer/inner normals; rim normals remain geometric.
  for(let i=0;i<size*2;i++)g.attributes.normal.setXYZ(i,...normals.slice(i*3,i*3+3));
  const result=mesh(g,{name,material});result.userData.construction={method:'normal-offset parametric shell',thickness};return result;
}
