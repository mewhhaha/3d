import { chromium } from 'playwright-core';
import path from 'node:path';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { browserPath } from './render.mjs';
// Fulfill every request from the built site: no HTTP server or network dependency.
const root=path.resolve('dist'),out='renders/cyber-review/pages',errors=[];
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:await browserPath(),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!=='http://workshop.test'||!url.pathname.startsWith('/3d/')){errors.push('Unexpected request '+url.href);return route.abort();}
  const suffix=decodeURIComponent(url.pathname.slice(4))||'index.html',file=path.resolve(root,suffix);
  if(!file.startsWith(root+path.sep))return route.abort();
  try{const body=await readFile(file),ext=path.extname(file);return route.fulfill({status:200,body,contentType:{'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.png':'image/png'}[ext]||'application/octet-stream'});}
  catch(e){errors.push('Missing site file '+suffix);return route.fulfill({status:404,body:'Not found'});}
 });
 await page.goto('http://workshop.test/3d/?capture=1#model=cyber-android-scene');
 await page.waitForFunction(()=>window.studio?.ready,null,{timeout:90000});
 assert.equal(await page.evaluate(()=>window.studio.state.model),'cyber-android-scene');
 assert.equal(await page.evaluate(()=>window.studio.sceneInfo().lighting),'authored');
 await page.screenshot({path:out+'/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>window.studio.frame());
 await page.screenshot({path:out+'/mobile.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 // Switching away must restore the normal preview path; switching back retains scene optics.
 await page.evaluate(()=>window.studio.select('orbit-bot'));
 assert.equal(await page.evaluate(()=>window.studio.sceneInfo()),null);
 await page.evaluate(()=>window.studio.select('cyber-android-scene',{detail:'draft',city:false}));
 assert.equal(await page.evaluate(()=>window.studio.sceneInfo().subject),'Android');
 await page.evaluate(()=>window.studio.frame('side'));
 const before=await page.evaluate(()=>window.studio.stats.triangles);
 const promise=page.waitForEvent('download');await page.locator('#download-glb').click();const download=await promise;
 assert.equal(download.suggestedFilename(),'cyber-android-scene.glb');assert.equal(await download.failure(),null);
 assert.equal(await page.evaluate(()=>window.studio.stats.triangles),before);
 assert.deepEqual(errors,[]);
 await writeFile(out+'/verification.json',JSON.stringify({status:'passed',tests:'Built /3d/ site; authored scene, mobile layout, legacy model switching, side view and real GLB download',sourceRevision:process.env.GITHUB_SHA||null},null,2));
}finally{await browser.close();}
console.log('CYBER_PAGES_OK');
