import * as THREE from 'three';
import {radialProfileMaps} from '../radial-profile-maps.js';

const profiles={
 pink:['#ff9835','#ff477e','#e77ed9','#91d4c6'],
 cyan:['#ff5b30','#ffe067','#21cdcc','#699edc'],
 lime:['#fc5632','#f7d966','#87da9c','#38bfbe'],
 amber:['#ff5537','#ffd68b','#ee735a','#d2ead0'],
 white:['#ff9e48','#fff2bd','#d4eaa4','#87dddb'],
};
const palettes=new WeakMap();
/** Luminous bands are optical detail on a shallow lens, not individual toruses.
 * Palette-owned materials share maps inside a build; independent palettes never do.
 */
export function signalFaceMaterial(color,mats){
 let cache=palettes.get(mats);if(!cache){cache=new Map();palettes.set(mats,cache);}
 if(cache.has(color))return cache.get(color);
 const [core,inner,field,edge]=profiles[color]||profiles.cyan;
 const maps=radialProfileMaps({name:`Prism ${color} signal`,size:256,stops:[
  [0,core,.72],[.15,core,.84],[.24,'#fff0a7',1],[.30,inner,.88],
  [.42,inner,.85],[.48,'#fff0c7',1],[.515,field,.65],[.69,field,.58],
  [.72,'#fbe6d1',.95],[.755,field,.68],[.86,field,.45],
  [.89,'#fff5d8',.95],[.92,edge,.40],[1,edge,.24],
 ]});
 const m=new THREE.MeshStandardMaterial({name:`Prism ${color} / mapped signal lens`,...maps,color:'#ffffff',emissive:'#ffffff',emissiveIntensity:mats[color].emissiveIntensity*.48,roughness:.46,metalness:0});
 cache.set(color,m);return m;
}
/** Circular shallow cap with planar XY UVs. Housing/rim stay separate geometry.
 * This analytic lens has no normal map; the band pattern cannot create parallax.
 */
export function signalLensGeometry(radius,{depth=.011,segments=48,rings=4}={}){
 if(!Number.isFinite(radius)||radius<=0||!Number.isFinite(depth)||depth<0||!Number.isInteger(segments)||segments<8||segments>128||!Number.isInteger(rings)||rings<1||rings>16)throw new Error('Invalid signal lens');
 const p=[0,0,depth],n=[0,0,1],uv=[.5,.5],indices=[];
 for(let ring=1;ring<=rings;ring++)for(let j=0;j<segments;j++){
  const r=ring/rings,a=j/segments*Math.PI*2,x=Math.cos(a)*r*radius,y=Math.sin(a)*r*radius;
  p.push(x,y,depth*(1-r*r));n.push(...new THREE.Vector3(2*depth*x/(radius*radius),2*depth*y/(radius*radius),1).normalize().toArray());uv.push(.5+x/(2*radius),.5+y/(2*radius));
 }
 for(let j=0;j<segments;j++)indices.push(0,1+j,1+(j+1)%segments);
 for(let ring=1;ring<rings;ring++)for(let j=0;j<segments;j++){
  const a=1+(ring-1)*segments+j,b=1+(ring-1)*segments+(j+1)%segments,c=a+segments,d=b+segments;
  indices.push(a,c,d,a,d,b);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeBoundingBox();g.computeBoundingSphere();return g;
}
