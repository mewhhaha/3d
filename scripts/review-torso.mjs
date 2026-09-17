import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRenderSession} from './render.mjs';
import {validateBytes} from 'gltf-validator';
import {measureRecipe} from './measure-reference.mjs';
const out=process.argv[2]||'renders/torso-review';await mkdir(out,{recursive:true});
const session=await createRenderSession({timeout:90000}),report={cases:{},validation:{},visualAcceptance:'not-assessed'};
const cameras=r=>Object.fromEntries(r.images.map(i=>[i.view,i.cameraState]));
async function render(id,options){
 console.log('Render '+id);
 const r=await session.render({...options,out:out+'/'+id});report.cases[id]=r;
 if(r.glb){const v=await validateBytes(new Uint8Array(await readFile(out+'/'+id+'/'+r.glb)));report.validation[id]={errors:v.issues.numErrors,warnings:v.issues.numWarnings,infos:v.issues.numInfos};await writeFile(out+'/'+id+'/validation.json',JSON.stringify(v,null,2));if(v.issues.numErrors||v.issues.numWarnings)throw new Error(id+' validation failed');}
 await writeFile(out+'/review.json',JSON.stringify(report,null,2));return r;
}
try{
 const hero={module:'models/cyber-form-study.js',views:['hero'],passes:['material','clay','silhouette'],width:768,height:1376};
 const before=await render('hero-before',{...hero,values:{headStyle:'illustrated',bodyStyle:'legacy'}});
 await render('hero-after',{...hero,values:{headStyle:'illustrated',bodyStyle:'articulated'},cameras:cameras(before),glb:true});
 const close={module:'studies/prism-torso.js',views:['front','threequarter','side'],passes:['material','clay','wire'],width:560,height:640};
 const old=await render('torso-before',{...close,values:{bodyStyle:'legacy'}});
 await render('torso-after',{...close,values:{bodyStyle:'articulated'},cameras:cameras(old),glb:true});
 const prop={module:'studies/surface-contour.js',views:['front','threequarter','side'],passes:['material','clay','wire'],width:450,height:500};
 await render('hatch',{...prop,glb:true});
 report.alignment={before:await measureRecipe('models/cyber-form-study.js',{headStyle:'illustrated',bodyStyle:'legacy'}),after:await measureRecipe('models/cyber-form-study.js',{headStyle:'illustrated',bodyStyle:'articulated'})};
 await session.sheet({out:out+'/hero-comparison.png',columns:2,cellSize:650,title:'Locked camera: published torso / scalloped shared-support torso',tiles:['before','after'].map(c=>({label:c,file:out+'/hero-'+c+'/hero-material.png'}))});
 await session.sheet({out:out+'/torso-comparison.png',columns:2,cellSize:360,title:'Torso primary forms and shell boundaries',tiles:['front','threequarter','side'].flatMap(v=>['before','after'].map(c=>({label:v+' '+c,file:out+'/torso-'+c+'/'+v+'-clay.png'})))});
 await writeFile(out+'/review.json',JSON.stringify(report,null,2));console.log(JSON.stringify({validation:report.validation,alignment:[report.alignment.before.rmsPixels,report.alignment.after.rmsPixels]}));
}finally{await session.close();}
