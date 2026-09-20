import * as THREE from 'three';
import {defineModel,group,mesh,box,material} from '../src/lib/modeling.js';
import source from './imported-xbot.js';
import {mountOnBone} from '../src/lib/bone-mount.js';
import {segmentFrame} from '../src/lib/reference-shot.js';
import {limbVolume,armorLeaf} from '../src/lib/cyber/contour-armor.js';
import {surfaceContourGeometry} from '../src/lib/surface-contour.js';
import {solidifyGeometry} from '../src/lib/surface-thickness.js';
import {radialProfileMaps} from '../src/lib/radial-profile-maps.js';
import {armorLook} from './armor-look.js';
import {fittedLimbSupport} from './armor-support.js';
import {defineFaceRegions} from '../src/lib/face-regions.js';
import {assignFaceMaterials} from '../src/lib/material-regions.js';

// Rough garment construction data, not new pose targets or a replacement rig.
export function dressBlockout(scene,{textured=false,pack=true}={}) {
 const mats=armorLook(textured),bones=n=>scene.getObjectByName('mixamorig'+n);
 const P=n=>bones(n).getWorldPosition(new THREE.Vector3());scene.updateMatrixWorld(true);
 const mounts=[],optics=new Map(),fits=[];
 const sourceSkin=scene.getObjectByName('Beta_Surface');
 const mount=(part,bone,frame=new THREE.Matrix4())=>{const holder=mountOnBone(scene,bones(bone),part,{frame});mounts.push(holder);return holder;};
 // Keep the existing skin as visible construction, only changing its owned look.
 scene.traverse(o=>{if(o.isSkinnedMesh){o.material.color.set(o.name==='Beta_Joints'?'#131c20':'#29363a');o.material.roughness=.76;}});
 // Keep the faceless head light for readable blockout, using existing face-region
 // materials without rewriting any skin vertex, UV, weight or index.
 const headIndex=sourceSkin.skeleton.bones.indexOf(bones('Head')),g=sourceSkin.geometry;
 const chosen=[];
 for(let f=0;f<g.index.count/3;f++){
  let weight=0;for(let j=0;j<3;j++){const i=g.index.getX(f*3+j);for(let k=0;k<4;k++)if(g.attributes.skinIndex.array[i*4+k]===headIndex)weight+=g.attributes.skinWeight.array[i*4+k];}
  if(weight>1.5)chosen.push(f);
 }
 defineFaceRegions(g,{Head:chosen},{clone:false});const withHead=assignFaceMaterials(g,{Head:1},{defaultMaterial:0});g.dispose();sourceSkin.geometry=withHead;
 sourceSkin.material=[sourceSkin.material,material('#b3aca0',{roughness:.8})];
 function plate(name,outline,support,bone){
  const surface=surfaceContourGeometry(support,{outline,rounding:.10,refinement:2});
  const g=solidifyGeometry(surface,{thickness:.005,offset:-1});surface.dispose();
  const o=mesh(g,{name,material:mats.shell});mount(o,bone);return o;
 }
 const shape=[[.08,.35],[.13,.80],[.33,.99],[.70,.98],[.93,.78],[.98,.36],[.79,.08],[.57,.18],[.47,.06],[.28,.10]];
 // Broad central chest volume; a tapered gap leaves the black waist readable.
 const chest=P('Spine2');
 plate('Chest carapace',shape,(u,v)=>[(u-.5)*.30,chest.y-.08+v*.22,.102+.060*(1-(2*u-1)**2)*Math.sin(Math.PI*v)],'Spine2');
 const hip=P('Hips');
 for(const side of [-1,1]){
  const s=side>0?'Left':'Right';
  plate(s+' iliac wing',shape,(u,v)=>[side*(.05+u*.11),hip.y-.03+(v-.5)*.14,.065+.085*Math.sin(Math.PI*u)*Math.sin(Math.PI*v)],'Hips');
  // Each limb shares a support and an attachment frame; only the boundaries
  // and radii differ. Geometry resolution is intentionally modest.
  const specs=[
   ['Arm','ForeArm','Upper arm',.072,.058,.066,.052,.13,.86],
   ['ForeArm','Hand','Forearm',.069,.049,.069,.052,.13,.88],
   ['UpLeg','Leg','Thigh',.120,.077,.115,.078,.12,.83],
   ['Leg','Foot','Shin',.086,.051,.093,.054,.13,.90],
  ];
  for(const [from,to,label,rx0,rx1,rz0,rz1,start,end] of specs){
   const a=P(s+from),b=P(s+to),length=a.distanceTo(b),basis=segmentFrame(a.toArray(),b.toArray(),{referenceLength:length});
   const frame=new THREE.Matrix4().compose(basis.position,basis.quaternion,new THREE.Vector3(1,1,1));
   const base=limbVolume({length,radii:[[0,rx0,rz0],[.35,rx0*1.06,rz0],[1,rx1,rz1]]});
   const support=fittedLimbSupport(sourceSkin,bones(s+from),frame,base,{length});fits.push(support.fit);
   const parts=group(s+' '+label+' armor');
   const panelOutline=[[.38,start],[.29,start+.10],[.28,.55],[.33,end-.06],[.44,end],[.57,end],[.69,end-.08],[.73,.54],[.70,start+.11],[.62,start],[.56,start+.045],[.44,start+.045]];
   const front=surfaceContourGeometry(support,{outline:panelOutline,rounding:.12,cornerSegments:2,refinement:2});
   const solid=solidifyGeometry(front,{thickness:.005,offset:-1});front.dispose();
   parts.add(mesh(solid,{name:s+' '+label+' front',material:mats.shell}));
   // Rear sliver is separate; no rigid shell spans an elbow or knee.
   parts.add(armorLeaf(support,{name:s+' '+label+' rear',start:start+.04,end:end-.06,left:[[0,.025],[1,.06]],right:[[0,.18],[.5,.22],[1,.15]],segments:[4,8],thickness:.004,material:mats.shell}));
   mount(parts,s+from,frame);
  }
 }
 function optic(name,r,color,position,bone,direction=[0,0,1]){
  if(!optics.has(color)){
   const maps=radialProfileMaps({name:'Blockout '+color,size:128,stops:[[0,'#ffb42b',.9],[.18,'#ff8530',.8],[.25,'#fff3a5',.8],[.29,color,1],[.60,color,.85],[.64,'#eee9dc',0],[.69,color,.7],[.80,'#162e32',0],[1,'#142326',0]]});
   optics.set(color,material('#ffffff',{...maps,roughness:.4,emissive:'#ffffff',emissiveIntensity:.7}));
  }
  const part=group(name);
  const housing=new THREE.CylinderGeometry(r,r*.96,.021,32);housing.rotateX(Math.PI/2);
  part.add(mesh(housing,{name:name+' bezel',material:mats.edge}));
  part.add(mesh(new THREE.CircleGeometry(r*.92,32),{name:name+' mapped lens',position:[0,0,.012],material:optics.get(color)}));
  part.position.copy(position);part.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...direction).normalize());
  mount(part,bone);
 }
 for(const side of [-1,1]){
  const s=side>0?'Left':'Right',shoulder=P(s+'Arm');
  const shell=new THREE.SphereGeometry(1,16,10,0,Math.PI*2,0,Math.PI*.78);shell.scale(.076,.077,.070);shell.translate(...shoulder.clone().add(new THREE.Vector3(side*.020,0,.008)).toArray());
  mount(mesh(shell,{name:s+' shoulder cap',material:mats.shell}),s+'Arm');
  optic(s+' shoulder signal',.044,side>0?'#ff42ba':'#6affb4',shoulder.clone().add(new THREE.Vector3(side*.045,.025,.064)),s+'Arm');
  optic(s+' knee signal',.037,'#ff6932',P(s+'Leg').add(new THREE.Vector3(0,0,.066)),s+'Leg');
  const ankle=P(s+'Foot');
  const boot=box({name:s+' toe shell',size:[.136,.063,.29],radius:.022,segments:2,position:ankle.clone().add(new THREE.Vector3(0,-.024,.086)).toArray(),material:mats.shell});mount(boot,s+'Foot');
  mount(box({name:s+' orange sole',size:[.141,.021,.302],radius:.008,segments:1,position:ankle.clone().add(new THREE.Vector3(0,-.070,.086)).toArray(),material:mats.orange}),s+'Foot');
 }
 if(pack){
  const packFrame=new THREE.Matrix4().makeTranslation(0,chest.y,-.205),back=group('Reactor blockout');
  back.add(box({name:'Backpack spine',size:[.18,.30,.12],radius:.025,segments:2,material:mats.dark}));mount(back,'Spine2',packFrame);
  optic('Backpack reactor',.147,'#ff42ba',new THREE.Vector3(.105,chest.y+.01,-.26),'Spine2',[1,0,-.25]);
  for(const [i,color]of ['#ff52b4','#b5ef59','#39d9df'].entries()){
   const x=.06+i*.045,route=[[x,chest.y-.10,-.25],[x+.11,chest.y-.34,-.34],[x+.16,chest.y-.52,-.31],[x+.23,chest.y-.36,-.27],[x+.10,chest.y-.03,-.24]];
   const curve=new THREE.CatmullRomCurve3(route.map(p=>new THREE.Vector3(...p)));
   mount(mesh(new THREE.TubeGeometry(curve,40,.006,6,false),{name:'Backpack cable '+i,material:material(color,{emissive:color,emissiveIntensity:.5,roughness:.45})}),'Spine2');
  }
 }
 scene.userData.armorBlockout={mounts:mounts.map(m=>m.name),fits,pose:'unchanged upright clip',surface:textured?'generated color samples':'plain PBR',scope:'rigid rough shells; no automatic fit or collision guarantee'};
 return scene;
}
export default defineModel({id:'prism-armor-blockout',title:'Upright rig / coarse fitted costume',parameters:{armor:{type:'boolean',default:true},textured:{type:'boolean',default:true},pack:{type:'boolean',default:true}},build:p=>{
 const scene=source.build({form:'tailored'});if(p.armor)dressBlockout(scene,p);return scene;
}});
