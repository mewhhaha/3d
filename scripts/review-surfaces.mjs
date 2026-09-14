import {chromium} from 'playwright-core';
import validator from 'gltf-validator';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {project} from './build.mjs';
import {startServer} from './server.mjs';
const {server,url}=await startServer({base:'/3d/'});
let browser;
try {
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'?capture=1');await page.waitForFunction(()=>window.studio?.ready);
  for(const id of ['atelier-bust','field-explorer']) {
    console.log(`Surface review: ${id}`);
    const folder=path.join(project,'dist/assets',id);await mkdir(path.join(folder,'textures'),{recursive:true});
    await page.evaluate(id=>studio.select(id),id);
    const audit=await page.evaluate(()=>studio.surfaceAudit());
    assert.deepEqual(audit.missing,[]);assert.deepEqual(audit.invalid,[]);assert.ok(audit.textures>=3);
    const bytes=await readFile(path.join(folder,`${id}.glb`)), json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
    assert.ok(json.images.length>=3);assert.ok(json.images.every(i=>i.bufferView!==undefined&&!i.uri),'All images embedded');
    assert.ok(json.meshes.every(m=>m.primitives.every(p=>p.attributes.TEXCOORD_0!==undefined)),'All exported meshes retain UVs');
    assert.ok(json.materials.some(m=>m.normalTexture&&m.pbrMetallicRoughness?.metallicRoughnessTexture),'PBR maps survive export');
    await page.evaluate(()=>studio.focus('Head'));
    for(const mode of ['pbr','clay','normals','uv']) {
      await page.evaluate(mode=>studio.setDisplay(mode),mode);
      await page.locator('#canvas').screenshot({path:path.join(folder,`portrait-${mode}.png`)});
    }
    const after=Buffer.from(await page.evaluate(async()=>Array.from(new Uint8Array(await studio.exportGLB()))));
    assert.deepEqual(after,bytes,'Surface display modes cannot change the exported model');
    await page.evaluate(()=>studio.setDisplay('pbr'));
    await writeFile(path.join(folder,'head-uv.svg'),await page.evaluate(()=>studio.uvLayout()));
    const seen=new Set();
    const meshes=await page.evaluate(()=>studio.surfaceMeshes());
    for(const {index} of meshes) {
      await page.evaluate(i=>studio.inspectMesh(i),index);
      for(const slot of ['map','normalMap','roughnessMap']) {
        const data=await page.evaluate(s=>studio.textureData(s),slot);
        if(!data||seen.has(data.name))continue;seen.add(data.name);
        const safe=data.name.replace(/[^a-z0-9-]+/gi,'-').toLowerCase();
        await writeFile(path.join(folder,'textures',safe+'.png'),Buffer.from(data.data.split(',')[1],'base64'));
      }
    }
    await page.evaluate(()=>studio.inspectMesh(0));
    const high=await page.evaluate(()=>studio.setParameters({quality:'fine'}));
    const fine=Buffer.from(await page.evaluate(async()=>Array.from(new Uint8Array(await studio.exportGLB()))));
    const validation=await validator.validateBytes(new Uint8Array(fine),{maxIssues:100});
    assert.equal(validation.issues.numErrors,0,JSON.stringify(validation.issues.messages));
    await writeFile(path.join(folder,`${id}-fine.glb`),fine);
    await writeFile(path.join(folder,'fine-validation.json'),JSON.stringify(validation,null,2));
    await writeFile(path.join(folder,'surface-report.json'),JSON.stringify({audit,embeddedImages:json.images.length,fineStats:high,textureFiles:seen.size,exportIsolation:true},null,2));
    await page.evaluate(id=>studio.select(id),id);
    await page.locator('#surface-tools').evaluate(e=>e.open=true);
    await page.screenshot({path:path.join(project,'reports',`${id}-surface-tools.png`),fullPage:true});
  }
  assert.equal(errors.length,0,errors.join('\n'));
} finally {if(browser)await browser.close();await new Promise(r=>server.close(r));}
