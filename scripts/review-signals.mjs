import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRenderBatch} from './render-batch.mjs';
import {validateBytes} from 'gltf-validator';
import {measureRecipe} from './measure-reference.mjs';
const out=process.argv[2]||'renders/signal-review';await mkdir(out,{recursive:true});
const session=createRenderBatch({timeout:90000,maxJobs:16,transientRetries:0}),report={cases:{},validation:{},visualAcceptance:'not-assessed',scope:'Authored color/emission maps on a low lens, NOT a normal bake or geometry-equivalent transfer'};
const cameras=r=>Object.fromEntries(r.images.map(i=>[i.view,i.cameraState]));
async function render(id,opts){console.log('Render '+id);const r=await session.render({...opts,out:out+'/'+id});report.cases[id]=r;
 if(r.glb){const v=await validateBytes(new Uint8Array(await readFile(out+'/'+id+'/'+r.glb)));report.validation[id]={errors:v.issues.numErrors,warnings:v.issues.numWarnings,infos:v.issues.numInfos};await writeFile(out+'/'+id+'/validation.json',JSON.stringify(v,null,2));if(v.issues.numErrors||v.issues.numWarnings)throw new Error(id+' GLB failed');}
 await writeFile(out+'/review.json',JSON.stringify(report,null,2));return r;}
try{
 const base={headStyle:'illustrated',bodyStyle:'articulated',limbStyle:'scalloped',poseStyle:'relaxed',gestureStyle:'counterpose',jointStyle:'housed',massStyle:'sculpted',handStyle:'relaxed',panelStyle:'cutaway',footStyle:'bridged'};
 const hero={module:'models/cyber-form-study.js',width:768,height:1376,views:['hero'],passes:['material','clay','silhouette']};
 const before=await render('before',{...hero,values:base,glb:true});
 await render('after',{...hero,values:{...base,emitterStyle:'mapped'},cameras:cameras(before),glb:true});
 const port={module:'studies/prism-signal.js',width:540,height:600,views:['front','threequarter','side'],passes:['material','clay','wire','silhouette']};
 const old=await render('port-before',{...port,values:{style:'rings'}});
 await render('port-after',{...port,cameras:cameras(old),glb:true});
 await render('port-cyan',{...port,values:{color:'cyan'},views:['threequarter'],passes:['material'],cameras:cameras(old)});
 const tile={module:'studies/radial-enamel.js',width:520,height:560,views:['threequarter','side'],passes:['material','wire']};
 const blank=await render('tile-before',{...tile,values:{marked:false}});
 await render('tile-after',{...tile,cameras:cameras(blank),glb:true});
 report.alignment={before:await measureRecipe(hero.module,base),after:await measureRecipe(hero.module,{...base,emitterStyle:'mapped'})};
 await session.sheet({out:out+'/hero-comparison.png',columns:2,cellSize:688,title:'Fixed geometry placements: torus-stack signals / mapped optical lenses',tiles:['before','after'].map(id=>({label:id,file:out+'/'+id+'/hero-material.png'}))});
 await session.sheet({out:out+'/port-comparison.png',columns:2,cellSize:440,title:'Torus stack / lower-triangle mapped lens: different inner relief, retained housing',tiles:['front','threequarter','side'].flatMap(view=>['before','after'].map(id=>({label:view+' '+id,file:out+'/port-'+id+'/'+view+'-material.png'})))});
 report.comparisons={};
 for(const [a,b,label,views] of [['before','after','scene',['hero']],['port-before','port-after','port',['front','threequarter','side']]])for(const view of views){
  const path=(id,pass)=>`${out}/${id}/${view}-${pass}.png`;
  report.comparisons[`${label}-${view}`]=await session.compare({reference:path(a,'material'),candidate:path(b,'material'),referenceMask:path(a,'silhouette'),candidateMask:path(b,'silhouette')});
 }
 report.sourceFingerprints=[...new Set(Object.values(report.cases).map(r=>r.sourceFingerprint.sha256))];if(report.sourceFingerprints.length!==1)throw new Error('Source changed within review');
 await writeFile(out+'/review.json',JSON.stringify(report,null,2));
}finally{await session.close();}
