import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {validateBytes} from 'gltf-validator';
import {createRenderBatch} from './render-batch.mjs';
import {buildModel,dispose} from '../src/lib/modeling.js';
import {captureBonePose} from '../src/lib/bone-pose-state.js';
import model from '../studies/prism-armor-blockout.js';
import probe from '../studies/bone-mounted-prop.js';
import {checkCostumeExport} from './check-costume-export.mjs';
const out=process.argv[2]||'renders/armor-blockout-review';await mkdir(out,{recursive:true});
const report={cases:{},validation:{},roundtrip:{},scope:'Rough rigid costume over unchanged upright skin. Generated color samples only; no normal bake or collision guarantee.',visualAcceptance:'unreviewed'};
const save=()=>writeFile(out+'/review.json',JSON.stringify(report,null,2));
const cameras=r=>Object.fromEntries(r.images.map(i=>[i.view,i.cameraState]));
const batch=createRenderBatch({timeout:90000,maxJobs:14,transientRetries:0});
async function render(id,options){
 console.log('Render '+id);const r=await batch.render({module:'studies/prism-armor-blockout.js',...options,out:out+'/'+id});report.cases[id]=r;await save();
 assert.ok(r.images.every(i=>!i.framing.clipped),id+' clipped');
 if(r.glb){const v=await validateBytes(new Uint8Array(await readFile(out+'/'+id+'/'+r.glb)));report.validation[id]=v.issues;await save();assert.equal(v.issues.numErrors,0);assert.equal(v.issues.numWarnings,0);}
 return r;
}
function frameSnapshot(root,clipName){
 const reset=captureBonePose(root),mixer=new THREE.AnimationMixer(root);let clip;root.traverse(o=>{clip??=o.animations?.find(c=>c.name===clipName);});mixer.clipAction(clip).play();mixer.setTime(.5);root.updateMatrixWorld(true);
 const result={};root.traverse(o=>{if(o.isBone)result[o.name]=o.matrixWorld.toArray();});mixer.stopAllAction();mixer.uncacheRoot(root);reset();return result;
}
try{
 const bare=buildModel(model,{armor:false}),plain=buildModel(model,{textured:false}),textured=buildModel(model,{textured:true});
 for(const name of ['neutral','confident','poised','silhouette','upright'])assert.deepEqual(frameSnapshot(bare,name),frameSnapshot(textured,name),'costume changed '+name);
 for(const name of ['Beta_Surface','Beta_Joints']){
  const a=bare.getObjectByName(name),b=textured.getObjectByName(name);
  for(const [key,attr]of Object.entries(a.geometry.attributes))assert.deepEqual(attr.array,b.geometry.attributes[key].array,name+' '+key);
  assert.deepEqual(a.geometry.index.array,b.geometry.index.array);assert.deepEqual(a.skeleton.boneInverses.map(m=>m.toArray()),b.skeleton.boneInverses.map(m=>m.toArray()));
 }
 plain.traverse(o=>{if(o.isMesh){const other=textured.getObjectByName(o.name);assert.ok(other?.isMesh);for(const [key,attr]of Object.entries(o.geometry.attributes))assert.deepEqual(attr.array,other.geometry.attributes[key].array);assert.deepEqual(o.geometry.index?.array,other.geometry.index?.array);assert.notEqual(o.geometry,other.geometry);}});
 textured.traverse(o=>{if(o.userData.armorBlockout)report.construction=o.userData.armorBlockout;});
 report.preserved='all 67 bone matrices in five clips; source positions/normals/UV/weights/index/inverse binds; plain/textured geometry identical';
 dispose(bare);dispose(plain);dispose(textured);
 const hero={width:768,height:1376,views:['hero'],passes:['material','clay','silhouette'],clip:'upright',time:.5};
 const before=await render('before',{...hero,values:{armor:false}});
 const unpainted=await render('plain',{...hero,values:{textured:false},cameras:cameras(before)});
 await render('textured',{...hero,values:{textured:true},cameras:cameras(before),glb:true});
 assert.ok((await readFile(out+'/plain/hero-silhouette.png')).equals(await readFile(out+'/textured/hero-silhouette.png')),'Material change altered silhouette');
 const view={width:620,height:840,views:['front','threequarter','side','back'],passes:['clay','wire'],clip:'upright',time:.5};
 const angle=await render('angles',{...view,values:{textured:false}});
 await render('materials',{...view,passes:['material'],values:{textured:true},cameras:cameras(angle)});
 await render('bind',{width:860,height:720,views:['threequarter'],passes:['material'],values:{textured:true},glb:true});
 assert.ok((await readFile(out+'/bind/prism-armor-blockout.glb')).equals(await readFile(out+'/textured/prism-armor-blockout.glb')),'Preview changed exported bytes');
 const prop={module:'studies/bone-mounted-prop.js',width:520,height:600,views:['threequarter','side'],passes:['material'],time:.5};
 const p=await render('probe-before',{...prop,clip:'before',values:{textured:false}});
 await render('probe-after',{...prop,clip:'shifted',values:{textured:true},cameras:cameras(p),glb:true});
 const subject=buildModel(model);report.roundtrip.armor=await checkCostumeExport(out+'/textured/prism-armor-blockout.glb',subject,['upright','neutral']);dispose(subject);
 const mechanism=buildModel(probe);report.roundtrip.probe=await checkCostumeExport(out+'/probe-after/bone-mounted-prop.glb',mechanism,['before','shifted']);dispose(mechanism);
 report.sourceFingerprints=[...new Set(Object.values(report.cases).map(r=>r.sourceFingerprint.sha256))];assert.equal(report.sourceFingerprints.length,1);
 report.counts={before:before.stats.triangles,after:unpainted.stats.triangles};
 await batch.sheet({out:out+'/armor-board.png',columns:3,cellSize:650,title:'Same upright pose: bare rig / rough armor / sampled generated color',tiles:['before','plain','textured'].map(id=>({label:id,file:out+'/'+id+'/hero-material.png'}))});
 await batch.sheet({out:out+'/angle-board.png',columns:4,cellSize:420,title:'Rough costume / unchanged upright clip / neutral clay',tiles:['front','threequarter','side','back'].map(view=>({label:view,file:out+'/angles/'+view+'-clay.png'}))});
 await save();console.log('ARMOR_BLOCKOUT_REVIEW_OK');
}catch(error){report.failure=String(error.stack||error);await save();throw error;}
finally{await batch.close();}
