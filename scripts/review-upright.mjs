import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {validateBytes} from 'gltf-validator';
import {createRenderBatch} from './render-batch.mjs';
import {buildModel,dispose} from '../src/lib/modeling.js';
import {captureBonePose} from '../src/lib/bone-pose-state.js';
import recipe from '../studies/imported-xbot.js';

const out=process.argv[2]||'renders/upright-review';await mkdir(out,{recursive:true});
const report={cases:{},validation:{},roundtrip:{},pose:{},visualAcceptance:'unreviewed',scope:'User correction: upright chest, displaced pelvis, side-hanging arms, downward head. Same bind geometry, no added detail.'};
const batch=createRenderBatch({timeout:60000,maxJobs:12,transientRetries:0});
const save=()=>writeFile(out+'/review.json',JSON.stringify(report,null,2));
const cameras=r=>Object.fromEntries(r.images.map(i=>[i.view,i.cameraState]));
const V=p=>new THREE.Vector3(...p),degrees=THREE.MathUtils.radToDeg;
function clips(root){const result=new Map();root.traverse(o=>o.animations?.forEach(c=>result.set(c.name,c)));return result;}
function sample(root,clip){
 const reset=captureBonePose(root),mixer=new THREE.AnimationMixer(root);
 try{
  if(clip){mixer.clipAction(clip).play();mixer.setTime(.5);}root.updateWorldMatrix(true,true);root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
  const points={},bones={};root.traverse(o=>{
   if(o.isBone)bones[o.name]={p:o.getWorldPosition(new THREE.Vector3()).toArray(),q:o.getWorldQuaternion(new THREE.Quaternion()).normalize().toArray()};
   if(o.isSkinnedMesh)points[o.name]=Array.from({length:o.geometry.attributes.position.count},(_,i)=>o.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(o.matrixWorld).toArray());
  });return{points,bones};
 }finally{mixer.stopAllAction();mixer.uncacheRoot(root);reset();}
}
function difference(a,b){let max=0,sum=0,count=0;for(const [name,points]of Object.entries(a)){
 const other=b[name]||b[name.replace(/\s/g,'_')];assert.equal(points.length,other?.length,name);
 for(let i=0;i<points.length;i++){const d=V(points[i]).distanceTo(V(other[i]));max=Math.max(max,d);sum+=d*d;count++;}
 }return{vertices:count,maxMeters:max,rmsMeters:Math.sqrt(sum/count)};}
function poseReport(sample){
 const p=n=>V(sample.bones['mixamorig'+n].p),q=n=>new THREE.Quaternion(...sample.bones['mixamorig'+n].q);
 const direction=n=>new THREE.Vector3(0,0,1).applyQuaternion(q(n));
 const planar=n=>{const p=direction(n);p.y=0;return p.normalize();};
 const shoulders=p('LeftArm').sub(p('RightArm'));
 return{
  chestPelvisHeadingDifferenceDegrees:degrees(planar('Hips').angleTo(planar('Spine2'))),
  shoulderHeightDifferenceMeters:Math.abs(shoulders.y),shoulderDepthDifferenceMeters:Math.abs(shoulders.z),
  chestUpTiltDegrees:degrees(new THREE.Vector3(0,1,0).applyQuaternion(q('Spine2')).angleTo(new THREE.Vector3(0,1,0))),
  headForwardY:direction('Head').y,
  pelvisFromChest:p('Hips').sub(p('Spine2')).toArray(),
  armFromVerticalDegrees:Object.fromEntries(['Left','Right'].map(s=>[s,degrees(p(s+'Hand').sub(p(s+'Arm')).angleTo(new THREE.Vector3(0,-1,0)))])),
 };
}
async function render(name,options){
 console.log('Render '+name);const r=await batch.render({module:'studies/imported-xbot.js',out:out+'/'+name,...options});report.cases[name]=r;await save();
 assert.ok(r.images.every(i=>!i.framing.clipped),name+' clipped');
 if(r.glb){
  const bytes=await readFile(out+'/'+name+'/'+r.glb),v=await validateBytes(new Uint8Array(bytes));report.validation[name]=v.issues;await save();assert.equal(v.issues.numErrors,0);assert.equal(v.issues.numWarnings,0);
  const decoded=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''),source=buildModel(recipe,options.values);
  try{for(const [pose,clip]of clips(source)){
   const imported=decoded.animations.find(c=>c.name===pose);assert.ok(imported,pose);
   const error=difference(sample(source,clip).points,sample(decoded.scene,imported).points);
   assert.ok(error.maxMeters<3e-6,pose+' full skin roundtrip');report.roundtrip[name+'-'+pose]=error;
  }}finally{dispose(source);dispose(decoded.scene);}await save();
 }return r;
}
try{
 // Actual imported-rig assertions are here, after explicit cache preparation,
 // so default unit/build workflows do not acquire a mandatory Adobe asset.
 for(const form of ['stock','tailored']){
  const root=buildModel(recipe,{form});try{
   const variants=clips(root),before=sample(root,variants.get('silhouette')),after=sample(root,variants.get('upright'));
   const geometry=[];root.traverse(o=>{if(o.isSkinnedMesh)geometry.push([o.geometry,Object.fromEntries(Object.entries(o.geometry.attributes).map(([k,v])=>[k,v.array.slice()])),o.skeleton.boneInverses.map(m=>m.toArray())]);});
   report.pose[form]={before:poseReport(before),after:poseReport(after)};
   const data=report.pose[form];
   assert.ok(data.after.chestPelvisHeadingDifferenceDegrees<1e-4,'body heading, not opposing yaw');
   assert.ok(data.after.shoulderHeightDifferenceMeters<1e-6,'unraised shoulders');
   assert.ok(data.after.shoulderDepthDifferenceMeters<data.before.shoulderDepthDifferenceMeters*.65,'reduce stacked-shoulder projection');
   assert.ok(data.after.chestUpTiltDegrees<1e-4,'upright rib section');
   assert.ok(data.after.headForwardY<-.2,'head faces downward');
   for(const side of ['Left','Right']){
    assert.ok(data.after.armFromVerticalDegrees[side]<10,'arm hangs beside body');
    const at=(s,n)=>V(s.bones['mixamorig'+side+n].p);
    assert.ok(at(before,'Foot').distanceTo(at(after,'Foot'))<1e-6,'ankle target retained');
    for(const [a,b]of [['UpLeg','Leg'],['Leg','Foot'],['Arm','ForeArm'],['ForeArm','Hand']])assert.ok(Math.abs(at(before,a).distanceTo(at(before,b))-at(after,a).distanceTo(at(after,b)))<1e-6,'unchanged bone lengths');
   }
   sample(root,variants.get('upright'));let i=0;root.traverse(o=>{if(!o.isSkinnedMesh)return;const [g,attributes,inverses]=geometry[i++];assert.equal(o.geometry,g);for(const [k,v]of Object.entries(attributes))assert.deepEqual(o.geometry.attributes[k].array,v);assert.deepEqual(o.skeleton.boneInverses.map(m=>m.toArray()),inverses);});
  }finally{dispose(root);}
 }
 const hero={values:{form:'tailored'},width:768,height:1376,views:['hero'],passes:['material','clay','silhouette'],time:.5};
 const before=await render('before',{...hero,clip:'silhouette'});
 await render('after',{...hero,clip:'upright',cameras:cameras(before),glb:true});
 const angles={values:{form:'tailored'},width:560,height:780,views:['front','threequarter','side','back'],passes:['clay','wire'],time:.5};
 const other=await render('angles-before',{...angles,clip:'silhouette'});
 await render('angles-after',{...angles,clip:'upright',cameras:cameras(other)});
 await render('stock',{...hero,values:{form:'stock'},clip:'upright',views:['hero'],passes:['material','silhouette'],cameras:cameras(before),glb:true});
 await render('bind',{...hero,clip:undefined,views:['front','side'],passes:['clay'],glb:true});
 assert.deepEqual(await readFile(out+'/bind/imported-xbot.glb'),await readFile(out+'/after/imported-xbot.glb'));report.exportIsolation='byte-identical tailored exports from bind and upright previews';
 report.sourceFingerprints=[...new Set(Object.values(report.cases).map(c=>c.sourceFingerprint.sha256))];assert.equal(report.sourceFingerprints.length,1);
 await batch.sheet({out:out+'/before-after.png',columns:2,cellSize:700,title:'Fixed camera and same mesh: previous twist / upright correction',tiles:['before','after'].map(id=>({label:id,file:out+'/'+id+'/hero-material.png'}))});
 await batch.sheet({out:out+'/angles-board.png',columns:2,cellSize:430,title:'Same cameras and geometry: previous / upright, arms down',tiles:['front','threequarter','side','back'].flatMap(view=>['before','after'].map(id=>({label:view+' '+id,file:out+'/angles-'+id+'/'+view+'-clay.png'})))});
 await save();console.log('UPRIGHT_REVIEW_OK');
}catch(error){report.failure=String(error.stack||error);await save();throw error;}
finally{await batch.close();}
