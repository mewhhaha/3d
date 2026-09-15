import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { createRenderSession } from './render.mjs';
import validator from 'gltf-validator';
const out='renders/local-check';await mkdir(out,{recursive:true});
const studio=await createRenderSession();
try {
  const common={module:'models/anatomy-cage-hand.js',values:{representation:'cage'},width:512,height:640};
  const rest=await studio.render({...common,views:['front','side','top','threequarter'],passes:['material','clay','normal','wire','silhouette'],out:out+'/rest',glb:true});
  assert.equal(rest.images.length,20);
  for(const image of rest.images){assert.ok(image.bytes>1000);assert.ok(image.framing.occupancy>.7&&image.framing.occupancy<.95);assert.ok(image.framing.ndcMin.slice(0,2).every(x=>x>-.96));assert.ok(image.framing.ndcMax.slice(0,2).every(x=>x<.96));}
  const posed=await studio.render({...common,clip:'Grasp',time:1.1,views:['threequarter'],passes:['clay'],skeleton:true,out:out+'/posed',glb:true});
  const before=await readFile(out+'/rest/anatomy-cage-hand.glb'),after=await readFile(out+'/posed/anatomy-cage-hand.glb');
  assert.deepEqual(before,after,'Preview pass and pose must not change GLB');
  const gltf=await validator.validateBytes(new Uint8Array(before),{maxIssues:100});assert.equal(gltf.issues.numErrors,0);
  const perspective=await studio.render({module:'models/orbit-bot.js',views:['threequarter'],projection:'perspective',out:out+'/perspective',width:390,height:844});
  assert.ok(perspective.images[0].framing.occupancy<.95);
  await assert.rejects(studio.render({...common,module:'../outside.js'}),/relative/);
  await assert.rejects(studio.render({...common,values:{typo:true}}),/Unknown parameters/);
  await assert.rejects(studio.render({...common,clip:'missing'}),/Unknown clip/);
  // A failed recipe must not poison the next independent build.
  const recovered=await studio.render({...common,views:['front'],out:out+'/recovered'});assert.equal(recovered.stats.triangles,11840);
  const cameras=Object.fromEntries(rest.images.map(i=>[i.view,i.cameraState]));
  const locked=await studio.render({...common,views:['front'],passes:['material','silhouette'],cameras,out:out+'/locked'});
  assert.deepEqual(locked.images[0].cameraState,cameras.front,'Reference camera and lighting stay fixed');
  const pixels=await studio.compare({reference:out+'/rest/front-material.png',candidate:out+'/locked/front-material.png',referenceMask:out+'/rest/front-silhouette.png',candidateMask:out+'/locked/front-silhouette.png'});
  assert.equal(pixels.silhouetteIoU,1);assert.equal(pixels.meanAbsoluteRgbError,0);
  await assert.rejects(studio.render({...common,views:['front'],cameras,width:500}),/original image dimensions/);
  const temporary='studies/_freshness';await mkdir(temporary,{recursive:true});
  try {
    await writeFile(temporary+'/shape.js','export const height=1;');
    await writeFile(temporary+'/recipe.js',`import {defineModel,box} from '../../src/lib/modeling.js';import {height} from './shape.js';export default defineModel({id:'freshness',title:'Fresh import fixture',parameters:{},build:()=>box({size:[1,height,1]})});`);
    const first=await studio.render({module:temporary+'/recipe.js',views:['front'],width:128,height:128,out:out+'/fresh-a'});
    await writeFile(temporary+'/shape.js','export const height=2;');
    const second=await studio.render({module:temporary+'/recipe.js',views:['front'],width:128,height:128,out:out+'/fresh-b'});
    assert.equal(first.stats.dimensions[1],1);assert.equal(second.stats.dimensions[1],2,'Imported helper edits are not stale');
  }finally{await rm(temporary,{recursive:true,force:true});}
  const report={capabilities:studio.capabilities,restMs:rest.totalMs,posedMs:posed.totalMs,tests:'20 views/passes; framing; perspective; rig transfer; GLB validation; pose/export isolation; invalid-input rejection; recovery; locked cameras/lights; exact pixel comparison; edited dependency freshness',validation:gltf.issues};
  await writeFile(out+'/verification.json',JSON.stringify(report,null,2));console.log('LOCAL_RENDER_OK',JSON.stringify(report));
}finally{await studio.close();}
