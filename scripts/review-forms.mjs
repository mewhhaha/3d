import assert from 'node:assert/strict';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import validator from 'gltf-validator';
import { createRenderBatch } from './render-batch.mjs';
import { runStudy } from './study.mjs';
import { measureRecipe } from './measure-reference.mjs';
import { polygonMask } from './raster-mask.mjs';
import { measureHair } from './measure-hair.mjs';
const out='renders/form-review';await mkdir(out,{recursive:true});
const r={schema:1,sourceRevision:process.env.GITHUB_SHA||null,status:'running',visualAcceptance:'not-assessed',completed:[]};
const save=async()=>{await writeFile(out+'/verification.json.tmp',JSON.stringify(r,null,2));await rename(out+'/verification.json.tmp',out+'/verification.json');};
const studio=createRenderBatch({maxJobs:40});await save();
try{
 const spec=JSON.parse(await readFile('studies/prism-forms.json'));
 const study=await runStudy(spec,{session:studio,out:out+'/variants'});assert.equal(study.status,'passed',JSON.stringify(study.cases));
 r.completed.push('four scene variants, GLB validation and fixed-camera comparison');await save();
 const bytes=await readFile(out+'/variants/baked/cyber-form-study.glb');assert.deepEqual(bytes,await readFile(out+'/variants/survey/cyber-form-study.glb'));
 const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());assert.equal(json.cameras.length,1);assert.equal(json.extensions.KHR_lights_punctual.lights.length,5);assert.ok(json.images.every(i=>Number.isInteger(i.bufferView)));
 r.completed.push('preview pose cannot alter the scene export');await save();
 r.hero=await studio.render({module:'models/cyber-form-study.js',values:{hairMode:'baked'},views:['hero'],width:768,height:1376,out:out+'/hero'});
 await studio.render({module:'models/cyber-pose-study.js',views:['hero'],width:768,height:1376,out:out+'/baseline'});
 await studio.render({module:'models/cyber-form-study.js',views:['side','back'],passes:['clay'],width:640,height:960,out:out+'/depth'});
 await studio.render({module:'studies/prism-head.js',values:{mode:'baked'},views:['front','side','back','threequarter'],passes:['material','clay'],width:600,height:700,out:out+'/head'});
 await studio.render({module:'studies/prism-head.js',values:{hair:false},views:['front','side'],passes:['clay'],width:600,height:700,out:out+'/head-construction'});
 await studio.render({module:'models/cyber-form-study.js',values:{hairMode:'cage'},focus:'Boot.L planted',views:['threequarter'],width:700,height:600,out:out+'/boot'});
 r.completed.push('full hero, neutral side/back, head with/without hair and boot closeup');await save();
 const before=await measureRecipe('models/cyber-pose-study.js'),after=await measureRecipe('models/cyber-form-study.js');
 await writeFile(out+'/alignment.json',JSON.stringify({before,after},null,2));assert.ok(Math.abs(before.rmsPixels-after.rmsPixels)<1e-5);
 r.alignment={rmsPixels:after.rmsPixels,poseUnchanged:true,oldEnvelope:before.regions.hair.envelope.iou,newEnvelope:after.regions.hair.envelope.iou,scope:after.warning};
 const annotation=JSON.parse(await readFile('references/prism-hair-outline.json')),mask=polygonMask(annotation);await writeFile(out+'/hair-target-mask.png',mask.png);
 r.visibleHair={annotationSHA256:createHash('sha256').update(await readFile('references/prism-hair-outline.json')).digest('hex'),scope:annotation.limitations};
 for(const baseline of [true,false]){const id=baseline?'before':'after';await studio.render({module:'studies/prism-hair-mask.js',values:{baseline},views:['hero'],width:768,height:1376,out:out+'/mask-'+id});
  r.visibleHair[id]=await studio.compare({reference:out+'/hair-target-mask.png',candidate:out+'/mask-'+id+'/hero-material.png',referenceMask:out+'/hair-target-mask.png',candidateMask:out+'/mask-'+id+'/hero-material.png'});
 }
 r.completed.push('unchanged landmark test and occlusion-aware component mask comparison');await save();
 r.normalTransfer=await measureHair(out+'/hair');r.hairExports={};
 for(const mode of ['sculpt','cage','baked']){
  const report=await studio.render({module:'studies/prism-hair.js',values:{mode},views:['threequarter'],width:512,height:512,out:out+'/hair/'+mode,glb:true});
  const validation=await validator.validateBytes(new Uint8Array(await readFile(out+'/hair/'+mode+'/prism-hair.glb')),{maxIssues:10000});await writeFile(out+'/hair/'+mode+'/validation.json',JSON.stringify(validation,null,2));assert.equal(validation.issues.numErrors,0);assert.equal(validation.issues.truncated,false);r.hairExports[mode]={triangles:report.stats.triangles,errors:validation.issues.numErrors,warnings:validation.issues.numWarnings};
 }
 r.completed.push('independent normal transfer, unchanged low attributes and standalone hair exports');await save();
 await studio.sheet({out:out+'/comparison.png',title:'Actual fixed-camera 3D renders / shapes remain under review',columns:3,cellSize:480,tiles:[{file:out+'/baseline/hero-material.png',label:'Previous pose study'},{file:out+'/hero/hero-material.png',label:'Guided forms + baked hair'},{file:out+'/depth/side-clay.png',label:'Side clay: inspect depth separately'}]});
 await studio.sheet({out:out+'/hair-masks.png',title:'Visible geometry masks: white objects still occlude black hair',columns:3,cellSize:400,tiles:[{file:out+'/hair-target-mask.png',label:'Approximate manual reference mask'},{file:out+'/mask-before/hero-material.png',label:'Previous geometry'},{file:out+'/mask-after/hero-material.png',label:'Guide-loft geometry'}]});
 r.status='passed';
}catch(e){r.status='failed';r.error=e.stack;process.exitCode=1;}finally{await save();await studio.close();}
console.log(JSON.stringify({status:r.status,completed:r.completed,error:r.error,alignment:r.alignment,visibleHair:r.visibleHair},null,2));
