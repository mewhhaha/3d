import * as THREE from 'three';
/** Refine long interior edges, keeping boundary samples unchanged for neighboring charts. */
export function refinePatch(geometry,{passes=8}={}){
 const p=geometry.attributes.position,uv=geometry.attributes.uv;
 if(!Number.isInteger(passes)||passes<0||passes>12)throw new Error('Invalid refinement passes');
 if(Object.keys(geometry.attributes).some(k=>!['position','normal','uv'].includes(k)))throw new Error('Refine before assigning tangents or skin attributes');
 if(geometry.index||!uv)throw new Error('refinePatch needs non-indexed positions and UVs');
 const keys=new Map(),points=[],coords=[],faces=[];
 for(let i=0;i<p.count;i+=3){const face=[];for(let k=0;k<3;k++){
  const j=i+k,q=[p.getX(j),p.getY(j),p.getZ(j)],t=[uv.getX(j),uv.getY(j)],key=[...q,...t].join(',');let id=keys.get(key);
  if(id===undefined){id=points.length;keys.set(key,id);points.push(q);coords.push(t);}face.push(id);
 }faces.push(face);}
 const edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
 const edgeMap=()=>{const map=new Map();for(const face of faces)for(let k=0;k<3;k++){
  const a=face[k],b=face[(k+1)%3],key=edgeKey(a,b);if(!map.has(key))map.set(key,{a,b,count:0});map.get(key).count++;
 }return map;};
 const length=(a,b)=>Math.hypot(...points[a].map((v,k)=>v-points[b][k]));
 const boundary=[...edgeMap().values()].filter(e=>e.count===1);if(!boundary.length)return geometry;
 const target=2*boundary.reduce((s,e)=>s+length(e.a,e.b),0)/boundary.length;
 for(let pass=0;pass<passes;pass++){
  const mids=new Map();for(const[key,e]of edgeMap())if(e.count===2&&length(e.a,e.b)>target){
   const id=points.length;points.push(points[e.a].map((v,k)=>(v+points[e.b][k])/2));coords.push(coords[e.a].map((v,k)=>(v+coords[e.b][k])/2));mids.set(key,id);
  }
  if(!mids.size)break;
  const next=[];
  for(const[a,b,c]of faces){const ab=mids.get(edgeKey(a,b)),bc=mids.get(edgeKey(b,c)),ca=mids.get(edgeKey(c,a));
   const flags=[ab,bc,ca].map(v=>v!==undefined),count=flags.filter(Boolean).length;
   if(!count){next.push([a,b,c]);continue;}
   if(count===3){next.push([a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]);continue;}
   if(count===1){if(flags[0])next.push([a,ab,c],[ab,b,c]);else if(flags[1])next.push([b,bc,a],[bc,c,a]);else next.push([c,ca,b],[ca,a,b]);continue;}
   if(!flags[2])next.push([b,bc,ab],[a,ab,c],[ab,bc,c]);
   else if(!flags[0])next.push([c,ca,bc],[b,bc,a],[bc,ca,a]);
   else next.push([a,ab,ca],[c,ca,b],[ca,ab,b]);
  }
  faces.splice(0,faces.length,...next);
  if(faces.length>100000)throw new Error('Patch refinement exceeded triangle budget');
 }
 const positions=[],uvs=[];for(const face of faces)for(const i of face){positions.push(...points[i]);uvs.push(...coords[i]);}
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.deleteAttribute('normal');geometry.computeVertexNormals();return geometry;
}
/** Move an overlying chart in front of an analytic sphere, without changing its opening. */
export function clearSphere(point,radius,clearance=.0003){
 const d=radius*radius-point.x*point.x-point.y*point.y;
 if(d>0)point.z=Math.max(point.z,Math.sqrt(d)+clearance);
 return point;
}
