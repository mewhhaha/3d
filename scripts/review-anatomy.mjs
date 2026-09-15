import {chromium} from 'playwright-core';import validator from 'gltf-validator';import assert from 'node:assert/strict';
import{mkdir,writeFile}from'node:fs/promises';import{startServer}from'./server.mjs';import{createHash}from'node:crypto';
const folder='dist/assets/anatomy-hand';await mkdir(folder,{recursive:true});await mkdir('reports',{recursive:true});
const{server,url}=await startServer({base:'/3d/'});let browser,page;const errors=[],report={commit:process.env.GITHUB_SHA||'local',variants:{}};
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 page=await browser.newPage({viewport:{width:1400,height:1100}});page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(120000);
 await page.goto(url+'src/anatomy-lab.html?capture=1');await page.waitForFunction(()=>window.lab?.ready);
 for(const component of (process.env.STUDIES||'hand,forearm,eye,arm,cage-hand').split(','))for(const representation of ['sculpt','cage','baked']){
  console.log('REVIEW',component,representation);await page.evaluate(p=>window.lab.set(p),{component,representation});await page.evaluate(()=>window.lab.frame('threequarter'));
  await page.locator('canvas').screenshot({path:`${folder}/${component}-${representation}.png`});
  const data=await page.evaluate(async()=>{const a=new Uint8Array(await window.lab.exportGLB());let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(s);});
  const bytes=Buffer.from(data,'base64'),validation=await validator.validateBytes(new Uint8Array(bytes),{maxIssues:0});assert.equal(validation.issues.numErrors,0,JSON.stringify(validation.issues.messages));
  await writeFile(`${folder}/${component}-${representation}.glb`,bytes);await writeFile(`${folder}/${component}-${representation}-validation.json`,JSON.stringify(validation,null,2));
  const roundtrip=await page.evaluate(async encoded=>{const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');const{assetInfo}=await import('./lib/rigging.js');const{inspect,dispose}=await import('./lib/modeling.js');const gltf=await new GLTFLoader().parseAsync(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)).buffer,'');const value={stats:inspect(gltf.scene),rig:assetInfo(gltf.scene),clips:gltf.animations.map(c=>c.name)};dispose(gltf.scene);return value;},data);
  const original=await page.evaluate(()=>({stats:window.lab.stats(),rig:window.lab.rigInfo()}));assert.equal(roundtrip.stats.triangles,original.stats.triangles);assert.equal(roundtrip.rig.bones,original.rig.bones);assert.equal(roundtrip.rig.uvMeshes,original.rig.uvMeshes);if(component!=='eye')assert.deepEqual(roundtrip.clips.sort(),component==='arm'?['ElbowFlex','ForearmTurn','Grasp','WristFlex']:['Grasp','WristFlex']);
  report.variants[`${component}-${representation}`]={stats:original.stats,rig:original.rig,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),errors:validation.issues.numErrors,warnings:validation.issues.numWarnings,roundtrip:true};
  if(representation==='baked'){
   for(const view of ['front','back','side']){await page.evaluate(v=>window.lab.frame(v),view);await page.locator('canvas').screenshot({path:`${folder}/${component}-${view}.png`});}
   const maps=await page.evaluate(()=>window.lab.normalMaps());report.variants[`${component}-${representation}`].normalBakes=maps.map(({rgba,...map})=>map);
   for(const map of maps){const png=await page.evaluate(({width,height,rgba})=>{const c=document.createElement('canvas');c.width=width;c.height=height;c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba),width,height),0,0);return c.toDataURL('image/png').split(',')[1];},map);await writeFile(`${folder}/${component}-${map.name}-normal.png`,Buffer.from(png,'base64'));}
   if(component==='arm'){for(const pose of ['ElbowFlex','ForearmTurn']){await page.evaluate(p=>{window.lab.frame('threequarter');window.lab.pose(p,1.2);},pose);await page.locator('canvas').screenshot({path:`${folder}/arm-${pose}.png`});}}
   if(component!=='eye'){await page.evaluate(()=>{window.lab.frame('threequarter');window.lab.pose('Grasp',1.1);});await page.locator('canvas').screenshot({path:`${folder}/${component}-grasp.png`});
   await page.evaluate(()=>{window.lab.pose('');window.lab.skeletonVisible(true);});await page.locator('canvas').screenshot({path:`${folder}/${component}-skeleton.png`});await page.evaluate(()=>window.lab.skeletonVisible(false));}
  }
 }
 for(const component of ['hand','forearm','arm','cage-hand'].filter(c=>report.variants[`${c}-sculpt`])){const hi=report.variants[`${component}-sculpt`].stats.triangles,lo=report.variants[`${component}-baked`].stats.triangles;assert.ok(hi/lo>10);report.variants[`${component}-baked`].triangleReduction=1-lo/hi;}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${folder}/mobile.png`,fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(errors.length,0,errors.join('\n'));
 await writeFile(`${folder}/comparison.json`,JSON.stringify(report,null,2));console.log('ANATOMY_REVIEW_OK',JSON.stringify(report.variants));
}catch(e){if(page)await page.screenshot({path:'reports/anatomy-failure.png',fullPage:true}).catch(()=>{});await writeFile('reports/anatomy-error.txt',e.stack+'\n'+errors.join('\n'));throw e;}
finally{await browser?.close();await new Promise(r=>server.close(r));}
