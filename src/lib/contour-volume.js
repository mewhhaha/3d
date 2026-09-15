import * as THREE from 'three';
import { mesh } from './modeling.js';
import { guideCurve, shapeProfile } from './shape-rails.js';
/** Loft a closed XZ footprint through named-height cross sections, with real caps.
 * Sections: {height, scale:[x,z], offset:[x,z]}. Values are physical meters.
 * Intended for simple star-shaped contours; this does not boolean or repair folds.
 */
export function contourVolume({name='Contour volume',outline,sections,segments=80,layers=16,material}={}){
 if(!Array.isArray(outline)||outline.length<3||outline.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))throw new TypeError('A closed XZ contour requires at least three 2D points');
 if(!Array.isArray(sections)||sections.length<2||!Number.isInteger(segments)||segments<8||segments>256||!Number.isInteger(layers)||layers<1||layers>128)throw new TypeError('Invalid volume sections or resolution');
 let area=0;for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length];area+=a[0]*b[1]-a[1]*b[0];}
 if(Math.abs(area)<1e-12)throw new RangeError('Footprint has zero signed area');
 // Counter-clockwise XZ points with descending cross product convention handled below.
 const points=(area>0?outline:[...outline].reverse()).map(([x,z])=>[x,0,z]),loop=guideCurve(points,{closed:true});
 const s=sections.map((p,i)=>{const scale=p.scale||[1,1],offset=p.offset||[0,0];if(!Number.isFinite(p.height)||i&&p.height<=sections[i-1].height||scale.length!==2||offset.length!==2||!scale.every(n=>Number.isFinite(n)&&n>0)||!offset.every(Number.isFinite))throw new RangeError('Sections need increasing heights, positive scales and finite offsets');return{height:p.height,scale,offset};});
 const bottom=s[0].height,top=s.at(-1).height;
 const scalar=(key,axis)=>shapeProfile(s.map(p=>[(p.height-bottom)/(top-bottom),p[key][axis]]));
 const sx=scalar('scale',0),sz=scalar('scale',1),ox=scalar('offset',0),oz=scalar('offset',1);
 const pos=[],uv=[],ids=[],n=segments+1;
 for(let j=0;j<=layers;j++)for(let i=0;i<=segments;i++){
  const v=j/layers,p=loop(i/segments);pos.push(p[0]*sx(v)+ox(v),bottom+v*(top-bottom),p[2]*sz(v)+oz(v));uv.push(i/segments,v);
 }
 // Increasing contour parameter x increasing height yields inward normal in XZ, so reverse.
 for(let j=0;j<layers;j++)for(let i=0;i<segments;i++){const a=j*n+i,b=a+1,c=b+n,d=a+n;ids.push(a,d,b,b,d,c);}
 const rim=(j,up)=>{
  const ring=[];let x=0,z=0;
  for(let i=0;i<segments;i++){const k=(j*n+i)*3;ring.push([pos[k],pos[k+1],pos[k+2]]);x+=pos[k]/segments;z+=pos[k+2]/segments;}
  const center=pos.length/3;pos.push(x,ring[0][1],z);uv.push(.5,.5);
  for(const p of ring){pos.push(...p);uv.push(.5+p[0],.5+p[2]);}
  for(let i=0;i<segments;i++){const a=center+1+i,b=center+1+(i+1)%segments;ids.push(center,...(up?[b,a]:[a,b]));}
 };
 rim(0,false);rim(layers,true);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();
 // Weld shading, not UV coordinates, at the periodic seam.
 for(let j=0;j<=layers;j++){const a=j*n,b=a+segments,normal=new THREE.Vector3().fromBufferAttribute(g.attributes.normal,a).add(new THREE.Vector3().fromBufferAttribute(g.attributes.normal,b)).normalize();g.attributes.normal.setXYZ(a,...normal.toArray());g.attributes.normal.setXYZ(b,...normal.toArray());}
 const root=mesh(g,{name,material});root.userData.construction={method:'closed footprint with smoothly varying cross sections',sections:s.length,closedCaps:true};return root;
}
