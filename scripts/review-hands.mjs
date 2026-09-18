import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRenderBatch} from './render-batch.mjs';
import {validateBytes} from 'gltf-validator';
import {measureRecipe} from './measure-reference.mjs';
const out=process.argv[2]||'renders/hand-review';await mkdir(out,{recursive:true});
const session=createRenderBatch({timeout:90000,maxJobs:16,transientRetries:0}),report={cases:{},validation:{},visualAcceptance:'not-assessed'};
const cameras=r=>Object.fromEntries(r.images.map(i=>[i.view,i.cameraState]));
async function render(id,opts){console.log('Render '+id);const r=await session.render({...opts,out:out+'/'+id});report.cases[id]=r;
 if(r.glb){const v=await validateBytes(new Uint8Array(await readFile(out+'/'+id+'/'+r.glb)));report.validation[id]={errors:v.issues.numErrors,warnings:v.issues.numWarnings,infos:v.issues.numInfos};await writeFile(out+'/'+id+'/validation.json',JSON.stringify(v,null,2));if(v.issues.numErrors||v.issues.numWarnings)throw new Error(id+' GLB failed');}
 await writeFile(out+'/review.json',JSON.stringify(report,null,2));return r;}
try{
 const base={headStyle:'illustrated',bodyStyle:'articulated',limbStyle:'scalloped',poseStyle:'relaxed',gestureStyle:'counterpose',jointStyle:'housed',massStyle:'sculpted'};
 const changes={handStyle:'relaxed',panelStyle:'cutaway'};
 const hero={module:'models/cyber-form-study.js',width:768,height:1376,views:['hero'],passes:['material','clay','silhouette']};
 const before=await render('before',{...hero,values:base});
 await render('after',{...hero,values:{...base,...changes},cameras:cameras(before),glb:true});
 const close={module:'studies/prism-body.js',values:{massStyle:'sculpted'},width:560,height:700,views:['front','threequarter','side'],passes:['clay','wire']};
 const body=await render('body-before',close);
 await render('body-after',{...close,values:{...close.values,...changes},cameras:cameras(body)});
 const hand={module:'studies/prism-hand.js',width:560,height:620,views:['front','threequarter','side'],passes:['material','clay','wire']};
 const oldHand=await render('hand-before',{...hand,values:{style:'legacy'}});
 const newHand=await render('hand-after',{...hand,cameras:cameras(oldHand),glb:true});
 await render('hand-grasp',{...hand,values:{pose:'grasp'},views:['front','side'],passes:['material','clay'],cameras:cameras(newHand)});
 await render('hand-open',{...hand,values:{pose:'open'},views:['front','side'],passes:['material'],cameras:cameras(newHand)});
 const prop={module:'studies/chain-gripper.js',width:520,height:620,views:['threequarter','side'],passes:['material','wire']};
 const gripper=await render('gripper-before',{...prop,values:{bend:0}});
 await render('gripper-after',{...prop,values:{bend:32},cameras:cameras(gripper),glb:true});
 report.alignment={before:await measureRecipe(hero.module,base),after:await measureRecipe(hero.module,{...base,...changes})};
 await session.sheet({out:out+'/hero-comparison.png',columns:2,cellSize:660,title:'Fixed camera: published baseline / new hand and cutaway plates',tiles:['before','after'].map(id=>({label:id,file:out+'/'+id+'/hero-material.png'}))});
 await session.sheet({out:out+'/body-comparison.png',columns:2,cellSize:400,title:'Fixed pose: broad covers / split clavicle and thigh recess',tiles:['front','threequarter','side'].flatMap(view=>['before','after'].map(id=>({label:view+' '+id,file:out+'/body-'+id+'/'+view+'-clay.png'})))});
 await session.sheet({out:out+'/hand-comparison.png',columns:2,cellSize:440,title:'Mechanical hands: original fixed geometry / connected relaxed digits',tiles:['front','threequarter','side'].flatMap(view=>['before','after'].map(id=>({label:view+' '+id,file:out+'/hand-'+id+'/'+view+'-material.png'})))});
 report.sourceFingerprints=[...new Set(Object.values(report.cases).map(r=>r.sourceFingerprint.sha256))];
 if(report.sourceFingerprints.length!==1)throw new Error('Source changed within review');
 await writeFile(out+'/review.json',JSON.stringify(report,null,2));
}finally{await session.close();}
