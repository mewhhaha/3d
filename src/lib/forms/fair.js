import * as THREE from 'three';
import { computeMikkTSpaceTangents } from 'three/addons/utils/BufferGeometryUtils.js';
import * as MikkTSpace from 'three/addons/libs/mikktspace.module.js';
/** Local fairing mask. Overlapping regions use max, not additive over-smoothing. */
export function jointRegion({ center, radius }) {
  if(!Array.isArray(center)||center.length!==3||!center.every(Number.isFinite)||!Array.isArray(radius)||radius.length!==3||!radius.every(v=>Number.isFinite(v)&&v>0))throw new Error('Invalid fairing region');
  return p=>Math.exp(-2*((p[0]-center[0])**2/radius[0]**2+(p[1]-center[1])**2/radius[1]**2+(p[2]-center[2])**2/radius[2]**2));
}
export const unionRegions=(...regions)=>p=>Math.max(0,...regions.map(r=>r(p)));
/** Weld a geometric graph while keeping UV/material corners independent. Not retopology. */
export function fairJoin(meshes,{region=()=>1,iterations=12,tolerance=1e-7}={}){
  if(!Number.isInteger(iterations)||iterations<0||iterations>512)throw new Error('Invalid fairing iterations');
  const ids=new Map(),nodes=[],corners=[];
  for(const mesh of meshes){
    const g=mesh.geometry;if(g.index)throw new Error('fairJoin expects non-indexed UV corners');
    const p=g.attributes.position,mapping=[];
    for(let i=0;i<p.count;i++){
      const xyz=[p.getX(i),p.getY(i),p.getZ(i)],key=xyz.map(x=>Math.round(x/tolerance)).join(',');let id=ids.get(key);
      if(id===undefined){id=nodes.length;ids.set(key,id);nodes.push({p:xyz,neighbors:new Set(),weight:Math.max(0,Math.min(1,region(xyz)))});}mapping.push(id);
    }
    for(let i=0;i<mapping.length;i+=3)for(let k=0;k<3;k++){const a=mapping[i+k],b=mapping[i+(k+1)%3];nodes[a].neighbors.add(b);nodes[b].neighbors.add(a);}
    corners.push({g,mapping});
  }
  const neighbors=nodes.map(n=>[...n.neighbors]),positions=nodes.map(n=>n.p.slice()),next=positions.map(p=>p.slice());
  const active=nodes.map((n,i)=>i).filter(i=>nodes[i].weight>=.001&&neighbors[i].length);
  const weights=neighbors.map((list,i)=>{
    const p=positions[i],w=list.map(j=>{const q=positions[j];return 1/Math.max(Math.hypot(q[0]-p[0],q[1]-p[1],q[2]-p[2]),1e-6);});
    const total=w.reduce((a,b)=>a+b,0);return w.map(a=>a/total);
  });
  for(let it=0;it<iterations;it++)for(const lambda of [.5,-.53]){
    for(const i of active){
      const p=positions[i],list=neighbors[i],w=weights[i];let x=0,y=0,z=0;
      for(let k=0;k<list.length;k++){const q=positions[list[k]];x+=q[0]*w[k];y+=q[1]*w[k];z+=q[2]*w[k];}
      const factor=lambda*nodes[i].weight;
      next[i][0]=p[0]+factor*(x-p[0]);next[i][1]=p[1]+factor*(y-p[1]);next[i][2]=p[2]+factor*(z-p[2]);
    }
    for(const i of active){positions[i][0]=next[i][0];positions[i][1]=next[i][1];positions[i][2]=next[i][2];}
  }
  const normals=nodes.map(()=>new THREE.Vector3());
  for(const {mapping}of corners)for(let i=0;i<mapping.length;i+=3){
    const p=[0,1,2].map(k=>new THREE.Vector3(...positions[mapping[i+k]]));
    const normal=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])).normalize();
    for(let k=0;k<3;k++){
      const a=p[(k+1)%3].clone().sub(p[k]).normalize(),b=p[(k+2)%3].clone().sub(p[k]).normalize();
      normals[mapping[i+k]].addScaledVector(normal,Math.acos(Math.max(-1,Math.min(1,a.dot(b)))));
    }
  }
  normals.forEach(n=>n.normalize());
  for(const {g,mapping}of corners){
    for(let i=0;i<mapping.length;i++){const id=mapping[i];g.attributes.position.setXYZ(i,...positions[id]);g.attributes.normal.setXYZ(i,...normals[id].toArray());}
    if(g.attributes.tangent)computeMikkTSpaceTangents(g,MikkTSpace,true);
    g.attributes.position.needsUpdate=g.attributes.normal.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
  }
  return {geometricVertices:nodes.length,iterations};
}
/** Lookup actual high-mesh normals through corresponding, non-overlapping UV charts. */
export function normalSampler(geometry,{bins=64}={}){
  const uv=geometry.attributes.uv,n=geometry.attributes.normal,lookup=new Map();
  for(let i=0;i<uv.count;i+=3){
    const u=[0,1,2].map(k=>uv.getX(i+k)),v=[0,1,2].map(k=>uv.getY(i+k));
    for(let y=Math.max(0,Math.floor(Math.min(...v)*bins));y<=Math.min(bins-1,Math.floor(Math.max(...v)*bins));y++)for(let x=Math.max(0,Math.floor(Math.min(...u)*bins));x<=Math.min(bins-1,Math.floor(Math.max(...u)*bins));x++){
      const key=y*bins+x;if(!lookup.has(key))lookup.set(key,[]);lookup.get(key).push(i);
    }
  }
  return(u,v)=>{
    const candidates=lookup.get(Math.min(bins-1,Math.max(0,Math.floor(v*bins)))*bins+Math.min(bins-1,Math.max(0,Math.floor(u*bins))))||[];
    for(const i of candidates){
      const ax=uv.getX(i),ay=uv.getY(i),bx=uv.getX(i+1),by=uv.getY(i+1),cx=uv.getX(i+2),cy=uv.getY(i+2),area=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);
      if(Math.abs(area)<1e-14)continue;const a=((by-cy)*(u-cx)+(cx-bx)*(v-cy))/area,b=((cy-ay)*(u-cx)+(ax-cx)*(v-cy))/area;
      if(a<-.00001||b<-.00001||a+b>1.00001)continue;
      return new THREE.Vector3().fromBufferAttribute(n,i).multiplyScalar(a).addScaledVector(new THREE.Vector3().fromBufferAttribute(n,i+1),b).addScaledVector(new THREE.Vector3().fromBufferAttribute(n,i+2),1-a-b).normalize();
    }
    throw new Error(`High surface has no corresponding UV triangle at ${u},${v}`);
  };
}
