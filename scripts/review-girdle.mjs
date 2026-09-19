import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRenderBatch} from './render-batch.mjs';
import {validateBytes} from 'gltf-validator';
import {measureRecipe} from './measure-reference.mjs';
const out=process.argv[2]||'renders/girdle-review';await mkdir(out,{recursive:true});
const session=createRenderBatch({timeout:90000,maxJobs:18,transientRetries:0});
const report={cases:{},validation:{},visualAcceptance:'not-assessed',scope:'Source-boundary girdle bridges, retained limb poses and independent duct; not a welded skin or normal bake'};
const cameras=r=>Object.fromEntries(r.images.map(i=>[i.view,i.cameraState]));
async function render(id,opts){
 console.log('Render '+id);const r=await session.render({...opts,out:out+'/'+id});report.cases[id]=r;
 if(r.glb){const v=await validateBytes(new Uint8Array(await readFile(out+'/'+id+'/'+r.glb)));report.validation[id]={errors:v.issues.numErrors,warnings:v.issues.numWarnings,infos:v.issues.numInfos};await writeFile(out+'/'+id+'/validation.json',JSON.stringify(v,null,2));if(v.issues.numErrors||v.issues.numWarnings)throw new Error(id+' GLB failed');}
 await writeFile(out+'/review.json',JSON.stringify(report,null,2));return r;
}
try{
 const base={headStyle:'illustrated',bodyStyle:'articulated',limbStyle:'scalloped',poseStyle:'relaxed',gestureStyle:'counterpose',jointStyle:'housed',massStyle:'structured',handStyle:'relaxed',panelStyle:'cutaway',footStyle:'bridged',emitterStyle:'mapped'};
 const hero={module:'models/cyber-form-study.js',width:768,height:1376,views:['hero'],passes:['material','clay','silhouette']};
 const before=await render('before',{...hero,values:base});
 await render('after',{...hero,values:{...base,girdleStyle:'connected'},cameras:cameras(before),glb:true});
 const body={module:'studies/prism-girdle.js',width:560,height:660,views:['front','threequarter','side','back'],passes:['material','clay','wire']};
 const bodyValues={girdleStyle:'legacy'};
 const close=await render('body-before',{...body,values:bodyValues});
 await render('body-after',{...body,values:{...bodyValues,girdleStyle:'connected'},cameras:cameras(close),glb:true});
 const housing={module:'studies/boundary-duct.js',width:480,height:600,views:['threequarter','side'],passes:['material','clay','wire']};
 const prop=await render('housing-before',{...housing,values:{curved:false}});
 await render('housing-after',{...housing,values:{curved:true},cameras:cameras(prop),glb:true});
 report.alignment={before:await measureRecipe(hero.module,base),after:await measureRecipe(hero.module,{...base,girdleStyle:'connected'})};
 await session.sheet({out:out+'/hero-comparison.png',columns:2,cellSize:640,title:'Fixed camera, fixed limb pose: previous / connected neck and shoulder supports',tiles:['before','after'].map(id=>({label:id,file:out+'/'+id+'/hero-material.png'}))});
 await session.sheet({out:out+'/body-comparison.png',columns:2,cellSize:400,title:'Fixed views: previous / boundary-driven shoulder girdle and socket cowls',tiles:['front','threequarter','side','back'].flatMap(view=>['before','after'].map(id=>({label:view+' '+id,file:out+'/body-'+id+'/'+view+'-clay.png'})))});
 report.comparison=await session.compare({reference:out+'/before/hero-material.png',candidate:out+'/after/hero-material.png',referenceMask:out+'/before/hero-silhouette.png',candidateMask:out+'/after/hero-silhouette.png'});
 report.sourceFingerprints=[...new Set(Object.values(report.cases).map(r=>r.sourceFingerprint.sha256))];if(report.sourceFingerprints.length!==1)throw new Error('Source changed within review');
 await writeFile(out+'/review.json',JSON.stringify(report,null,2));
}catch(e){report.failure=String(e.stack||e);await writeFile(out+'/review.json',JSON.stringify(report,null,2));throw e;}
finally{await session.close();}
