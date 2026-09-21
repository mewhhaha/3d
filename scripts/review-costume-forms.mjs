import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {validateBytes} from 'gltf-validator';
import {createRenderBatch} from './render-batch.mjs';
import {buildModel,dispose} from '../src/lib/modeling.js';
import {captureBonePose} from '../src/lib/bone-pose-state.js';
import model from '../studies/prism-armor-blockout.js';
import tail from '../studies/posed-tail-guard.js';
import {checkCostumeExport} from './check-costume-export.mjs';
const out=process.argv[2]||'renders/costume-forms-review';await mkdir(out,{recursive:true});
const report={cases:{},validation:{},roundtrip:{},scope:'Fitted torso panels, coarse portrait/bob and foot shells; pose and camera unchanged; no normal bake',visualAcceptance:'unreviewed'};
const save=()=>writeFile(out+'/review.json',JSON.stringify(report,null,2));
const cameras=r=>Object.fromEntries(r.images.map(i=>[i.view,i.cameraState]));
const batch=createRenderBatch({timeout:90000,maxJobs:20,transientRetries:0});
const options={fit:true,head:true,feet:true};
async function render(id,settings){
 console.log('Render '+id);const r=await batch.render({module:'studies/prism-armor-blockout.js',...settings,out:out+'/'+id});report.cases[id]=r;await save();
 assert.ok(r.images.every(i=>!i.framing.clipped),id+' clipped');
 if(r.glb){const v=await validateBytes(new Uint8Array(await readFile(out+'/'+id+'/'+r.glb)));report.validation[id]=v.issues;await save();assert.equal(v.issues.numErrors,0);assert.equal(v.issues.numWarnings,0);}
 return r;
}
function frameSnapshot(root,clipName){
 const reset=captureBonePose(root),mixer=new THREE.AnimationMixer(root);let clip;root.traverse(o=>{clip??=o.animations?.find(c=>c.name===clipName);});mixer.clipAction(clip).play();mixer.setTime(.5);root.updateMatrixWorld(true);
 const result={};root.traverse(o=>{if(o.isBone)result[o.name]=o.matrixWorld.toArray();});mixer.stopAllAction();mixer.uncacheRoot(root);reset();return result;
}
try{
 const before=buildModel(model),after=buildModel(model,options);
 for(const name of ['neutral','confident','poised','silhouette','upright'])assert.deepEqual(frameSnapshot(before,name),frameSnapshot(after,name),'changed '+name);
 for(const name of ['Beta_Surface','Beta_Joints']){
  const a=before.getObjectByName(name),b=after.getObjectByName(name);
  for(const [key,attr]of Object.entries(a.geometry.attributes))assert.deepEqual(attr.array,b.geometry.attributes[key].array,name+' '+key);
  assert.deepEqual(a.skeleton.boneInverses.map(m=>m.toArray()),b.skeleton.boneInverses.map(m=>m.toArray()));
  if(name==='Beta_Joints')assert.deepEqual(a.geometry.index.array,b.geometry.index.array);
  else {assert.ok(b.geometry.index.count<a.geometry.index.count);report.sourceHeadRemoval=b.geometry.userData.headReplacement;}
 }
 after.traverse(o=>{if(o.userData.armorBlockout)report.construction=o.userData.armorBlockout;});
 report.preserved='all 67 bone world matrices in five clips; positions/normals/UV/weights/inverse binds unchanged. Only source head-face indices removed explicitly.';
 dispose(before);dispose(after);
 const hero={width:768,height:1376,views:['hero'],passes:['material','clay','silhouette'],clip:'upright',time:.5};
 const base=await render('before',hero);
 await render('fit-only',{...hero,values:{fit:true},cameras:cameras(base)});
 await render('after',{...hero,values:options,cameras:cameras(base),glb:true});
 const angles={width:600,height:840,views:['front','side','back'],passes:['material','clay','wire'],clip:'upright',time:.5};
 const a=await render('angles-before',angles);
 await render('angles-after',{...angles,values:options,cameras:cameras(a)});
 await render('portrait',{width:640,height:680,views:['front','threequarter','side'],passes:['material','clay'],focus:'Illustrated head',clip:'upright',time:.5,values:options});
 await render('bind',{width:860,height:720,views:['threequarter'],passes:['material'],values:options,glb:true});
 assert.ok((await readFile(out+'/bind/prism-armor-blockout.glb')).equals(await readFile(out+'/after/prism-armor-blockout.glb')),'Preview changed bind export');
 const prop={module:'studies/posed-tail-guard.js',width:500,height:700,views:['threequarter','side'],passes:['material','wire'],clip:'bend',time:.5};
 const t=await render('tail-before',{...prop,values:{fitted:false}});
 await render('tail-after',{...prop,values:{fitted:true},cameras:cameras(t),glb:true});
 const subject=buildModel(model,options);report.roundtrip.armor=await checkCostumeExport(out+'/after/prism-armor-blockout.glb',subject,['upright','neutral']);dispose(subject);
 const appendage=buildModel(tail);report.roundtrip.tail=await checkCostumeExport(out+'/tail-after/posed-tail-guard.glb',appendage,['bend']);dispose(appendage);
 report.sourceFingerprints=[...new Set(Object.values(report.cases).map(r=>r.sourceFingerprint.sha256))];assert.equal(report.sourceFingerprints.length,1);
 report.counts={before:base.stats,after:report.cases.after.stats};
 await batch.sheet({out:out+'/progress.png',columns:3,cellSize:650,title:'Same upright pose: previous / fitted torso covers / head and shaped feet',tiles:['before','fit-only','after'].map(id=>({label:id,file:out+'/'+id+'/hero-material.png'}))});
 await batch.sheet({out:out+'/clay.png',columns:2,cellSize:420,title:'Fixed cameras: previous / fitted costume',tiles:['front','side','back'].flatMap(view=>['before','after'].map(id=>({label:view+' '+id,file:out+'/angles-'+id+'/'+view+'-clay.png'})))});
 await save();console.log('COSTUME_FORMS_REVIEW_OK');
}catch(error){report.failure=String(error.stack||error);await save();throw error;}
finally{await batch.close();}
