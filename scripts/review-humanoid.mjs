import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {validateBytes} from 'gltf-validator';
import {createRenderBatch} from './render-batch.mjs';
import recipe from '../models/humanoid-mannequin.js';
import {buildModel,dispose} from '../src/lib/modeling.js';
const out=process.argv[2]||'renders/humanoid-review';await mkdir(out,{recursive:true});
const report={cases:{},validation:{},roundtrip:{},visualAcceptance:'unreviewed',scope:'Plain original humanoid proxy; not Mixamo retargeting or a rebuilt android'};
const batch=createRenderBatch({timeout:60000,maxJobs:12,transientRetries:0});
const cameras=r=>Object.fromEntries(r.images.map(i=>[i.view,i.cameraState]));
async function save(){await writeFile(out+'/review.json',JSON.stringify(report,null,2));}
async function render(name,options){
 console.log('Render '+name);
 const r=await batch.render({module:'models/humanoid-mannequin.js',out:out+'/'+name,...options});report.cases[name]=r;
 if(r.glb){const data=await readFile(out+'/'+name+'/'+r.glb),v=await validateBytes(new Uint8Array(data));
  report.validation[name]=v.issues;await save();assert.equal(v.issues.numErrors,0);assert.equal(v.issues.numWarnings,0);
  const decoded=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
  const source=buildModel(recipe,options.values||{}),clips=[];source.traverse(n=>clips.push(...n.animations||[]));
  const sample=(root,animations,pose)=>{
   const mixer=new THREE.AnimationMixer(root);mixer.clipAction(animations.find(c=>c.name===pose)).play();mixer.setTime(.5);root.updateMatrixWorld(true);
   root.traverse(n=>{if(n.isSkinnedMesh)n.skeleton.update();});
   const result={};root.traverse(n=>{if(!n.isSkinnedMesh)return;const count=n.geometry.attributes.position.count;
    result[n.name]=[0,Math.floor(count*.25),Math.floor(count*.6),count-1].map(i=>n.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(n.matrixWorld).toArray());});
   mixer.stopAllAction();mixer.uncacheRoot(root);return result;
  };
  report.roundtrip[name]={};
  for(const pose of ['neutral','contrapposto','lookback']){
   const a=sample(source,clips,pose),b=sample(decoded.scene,decoded.animations,pose);let maximum=0,samples=0;
   for(const [name,points]of Object.entries(a)){
    const key=name.replace(/\s/g,'_');assert.ok(b[key]||b[name],`Missing imported mesh ${name}`);
    const other=b[key]||b[name];points.forEach((p,i)=>{maximum=Math.max(maximum,new THREE.Vector3(...p).distanceTo(new THREE.Vector3(...other[i])));samples++;});
   }
   assert.ok(maximum<2e-6,`${pose}: skin roundtrip error ${maximum}`);report.roundtrip[name][pose]={samples,maxPositionErrorMeters:maximum};
  }
  dispose(source);dispose(decoded.scene);
 }
 await save();return r;
}
try{
 const square={width:800,height:800,views:['front','threequarter'],passes:['material','wire'],skeleton:true};
 await render('bind',{...square,glb:true});
 const shot={width:640,height:900,views:['front','threequarter','side'],passes:['material','clay','wire','silhouette'],clip:'neutral',time:.5};
 const neutral=await render('slender-neutral',shot);
 const locked={...shot,cameras:cameras(neutral)};
 await render('slender-contrapposto',{...locked,clip:'contrapposto'});
 await render('slender-lookback',{...locked,clip:'lookback',glb:true});
 await render('broad-neutral',{...locked,values:{build:'broad'}});
 await render('broad-lookback',{...locked,values:{build:'broad'},clip:'lookback',glb:true});
 await render('skeleton',{...locked,views:['front'],passes:['material'],clip:'lookback',skeleton:true});
 // Preview pose/clay/skeleton overlays must not leak into the model export.
 const bind=await readFile(out+'/bind/humanoid-mannequin.glb'),posed=await readFile(out+'/slender-lookback/humanoid-mannequin.glb');
 assert.deepEqual(bind,posed);report.exportIsolation='byte-identical bind and posed-preview GLBs';
 report.sourceFingerprints=[...new Set(Object.values(report.cases).map(c=>c.sourceFingerprint.sha256))];assert.equal(report.sourceFingerprints.length,1);
 await batch.sheet({out:out+'/pose-board.png',columns:3,cellSize:600,title:'One simple rig: neutral / weight shift / look-back (fixed camera)',tiles:['slender-neutral','slender-contrapposto','slender-lookback'].map(id=>({label:id,file:out+'/'+id+'/front-material.png'}))});
 await batch.sheet({out:out+'/proportion-board.png',columns:2,cellSize:600,title:'Same skeleton layout, different proportions: slender / broad',tiles:['front','side'].flatMap(view=>['slender-neutral','broad-neutral'].map(id=>({label:id+' '+view,file:out+'/'+id+'/'+view+'-clay.png'})))});
 await save();console.log('HUMANOID_REVIEW_OK');
}catch(error){report.failure=String(error.stack||error);await save();throw error;}
finally{await batch.close();}
