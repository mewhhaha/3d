import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {validateBytes} from 'gltf-validator';
import {createRenderBatch} from './render-batch.mjs';
import {buildModel,dispose} from '../src/lib/modeling.js';
import {captureBonePose} from '../src/lib/bone-pose-state.js';
import {xbotForm} from '../studies/xbot-form.js';
import imported from '../studies/imported-xbot.js';
import tail from '../studies/refitted-tail.js';
const out=process.argv[2]||'renders/bind-form-review';await mkdir(out,{recursive:true});
const report={cases:{},validation:{},roundtrip:{},bind:{},visualAcceptance:'unreviewed',scope:'Rest-shape refit plus separately reauthored far-arm placement. Not animation retargeting, automatic skinning or a normal bake.'};
const batch=createRenderBatch({timeout:60000,maxJobs:20,transientRetries:0});
const cameras=r=>Object.fromEntries(r.images.map(i=>[i.view,i.cameraState]));
const save=()=>writeFile(out+'/review.json',JSON.stringify(report,null,2));
const skins=root=>{const result={};root.traverse(o=>{if(o.isSkinnedMesh)result[o.name]=o;});return result;};
const clips=root=>{const result=new Map();root.traverse(o=>o.animations?.forEach(c=>result.set(c.name,c)));return result;};
function sample(root,clip){
 const reset=captureBonePose(root),mixer=new THREE.AnimationMixer(root);
 if(clip){mixer.clipAction(clip).play();mixer.setTime(.5);}root.updateMatrixWorld(true);root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
 const data={};for(const [name,o]of Object.entries(skins(root)))data[name]=Array.from({length:o.geometry.attributes.position.count},(_,i)=>o.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(o.matrixWorld).toArray());
 mixer.stopAllAction();mixer.uncacheRoot(root);reset();return data;
}
function boneFrames(root,pose){
 const reset=captureBonePose(root),mixer=new THREE.AnimationMixer(root),clip=clips(root).get(pose);mixer.clipAction(clip).play();mixer.setTime(.5);root.updateMatrixWorld(true);
 const data={};for(const name of ['LeftFoot','RightFoot','LeftHand','RightHand','Hips']){
  const b=root.getObjectByName('mixamorig'+name);data[name]={position:b.getWorldPosition(new THREE.Vector3()).toArray(),quaternion:b.getWorldQuaternion(new THREE.Quaternion()).normalize().toArray()};
 }
 mixer.stopAllAction();mixer.uncacheRoot(root);reset();return data;
}
function diff(a,b){let max=0,sum=0,count=0;for(const [name,points]of Object.entries(a)){
 const other=b[name]||b[name.replace(/\s/g,'_')];assert.equal(points.length,other?.length,name);
 points.forEach((p,i)=>{const error=new THREE.Vector3(...p).distanceTo(new THREE.Vector3(...other[i]));max=Math.max(max,error);sum+=error*error;count++;});
 }return{vertices:count,maxMeters:max,rmsMeters:Math.sqrt(sum/count)};}
async function render(name,options,recipe=null){
 console.log('Render '+name);const r=await batch.render({...options,out:out+'/'+name});report.cases[name]=r;await save();assert.ok(r.images.every(i=>!i.framing.clipped),name+' clipped');
 if(r.glb){
  const bytes=await readFile(out+'/'+name+'/'+r.glb),v=await validateBytes(new Uint8Array(bytes));report.validation[name]=v.issues;await save();assert.equal(v.issues.numErrors,0);assert.equal(v.issues.numWarnings,0);
  const decoded=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''),source=buildModel(recipe,options.values);
  report.roundtrip[name]={};
  for(const [pose,clip]of clips(source)){
   const candidate=decoded.animations.find(c=>c.name===pose);assert.ok(candidate);
   const error=diff(sample(source,clip),sample(decoded.scene,candidate));assert.ok(error.maxMeters<3e-6,name+' '+pose+' roundtrip');report.roundtrip[name][pose]=error;
  }
  dispose(source);dispose(decoded.scene);await save();
 }
 return r;
}
try{
 // Refit is intentionally a NEW bind, but not new topology, weights or rig names.
 const stock=buildModel(imported,{form:'stock'}),shaped=buildModel(imported,{form:'tailored'}),ss=skins(stock),ts=skins(shaped),field=xbotForm();
 for(const [name,a]of Object.entries(ss)){
  const b=ts[name],ga=a.geometry,gb=b.geometry;
  assert.deepEqual(ga.index.array,gb.index.array);for(const key of ['uv','skinIndex','skinWeight'])assert.deepEqual(ga.attributes[key].array,gb.attributes[key].array);
  assert.notEqual(ga,gb);assert.notDeepEqual(ga.attributes.position.array,gb.attributes.position.array);
  for(let i=0;i<a.skeleton.bones.length;i++){
   assert.equal(a.skeleton.bones[i].name,b.skeleton.bones[i].name);
   const expected=field(a.skeleton.bones[i].getWorldPosition(new THREE.Vector3()).toArray());
   assert.ok(new THREE.Vector3(...expected).distanceTo(b.skeleton.bones[i].getWorldPosition(new THREE.Vector3()))<1e-9);
  }
 }
 const raw=Object.fromEntries(Object.entries(ss).map(([name,o])=>[name,Array.from({length:o.geometry.attributes.position.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(o.geometry.attributes.position,i).toArray())]));
 report.bind.sourceRestApproximation=diff(raw,sample(stock));
 const expected=Object.fromEntries(Object.entries(raw).map(([n,p])=>[n,p.map(field)]));report.bind.fieldAgreement=diff(expected,sample(shaped));assert.ok(report.bind.fieldAgreement.maxMeters<5e-7);
 const measurements=root=>{
  const b=n=>root.getObjectByName('mixamorig'+n).getWorldPosition(new THREE.Vector3());
  return {hipY:b('Hips').y,shoulderY:b('LeftArm').y,kneeY:b('LeftLeg').y,leg:b('LeftUpLeg').distanceTo(b('LeftLeg'))+b('LeftLeg').distanceTo(b('LeftFoot')),upperArm:b('LeftArm').distanceTo(b('LeftForeArm')),forearm:b('LeftForeArm').distanceTo(b('LeftHand'))};
 };
 report.bind.before=measurements(stock);report.bind.after=measurements(shaped);shaped.traverse(o=>{if(o.userData.bindRefit)report.bind.refit=o.userData.bindRefit;});
 report.frames={before:boneFrames(stock,'poised'),after:boneFrames(shaped,'silhouette')};
 for(const name of ['LeftFoot','RightFoot','LeftHand']){
  const a=report.frames.before[name],b=report.frames.after[name];
  assert.ok(new THREE.Vector3(...a.position).distanceTo(new THREE.Vector3(...b.position))<5e-7,name+' target');
  // Feet retain their authored world orientation. Hand roll is inherited from
  // the slightly different bind/arm solve and is not claimed identical.
  if(name.endsWith('Foot'))assert.ok(new THREE.Quaternion(...a.quaternion).angleTo(new THREE.Quaternion(...b.quaternion))<5e-7);
 }
 dispose(stock);dispose(shaped);
 const hero={module:'studies/imported-xbot.js',width:768,height:1376,views:['hero'],passes:['material','clay','silhouette'],time:.5};
 const before=await render('before',{...hero,values:{form:'stock'},clip:'poised'});
 await render('form-only',{...hero,values:{form:'tailored'},clip:'poised',cameras:cameras(before)});
 await render('pose-only',{...hero,values:{form:'stock'},clip:'silhouette',cameras:cameras(before)});
 await render('after',{...hero,values:{form:'tailored'},clip:'silhouette',cameras:cameras(before),glb:true},imported);
 const angles={module:hero.module,width:560,height:780,views:['front','threequarter','side','back'],passes:['clay','wire'],time:.5};
 const a=await render('angles-before',{...angles,values:{form:'stock'},clip:'poised'});
 await render('angles-after',{...angles,values:{form:'tailored'},clip:'silhouette',cameras:cameras(a)});
 const bind={module:hero.module,width:800,height:750,views:['front','side'],passes:['clay','wire']};
 const b=await render('bind-before',{...bind,values:{form:'stock'}});
 await render('bind-after',{...bind,values:{form:'tailored'},cameras:cameras(b),glb:true},imported);
 assert.deepEqual(await readFile(out+'/bind-after/imported-xbot.glb'),await readFile(out+'/after/imported-xbot.glb'));report.exportIsolation='byte-identical refitted bind and posed-preview exports';
 const fixture={module:'studies/refitted-tail.js',occupancy:.68,width:500,height:680,views:['threequarter','side'],passes:['material','wire'],time:.5};
 const t=await render('tail-before',{...fixture,values:{refitted:false}});
 await render('tail-after',{...fixture,values:{refitted:true},cameras:cameras(t)});
 await render('tail-bend',{...fixture,values:{refitted:true},clip:'bend',cameras:cameras(t),glb:true},tail);
 report.sourceFingerprints=[...new Set(Object.values(report.cases).map(c=>c.sourceFingerprint.sha256))];assert.equal(report.sourceFingerprints.length,1);
 await batch.sheet({out:out+'/before-after.png',columns:2,cellSize:650,title:'Same camera: stock poised / rest-refitted silhouette candidate',tiles:['before','after'].map(id=>({label:id,file:out+'/'+id+'/hero-material.png'}))});
 await batch.sheet({out:out+'/bind-board.png',columns:2,cellSize:500,title:'Same T bind view: stock / longer legs and smaller torso',tiles:['front','side'].flatMap(view=>['before','after'].map(id=>({label:view+' '+id,file:out+'/bind-'+id+'/'+view+'-clay.png'})))});
 await batch.sheet({out:out+'/angles-board.png',columns:2,cellSize:430,title:'Same views: stock poised / refit and far-arm correction',tiles:['front','threequarter','side','back'].flatMap(view=>['before','after'].map(id=>({label:view+' '+id,file:out+'/angles-'+id+'/'+view+'-clay.png'})))});
 await batch.sheet({out:out+'/tail-board.png',columns:3,cellSize:380,title:'Same skin/weights: original bind / refitted bind / freshly authored bend',tiles:['tail-before','tail-after','tail-bend'].map(id=>({label:id,file:out+'/'+id+'/threequarter-material.png'}))});
 await save();console.log('BIND_FORM_REVIEW_OK');
}catch(error){report.failure=String(error.stack||error);await save();throw error;}
finally{await batch.close();}
