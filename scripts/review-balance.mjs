import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRenderBatch} from './render-batch.mjs';
import {validateBytes} from 'gltf-validator';
import {measureRecipe} from './measure-reference.mjs';
const out=process.argv[2]||'renders/balance-review';await mkdir(out,{recursive:true});
const session=createRenderBatch({timeout:120000,maxJobs:20,transientRetries:0});
const report={cases:{},validation:{},visualAcceptance:'not-assessed',scope:'Far-arm depth correction and proximal thigh shell continuity; fixed endpoints and lengths, no added detail bake'};
const cameras=r=>Object.fromEntries(r.images.map(i=>[i.view,i.cameraState]));
async function render(id,opts){
 console.log('Render '+id);const r=await session.render({...opts,out:out+'/'+id});report.cases[id]=r;
 if(r.glb){const v=await validateBytes(new Uint8Array(await readFile(out+'/'+id+'/'+r.glb)));report.validation[id]={errors:v.issues.numErrors,warnings:v.issues.numWarnings,infos:v.issues.numInfos};await writeFile(out+'/'+id+'/validation.json',JSON.stringify(v,null,2));if(v.issues.numErrors||v.issues.numWarnings)throw new Error(id+' GLB failed');}
 await writeFile(out+'/review.json',JSON.stringify(report,null,2));return r;
}
try{
 const base={headStyle:'illustrated',bodyStyle:'articulated',limbStyle:'scalloped',poseStyle:'relaxed',gestureStyle:'lookback',jointStyle:'housed',massStyle:'structured',handStyle:'relaxed',panelStyle:'cutaway',footStyle:'bridged',emitterStyle:'mapped',girdleStyle:'connected',shoulderStyle:'seated',surfaceStyle:'outlined'};
 const hero={module:'models/cyber-form-study.js',width:768,height:1376,views:['hero'],passes:['material','clay','silhouette']};
 const before=await render('before',{...hero,values:base}),pose={...base,gestureStyle:'poised'},after={...pose,panelStyle:'swept'};
 await render('pose-only',{...hero,values:pose,cameras:cameras(before)});
 await render('after',{...hero,values:after,cameras:cameras(before),glb:true});
 await render('pbr',{...hero,values:{...after,surfaceStyle:'pigment'},cameras:cameras(before)});
 const body={module:'studies/prism-body.js',width:560,height:700,views:['front','threequarter','side'],passes:['material','clay','wire']};
 const bodyValues={massStyle:'structured',handStyle:'relaxed',panelStyle:'cutaway',girdleStyle:'connected',jointStyle:'housed',gestureStyle:'lookback',shoulderStyle:'seated',emitterStyle:'mapped',surfaceStyle:'outlined'};
 const close=await render('body-before',{...body,values:bodyValues});
 await render('body-after',{...body,values:{...bodyValues,gestureStyle:'poised',panelStyle:'swept'},cameras:cameras(close),glb:true});
 const fixture={module:'studies/plane-boom.js',width:480,height:600,views:['threequarter','side'],passes:['material','clay','wire']};
 const a=await render('fixture-before',{...fixture,values:{constrained:false}});
 await render('fixture-after',{...fixture,values:{constrained:true},cameras:cameras(a),glb:true});
 report.alignment={before:await measureRecipe(hero.module,base),after:await measureRecipe(hero.module,after)};
 await session.sheet({out:out+'/hero-comparison.png',columns:3,cellSize:600,title:'Fixed camera: previous / corrected far arm / arm and swept thigh covers',tiles:['before','pose-only','after'].map(id=>({label:id,file:out+'/'+id+'/hero-material.png'}))});
 await session.sheet({out:out+'/body-comparison.png',columns:2,cellSize:400,title:'Previous / far-arm depth and proximal thigh volume',tiles:['front','threequarter','side'].flatMap(view=>['before','after'].map(id=>({label:view+' '+id,file:out+'/body-'+id+'/'+view+'-clay.png'})))});
 report.comparison=await session.compare({reference:out+'/before/hero-material.png',candidate:out+'/after/hero-material.png',referenceMask:out+'/before/hero-silhouette.png',candidateMask:out+'/after/hero-silhouette.png'});
 report.sourceFingerprints=[...new Set(Object.values(report.cases).map(r=>r.sourceFingerprint.sha256))];if(report.sourceFingerprints.length!==1)throw new Error('Source changed within review');
 await writeFile(out+'/review.json',JSON.stringify(report,null,2));
}catch(e){report.failure=String(e.stack||e);await writeFile(out+'/review.json',JSON.stringify(report,null,2));throw e;}
finally{await session.close();}
