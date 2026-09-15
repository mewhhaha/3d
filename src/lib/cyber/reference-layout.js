import * as THREE from 'three';
import { group, sphere, material } from '../modeling.js';
import { referenceCamera, landmarkGuide, mountSegment } from '../reference-shot.js';
import { liftOnSphere } from '../reference-constraints.js';
import { exoArm, exoLeg, shellTorso, reactorBackpack } from './android.js';
import { worldSocket, routeSockets } from '../assembly-sockets.js';
import { animePortrait, prismBob } from './portrait.js';
import { cyberMaterials, link, cableLoom, routedCable } from './mechanics.js';
const V=a=>new THREE.Vector3(...a), D=THREE.MathUtils.degToRad;
/** Manually interpreted attachment locations, NOT measured skeleton ground truth.
 * Depths are independent hypotheses in meters toward the reference camera. */
export const prismAnchors={
  chest:{pixel:[381,316],depth:-.07}, pelvis:{pixel:[320,579],depth:.05},
  shoulderNear:{pixel:[490,291],depth:.04},elbowNear:{pixel:[458,444],depth:.08},wristNear:{pixel:[392,635],depth:.23},
  shoulderFar:{pixel:[300,379],depth:-.40},elbowFar:{pixel:[227,517],depth:-.30},wristFar:{pixel:[206,675],depth:-.25},
  hipNear:{pixel:[359,585],depth:.12},kneeNear:{pixel:[412,859],depth:.11},ankleNear:{pixel:[466,1172],depth:.17},
  hipFar:{pixel:[271,568],depth:-.16},kneeFar:{pixel:[295,863],depth:-.16},ankleFar:{pixel:[382,1156],depth:-.12},
  head:{pixel:[314,178],depth:-.02},reactor:{pixel:[542,344],depth:-.14},
};
export function prismGuide({overrides={}}={}){
 const g=landmarkGuide(referenceCamera({target:[0,1.03,0]}),prismAnchors,overrides);
 const solve=(child,parent,length)=>{g.points[child]=liftOnSphere(g.camera,overrides[child]?.pixel||prismAnchors[child].pixel,g.point(parent),length,{...g.image,depth:overrides[child]?.depth??prismAnchors[child].depth});};
 solve('shoulderFar','shoulderNear',.40);solve('hipFar','hipNear',.235);
 for(const side of ['Near','Far']){solve('elbow'+side,'shoulder'+side,.25);solve('wrist'+side,'elbow'+side,.30);solve('knee'+side,'hip'+side,.43);solve('ankle'+side,'knee'+side,.45);}
 return g;
}
const reset=o=>{o.removeFromParent();o.position.set(0,0,0);o.quaternion.identity();o.scale.set(1,1,1);return o;};
function bodyFacing(g){return V(g.point('shoulderNear')).sub(V(g.point('shoulderFar'))).cross(V(g.point('chest')).sub(V(g.point('pelvis')))).normalize().toArray();}
function bodyMount(part,g){part.position.y=-1.465;return mountSegment(part,g.point('chest'),g.point('pelvis'),{name:'BodyGesture',referenceLength:1.465-.991,width:.88,forward:bodyFacing(g)});}
function footMount(foot,ankle,forward){
 const toe=foot.getObjectByName('Rounded toe armor');if(toe){toe.scale.y=.021;toe.position.y=.009;}const collar=foot.getObjectByName('Ankle ceramic collar');if(collar){collar.scale.x=.82;collar.scale.z=.72;}
 const g=group(foot.name+' planted'),f=V(forward);f.y=0;f.normalize();g.position.copy(V(ankle));g.position.y=.155+.0435*1.6;g.position.addScaledVector(f,.037);
 g.rotation.y=Math.atan2(f.x,f.z);foot.scale.set(1.02,1.6,1.25);g.add(foot);return g;
}
/** Identical mounts drive a cheap volume study and the detailed assembly. No per-image vertex projection. */
export function posedAndroid({stage='assembly',detail='hero',shell='#dbdac4',glow=.7,cables=true,overrides={}}={}){
 if(!['gesture','masses','assembly'].includes(stage))throw new Error('Unknown construction stage');
 const g=prismGuide({overrides}),m=cyberMaterials({shell,glow}),root=group('Android'),forward=bodyFacing(g),level=detail==='hero'?1:0;
 const farMat=material('#536d76',{roughness:.75}),nearMat=material('#d6c6ac',{roughness:.7});
 if(stage==='assembly')root.add(bodyMount(shellTorso({detail:level},m),g));
 else {
  root.add(link({name:'Torso mass',from:g.point('chest'),to:g.point('pelvis'),radius:stage==='gesture'?.012:.12,endRadius:stage==='gesture'?.012:.14,material:nearMat}));
  root.add(link({name:'Shoulder axis',from:g.point('shoulderNear'),to:g.point('shoulderFar'),radius:.010,material:m.cyan}));
  root.add(link({name:'Hip axis',from:g.point('hipNear'),to:g.point('hipFar'),radius:.010,material:m.orange}));
 }
 for(const [side,suffix] of [[1,'Near'],[-1,'Far']]){
  const p=n=>g.point(n+suffix),mat=side>0?nearMat:farMat;
  if(stage==='assembly'){
   const leg=exoLeg({side,detail:level},m),knee=leg.getObjectByName(side>0?'Knee.L':'Knee.R'),foot=knee.getObjectByName(side>0?'Boot.L':'Boot.R');
   reset(foot);reset(knee);reset(leg);
   root.add(mountSegment(leg,p('hip'),p('knee'),{name:'Hip.'+(side>0?'Near':'Far'),referenceLength:.428,width:.91,forward}));
   root.add(mountSegment(knee,p('knee'),p('ankle'),{name:'Knee.'+suffix,referenceLength:.329,width:.95,forward}));
   root.add(footMount(foot,p('ankle'),forward));
   const arm=exoArm({side,detail:level},m),elbow=arm.getObjectByName(side>0?'Elbow.L':'Elbow.R'),hand=elbow.getObjectByName(side>0?'ServoHand.L':'ServoHand.R');
   reset(hand);reset(elbow);reset(arm);
   root.add(mountSegment(arm,p('shoulder'),p('elbow'),{name:'Shoulder.'+suffix,referenceLength:.242,width:.94,forward}));
   root.add(mountSegment(elbow,p('elbow'),p('wrist'),{name:'Elbow.'+suffix,referenceLength:.225,width:.98,forward}));
   const end=V(p('wrist')).add(V(p('wrist')).sub(V(p('elbow'))).normalize().multiplyScalar(.11));
   root.add(mountSegment(hand,p('wrist'),end.toArray(),{name:'Wrist.'+suffix,referenceLength:.11,forward:[-.42,0,.91]}));
  }else{
   for(const [a,b,r0,r1]of[['shoulder','elbow',.045,.06],['elbow','wrist',.026,.041],['hip','knee',.052,.078],['knee','ankle',.033,.052]])root.add(link({name:a+suffix,from:p(a),to:p(b),radius:stage==='gesture'?.007:r0,endRadius:stage==='gesture'?.007:r1,material:mat}));
   for(const name of['shoulder','elbow','wrist','hip','knee','ankle'])root.add(sphere({name:name+suffix+' mark',radius:stage==='gesture'?.013:.033,position:p(name),segments:16,material:side>0?m.orange:m.cyan}));
   root.add(footMount(group('BootProxy',[sphere({radius:1,scale:[.05,.055,.10],position:[0,0,.09],segments:20,material:mat})]),p('ankle'),forward));
  }
 }
 const head=group('HeadMount');head.position.fromArray(g.point('head'));head.rotation.set(D(20),D(-28),D(28),'YXZ');head.scale.setScalar(1.1);
 if(stage==='assembly')head.add(animePortrait({detail:level},m),prismBob({detail:level},m));else head.add(sphere({name:'Head mass',radius:1,scale:[.093,.135,.083],segments:24,material:nearMat}));
 root.add(head);
 if(stage==='assembly'){
  const pack=reactorBackpack({detail:level,loops:false},m),hub=pack.getObjectByName('Main radial reactor');
  const wrapper=group('Pack mount');wrapper.rotation.y=D(-55);wrapper.scale.setScalar(.85);hub.scale.setScalar(.69);pack.position.copy(hub.position).multiplyScalar(-1);wrapper.add(pack);wrapper.position.fromArray(g.point('reactor'));root.add(wrapper);const oldHoop=pack.getObjectByName('Outer backpack cage');oldHoop.removeFromParent();oldHoop.traverse(o=>{if(o.isMesh)o.geometry.dispose();});const hoopPixels=[[492,175],[608,205],[683,260],[705,339],[682,422],[614,468],[560,447]];const hoop=hoopPixels.map((pixel,i)=>landmarkGuide(g.camera,{p:{pixel,depth:-.23+i*.025}}).point('p'));root.add(routedCable({name:'Backpack protective hoop',points:hoop,radius:.009,clamps:8,material:m.edge,clampMaterial:m.shell,segments:90}));wrapper.updateMatrixWorld(true);const lower=pack.getObjectByName('Secondary blue reactor');const target=landmarkGuide(g.camera,{p:{pixel:[465,515],depth:-.07}}).point('p');lower.position.copy(pack.worldToLocal(V(target)));lower.scale.multiplyScalar(.9);const outlet=pack.getObjectByName('Lower coolant manifold');outlet.position.copy(pack.worldToLocal(V(landmarkGuide(g.camera,{p:{pixel:[557,490],depth:-.08}}).point('p'))));
 }else root.add(sphere({name:'Backpack mass',radius:1,scale:[.16,.23,.10],position:g.point('reactor'),segments:24,material:farMat}));
 if(cables){const pixels=[[557,495],[606,635],[713,758],[738,827],[695,857],[620,833],[559,762],[524,671],[487,555]];
  let route=pixels.map((pixel,i)=>landmarkGuide(g.camera,{p:{pixel,depth:[-.16,-.2,-.32,-.25,-.15,-.03,0,-.06,-.1][i]}}).point('p'));
  root.updateMatrixWorld(true);if(stage==='assembly'){const outlet=root.getObjectByName('Lower coolant manifold'),inlet=root.getObjectByName('Secondary blue reactor');route=routeSockets(worldSocket(outlet,{at:[0,0,.045]}),worldSocket(inlet,{at:[0,-.04,0],normal:[0,-1,0]}),{via:route.slice(1,-1),lead:.025});}
  root.add(cableLoom({name:'Reference power loop',points:route,colors:stage==='gesture'?['cyan']:['pink','white','lime'],radius:.007,spacing:.018,segments:96},m));
 }
 root.userData.poseGuide={schema:1,anchors:g.points,depths:'Hand-authored hypotheses; single view cannot resolve depth',stage};
 root.userData.design={source:'Procedural components mounted to a manually interpreted 3D pose guide',status:'composition study, not visual acceptance',rig:'static rigid assembly; no skinned humanoid'};
 if(stage==='assembly'){const q=head.quaternion.clone(),values=[0,1,2].flatMap(i=>q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),i===1?.04:0)).toArray());root.animations=[new THREE.AnimationClip('Survey',4,[new THREE.QuaternionKeyframeTrack('HeadMount.quaternion',[0,2,4],values)])];}
 return root;
}
