import * as THREE from 'three';
import { surface, surfaceMesh, layers, grain, smooth } from './surface.js';
const TAU=2*Math.PI;
const stage=(kind,values)=>Object.freeze({kind,...values});
function range(v,a,b,name){if(!Number.isFinite(v)||v<a||v>b)throw new Error(`${name} must be ${a}..${b}`);return v;}
export const eyeball=({radius=.014}={})=>stage('eyeball',{radius:range(radius,.010,.018,'eye radius')});
export const eyelids=({openness=1,tilt=.05}={})=>stage('eyelids',{openness:range(openness,.4,1.2,'openness'),tilt:range(tilt,-.2,.2,'lid tilt')});
export const iris=({color='#67553b',pupil=.38}={})=>{if(!/^#[0-9a-f]{6}$/i.test(color))throw new Error('Invalid iris color');return stage('iris',{color,pupil:range(pupil,.2,.6,'pupil')});};
/** Orbital surface, separate sclera, iris and wet lid margin. Not a complete face. */
export function eye(...components){
 const values=Object.fromEntries([eyeball(),eyelids(),iris()].map(v=>[v.kind,v])),seen=new Set();
 for(const c of components){if(!c||!Object.hasOwn(values,c.kind)||seen.has(c.kind))throw new Error('Invalid or duplicate eye component');values[c.kind]=c;seen.add(c.kind);}return stage('eye',{parts:values});
}
function irisMap(color,pupil,size=256){
 const data=new Uint8Array(size*size*4);
 const rgb=[parseInt(color.slice(1,3),16),parseInt(color.slice(3,5),16),parseInt(color.slice(5,7),16)];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const px=(x+.5)/size*2-1,py=(y+.5)/size*2-1,r=Math.hypot(px,py),a=Math.atan2(py,px),i=(y*size+x)*4;
  const fiber=.74+.18*Math.sin(a*83+8*r)+.1*Math.sin(a*157-r*13),edge=1-.66*smooth((r-.83)/.15),inside=smooth((r-pupil)/.025);
  for(let k=0;k<3;k++)data[i+k]=Math.round(THREE.MathUtils.clamp(rgb[k]*fiber*edge*inside+6*(1-inside),0,255));data[i+3]=255;
 }
 const t=new THREE.DataTexture(data,size,size);t.colorSpace=THREE.SRGBColorSpace;t.flipY=false;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.needsUpdate=true;t.name='IrisColor';return t;
}
export function buildEye(component=eye(),{mode='baked',textureSize=256,skin='#b98770'}={}){
 if(component.kind!=='eye')throw new Error('buildEye requires an eye component');
 const {eyeball:ball,eyelids:lid,iris:irisSpec}=component.parts,r=ball.radius,scale=r/.014;
 const root=new THREE.Group();root.name='EyeStudy';
 const skinMaterial=new THREE.MeshStandardMaterial({color:skin,roughness:.64});skinMaterial.name='OrbitalSkin';
 const opening=u=>{const a=u*TAU,x=.0133*scale*Math.cos(a),s=Math.sin(a),y=scale*(s>=0?.0050:.0035)*s*lid.openness+x*lid.tilt;return new THREE.Vector3(x,y,Math.sqrt(Math.max(.000001,r*r-x*x-y*y))+.00023*scale);};
 const form=(u,v)=>{
  const a=u*TAU,outer=new THREE.Vector3(.032*scale*Math.cos(a),.023*scale*Math.sin(a),-.002*scale),inner=opening(u);
  const p=outer.lerp(inner,v);p.z+=.002*scale*Math.sin(Math.PI*v)*Math.max(0,Math.sin(a));return p;
 };
 const detail=layers(grain({amplitude:.000017*scale,frequency:36}),
  (u,v)=>-.00025*scale*Math.exp(-(((v-.70)/.05)**2))*Math.max(0,Math.sin(u*TAU))**.6,
  (u,v)=>-.00009*scale*Math.exp(-(((v-.78)/.04)**2))*Math.max(0,-Math.sin(u*TAU)));
 const chart=surface(form,{wrapU:true,detail:(u,v)=>detail(u,v)*smooth(v/.08)*smooth((1-v)/.10)});
 root.add(surfaceMesh('EyelidsAndOrbit',chart,{mode,textureSize,segments:[64,16],material:skinMaterial}));skinMaterial.dispose();
 const white=new THREE.MeshPhysicalMaterial({color:'#d1c5bf',roughness:.23,metalness:0});white.name='Sclera';
 const g=new THREE.SphereGeometry(r,48,24,0,TAU,.425,Math.PI-.425);g.rotateX(Math.PI/2);
 const sclera=new THREE.Mesh(g,white);sclera.name='Sclera';root.add(sclera);
 const radius=r*Math.sin(.425),irisGeometry=new THREE.CircleGeometry(radius,64);
 const irisMaterial=new THREE.MeshPhysicalMaterial({map:irisMap(irisSpec.color,irisSpec.pupil),roughness:.18,clearcoat:1,clearcoatRoughness:.08});irisMaterial.name='Iris';
 const disk=new THREE.Mesh(irisGeometry,irisMaterial);disk.name='Iris';disk.position.z=r*Math.cos(.425)+.000015;root.add(disk);
 const curve=new THREE.CatmullRomCurve3(Array.from({length:96},(_,i)=>opening(i/96)),true,'centripetal');
 const wetMaterial=new THREE.MeshPhysicalMaterial({color:'#a77470',roughness:.25,clearcoat:1});wetMaterial.name='LidMargin';
 const margin=new THREE.Mesh(new THREE.TubeGeometry(curve,128,.00016*scale,6,true),wetMaterial);margin.name='WetLidMargin';root.add(margin);
 root.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
 root.userData.provenance='Procedural orbital component; no reference image projection or scan';root.userData.representation=mode;return root;
}
