import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {validateBytes} from 'gltf-validator';
import {createRenderBatch} from './render-batch.mjs';
import {buildModel,dispose} from '../src/lib/modeling.js';
import {captureBonePose} from '../src/lib/bone-pose-state.js';
import model from '../studies/prism-armor-blockout.js';
import tail from '../studies/posed-tail-sleeve.js';
import {checkCostumeExport} from './check-costume-export.mjs';
const out=process.argv[2]||'renders/costume-flow-review';await mkdir(out,{recursive:true});
const report={cases:{},validation:{},roundtrip:{},scope:'New pose-authored waist skin, thigh contours and optional pigment; unchanged upright rig. Not a normal bake.',visualAcceptance:'unreviewed'};
const save=()=>writeFile(out+'/review.json',JSON.stringify(report,null,2));
const cameras=r=>Object.fromEntries(r.images.map(i=>[i.view,i.cameraState]));
const batch=createRenderBatch({timeout:90000,maxJobs:16,transientRetries:0});
const base={fit:true,head:true,feet:true},options={...base,flow:true,panelLines:true};
async function render(id,settings){
 console.log('Render '+id);const r=await batch.render({module:'studies/prism-armor-blockout.js',...settings,out:out+'/'+id});report.cases[id]=r;await save();
 assert.ok(r.images.every(i=>!i.framing.clipped),id+' clipped');
 if(r.glb){const v=await validateBytes(new Uint8Array(await readFile(out+'/'+id+'/'+r.glb)));report.validation[id]=v.issues;await save();assert.equal(v.issues.numErrors,0);assert.equal(v.issues.numWarnings,0);}
 return r;
}
function bonesInPose(root,name){
 const restore=captureBonePose(root),mixer=new THREE.AnimationMixer(root);let clip;root.traverse(o=>{clip??=o.animations?.find(c=>c.name===name);});
 mixer.clipAction(clip).play();mixer.setTime(.5);root.updateMatrixWorld(true);const result={};root.traverse(o=>{if(o.isBone)result[o.name]=o.matrixWorld.toArray();});mixer.stopAllAction();mixer.uncacheRoot(root);restore();return result;
}
try{
 const before=buildModel(model,base),after=buildModel(model,options),plain=buildModel(model,{...base,flow:true});
 for(const name of ['neutral','confident','poised','silhouette','upright'])assert.deepEqual(bonesInPose(before,name),bonesInPose(after,name),'changed '+name);
 for(const name of ['Beta_Surface','Beta_Joints']){
  const a=before.getObjectByName(name),b=after.getObjectByName(name);
  for(const [key,value]of Object.entries(a.geometry.attributes))assert.deepEqual(value.array,b.geometry.attributes[key].array);
  assert.deepEqual(a.geometry.index.array,b.geometry.index.array);assert.deepEqual(a.skeleton.boneInverses.map(m=>m.toArray()),b.skeleton.boneInverses.map(m=>m.toArray()));
 }
 plain.traverse(a=>{if(a.isMesh){const b=after.getObjectByName(a.name);assert.ok(b);assert.notEqual(a.geometry,b.geometry);assert.deepEqual(a.geometry.index?.array,b.geometry.index?.array);for(const [key,value]of Object.entries(a.geometry.attributes))assert.deepEqual(value.array,b.geometry.attributes[key].array);}});
 const waist=after.getObjectByName('Flexible waist connector');assert.ok(waist.isSkinnedMesh);assert.equal(waist.skeleton,after.getObjectByName('Beta_Surface').skeleton);report.waist={...waist.geometry.userData.poseSkin,...waist.userData.waist};
 report.preserved='all 67 bone world matrices in five clips; all source skin attributes, topology, inverse binds; geometry identical between plain/pigment';
 dispose(before);dispose(after);dispose(plain);
 const hero={width:768,height:1376,views:['hero'],passes:['material','clay','silhouette'],clip:'upright',time:.5};
 const b=await render('before',{...hero,values:base});
 await render('plain',{...hero,values:{...base,flow:true},cameras:cameras(b)});
 await render('after',{...hero,values:options,cameras:cameras(b),glb:true});
 assert.ok((await readFile(out+'/plain/hero-silhouette.png')).equals(await readFile(out+'/after/hero-silhouette.png')));
 const angles={width:580,height:820,views:['front','side','back'],passes:['clay','wire'],clip:'upright',time:.5};
 const a=await render('angles-before',{...angles,values:base});
 await render('angles-after',{...angles,values:options,cameras:cameras(a)});
 await render('bind',{width:800,height:700,views:['threequarter'],passes:['material'],values:options,glb:true});
 assert.ok((await readFile(out+'/bind/prism-armor-blockout.glb')).equals(await readFile(out+'/after/prism-armor-blockout.glb')));
 const fixture={module:'studies/posed-tail-sleeve.js',width:480,height:640,views:['threequarter','side'],passes:['material','wire'],time:.5,clip:'bend',occupancy:.70};
 const t=await render('tail-before',{...fixture,values:{sleeve:false}});
 await render('tail-after',{...fixture,values:{sleeve:true},cameras:cameras(t),glb:true});
 await render('tail-rest',{...fixture,values:{sleeve:true},clip:'rest',cameras:cameras(t)});
 const subject=buildModel(model,options);report.roundtrip.armor=await checkCostumeExport(out+'/after/prism-armor-blockout.glb',subject,['upright','neutral'],{skinNames:['Flexible waist connector']});dispose(subject);
 const fixtureModel=buildModel(tail);report.roundtrip.tail=await checkCostumeExport(out+'/tail-after/posed-tail-sleeve.glb',fixtureModel,['bend','rest'],{skinNames:['Flexible tail cuff','Tail skin','Tail tip']});dispose(fixtureModel);
 report.exportIsolation='byte-identical bind and posed-preview GLBs; actual PNG decode and rigid + explicitly selected skin vertex reimport';
 report.sourceFingerprints=[...new Set(Object.values(report.cases).map(r=>r.sourceFingerprint.sha256))];assert.equal(report.sourceFingerprints.length,1);
 await batch.sheet({out:out+'/progress.png',columns:3,cellSize:620,title:'Actual 3D, fixed upright pose: previous / flexible waist and thigh contours / pigment',tiles:['before','plain','after'].map(id=>({label:id,file:out+'/'+id+'/hero-material.png'}))});
 await batch.sheet({out:out+'/clay.png',columns:2,cellSize:400,title:'Fixed views: previous / flexible connector and revised panel boundaries',tiles:['front','side','back'].flatMap(view=>['before','after'].map(id=>({label:view+' '+id,file:out+'/angles-'+id+'/'+view+'-clay.png'})))});
 await batch.sheet({out:out+'/tail.png',columns:3,cellSize:360,title:'Independent appendage: bare / posed-authored cuff / same cuff at rest',tiles:['tail-before','tail-after','tail-rest'].map(id=>({label:id,file:out+'/'+id+'/threequarter-material.png'}))});
 await save();console.log('COSTUME_FLOW_REVIEW_OK');
}catch(error){report.failure=String(error.stack||error);await save();throw error;}
finally{await batch.close();}
