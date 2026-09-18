import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRenderBatch} from './render-batch.mjs';
import {validateBytes} from 'gltf-validator';
import {measureRecipe} from './measure-reference.mjs';
const out=process.argv[2]||'renders/foot-review';await mkdir(out,{recursive:true});
const session=createRenderBatch({timeout:90000,maxJobs:12,transientRetries:0}),report={cases:{},validation:{},visualAcceptance:'not-assessed'};
const cameras=r=>Object.fromEntries(r.images.map(i=>[i.view,i.cameraState]));
async function render(id,opts){console.log('Render '+id);const r=await session.render({...opts,out:out+'/'+id});report.cases[id]=r;
 if(r.glb){const v=await validateBytes(new Uint8Array(await readFile(out+'/'+id+'/'+r.glb)));report.validation[id]={errors:v.issues.numErrors,warnings:v.issues.numWarnings,infos:v.issues.numInfos};await writeFile(out+'/'+id+'/validation.json',JSON.stringify(v,null,2));if(v.issues.numErrors||v.issues.numWarnings)throw new Error(id+' GLB failed');}
 await writeFile(out+'/review.json',JSON.stringify(report,null,2));return r;}
try{
 const base={headStyle:'illustrated',bodyStyle:'articulated',limbStyle:'scalloped',poseStyle:'relaxed',gestureStyle:'counterpose',jointStyle:'housed',massStyle:'sculpted',handStyle:'relaxed',panelStyle:'cutaway'};
 const hero={module:'models/cyber-form-study.js',width:768,height:1376,views:['hero'],passes:['material','clay','silhouette']};
 const before=await render('before',{...hero,values:base});
 await render('after',{...hero,values:{...base,footStyle:'bridged'},cameras:cameras(before),glb:true});
 const foot={module:'studies/prism-foot.js',width:620,height:640,views:['front','threequarter','side'],passes:['material','clay','wire']};
 const old=await render('foot-before',{...foot,values:{style:'legacy'}});
 await render('foot-after',{...foot,cameras:cameras(old),glb:true});
 await render('foot-reverse',{...foot,values:{side:-1},views:['threequarter'],passes:['material','clay'],cameras:cameras(old)});
 const bracket={module:'studies/apertured-bracket.js',width:520,height:560,views:['threequarter','side'],passes:['material','wire']};
 const solid=await render('bracket-before',{...bracket,values:{apertures:false}});
 await render('bracket-after',{...bracket,cameras:cameras(solid),glb:true});
 report.alignment={before:await measureRecipe(hero.module,base),after:await measureRecipe(hero.module,{...base,footStyle:'bridged'})};
 await session.sheet({out:out+'/hero-comparison.png',columns:2,cellSize:680,title:'Locked camera: published feet / bridged heel, instep and sole',tiles:['before','after'].map(id=>({label:id,file:out+'/'+id+'/hero-material.png'}))});
 await session.sheet({out:out+'/foot-comparison.png',columns:2,cellSize:440,title:'Fixed cameras: uniform outsole and ankle guards / apertured mechanical foot',tiles:['front','threequarter','side'].flatMap(view=>['before','after'].map(id=>({label:view+' '+id,file:out+'/foot-'+id+'/'+view+'-material.png'})))});
 report.sourceFingerprints=[...new Set(Object.values(report.cases).map(r=>r.sourceFingerprint.sha256))];
 if(report.sourceFingerprints.length!==1)throw new Error('Source changed within review');
 await writeFile(out+'/review.json',JSON.stringify(report,null,2));
}finally{await session.close();}
