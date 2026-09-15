import * as THREE from 'three';
import {refinePatch} from './refine.js';
import { computeTangents } from '../tangents.js';
/** A local fairing region. Composition uses max so overlapping regions do not oversmooth. */
export function jointRegion({ center, radius }) {
  if(!Array.isArray(center)||center.length!==3||!center.every(Number.isFinite)||!Array.isArray(radius)||radius.length!==3||!radius.every(v=>Number.isFinite(v)&&v>0))throw new Error('Invalid fairing region');
  return p=>Math.exp(-2*((p[0]-center[0])**2/radius[0]**2+(p[1]-center[1])**2/radius[1]**2+(p[2]-center[2])**2/radius[2]**2));
}
export const unionRegions=(...regions)=>p=>Math.max(0,...regions.map(r=>r(p)));
/** Weld the geometric graph while retaining separate UV/material corners. Not retopology. */
export function fairJoin(meshes,{region=()=>1,iterations=12,tolerance=1e-7,method='fair'}={}){
  if(!['fair','relax'].includes(method))throw new Error('Unknown joint smoothing method');
  if(!Number.isInteger(iterations)||iterations<0||iterations>512)throw new Error('Invalid fairing iterations');
  const ids=new Map(),nodes=[],corners=[];
  for(const mesh of meshes){
    const g=mesh.geometry;
    const uv=g.attributes.uv;if(!g.attributes.tangent&&uv&&uv.array.some(v=>v!==uv.array[0]))refinePatch(g);
    if(g.index)throw new Error('fairJoin expects non-indexed UV corners');
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
  for(let it=0;it<iterations;it++)for(const lambda of (method==='fair'?[.5,-.53]:[.5])){
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
    if(g.attributes.tangent)computeTangents(g);
    g.attributes.position.needsUpdate=g.attributes.normal.needsUpdate=true;g.computeBoundingBox();g.computeBoundingSphere();
  }
  return {geometricVertices:nodes.length,iterations,method};
}
/** UV lookup with optional, bounded edge extension for slightly different LOD hole outlines. */
export function normalSampler(geometry,{bins=64,edgePadding=geometry.userData.uvBoundaryPadding||0}={}){
  if(!Number.isInteger(bins)||bins<1||bins>256||!Number.isFinite(edgePadding)||edgePadding<0||edgePadding>.05)throw new Error('Invalid UV sampler settings');
  const uv=geometry.attributes.uv,n=geometry.attributes.normal,lookup=new Map();
  const cell=t=>Math.min(bins-1,Math.max(0,Math.floor(t*bins)));
  for(let i=0;i<uv.count;i+=3){
    const u=[0,1,2].map(k=>uv.getX(i+k)),v=[0,1,2].map(k=>uv.getY(i+k));
    for(let y=cell(Math.min(...v));y<=cell(Math.max(...v));y++)for(let x=cell(Math.min(...u));x<=cell(Math.max(...u));x++){
      const key=y*bins+x;if(!lookup.has(key))lookup.set(key,[]);lookup.get(key).push(i);
    }
  }
  const stats={samples:0,edgeSamples:0,maxEdgeDistance:0};
  const normal=(i,w)=>new THREE.Vector3().fromBufferAttribute(n,i).multiplyScalar(w[0])
    .addScaledVector(new THREE.Vector3().fromBufferAttribute(n,i+1),w[1])
    .addScaledVector(new THREE.Vector3().fromBufferAttribute(n,i+2),w[2]).normalize();
  const sample=(u,v)=>{
    if(!Number.isFinite(u)||!Number.isFinite(v))throw new Error('Invalid UV sample');
    stats.samples++;
    const candidates=lookup.get(cell(v)*bins+cell(u))||[];
    for(const i of candidates){
      const ax=uv.getX(i),ay=uv.getY(i),bx=uv.getX(i+1),by=uv.getY(i+1),cx=uv.getX(i+2),cy=uv.getY(i+2),area=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);
      if(Math.abs(area)<1e-14)continue;const a=((by-cy)*(u-cx)+(cx-bx)*(v-cy))/area,b=((cy-ay)*(u-cx)+(ax-cx)*(v-cy))/area;
      if(a<-.00001||b<-.00001||a+b>1.00001)continue;
      return normal(i,[a,b,1-a-b]);
    }
    // Only extend a real high-mesh edge by a declared UV tolerance. Large holes still fail.
    if(edgePadding){
      const nearby=new Set();
      for(let y=cell(v-edgePadding);y<=cell(v+edgePadding);y++)for(let x=cell(u-edgePadding);x<=cell(u+edgePadding);x++)
        for(const i of lookup.get(y*bins+x)||[])nearby.add(i);
      let best=edgePadding**2,hit=null;
      for(const i of nearby)for(let k=0;k<3;k++){
        const j=(k+1)%3,ax=uv.getX(i+k),ay=uv.getY(i+k),dx=uv.getX(i+j)-ax,dy=uv.getY(i+j)-ay,d=dx*dx+dy*dy;
        if(d<1e-16)continue;const t=Math.max(0,Math.min(1,((u-ax)*dx+(v-ay)*dy)/d));
        const distance=(u-ax-dx*t)**2+(v-ay-dy*t)**2;
        if(distance<=best){best=distance;const w=[0,0,0];w[k]=1-t;w[j]=t;hit={i,w};}
      }
      if(hit){stats.edgeSamples++;stats.maxEdgeDistance=Math.max(stats.maxEdgeDistance,Math.sqrt(best));return normal(hit.i,hit.w);}
    }
    throw new Error(`High surface has no corresponding UV triangle at ${u},${v}`);
  };
  sample.stats=stats;return sample;
}
