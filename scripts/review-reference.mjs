import { chromium } from 'playwright-core';
import validator from 'gltf-validator';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { startServer } from './server.mjs';
const folder='dist/assets/reference-explorer';await mkdir(folder,{recursive:true});await mkdir('reports',{recursive:true});
const {server,url}=await startServer({base:'/3d/'});let browser,page;const errors=[];
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 page=await browser.newPage({viewport:{width:1440,height:1100}});page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+'?capture=1#model=reference-explorer');await page.waitForFunction(()=>window.studio?.ready);
 const stats=await page.evaluate(()=>window.studio.stats),rig=await page.evaluate(()=>window.studio.rigInfo());
 for(const view of ['front','perspective','side']){await page.evaluate(v=>window.studio.frame(v),view);await page.locator('#canvas').screenshot({path:`${folder}/review-${view}.png`});}
 for(const detail of ['face','hand','boots']){await page.evaluate(v=>window.studio.frameDetail(v),detail);await page.locator('#canvas').screenshot({path:`${folder}/review-${detail}.png`});}
 await page.evaluate(()=>{window.studio.frameDetail('face');window.studio.setLighting('dramatic');});await page.locator('#canvas').screenshot({path:`${folder}/review-lighting.png`});
 await page.evaluate(()=>{window.studio.setLighting('studio');window.studio.frame();});
 const base64=await page.evaluate(async()=>{const a=new Uint8Array(await window.studio.exportGLB());let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(s);});
 const bytes=Buffer.from(base64,'base64');await writeFile(`${folder}/reference-explorer.glb`,bytes);
 const validation=await validator.validateBytes(new Uint8Array(bytes),{maxIssues:100});await writeFile(`${folder}/validation.json`,JSON.stringify(validation,null,2));assert.equal(validation.issues.numErrors,0,JSON.stringify(validation.issues.messages));
 await page.evaluate(()=>window.studio.setAnimation('Wave',1.2));await page.locator('#canvas').screenshot({path:`${folder}/review-wave.png`});await page.evaluate(()=>window.studio.setAnimation('',0));await page.screenshot({path:`${folder}/workshop.png`,fullPage:true});assert.equal(errors.length,0,errors.join('\n'));
 await writeFile(`${folder}/review.json`,JSON.stringify({commit:process.env.GITHUB_SHA||'local',stats,rig,validation:validation.issues,lighting:await page.evaluate(()=>window.studio.lightingInfo()),notes:'Source-guided approximation, not a photoreal reconstruction. Body and clothing UVs are inherited from a CC0 anatomical template.'},null,2));console.log('REFERENCE_REVIEW_OK',JSON.stringify(stats));
}catch(error){if(page)await page.screenshot({path:'reports/reference-failure.png',fullPage:true}).catch(()=>{});await writeFile('reports/reference-error.txt',error.stack);throw error;}
finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
