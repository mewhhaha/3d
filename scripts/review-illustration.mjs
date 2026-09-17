import path from 'node:path';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRenderSession} from './render.mjs';
import {validateBytes} from 'gltf-validator';
import {measureHair} from './measure-hair.mjs';
import {roundedBob} from '../src/lib/cyber/illustrated-head.js';
import {measureRecipe} from './measure-reference.mjs';

// Small controlled comparison: same camera and light for old/new heads and a prop.
const out=process.argv[2]||'renders/illustration-review';await mkdir(out,{recursive:true});
const session=await createRenderSession({timeout:90000}),report={cases:{},checks:{},visualAcceptance:'not-assessed'};
const cameras=r=>Object.fromEntries(r.images.map(i=>[i.view,i.cameraState]));
async function render(id,options){
 const r=await session.render({...options,out:out+'/'+id});report.cases[id]=r;
 if(r.glb){const v=await validateBytes(new Uint8Array(await readFile(out+'/'+id+'/'+r.glb)));report.checks[id]={errors:v.issues.numErrors,warnings:v.issues.numWarnings,infos:v.issues.numInfos};await writeFile(out+'/'+id+'/validation.json',JSON.stringify(v,null,2));if(v.issues.numErrors||v.issues.numWarnings)throw new Error(id+' GLB validation failed');}
 await writeFile(out+'/review.json',JSON.stringify(report,null,2));return r;
}
try{
 const view={module:'studies/prism-head.js',views:['front','side','threequarter'],passes:['material','clay','wire','silhouette'],width:600,height:700};
 const before=await render('head-before',{...view,values:{headStyle:'legacy'},glb:true});
 await render('head-after',{...view,values:{headStyle:'illustrated'},cameras:cameras(before),glb:true});
 await render('head-baked',{...view,values:{headStyle:'illustrated',mode:'baked'},views:['threequarter'],passes:['material'],cameras:cameras(before),glb:true});
 await render('head-pbr',{...view,values:{headStyle:'illustrated',toon:false},views:['threequarter'],passes:['material'],cameras:cameras(before),glb:true});
 const a=await render('prop-before',{module:'studies/illustration-tools.js',values:{illustrated:false},width:400,height:480,views:['threequarter'],passes:['material','clay','silhouette']});
 await render('prop-after',{module:'studies/illustration-tools.js',values:{illustrated:true},width:400,height:480,views:['threequarter'],passes:['material','clay','silhouette'],cameras:cameras(a),glb:true});
 const hero={module:'models/cyber-form-study.js',views:['hero'],width:768,height:1376};
 const h=await render('hero-before',{...hero,values:{headStyle:'legacy'}});
 await render('hero-after',{...hero,values:{headStyle:'illustrated'},cameras:cameras(h),glb:true});
 await session.sheet({out:out+'/head-comparison.png',columns:2,cellSize:360,title:'Published head / illustrated geometry and shading',tiles:['front','threequarter','side'].flatMap(v=>['before','after'].map(c=>({label:v+' '+c,file:out+'/head-'+c+'/'+v+'-material.png'})))});
 await session.sheet({out:out+'/hero-comparison.png',columns:2,cellSize:640,title:'Locked reference camera: published / illustrated head',tiles:['before','after'].map(c=>({label:c,file:out+'/hero-'+c+'/hero-material.png'}))});
 report.alignment={before:await measureRecipe('models/cyber-form-study.js',{headStyle:'legacy'}),after:await measureRecipe('models/cyber-form-study.js',{headStyle:'illustrated'})};
 report.normalTransfer=await measureHair(out+'/normal-transfer',{builder:roundedBob,names:['Rounded crown','Rounded curtain','Rounded fringe']});
 await writeFile(out+'/review.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({cases:Object.keys(report.cases),checks:report.checks,normalTransfer:report.normalTransfer},null,2));
}finally{await session.close();}
