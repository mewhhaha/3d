import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRenderSession } from './render.mjs';
import { runStudy } from './study.mjs';
import validator from 'gltf-validator';
const out='renders/cyber-review';await mkdir(out,{recursive:true});
const studio=await createRenderSession();
const results={sourceRevision:process.env.GITHUB_SHA||null,visualAcceptance:'not-assessed'};
try {
 const spec=JSON.parse(await readFile('studies/cyber-android-scene.json','utf8'));
 const study=await runStudy(spec,{session:studio,out:out+'/study'});
 assert.equal(study.status,'passed',JSON.stringify(study.cases));results.study='study/study.json';
 const hero=await readFile(out+'/study/hero/cyber-android-scene.glb');
 const posed=await readFile(out+'/study/survey/cyber-android-scene.glb');
 assert.deepEqual(hero,posed,'Preview pose and optics cannot change the exported scene');
 const gltf=JSON.parse(hero.subarray(20,20+hero.readUInt32LE(12)).toString('utf8'));
 assert.equal(gltf.cameras.length,1);assert.equal(gltf.extensions.KHR_lights_punctual.lights.length,5);
 assert.ok(gltf.animations.some(a=>a.name==='Survey'));
 assert.ok(gltf.images.every(i=>Number.isInteger(i.bufferView)),'Images embedded, no external reference');
 const beauty=await studio.render({module:'models/cyber-android-scene.js',views:['hero'],width:768,height:1376,out:out+'/hero'});
 assert.equal(beauty.images[0].framing.clipped,false);
 const asset=await studio.render({module:'models/cyber-android.js',views:['front','side','back'],passes:['material','clay'],width:700,height:1000,out:out+'/asset',glb:true});
 const validation=await validator.validateBytes(new Uint8Array(await readFile(out+'/asset/cyber-android.glb')),{maxIssues:10000});
 assert.equal(validation.issues.numErrors,0);assert.equal(validation.issues.truncated,false);
 await writeFile(out+'/asset/validation.json',JSON.stringify(validation,null,2));
 const portrait=await studio.render({module:'models/cyber-android.js',focus:'HeadMount',views:['front'],width:768,height:768,out:out+'/portrait'});
 const pack=await studio.render({module:'models/cyber-android.js',focus:'ReactorBackpack',views:['side'],width:768,height:768,out:out+'/backpack'});
 results.scene={triangles:beauty.stats.triangles,meshes:beauty.stats.meshes,lights:5,cameras:1,animations:gltf.animations.map(a=>a.name)};
 results.character={triangles:asset.stats.triangles,meshes:asset.stats.meshes,validation:{errors:validation.issues.numErrors,warnings:validation.issues.numWarnings,infos:validation.issues.numInfos}};
 results.exportIsolation='byte-identical after Survey pose';results.status='passed';
 await studio.sheet({title:'Actual 3D checkpoint — hero, geometry and portrait',out:out+'/contact.png',columns:3,cellSize:430,tiles:[{label:'Authored scene',file:out+'/hero/hero-material.png'},{label:'Side: geometry only',file:out+'/asset/side-clay.png'},{label:'Portrait: remaining shape limitations',file:out+'/portrait/front-material.png'}]});
} catch(error){results.status='failed';results.error=error.stack;throw error;}
finally{await writeFile(out+'/verification.json',JSON.stringify(results,null,2));await studio.close();}
console.log(JSON.stringify(results,null,2));
