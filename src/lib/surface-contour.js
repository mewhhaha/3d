import * as THREE from 'three';
import { surface } from './forms/surface.js';

const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const area=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2;
function validateLoop(points){
 if(!Array.isArray(points)||points.length<3||points.length>512||points.some(p=>!Array.isArray(p)||p.length!==2||p.some(x=>!Number.isFinite(x)||x<0||x>1)))throw new Error('surfaceContour: simple outline needs 3..512 UV points in [0,1]');
 const eps=1e-12,on=(a,b,c)=>Math.abs(cross(a,b,c))<eps&&c[0]>=Math.min(a[0],b[0])-eps&&c[0]<=Math.max(a[0],b[0])+eps&&c[1]>=Math.min(a[1],b[1])-eps&&c[1]<=Math.max(a[1],b[1])+eps;
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];
  if(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-8)throw new Error('surfaceContour: repeated boundary point');
  for(let j=i+1;j<points.length;j++){
   if(j===i+1||i===0&&j===points.length-1)continue;
   const c=points[j],d=points[(j+1)%points.length];
   if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b))throw new Error('surfaceContour: self-intersecting or touching outline');
  }
 }
 if(Math.abs(area(points))<1e-10)throw new Error('surfaceContour: zero area');
}
/** A simple UV-domain contour sampled on a regular parametric support.
 * Triangulate in 2D, refine shared edges there, THEN evaluate the curved support.
 * Generates fresh topology/UVs, not a transfer from an existing mesh. Holes are not supported.
 * rounding is a fraction of adjacent UV edges, not a physical bevel radius.
 */
export function surfaceContourGeometry(support,{outline,refinement=3,rounding=0,cornerSegments=4,offset=0}={}){
 if(typeof support!=='function'||!Number.isInteger(refinement)||refinement<0||refinement>6||!Number.isFinite(rounding)||rounding<0||rounding>.35||!Number.isInteger(cornerSegments)||cornerSegments<1||cornerSegments>12||!Number.isFinite(offset))throw new Error('surfaceContour: invalid support, resolution, rounding or offset');
 validateLoop(outline);
 const authored=outline.map(p=>[...p]);let uv=authored.map(p=>[...p]);
 if(rounding){
  uv=[];
  for(let i=0;i<authored.length;i++){
   const p=authored[i],a=authored[(i+authored.length-1)%authored.length],b=authored[(i+1)%authored.length];
   const start=p.map((v,k)=>v+(a[k]-v)*rounding),end=p.map((v,k)=>v+(b[k]-v)*rounding);
   for(let j=0;j<=cornerSegments;j++){const t=j/cornerSegments;uv.push(p.map((v,k)=>(1-t)**2*start[k]+2*t*(1-t)*v+t*t*end[k]));}
  }
  validateLoop(uv);
 }
 if(area(uv)<0)uv.reverse();
 let faces=THREE.ShapeUtils.triangulateShape(uv.map(p=>new THREE.Vector2(...p)),[]);
 let sum=0;for(const f of faces){if(cross(...f.map(i=>uv[i]))<0)[f[1],f[2]]=[f[2],f[1]];sum+=cross(...f.map(i=>uv[i]))/2;}
 if(Math.abs(sum-area(uv))>1e-9||faces.length!==uv.length-2)throw new Error('surfaceContour: incomplete triangulation');
 if(faces.length*4**refinement>250000)throw new Error('surfaceContour: resolution exceeds 250000 triangles');
 const boundaryCount=uv.length;
 for(let level=0;level<refinement;level++){
  const mids=new Map(),mid=(a,b)=>{const key=a<b?`${a}:${b}`:`${b}:${a}`;if(mids.has(key))return mids.get(key);const id=uv.length;uv.push(uv[a].map((x,k)=>(x+uv[b][k])/2));mids.set(key,id);return id;};
  const next=[];
  for(const [a,b,c] of faces){const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);next.push([a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]);}
  faces=next;
 }
 const chart=surface(support),positions=[],normals=[];
 for(const [u,v] of uv){const n=chart.normal(u,v),p=chart.point(u,v).addScaledVector(n,offset);positions.push(...p.toArray());normals.push(...n.toArray());}
 // Fail before export if a folded/singular support collapses a sampled triangle.
 const p=i=>new THREE.Vector3(...positions.slice(i*3,i*3+3));
 for(const [a,b,c] of faces)if(p(b).sub(p(a)).cross(p(c).sub(p(a))).lengthSq()<1e-24)throw new Error('surfaceContour: support collapses a triangle');
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv.flat(),2));g.setIndex(faces.flat());g.computeBoundingBox();g.computeBoundingSphere();
 g.userData.surfaceContour={outline:authored,refinement,rounding,cornerSegments,offset,boundaryCount,topology:'new chart triangulation; rebind external anchors/weights/correspondence',parameterization:'support UV; shape intent independent of refinement'};
 return g;
}
