import assert from 'node:assert/strict';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRenderBatch } from './render-batch.mjs';
import { runStudy } from './study.mjs';
import { measureRecipe } from './measure-reference.mjs';
import { writeReferenceOverlay } from './reference-overlay.mjs';
const out='renders/pose-review';await mkdir(out,{recursive:true});
const results={schema:1,sourceRevision:process.env.GITHUB_SHA||null,status:'running',visualAcceptance:'not-assessed',completed:[]};
async function checkpoint(){await writeFile(out+'/verification.json.tmp',JSON.stringify(results,null,2));await rename(out+'/verification.json.tmp',out+'/verification.json');}
await checkpoint();let studio;
try {
 studio=createRenderBatch({maxJobs:24});
 const spec=JSON.parse(await readFile('studies/cyber-pose.json','utf8'));
 const study=await runStudy(spec,{session:studio,out:out+'/stages'});
 assert.equal(study.status,'passed',JSON.stringify(study.cases));results.completed.push('fixed-camera stages');await checkpoint();
 const glb=await readFile(out+'/stages/assembly/cyber-pose-study.glb'),posed=await readFile(out+'/stages/survey/cyber-pose-study.glb');
 assert.deepEqual(glb,posed,'Preview head motion altered clean export');
 const json=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());
 assert.equal(json.cameras.length,1);assert.equal(json.extensions.KHR_lights_punctual.lights.length,5);
 assert.ok(json.images.every(i=>Number.isInteger(i.bufferView)));
 results.completed.push('validated scene exports and preview isolation');await checkpoint();
 const hero=await studio.render({module:'models/cyber-pose-study.js',views:['hero'],width:768,height:1376,out:out+'/hero'});
 assert.ok(!hero.images[0].framing.clipped,'Final scene crop clips the character');
 const other=await studio.render({module:'models/cyber-pose-study.js',views:['side','back'],passes:['clay'],width:700,height:1000,out:out+'/depth'});
 assert.ok(other.images.every(i=>!i.framing.clipped));
 const baseline=await studio.render({module:'models/cyber-android-scene.js',views:['hero'],width:768,height:1376,out:out+'/baseline'});
 results.completed.push('hero and alternative-depth views');await checkpoint();
 const before=await measureRecipe('models/cyber-android-scene.js'),after=await measureRecipe('models/cyber-pose-study.js');
 for(const [name,report] of [['before',before],['after',after]])await writeFile(out+`/${name}-alignment.json`,JSON.stringify(report,null,2));
 assert.ok(after.rows.every(r=>r.visible),'Measured emitter or eye anchor is outside image');
 assert.ok(after.rmsPixels<before.rmsPixels*.2,'Pose has not meaningfully improved screen alignment');
 const annotations=await readFile('references/prism.json');
 results.alignment={beforeRmsPixels:before.rmsPixels,afterRmsPixels:after.rmsPixels,maxPixels:after.maxPixels,featureCount:after.rows.length,annotationSHA256:createHash('sha256').update(annotations).digest('hex'),scope:after.warning};
 results.nextPriorities=after.nextPriorities;results.hairEnvelope=after.regions.hair.envelope.iou;
 results.triangles=hero.stats.triangles;results.completed.push('screen landmarks and coarse mass envelopes');await checkpoint();
 if(process.env.REFERENCE_IMAGE){await writeReferenceOverlay({reference:process.env.REFERENCE_IMAGE,candidate:out+'/hero/hero-material.png',report:out+'/after-alignment.json',out:out+'/reference-overlay.svg'});results.overlay='reference-overlay.svg';}
 // The old recipe deliberately keeps its original camera. Only the four new stages share cameras.
 await studio.sheet({title:'Actual 3D output — placement improved; shape is still unaccepted',out:out+'/comparison.png',columns:3,cellSize:420,tiles:[{label:'Previous composition / original camera',file:out+'/baseline/hero-material.png'},{label:'New placement / reference camera',file:out+'/hero/hero-material.png'},{label:'Side clay / depth hypothesis',file:out+'/depth/side-clay.png'}]});
 results.status='passed';
} catch(error){results.status='failed';results.error=error.stack;process.exitCode=1;}
finally{await checkpoint();await studio?.close();}
console.log(JSON.stringify(results,null,2));
