import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {validateBytes} from 'gltf-validator';
import {createRenderBatch} from './render-batch.mjs';
import {loadXbot} from './load-xbot.mjs';
import {buildModel,dispose,inspect} from '../src/lib/modeling.js';
import {skeletonPose} from '../src/lib/skeleton-pose.js';
import {captureBonePose} from '../src/lib/bone-pose-state.js';
import {xbotNames,xbotStance,xbotPoised} from '../studies/xbot-pose.js';
import recipe from '../studies/imported-xbot.js';
const out=process.argv[2]||'renders/imported-humanoid-review';await mkdir(out,{recursive:true});
const report={cases:{},validation:{},roundtrip:{},visualAcceptance:'unreviewed',scope:'Actual Adobe/Mixamo Xbot from the public Three.js example; new authored hold poses, not animation retargeting or new geometry'};
const batch=createRenderBatch({timeout:60000,maxJobs:16,transientRetries:0});
const save=()=>writeFile(out+'/review.json',JSON.stringify(report,null,2));
const cameras=r=>Object.fromEntries(r.images.map(i=>[i.view,i.cameraState]));
const meshes=root=>{const all={};root.traverse(o=>{if(o.isSkinnedMesh)all[o.name]=o;});return all;};
function sample(root,clip){
 const reset=captureBonePose(root),mixer=new THREE.AnimationMixer(root);
 if(clip){mixer.clipAction(clip).play();mixer.setTime(.5);}root.updateMatrixWorld(true);root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});
 const values={};for(const [name,o]of Object.entries(meshes(root)))values[name]=Array.from({length:o.geometry.attributes.position.count},(_,i)=>o.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(o.matrixWorld).toArray());
 mixer.stopAllAction();mixer.uncacheRoot(root);reset();return values;
}
function difference(a,b){let max=0,sum=0,count=0;for(const [name,values]of Object.entries(a)){
 const other=b[name]||b[name.replace(/\s/g,'_')];assert.equal(values.length,other?.length,name);
 values.forEach((p,i)=>{const d=new THREE.Vector3(...p).distanceTo(new THREE.Vector3(...other[i]));max=Math.max(max,d);sum+=d*d;count++;});
 }return {vertices:count,maxMeters:max,rmsMeters:Math.sqrt(sum/count)};
}
async function render(name,options){
 console.log('Render '+name);const r=await batch.render({module:'studies/imported-xbot.js',out:out+'/'+name,...options});report.cases[name]=r;await save();
 if(r.glb){const bytes=await readFile(out+'/'+name+'/'+r.glb),v=await validateBytes(new Uint8Array(bytes));report.validation[name]=v.issues;assert.equal(v.issues.numErrors,0);assert.equal(v.issues.numWarnings,0);
 const decoded=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''),source=buildModel(recipe);
 for(const pose of ['neutral','confident','poised','silhouette']){
  let clip;source.traverse(o=>{clip??=o.animations?.find(c=>c.name===pose);});
  const diff=difference(sample(source,clip),sample(decoded.scene,decoded.animations.find(c=>c.name===pose)));assert.ok(diff.maxMeters<3e-6,pose+' skin roundtrip');report.roundtrip[name+'-'+pose]=diff;
 }
 dispose(source);dispose(decoded.scene);await save();}
 return r;
}
try{
 const loaded=await loadXbot(),subject=buildModel(recipe);report.source=loaded.scene.userData.sourceAsset;
 report.originalClips=loaded.animations.map(c=>c.name);report.originalGeometry=inspect(loaded.scene);
 const original=meshes(loaded.scene),copy=meshes(subject);
 for(const [name,o]of Object.entries(original)){
  const g=copy[name].geometry;assert.notEqual(g,o.geometry);assert.deepEqual(g.index.array,o.geometry.index.array);
  for(const [key,attribute]of Object.entries(o.geometry.attributes))assert.deepEqual(g.attributes[key].array,attribute.array,name+' '+key);
  assert.deepEqual(copy[name].skeleton.boneInverses.map(m=>m.toArray()),o.skeleton.boneInverses.map(m=>m.toArray()));
  copy[name].skeleton.boneInverses.forEach((m,i)=>assert.notEqual(m,o.skeleton.boneInverses[i]));
 }
 report.bindImport=difference(sample(loaded.scene),sample(subject));assert.ok(report.bindImport.maxMeters<1e-7);
 // Import hierarchy normalization must preserve existing source animation too.
 report.originalClipImport={};for(const name of ['idle','walk']){
  const clip=loaded.animations.find(c=>c.name===name),diff=difference(sample(loaded.scene,clip),sample(subject,clip));
  assert.ok(diff.maxMeters<1e-6);report.originalClipImport[name]=diff;
 }
 const controls=skeletonPose(subject,{names:xbotNames}),rest=controls.names.map(name=>controls.position(name));
 report.kinematics=xbotStance(controls);
 const tips=['LeftFoot','RightFoot','LeftHand','RightHand'];
 const capture=()=>Object.fromEntries(tips.map(name=>[name,{position:controls.position(name),quaternion:controls.orientation(name).toArray()}]));
 const held=capture();controls.reset();report.pinnedSolves=xbotPoised(controls);const retained=capture();
 report.pins={};for(const name of tips){
  const translation=new THREE.Vector3(...held[name].position).distanceTo(new THREE.Vector3(...retained[name].position));
  const angle=new THREE.Quaternion(...held[name].quaternion).normalize().angleTo(new THREE.Quaternion(...retained[name].quaternion).normalize());
  assert.ok(translation<1e-6&&angle<1e-6,name+' moved from pin');report.pins[name]={translationMeters:translation,rotationRadians:angle};
 }
 controls.reset();assert.deepEqual(controls.names.map(name=>controls.position(name)),rest);
 dispose(loaded.scene);dispose(subject);
 const hero={width:768,height:1376,views:['hero'],passes:['material','clay','silhouette'],time:.5};
 const neutral=await render('neutral',{...hero,clip:'neutral'});
 const confident=await render('confident',{...hero,clip:'confident',cameras:cameras(neutral),glb:true});
 assert.ok(confident.images[0].framing.occupancy>.75&&!confident.images[0].framing.clipped,'full-sized imported rig must survive browser rest reset');
 await render('poised',{...hero,clip:'poised',cameras:cameras(neutral),glb:true});
 const angles={width:600,height:800,views:['front','threequarter','side','back'],passes:['clay','wire'],time:.5};
 const a=await render('angles-neutral',{...angles,clip:'neutral'});
 await render('angles-confident',{...angles,clip:'confident',cameras:cameras(a)});
 await render('angles-poised',{...angles,clip:'poised',cameras:cameras(a)});
 await render('bind',{width:900,height:700,views:['front','threequarter'],passes:['material'],skeleton:true,glb:true});
 assert.deepEqual(await readFile(out+'/bind/imported-xbot.glb'),await readFile(out+'/confident/imported-xbot.glb'));assert.deepEqual(await readFile(out+'/bind/imported-xbot.glb'),await readFile(out+'/poised/imported-xbot.glb'));
 report.exportIsolation='Byte-identical fresh bind exports from all reviewed poses';
 const fixture={module:'studies/pinned-inspection-arm.js',width:550,height:600,views:['threequarter','side'],passes:['material','wire'],time:.5};
 const fixtureBefore=await batch.render({...fixture,clip:'before',out:out+'/probe-before'});report.cases['probe-before']=fixtureBefore;
 const fixtureAfter=await batch.render({...fixture,clip:'shifted',cameras:cameras(fixtureBefore),glb:true,out:out+'/probe-after'});report.cases['probe-after']=fixtureAfter;
 const probeBytes=await readFile(out+'/probe-after/'+fixtureAfter.glb),probeValidation=await validateBytes(new Uint8Array(probeBytes));
 report.validation['probe-after']=probeValidation.issues;assert.equal(probeValidation.issues.numErrors,0);assert.equal(probeValidation.issues.numWarnings,0);
 const probe=await new GLTFLoader().parseAsync(probeBytes.buffer.slice(probeBytes.byteOffset,probeBytes.byteOffset+probeBytes.byteLength),'');
 const resetProbe=captureBonePose(probe.scene);const transforms=[];
 for(const name of ['before','shifted']){
  const mixer=new THREE.AnimationMixer(probe.scene);mixer.clipAction(probe.animations.find(c=>c.name===name)).play();mixer.setTime(.5);probe.scene.updateMatrixWorld(true);
  const bone=probe.scene.getObjectByName('Probe');transforms.push({p:bone.getWorldPosition(new THREE.Vector3()),q:bone.getWorldQuaternion(new THREE.Quaternion())});
  mixer.stopAllAction();mixer.uncacheRoot(probe.scene);resetProbe();
 }
 report.probePinRoundtrip={translationMeters:transforms[0].p.distanceTo(transforms[1].p),rotationRadians:transforms[0].q.angleTo(transforms[1].q)};
 assert.ok(report.probePinRoundtrip.translationMeters<1e-6&&report.probePinRoundtrip.rotationRadians<1e-6);dispose(probe.scene);
 await batch.sheet({out:out+'/poised-board.png',columns:2,cellSize:650,title:'Actual same rig: previous / chest-pelvis opposition with held hands and feet',tiles:['confident','poised'].map(id=>({label:id,file:out+'/'+id+'/hero-material.png'}))});
 await batch.sheet({out:out+'/poised-angles.png',columns:2,cellSize:430,title:'Same cameras, same skin: previous / pinned body edit',tiles:['front','threequarter','side','back'].flatMap(view=>['confident','poised'].map(id=>({label:view+' '+id,file:out+'/angles-'+id+'/'+view+'-clay.png'})))});
 await batch.sheet({out:out+'/probe-board.png',columns:2,cellSize:500,title:'Independent mechanism: moving carriage, held probe pose',tiles:['before','after'].map(id=>({label:id,file:out+'/probe-'+id+'/threequarter-material.png'}))});
 report.sourceFingerprints=[...new Set(Object.values(report.cases).map(r=>r.sourceFingerprint.sha256))];assert.equal(report.sourceFingerprints.length,1);
 await batch.sheet({out:out+'/pose-board.png',columns:2,cellSize:650,title:'Actual Mixamo Xbot: neutral / authored weight-shift and look back',tiles:['neutral','confident'].map(id=>({label:id,file:out+'/'+id+'/hero-material.png'}))});
 await batch.sheet({out:out+'/skeleton-board.png',columns:2,cellSize:650,title:'Actual imported mesh and 67-bone skeleton / posed study',tiles:[{label:'Imported T bind and skeleton',file:out+'/bind/threequarter-material.png'},{label:'Authored pose on the same skin',file:out+'/confident/hero-material.png'}]});
 await batch.sheet({out:out+'/angles-board.png',columns:2,cellSize:430,title:'Same cameras, same skin: neutral / authored stance',tiles:['front','threequarter','side'].flatMap(view=>['neutral','confident'].map(id=>({label:view+' '+id,file:out+'/angles-'+id+'/'+view+'-clay.png'})))});
 await save();console.log('IMPORTED_HUMANOID_REVIEW_OK');
}catch(error){report.failure=String(error.stack||error);await save();throw error;}
finally{await batch.close();}
