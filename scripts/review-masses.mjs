import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRenderSession} from './render.mjs';
import {validateBytes} from 'gltf-validator';
import {measureRecipe} from './measure-reference.mjs';
const out=process.argv[2]||'renders/mass-review';await mkdir(out,{recursive:true});
const session=await createRenderSession({timeout:90000}),report={cases:{},validation:{},visualAcceptance:'not-assessed'};
const cameras=r=>Object.fromEntries(r.images.map(i=>[i.view,i.cameraState]));
async function render(id,opts){console.log('Render '+id);const r=await session.render({...opts,out:out+'/'+id});report.cases[id]=r;
 if(r.glb){const v=await validateBytes(new Uint8Array(await readFile(out+'/'+id+'/'+r.glb)));report.validation[id]={errors:v.issues.numErrors,warnings:v.issues.numWarnings,infos:v.issues.numInfos};await writeFile(out+'/'+id+'/validation.json',JSON.stringify(v,null,2));if(v.issues.numErrors||v.issues.numWarnings)throw new Error(id+' GLB failed');}
 await writeFile(out+'/review.json',JSON.stringify(report,null,2));return r;}
try{
 const base={headStyle:'illustrated',bodyStyle:'articulated',limbStyle:'scalloped',poseStyle:'relaxed',gestureStyle:'counterpose',jointStyle:'housed'};
 const hero={module:'models/cyber-form-study.js',width:768,height:1376,views:['hero'],passes:['material','clay','silhouette']};
 const before=await render('before',{...hero,values:base});
 await render('after',{...hero,values:{...base,massStyle:'sculpted'},cameras:cameras(before),glb:true});
 const close={module:'studies/prism-body.js',width:560,height:700,views:['front','threequarter','side'],passes:['material','clay','wire']};
 const body=await render('body-before',{...close});
 await render('body-after',{...close,values:{massStyle:'sculpted'},cameras:cameras(body),glb:true});
 const legs={module:'studies/prism-limbs.js',width:520,height:760,views:['threequarter','side'],passes:['clay','wire'],values:{region:'legs'}};
 const leg=await render('legs-before',{...legs});
 await render('legs-after',{...legs,values:{...legs.values,massStyle:'sculpted'},cameras:cameras(leg)});
 const prop={module:'studies/spiral-grip.js',width:440,height:620,views:['threequarter','side'],passes:['material','clay','wire']};
 const grip=await render('grip-before',{...prop,values:{swept:false}});
 await render('grip-after',{...prop,values:{swept:true},cameras:cameras(grip),glb:true});
 report.alignment={before:await measureRecipe(hero.module,base),after:await measureRecipe(hero.module,{...base,massStyle:'sculpted'})};
 await session.sheet({out:out+'/hero-comparison.png',columns:2,cellSize:640,title:'Fixed camera: prior counterpose / sculpted humanoid masses',tiles:['before','after'].map(id=>({label:id,file:out+'/'+id+'/hero-material.png'}))});
 await session.sheet({out:out+'/body-comparison.png',columns:2,cellSize:400,title:'Fixed views: profiled / anatomically grouped volumes',tiles:['front','threequarter','side'].flatMap(view=>['before','after'].map(id=>({label:view+' '+id,file:out+'/body-'+id+'/'+view+'-clay.png'})))});
 await session.sheet({out:out+'/legs-comparison.png',columns:2,cellSize:400,title:'Fixed limb lengths and cameras: thigh/calf mass groups',tiles:['threequarter','side'].flatMap(view=>['before','after'].map(id=>({label:view+' '+id,file:out+'/legs-'+id+'/'+view+'-clay.png'})))});
 report.sourceFingerprints=[...new Set(Object.values(report.cases).map(r=>r.sourceFingerprint.sha256))];
 if(report.sourceFingerprints.length!==1)throw new Error('Source changed within review');
 await writeFile(out+'/review.json',JSON.stringify(report,null,2));
}finally{await session.close();}
