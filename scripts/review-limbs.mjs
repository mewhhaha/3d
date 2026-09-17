import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRenderSession} from './render.mjs';
import {validateBytes} from 'gltf-validator';
import {measureRecipe} from './measure-reference.mjs';
const out=process.argv[2]||'renders/limb-review';await mkdir(out,{recursive:true});
const s=await createRenderSession({timeout:90000}),report={cases:{},validation:{},visualAcceptance:'not-assessed'};
const cameras=r=>Object.fromEntries(r.images.map(i=>[i.view,i.cameraState]));
async function render(id,opts){console.log('Render '+id);const r=await s.render({...opts,out:out+'/'+id});report.cases[id]=r;
 if(r.glb){const v=await validateBytes(new Uint8Array(await readFile(out+'/'+id+'/'+r.glb)));report.validation[id]={errors:v.issues.numErrors,warnings:v.issues.numWarnings,infos:v.issues.numInfos};await writeFile(out+'/'+id+'/validation.json',JSON.stringify(v,null,2));if(v.issues.numErrors||v.issues.numWarnings)throw new Error(id+' GLB validation failed');}
 await writeFile(out+'/review.json',JSON.stringify(report,null,2));return r;}
try{
 const base={headStyle:'illustrated',bodyStyle:'articulated'},after={...base,limbStyle:'scalloped',poseStyle:'relaxed'};
 const hero={module:'models/cyber-form-study.js',views:['hero'],passes:['material','clay','silhouette'],width:768,height:1376};
 const b=await render('before',{...hero,values:base});await render('shape-only',{...hero,values:{...after,poseStyle:'reference'},cameras:cameras(b)});await render('after',{...hero,values:after,cameras:cameras(b),glb:true});
 const close={module:'studies/prism-limbs.js',views:['front','threequarter','side'],passes:['material','clay','wire'],width:550,height:780};
 const old=await render('legs-before',{...close,values:{limbStyle:'legacy',poseStyle:'reference'}});await render('legs-after',{...close,cameras:cameras(old),glb:true});
 await render('arms-after',{...close,values:{region:'arms'},views:['threequarter','side'],glb:true});
 const prop={module:'studies/two-link-boom.js',views:['threequarter','side'],passes:['material','wire'],width:500,height:550};
 const p=await render('boom-before',{...prop,values:{swivel:0}});await render('boom-after',{...prop,values:{swivel:45},cameras:cameras(p),glb:true});
 report.alignment={before:await measureRecipe('models/cyber-form-study.js',base),after:await measureRecipe('models/cyber-form-study.js',after)};
 await s.sheet({out:out+'/hero-comparison.png',columns:3,cellSize:620,title:'Locked camera: previous / new shapes / connected pose',tiles:['before','shape-only','after'].map(id=>({label:id,file:out+'/'+id+'/hero-material.png'}))});
 await s.sheet({out:out+'/legs-comparison.png',columns:2,cellSize:350,title:'Limb shape and joint continuity: before / after',tiles:['front','threequarter','side'].flatMap(v=>['before','after'].map(id=>({label:v+' '+id,file:out+'/legs-'+id+'/'+v+'-clay.png'})))});
 await writeFile(out+'/review.json',JSON.stringify(report,null,2));console.log(JSON.stringify({validation:report.validation,alignment:[report.alignment.before.rmsPixels,report.alignment.after.rmsPixels]}));
}finally{await s.close();}
