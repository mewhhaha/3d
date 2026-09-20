import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {validateBytes} from 'gltf-validator';
import {createRenderBatch} from './render-batch.mjs';
import {humanoidRig,humanoidProportions,poseHumanoid} from '../src/lib/humanoid-rig.js';
import {shotProportions,shotPose,stancePose} from '../studies/prism-mannequin-pose.js';
const out=process.argv[2]||'renders/support-leg-review';await mkdir(out,{recursive:true});
const report={cases:{},validation:{},kinematics:{},visualAcceptance:'unreviewed',scope:'Plain mannequin stance, unchanged bind mesh; no balance simulation or Mixamo retargeting'};
const batch=createRenderBatch({timeout:60000,maxJobs:16,transientRetries:0});
const cameras=r=>Object.fromEntries(r.images.map(i=>[i.view,i.cameraState]));
const save=()=>writeFile(out+'/review.json',JSON.stringify(report,null,2));
async function render(name,options){
 console.log('Render '+name);
 const r=await batch.render({out:out+'/'+name,...options});report.cases[name]=r;await save();
 if(r.glb){const v=await validateBytes(new Uint8Array(await readFile(out+'/'+name+'/'+r.glb)));report.validation[name]=v.issues;await save();assert.equal(v.issues.numErrors,0);assert.equal(v.issues.numWarnings,0);}
 return r;
}
try{
 const hero={module:'studies/prism-mannequin-shot.js',width:768,height:1376,views:['hero'],passes:['material','clay','silhouette'],time:.5};
 const before=await render('before',{...hero,clip:'shot'});
 await render('stance',{...hero,clip:'stance',cameras:cameras(before),glb:true});
 const angle={module:hero.module,width:600,height:800,views:['front','threequarter','side'],passes:['clay','wire'],time:.5};
 const other=await render('angles-before',{...angle,clip:'shot'});
 await render('angles-stance',{...angle,clip:'stance',cameras:cameras(other)});
 await render('bind',{...angle,views:['front','threequarter'],passes:['material'],clip:undefined,skeleton:true,glb:true});
 assert.deepEqual(await readFile(out+'/bind/prism-mannequin-shot.glb'),await readFile(out+'/stance/prism-mannequin-shot.glb'));
 report.exportIsolation='byte-identical bind and stance-preview GLBs';
 const plain={module:'studies/humanoid-support.js',width:620,height:840,views:['front','side'],passes:['material'],time:.5};
 const slender=await render('slender-bind',{...plain,values:{build:'slender'}});
 await render('broad-bind',{...plain,values:{build:'broad'},cameras:cameras(slender)});
 await render('slender-support',{...plain,values:{build:'slender'},clip:'support',cameras:cameras(slender)});
 await render('broad-support',{...plain,values:{build:'broad'},clip:'support',cameras:cameras(slender),glb:true});
 const boom={module:'studies/two-link-boom.js',width:550,height:600,views:['threequarter'],passes:['material','wire']};
 const stiff=await render('boom-25',{...boom,values:{rootMode:'sliding',bend:25}});
 await render('boom-65',{...boom,values:{rootMode:'sliding',bend:65},cameras:cameras(stiff),glb:true});
 for(const [name,pose]of [['before',shotPose],['stance',stancePose]]){
  const r=humanoidRig(humanoidProportions(shotProportions)),solved=poseHumanoid(r,pose);
  report.kinematics[name]={leftBend:solved.Left.leg.bendDegrees,rightBend:solved.Right.leg.bendDegrees,rootSlide:solved.support?.slide??0,targets:solved};r.skeleton.dispose();
 }
 report.sourceFingerprints=[...new Set(Object.values(report.cases).map(c=>c.sourceFingerprint.sha256))];assert.equal(report.sourceFingerprints.length,1);
 await batch.sheet({out:out+'/stance-board.png',columns:2,cellSize:650,title:'Plain rig, fixed camera: previous / supporting-leg study',tiles:['before','stance'].map(id=>({label:id,file:out+'/'+id+'/hero-material.png'}))});
 await batch.sheet({out:out+'/angles-board.png',columns:2,cellSize:440,title:'Same mesh and cameras: previous / support-leg pose',tiles:['front','threequarter','side'].flatMap(view=>['before','stance'].map(id=>({label:view+' '+id,file:out+'/angles-'+id+'/'+view+'-clay.png'})))});
 await batch.sheet({out:out+'/foundation-board.png',columns:2,cellSize:580,title:'One original humanoid layout: slender / broad; T bind above, supported stance below',tiles:['slender-bind','broad-bind','slender-support','broad-support'].map(id=>({label:id,file:out+'/'+id+'/front-material.png'}))});
 await save();console.log('SUPPORT_LEG_REVIEW_OK');
}catch(error){report.failure=String(error.stack||error);await save();throw error;}
finally{await batch.close();}
