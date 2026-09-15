import * as THREE from 'three';
import { compactGeometry } from '../compact-geometry.js';
import { group, material, mesh } from '../modeling.js';
import { guideCurve, railSurface, compileSurface } from '../shape-rails.js';

import { cacheSurface } from '../surface-cache.js';
import { partitionSurface, matchBoundary, surfaceEdge, edgeDerivative } from '../surface-boundary.js';
import { prismHairGuides, prismFringeGuides } from './hair-guides.js';
/** Flow along a crown-to-cut guide. The cut, scalp volume and fibers are separate. */
export function bobGuides({guides=prismHairGuides, fringeGuides=prismFringeGuides, join=true}={}) {
 const rails=Object.values(guides).map(points=>guideCurve(points));
 if(!join){const curtain=railSurface(rails),fringe=railSurface(fringeGuides.map(points=>guideCurve(points)));return{curtain,fringe:(u,v)=>fringe(1-u,v)};}
 const fraction=.47,oldCurtain=cacheSurface(railSurface(rails),{segments:[192,192]});
 const front=fringeGuides.slice(1,-1).map(points=>guideCurve(points));
 const around=cacheSurface(railSurface([...rails.map(r=>v=>r(v*fraction)),...front],{closed:true}),{segments:[192,192],wrapU:true});
 const split=(rails.length-1)/(rails.length+front.length);
 const patches=partitionSurface(around,[{name:'crown',end:split},{name:'fringe',end:1}]);
 const lowerBase=(u,v)=>oldCurtain(u,fraction+v*(1-fraction));
 const lower=matchBoundary(lowerBase,{edge:'v0',curve:surfaceEdge(patches.crown,'v1'),inward:edgeDerivative(patches.crown,'v1',{scale:-(1-fraction)/fraction}),width:.38});
 const curtain=(u,v)=>v<=fraction?patches.crown(u,v/fraction):lower(u,(v-fraction)/(1-fraction));
 return {curtain,fringe:patches.fringe};
}
export function hairFibers({count=52,depth=.000065}={}){
 if(!Number.isInteger(count)||count<1||count>256||!Number.isFinite(depth)||depth<0||depth>.003)throw new Error('Invalid fiber density or depth');
 return (u,v)=>depth*(.65*Math.cos(2*Math.PI*(u*count+.06*Math.sin(v*7)))+.35*Math.cos(2*Math.PI*u*count*2))*Math.sin(Math.PI*v)**2;
}
function fiberAlbedo(count,{fringe=false}={}){
 const width=512,height=256,bytes=new Uint8Array(width*height*4);
 const stops=(fringe?[[0,'#507d7f'],[.4,'#78b492'],[1,'#b3d17d']]:[[0,'#507d7f'],[.35,'#85b89a'],[.57,'#c4d98b'],[.78,'#ffc670'],[1,'#ff7838']]).map(([t,c])=>[t,new THREE.Color(c)]);
 for(let j=0;j<height;j++)for(let i=0;i<width;i++){
  const u=i/(width-1),v=j/(height-1);let k=0;while(k<stops.length-2&&v>stops[k+1][0])k++;
  const [a,ca]=stops[k],[b,cb]=stops[k+1],c=ca.clone().lerp(cb,(v-a)/(b-a));
  const line=(.5+.5*Math.cos(2*Math.PI*(u*count+.06*Math.sin(v*7))))**18;
  c.multiplyScalar(1-.19*line*Math.sin(Math.PI*v*.85)).convertLinearToSRGB();bytes.set([c.r*255,c.g*255,c.b*255,255],(j*width+i)*4);
 }
 const t=new THREE.DataTexture(bytes,width,height);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;t.name='Authored strand-direction gradient';return t;
}
/** Low/high/baked share one authored support. Texture detail never drives the cut. */
export function guidedBob({ mode='cage', textureSize=512, ...shape }={}) {
 const root=group('Prismatic bob'),guides=bobGuides(shape);
 for(const [key,support]of Object.entries(guides)){
  const fringe=key==='fringe',count=fringe?16:52,map=fiberAlbedo(count,{fringe});
  const mat=material('#ffffff',{map,roughness:.60,metalness:0,side:THREE.DoubleSide,emissive:'#ffffff',emissiveMap:map,emissiveIntensity:.035});
  mat.name='Prism / '+key+' fibers';
  // Keep seams identical in geometry; fine strands are material/normal detail, not independent edge displacement.
  const cut=support;
  const object=compileSurface('Guided '+key,cut,{mode,segments:fringe?[48,32]:[128,48],refinement:3,textureSize,detail:hairFibers({count}),material:mat});
  const original=object.geometry;object.geometry=compactGeometry(original);original.dispose();root.add(object);
 }
 // Close only the small crown opening with a geometric fan, not a collapsed UV chart.
 const ring=Array.from({length:64},(_,i)=>guides.curtain(i/63,0)),center=ring.reduce((a,p)=>a.map((x,k)=>x+p[k]/ring.length),[0,0,0]);center[1]+=.003;
 const geo=new THREE.BufferGeometry(),pos=[...center,...ring.flat()],idx=[];
 for(let i=0;i<ring.length;i++)idx.push(0,1+i,1+(i+1)%ring.length);
 geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute([.5,.5,...ring.flatMap((_,i)=>[i/ring.length,0])],2));geo.setIndex(idx);geo.computeVertexNormals();
 root.add(mesh(geo,{name:'Crown closure',material:material('#82a5a0',{roughness:.6,side:THREE.DoubleSide})}));
 root.userData.groom={method:'periodic crown-to-cut support, partitioned into matching charts; no reference projection',mode};return root;
}
