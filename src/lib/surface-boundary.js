import * as THREE from 'three';
const EDGES = new Set(['u0', 'u1', 'v0', 'v1']);
const point = (p) => {
  if (!Array.isArray(p) || p.length !== 3 || !p.every(Number.isFinite)) throw new TypeError('Surface point must have three finite coordinates');
  return p;
};
const uv = (edge, t) => edge[0] === 'u' ? [Number(edge[1]), t] : [t, Number(edge[1])];
const checked = (fn, edge) => { if (typeof fn !== 'function' || !EDGES.has(edge)) throw new TypeError('A surface and u0/u1/v0/v1 edge are required'); };
/** An exact shared edge with an independent parameter range. No camera or mesh resolution involved. */
export function surfaceEdge(surface, edge, { from = 0, to = 1 } = {}) {
  checked(surface, edge);
  if (![from, to].every(Number.isFinite) || Math.min(from,to) < 0 || Math.max(from,to) > 1 || from === to) throw new RangeError('Edge range must be distinct values in [0,1]');
  return t => point(surface(...uv(edge, THREE.MathUtils.lerp(from, to, t))));
}
/** Fit a patch boundary to another curve, with C2-vanishing influence outside a strip.
 * Positions meet exactly. Optional inward derivative matches the transverse tangent.
 * Mesh indices are not welded; singularities and collisions still need separate checks.
 * Apply after primary sculpting and before thickness, UV sampling or detail baking.
 */
export function matchBoundary(surface, { edge, curve, inward = null, width = .25 } = {}) {
  checked(surface, edge);
  if ((inward !== null && typeof inward !== 'function') || typeof curve !== 'function' || !Number.isFinite(width) || width <= 0 || width > 1) throw new RangeError('Boundary requires a curve and width in (0,1]');
  return (u, v) => {
    if (![u,v].every(n => Number.isFinite(n) && n >= 0 && n <= 1)) throw new RangeError('Surface coordinates must be in [0,1]');
    const t = edge[0] === 'u' ? v : u, a = edge[0] === 'u' ? u : v;
    const distance = edge[1] === '0' ? a : 1-a;
    const original = point(surface(u,v));
    if (distance >= width) return original.slice();
    const source = point(surface(...uv(edge,t))), target = point(curve(t));
    const s = distance / width, blend = 1 - s*s*s*(10 + s*(-15 + 6*s));
    let slope = [0,0,0];
    if (inward) {
      const h = 1e-5, corner = uv(edge,t), axis = edge[0] === 'u' ? 0 : 1;
      corner[axis] += edge[1] === '0' ? h : -h;
      const next = point(surface(...corner)), desired = point(inward(t));
      slope = desired.map((d,i) => d-(next[i]-source[i])/h);
    }
    return original.map((p,i) => p + blend*(target[i]-source[i] + distance*slope[i]));
  };
}
/** Measure two evaluated boundaries independently of tessellation or beauty lighting. */
export function boundaryGap(a, b, { samples = 129 } = {}) {
  if (typeof a !== 'function' || typeof b !== 'function' || !Number.isInteger(samples) || samples < 2 || samples > 10000) throw new TypeError('Two curves and 2..10000 samples required');
  let sum = 0, max = 0;
  for (let i = 0; i < samples; i++) {
    const p = point(a(i/(samples-1))), q = point(b(i/(samples-1)));
    const d = Math.hypot(...p.map((x,j)=>x-q[j])); sum += d*d; max = Math.max(max,d);
  }
  return { samples, rmsMeters: Math.sqrt(sum/samples), maxMeters: max, scope: 'Position continuity only; not topology welding, normal continuity or collision safety' };
}

/** The derivative directed into a patch, in normalized-domain units. */
export function edgeDerivative(surface, edge, { from = 0, to = 1, scale = 1 } = {}) {
 checked(surface,edge);surfaceEdge(surface,edge,{from,to});
 if (!Number.isFinite(scale)) throw new TypeError('Finite derivative scale required');
 return t => {
  const at = uv(edge,THREE.MathUtils.lerp(from,to,t)), next=at.slice(), h=1e-5;
  next[edge[0]==='u'?0:1] += edge[1]==='0'?h:-h;
  const a=point(surface(...at)),b=point(surface(...next));return b.map((v,i)=>(v-a[i])*scale/h);
 };
}
/** Partition ONE continuous support into material/UV patches; boundaries cannot drift apart.
 * Cuts are named increasing intervals spanning [0,1]. Each patch has a local [0,1] domain.
 */
export function partitionSurface(surface, cuts, { axis = 'u' } = {}) {
 if (typeof surface!=='function' || !['u','v'].includes(axis) || !Array.isArray(cuts) || cuts.length<1) throw new TypeError('Surface, named cuts and u/v axis required');
 let previous=0;const names=new Set(),result={};
 for(const {name,end} of cuts){
  if(typeof name!=='string'||!name||names.has(name)||!Number.isFinite(end)||end<=previous||end>1)throw new RangeError('Partition intervals must be increasing, unique named cuts');
  const start=previous;names.add(name);previous=end;
  result[name]=(u,v)=>{if(![u,v].every(n=>Number.isFinite(n)&&n>=0&&n<=1))throw new RangeError('Patch coordinates must be in [0,1]');return point(axis==='u'?surface(start+u*(end-start),v):surface(u,start+v*(end-start)));};
 }
 if(previous!==1)throw new RangeError('Partition must end at 1');return Object.freeze(result);
}

/** Cubic Hermite span between corresponding curves, u along each edge, v across
 * the gap. Tangents are dP/dv in the SAME direction at both ends (not two inward
 * normals). Omitting them yields a ruled/linear span. This is a new support,
 * not a weld, automatic loop matching, UV transfer or collision repair.
 */
export function bridgeSurface(start, end, { tangentStart = null, tangentEnd = null } = {}) {
 if (typeof start !== 'function' || typeof end !== 'function' ||
     [tangentStart,tangentEnd].some(f=>f!==null&&typeof f!=='function')) throw new TypeError('Bridge edges and optional tangents must be functions');
 return (u,v) => {
  if(![u,v].every(n=>Number.isFinite(n)&&n>=0&&n<=1))throw new RangeError('Bridge coordinates must be in [0,1]');
  const a=point(start(u)),b=point(end(u));
  if(v===0)return a.slice();if(v===1)return b.slice();
  const chord=b.map((x,i)=>x-a[i]);
  if(!tangentStart&&!tangentEnd)return point(a.map((x,i)=>x+v*chord[i]));
  const ta=tangentStart?point(tangentStart(u)):chord,tb=tangentEnd?point(tangentEnd(u)):chord;
  const v2=v*v,v3=v2*v;
  return point(a.map((x,i)=>(2*v3-3*v2+1)*x+(v3-2*v2+v)*ta[i]+(-2*v3+3*v2)*b[i]+(v3-v2)*tb[i]));
 };
}
