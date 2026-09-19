import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRenderBatch} from './render-batch.mjs';
import {validateBytes} from 'gltf-validator';
import {measureRecipe} from './measure-reference.mjs';
const out=process.argv[2]||'renders/lookback-review';await mkdir(out,{recursive:true});
const session=createRenderBatch({timeout:120000,maxJobs:24,transientRetries:0});
const report={cases:{},validation:{},visualAcceptance:'not-assessed',scope:'A new pose hypothesis, fixed camera, explicit arm-ratio correction with fixed total reach, unchanged leg lengths; separate pigment and shader controls, no new normal bake'};
const cameras=r=>Object.fromEntries(r.images.map(i=>[i.view,i.cameraState]));
async function render(id,opts){
 console.log('Render '+id);const r=await session.render({...opts,out:out+'/'+id});report.cases[id]=r;
 if(r.glb){const v=await validateBytes(new Uint8Array(await readFile(out+'/'+id+'/'+r.glb)));report.validation[id]={errors:v.issues.numErrors,warnings:v.issues.numWarnings,infos:v.issues.numInfos};await writeFile(out+'/'+id+'/validation.json',JSON.stringify(v,null,2));if(v.issues.numErrors||v.issues.numWarnings)throw new Error(id+' GLB failed');}
 await writeFile(out+'/review.json',JSON.stringify(report,null,2));return r;
}
try{
 const base={headStyle:'illustrated',bodyStyle:'articulated',limbStyle:'scalloped',poseStyle:'relaxed',gestureStyle:'counterpose',jointStyle:'housed',massStyle:'structured',handStyle:'relaxed',panelStyle:'cutaway',footStyle:'bridged',emitterStyle:'mapped',girdleStyle:'connected',shoulderStyle:'seated'};
 const hero={module:'models/cyber-form-study.js',width:768,height:1376,views:['hero'],passes:['material','clay','silhouette']};
 const before=await render('before',{...hero,values:base}),newPose={...base,gestureStyle:'lookback'};
 await render('pose-only',{...hero,values:newPose,cameras:cameras(before)});
 await render('pigment',{...hero,values:{...newPose,surfaceStyle:'pigment'},cameras:cameras(before),glb:true});
 await render('illustrated',{...hero,values:{...newPose,surfaceStyle:'outlined'},cameras:cameras(before),glb:true});
 const body={module:'studies/prism-body.js',width:560,height:700,views:['front','threequarter','side'],passes:['material','clay','wire']};
 const bodyValues={massStyle:'structured',handStyle:'relaxed',panelStyle:'cutaway',girdleStyle:'connected',jointStyle:'housed',gestureStyle:'counterpose'};
 const close=await render('body-before',{...body,values:bodyValues});
 await render('body-after',{...body,values:{...bodyValues,gestureStyle:'lookback',surfaceStyle:'outlined'},cameras:cameras(close)});
 const prop={module:'studies/posed-enamel.js',width:480,height:600,views:['threequarter','side'],passes:['material','clay','wire']};
 const fixture=await render('fixture-before',{...prop,values:{shaped:false,marked:false}});
 await render('fixture-after',{...prop,values:{shaped:true,marked:true},cameras:cameras(fixture),glb:true});
 report.alignment={before:await measureRecipe(hero.module,base),after:await measureRecipe(hero.module,newPose)};
 await session.sheet({out:out+'/hero-comparison.png',columns:3,cellSize:640,title:'Previous / pose-only / pose with pigment and directed shading',tiles:['before','pose-only','illustrated'].map(id=>({label:id,file:out+'/'+id+'/hero-material.png'}))});
 await session.sheet({out:out+'/body-comparison.png',columns:2,cellSize:400,title:'Fixed views: previous / narrower turned rib cage with re-solved limbs',tiles:['front','threequarter','side'].flatMap(view=>['before','after'].map(id=>({label:view+' '+id,file:out+'/body-'+id+'/'+view+'-clay.png'})))});
 report.poseComparison=await session.compare({reference:out+'/before/hero-material.png',candidate:out+'/pose-only/hero-material.png',referenceMask:out+'/before/hero-silhouette.png',candidateMask:out+'/pose-only/hero-silhouette.png'});
 report.lookComparison=await session.compare({reference:out+'/pose-only/hero-material.png',candidate:out+'/illustrated/hero-material.png',referenceMask:out+'/pose-only/hero-silhouette.png',candidateMask:out+'/illustrated/hero-silhouette.png'});
 report.sourceFingerprints=[...new Set(Object.values(report.cases).map(r=>r.sourceFingerprint.sha256))];if(report.sourceFingerprints.length!==1)throw new Error('Source changed within review');
 await writeFile(out+'/review.json',JSON.stringify(report,null,2));
}catch(e){report.failure=String(e.stack||e);await writeFile(out+'/review.json',JSON.stringify(report,null,2));throw e;}
finally{await session.close();}
