import * as THREE from 'three';
import { quadCage, topology, cageNormals, subdivideCage } from './cage.js';
const v = p => new THREE.Vector3(...p);
const point = p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);
const checkPoint = p => { if(!point(p))throw new Error('Expected a finite three-vector'); return p.slice(); };
const maskOK = mask => {if(typeof mask!=='function')throw new Error('Expected a selection mask');return mask;};
const compact = r => r>=1 ? 0 : (1-r*r)**3;
const amount = n => {if(!Number.isFinite(n))throw new Error('Brush amount must be finite');return n;};
const weight = (mask,p,n,meta) => {const w=mask(p,n,meta);if(!Number.isFinite(w)||w<0||w>1)throw new Error('Selection weight must be 0..1');return w;};

/** Smooth compact-support selection. Outside the radius, vertices are unchanged exactly. */
export function ball({at=[0,0,0],radius=1}={}) {
  const c=checkPoint(at),r=typeof radius==='number'?[radius,radius,radius]:checkPoint(radius);
  if(!r.every(x=>Number.isFinite(x)&&x>0))throw new Error('Brush radius must be positive');
  return p=>compact(Math.sqrt(p.reduce((s,x,k)=>s+((x-c[k])/r[k])**2,0)));
}
/** Name-based mask; '*' is the only wildcard. Tags come from incident control faces. */
export function region(pattern) {
  if(typeof pattern!=='string'||!pattern.length)throw new Error('Region needs a tag pattern');
  const re=new RegExp('^'+pattern.split('*').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*')+'$');
  return (_p,_n,meta)=>meta.tags.some(t=>re.test(t))?1:0;
}
export function facing(direction=[0,0,1]) {
  const d=v(checkPoint(direction));if(d.lengthSq()===0)throw new Error('Facing direction is zero');d.normalize();
  return (_p,n)=>Math.max(0,Math.min(1,n[0]*d.x+n[1]*d.y+n[2]*d.z));
}
export function intersect(...masks){masks.forEach(maskOK);return(...args)=>masks.reduce((a,m)=>a*m(...args),1);}
export function union(...masks){masks.forEach(maskOK);return(...args)=>Math.max(0,...masks.map(m=>m(...args)));}
export function invert(mask){maskOK(mask);return(...args)=>1-mask(...args);}
/** Reflect a spatial mask without doubling strength on the symmetry plane. Named tags are not renamed. */
export function mirrorMask(mask,axis='x'){
  maskOK(mask);const k='xyz'.indexOf(axis);if(k<0||axis.length!==1)throw new Error('Mirror axis must be x/y/z');
  return(p,n,meta)=>{const q=p.slice(),normal=n.slice();q[k]*=-1;normal[k]*=-1;return Math.max(mask(p,n,meta),mask(q,normal,meta));};
}
/** Continuous polyline distance, optionally projected into a plane for surface strokes. */
export function stroke(points,{radius=.01,plane='xyz'}={}) {
  if(!Array.isArray(points)||points.length<2||!Number.isFinite(radius)||radius<=0||!['xyz','xy','xz','yz'].includes(plane))throw new Error('Invalid sculpt stroke');
  const axes=[...'xyz'].map((a,i)=>plane.includes(a)?i:-1).filter(i=>i>=0),p=points.map(checkPoint);
  const segments=p.slice(1).map((b,i)=>{const a=p[i],d=b.map((x,k)=>axes.includes(k)?x-a[k]:0),length=d.reduce((s,x)=>s+x*x,0);if(length<1e-20)throw new Error('Repeated stroke points');return {a,d,length};});
  return q=>{
    let distance=Infinity;
    for(const {a,d,length} of segments){const t=Math.max(0,Math.min(1,axes.reduce((s,k)=>s+(q[k]-a[k])*d[k],0)/length));const d2=axes.reduce((s,k)=>s+(q[k]-a[k]-t*d[k])**2,0);distance=Math.min(distance,d2);}
    return compact(Math.sqrt(distance)/radius);
  };
}
const operation=(kind,mask,options={})=>Object.freeze({kind,mask:maskOK(mask),...options});
export const pull=(mask,offset)=>operation('pull',mask,{offset:checkPoint(offset)});
export const inflate=(mask,distance)=>operation('inflate',mask,{distance:amount(distance)});
export function flatten(mask,{at,normal,strength=.5}){
  const n=v(checkPoint(normal));if(n.lengthSq()===0||!Number.isFinite(strength)||!(strength>=0&&strength<=1))throw new Error('Invalid flatten brush');
  return operation('flatten',mask,{at:checkPoint(at),normal:n.normalize().toArray(),strength});
}
export function relax(mask,{strength=.35,iterations=3,preserveBoundary=true}={}){
  if(!Number.isFinite(strength)||strength<0||strength>1||!Number.isInteger(iterations)||iterations<1||iterations>100)throw new Error('Invalid relax brush');
  return operation('relax',mask,{strength,iterations,preserveBoundary});
}

/** Sequential non-destructive sculpt operations on shared vertices, before UV splits or skin binding.
 * Connectivity, tags and corner UVs survive. Not a remesher, collision solver, or rig refitter.
 */
export function sculpt(cage,...operations) {
  let out=quadCage(cage.points,cage.faces);out.atlas=cage.atlas;
  const graph=topology(out),tags=graph.incident.map(fs=>[...new Set(fs.map(i=>out.faces[i].tag))]);
  for(const op of operations.flat()){
    if(!op||!['pull','inflate','flatten','relax'].includes(op.kind))throw new Error('Unknown sculpt operation');
    for(let step=0;step<(op.iterations||1);step++){
      const normals=cageNormals(out).map(n=>n.toArray()),before=out.points;
      out.points=before.map((p,i)=>{
        const w=weight(op.mask,p.slice(),normals[i].slice(),{index:i,tags:tags[i]});
        if(w===0)return p.slice();
        let delta;
        if(op.kind==='pull')delta=op.offset;
        else if(op.kind==='inflate')delta=normals[i].map(x=>x*op.distance);
        else if(op.kind==='flatten'){const d=p.reduce((s,x,k)=>s+(op.at[k]-x)*op.normal[k],0);delta=op.normal.map(x=>x*d*op.strength);}
        else {
          if(op.preserveBoundary&&graph.boundary[i].length)return p.slice();
          const neighbors=[...graph.neighbors[i]];
          delta=p.map((x,k)=>(neighbors.reduce((s,j)=>s+before[j][k],0)/neighbors.length-x)*op.strength);
        }
        const q=p.map((x,k)=>x+w*delta[k]);if(!point(q))throw new Error('Sculpt produced invalid coordinates');return q;
      });
    }
  }
  cageNormals(out); // Reject collapsed triangles, not just valid indices.
  return out;
}

/** Closed cube-sphere seed with shared quad topology. Radii and location are in meters. */
export function ellipsoidCage({radii=[1,1,1],at=[0,0,0],level=3}={}) {
  const r=checkPoint(radii),c=checkPoint(at);if(r.some(x=>x<=0)||!Number.isInteger(level)||level<1||level>4)throw new Error('Invalid ellipsoid seed');
  const cube=quadCage([[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],[[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]].map((vertices,i)=>({vertices,tag:['Back','Front','Bottom','Top','Left','Right'][i]})));
  const seed=subdivideCage(cube,level);
  seed.points=seed.points.map(p=>{const n=v(p).normalize();return n.toArray().map((x,k)=>c[k]+x*r[k]);});return seed;
}
