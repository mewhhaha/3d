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
function roundedLoop(authored,rounding,cornerSegments){
 let points=authored.map(p=>[...p]);
 if(rounding){
  points=[];
  for(let i=0;i<authored.length;i++){
   const p=authored[i],a=authored[(i+authored.length-1)%authored.length],b=authored[(i+1)%authored.length];
   const start=p.map((v,k)=>v+(a[k]-v)*rounding),end=p.map((v,k)=>v+(b[k]-v)*rounding);
   for(let j=0;j<=cornerSegments;j++){const t=j/cornerSegments;points.push(p.map((v,k)=>(1-t)**2*start[k]+2*t*(1-t)*v+t*t*end[k]));}
  }
  validateLoop(points);
 }
 return points;
}
const onSegment=(a,b,p)=>Math.abs(cross(a,b,p))<1e-12&&p[0]>=Math.min(a[0],b[0])-1e-12&&p[0]<=Math.max(a[0],b[0])+1e-12&&p[1]>=Math.min(a[1],b[1])-1e-12&&p[1]<=Math.max(a[1],b[1])+1e-12;
function loopsTouch(a,b){
 for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
  const p=a[i],q=a[(i+1)%a.length],r=b[j],s=b[(j+1)%b.length];
  if(cross(p,q,r)*cross(p,q,s)<0&&cross(r,s,p)*cross(r,s,q)<0||onSegment(p,q,r)||onSegment(p,q,s)||onSegment(r,s,p)||onSegment(r,s,q))return true;
 }
 return false;
}
function inside(p,loop){
 let result=false;
 for(let i=0,j=loop.length-1;i<loop.length;j=i++){
  const a=loop[i],b=loop[j];
  if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])result=!result;
 }
 return result;
}
function validateDomain(outline,holes){
 for(let i=0;i<holes.length;i++){
  if(loopsTouch(outline,holes[i])||!inside(holes[i][0],outline))throw new Error('surfaceContour: hole must lie strictly inside outline');
  for(let j=0;j<i;j++)if(loopsTouch(holes[i],holes[j])||inside(holes[i][0],holes[j])||inside(holes[j][0],holes[i]))throw new Error('surfaceContour: holes must be disjoint, non-nested and not touching');
 }
}
/** A UV-domain contour with optional independent interior aperture loops.
 * Triangulate in 2D, refine shared edges there, THEN evaluate the curved support.
 * Generates fresh topology/UVs, not a transfer from an existing mesh.
 * Rounding is a fraction of adjacent UV edges, not a physical bevel radius.
 * One exterior; disjoint non-nested holes. Caller owns support regularity.
 */
export function surfaceContourGeometry(support,{outline,holes=[],refinement=3,rounding=0,cornerSegments=4,offset=0}={}){
 if(typeof support!=='function'||!Number.isInteger(refinement)||refinement<0||refinement>6||!Number.isFinite(rounding)||rounding<0||rounding>.35||!Number.isInteger(cornerSegments)||cornerSegments<1||cornerSegments>12||!Number.isFinite(offset))throw new Error('surfaceContour: invalid support, resolution, rounding or offset');
 validateLoop(outline);
 if(!Array.isArray(holes)||holes.length>16)throw new Error('surfaceContour: holes must be an array of at most 16 loops');
 holes.forEach(validateLoop);validateDomain(outline,holes);
 const authored=outline.map(p=>[...p]),authoredHoles=holes.map(loop=>loop.map(p=>[...p]));
 const outer=roundedLoop(authored,rounding,cornerSegments),inner=authoredHoles.map(loop=>roundedLoop(loop,rounding,cornerSegments));
 validateDomain(outer,inner);
 if(area(outer)<0)outer.reverse();for(const hole of inner)if(area(hole)>0)hole.reverse();
 const uv=[...outer,...inner.flat()];
 let faces=THREE.ShapeUtils.triangulateShape(outer.map(p=>new THREE.Vector2(...p)),inner.map(loop=>loop.map(p=>new THREE.Vector2(...p))));
 let sum=0;for(const f of faces){if(cross(...f.map(i=>uv[i]))<0)[f[1],f[2]]=[f[2],f[1]];sum+=cross(...f.map(i=>uv[i]))/2;}
 const domainArea=area(outer)+inner.reduce((total,loop)=>total+area(loop),0);
 if(Math.abs(sum-domainArea)>1e-9||faces.length!==uv.length+2*inner.length-2)throw new Error('surfaceContour: incomplete triangulation');
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
 g.userData.surfaceContour={...(authoredHoles.length?{holes:authoredHoles,boundaryLoops:1+authoredHoles.length}:{}),outline:authored,refinement,rounding,cornerSegments,offset,boundaryCount,topology:'new chart triangulation; rebind external anchors/weights/correspondence',parameterization:'support UV; shape intent independent of refinement'};
 return g;
}
