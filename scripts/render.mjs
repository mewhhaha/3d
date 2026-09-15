import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { access, readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawn } from 'node:child_process';
import { Worker } from 'node:worker_threads';
import { createHash } from 'node:crypto';

export const project = fileURLToPath(new URL('../',import.meta.url));
const exists = async p => { try {await access(p,constants.X_OK); return true;}catch{return false;} };
export async function browserPath(explicit=process.env.CHROMIUM_PATH) {
  if(explicit) {if(!await exists(explicit))throw new Error(`CHROMIUM_PATH is not executable: ${explicit}`);return explicit;}
  for(const p of [chromium.executablePath(),'/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']) if(await exists(p))return p;
  throw new Error('No Chromium found. Set CHROMIUM_PATH or run npx playwright-core install chromium once.');
}
// Only this fixed rendering runtime runs in the browser. Recipe code executes in a fresh Node worker.
// No HTTP server, URL navigation, CDN, or network fetch is needed to send the meshes to WebGL.
const modules = {
  three:'node_modules/three/build/three.module.js',
  'three/core':'node_modules/three/build/three.core.js',
  'three/addons/geometries/RoundedBoxGeometry.js':'node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js',
  'three/addons/exporters/GLTFExporter.js':'node_modules/three/examples/jsm/exporters/GLTFExporter.js',
  stage:'src/render-stage.js',
  modeling:'src/lib/modeling.js', rigging:'src/lib/rigging.js',
  lighting:'src/lib/studio-lighting.js', exporter:'src/lib/export-assets.js',
  canonical:'src/lib/canonical-glb.js', tangents:'src/lib/tangent-frame.js',
};
export async function memoryRuntime(root=project) {
  const byPath=new Map(Object.entries(modules).map(([name,p])=>[p,name])),imports={};
  for(const [name,file] of Object.entries(modules)) {
    let source=await readFile(path.join(root,file),'utf8');
    source=source.replace(/(\bfrom\s*)(['"])([^'"\n]+)\2/g,(all,from,quote,specifier)=>{
      if(!specifier.startsWith('.'))return all;
      const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(file),specifier)),target=byPath.get(resolved);
      if(!target)throw new Error(`Add ${resolved} to the fixed in-memory rendering runtime`);
      return `${from}${quote}${target}${quote}`;
    });
    imports[name]='data:text/javascript;base64,'+Buffer.from(source+'\n//# sourceURL=workshop-runtime/'+name+'.js').toString('base64');
  }
  return '<!doctype html><meta charset="utf-8"><style>html,body{margin:0}canvas{display:block}</style><script type="importmap">'+JSON.stringify({imports}).replace(/</g,'\\u003c')+'</script>';
}
export async function sourceFingerprint(root=project) {
  const hash=createHash('sha256');let files=0;
  async function walk(dir){for(const e of (await readdir(path.join(root,dir),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.posix.join(dir,e.name);if(e.isDirectory())await walk(file);else if(e.isFile()&&/\.(m?js|json)$/.test(e.name)){hash.update(file+'\0');hash.update(await readFile(path.join(root,file)));files++;}}}
  for(const dir of ['src','models','studies','scripts']){try{await walk(dir);}catch(e){if(e.code!=='ENOENT')throw e;}}
  hash.update(await readFile(path.join(root,'package-lock.json')));
  return {sha256:hash.digest('hex'),files};
}
async function buildRecipe(spec,timeout) {
  const worker=new Worker(new URL('./build-recipe.mjs',import.meta.url),{workerData:spec,execArgv:[]});
  try{return await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error(`Recipe build exceeded ${timeout} ms`)),timeout);
    worker.once('error',e=>{clearTimeout(timer);reject(e);});
    worker.once('exit',code=>{clearTimeout(timer);reject(new Error(`Recipe worker exited ${code} before returning a model`));});
    worker.once('message',m=>{clearTimeout(timer);m.error?reject(new Error(m.error)):resolve(m);});
  });}finally{await worker.terminate();}
}
async function virtualDisplay() {
  const child=spawn('Xvfb',['-displayfd','1','-screen','0','1280x1024x24','-nolisten','tcp'],{stdio:['ignore','pipe','pipe']});
  let stderr='';child.stderr.on('data',d=>stderr+=d);
  const display=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{child.kill();reject(new Error('Xvfb startup timed out'));},5000);
    let text='';child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('exit',()=>{clearTimeout(timer);reject(new Error(`Xvfb exited: ${stderr}`));});
    child.stdout.on('data',d=>{text+=d;if(/^\d+\n/.test(text)){clearTimeout(timer);resolve(`:${parseInt(text,10)}`);}});
  });
  return {display,close(){child.kill();}};
}
const launchArgs=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'];
/** One explicit session; no daemon, external model service, background agent, or automatic commits. */
export async function createRenderSession({root=project,executablePath,timeout=60000}={}) {
  const start=performance.now(); let browser,display,page;
  const errors=[];
  async function close(){await browser?.close().catch(()=>{});display?.close();}
  try {
    executablePath=await browserPath(executablePath);
    const launch=async env=>chromium.launch({executablePath,args:launchArgs,timeout:15000,env});
    browser=await launch();page=await browser.newPage();
    const supported=await page.evaluate(()=>!!document.createElement('canvas').getContext('webgl2'));
    if(!supported) {
      await browser.close();
      try{display=await virtualDisplay();}catch(e){throw new Error(`WebGL2 unavailable; virtual display fallback failed. Install Xvfb on Linux or use Playwright's Chromium. ${e.message}`);}
      browser=await launch({...process.env,DISPLAY:display.display});page=await browser.newPage();
    }
    await page.route('**/*',route=>{errors.push('Blocked network request: '+route.request().url());return route.abort();});
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    page.setDefaultTimeout(timeout);
    const bounded=async promise=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`Local render exceeded ${timeout} ms`)),timeout);})]);}finally{clearTimeout(timer);}};
    async function stage(){
      await page.setContent(await memoryRuntime(root));
      await bounded(page.evaluate(async()=>{await import('stage');}));
    }
    await stage();
    const capabilities={...await page.evaluate(()=>window.stage.capabilities),browser:browser.version(),executablePath,virtualDisplay:!!display,startupMs:performance.now()-start};
    return {capabilities,close,
      async compare(files){
        const data={};for(const key of ['reference','candidate','referenceMask','candidateMask'])data[key]=(await readFile(path.resolve(root,files[key]))).toString('base64');
        return bounded(page.evaluate(options=>window.stage.compare(options),data));
      },
      async sheet({tiles,out,columns=3,cellSize=360,title}){
        const payload=await Promise.all(tiles.map(async t=>({label:t.label,png:(await readFile(path.resolve(root,t.file))).toString('base64')})));
        const png=await bounded(page.evaluate(options=>window.stage.sheet(options),{tiles:payload,columns,cellSize,title}));
        const destination=path.resolve(root,out);await mkdir(path.dirname(destination),{recursive:true});
        await writeFile(destination,Buffer.from(png,'base64'));return destination;
      },
      async render({module,values={},views=['threequarter'],passes=['material'],out='renders/study',glb=false,cameras={},...camera}={}) {
        const start=performance.now();
        if(typeof module!=='string'||! /^(models|studies)\/[\w/-]+\.(m?js)$/.test(module)||module.includes('..'))throw new Error('Recipe must be a repository-relative models/*.js or studies/*.js path');
        if(!Array.isArray(views)||!views.length||!Array.isArray(passes)||!passes.length)throw new Error('Choose at least one view and pass');
        const source=await readFile(path.join(root,module));
        const recipeSHA256=createHash('sha256').update(source).digest('hex');
        errors.length=0;
        // Reload resets every imported dependency, not only the entry module. Edited helpers are never stale.
        // A new document resets imported modules and restores the original materials.
        await page.close();page=await browser.newPage();
        await page.route('**/*',r=>{errors.push('Blocked network request: '+r.request().url());return r.abort();});
        page.on('pageerror',e=>errors.push(e.message));
        page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
        page.setDefaultTimeout(timeout);
        await stage();
        const {json,info}=await buildRecipe({root,module,values},timeout);
        const imported=await bounded(page.evaluate(spec=>window.stage.load(spec),{json}));
        if(imported.stats.triangles!==info.stats.triangles||imported.rig.bones!==info.rig.bones)throw new Error('Scene transfer changed mesh or rig structure');
        const output=path.resolve(root,out);await mkdir(output,{recursive:true});
        const report={schema:1,sourceRevision:process.env.GITHUB_SHA||null,module,recipeSHA256,sourceFingerprint:await sourceFingerprint(root),capabilities,...info,imported,images:[]};
        for(const view of views)for(const pass of passes){
          const {png,...image}=await bounded(page.evaluate(spec=>window.stage.capture(spec),{...camera,view,pass,cameraState:cameras[Array.isArray(view)?JSON.stringify(view):view]}));
          const label=Array.isArray(view)?`angle-${views.indexOf(view)}`:view;
          if(!/^[\w-]+$/.test(label)||!/^[\w-]+$/.test(pass))throw new Error('Invalid image label');
          const filename=`${label}-${pass}.png`;const bytes=Buffer.from(png,'base64');
          await writeFile(path.join(output,filename),bytes);
          report.images.push({...image,file:filename,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
        }
        if(glb){const encoded=await bounded(page.evaluate(()=>window.stage.exportGLB()));await writeFile(path.join(output,`${info.id}.glb`),Buffer.from(encoded,'base64'));report.glb=`${info.id}.glb`;}
        if(errors.length)throw new Error(errors.join('\n'));
        report.totalMs=performance.now()-start;
        await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
        return report;
      },
    };
  }catch(e){await close();throw e;}
}
function parse(args){
  const options={};for(let i=0;i<args.length;i++){
    const arg=args[i];if(!arg.startsWith('--')){if(options.module)throw new Error('Only one recipe per CLI invocation');options.module=arg;continue;}
    const key=arg.slice(2);if(['doctor','glb','help','skeleton'].includes(key)){options[key]=true;continue;}
    if(!['params','views','passes','out','size','pose','time','focus','projection','preset','exposure'].includes(key))throw new Error(`Unknown option --${key}`);
    const value=args[++i];if(value===undefined||value.startsWith('--'))throw new Error(`Missing value for --${key}`);
    if(key==='params')options.values=JSON.parse(value);
    else if(key==='views'||key==='passes')options[key]=value.split(',');
    else if(key==='size'){const [width,height]=value.split('x').map(Number);options.width=width;options.height=height;}
    else if(['time','exposure'].includes(key))options[key]=Number(value);
    else options[key==='pose'?'clip':key]=value;
  }return options;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  let session;
  try{
    const options=parse(process.argv.slice(2));
    if(options.help||(!options.module&&!options.doctor))console.log('node scripts/render.mjs models/name.js --params \'{"key":1}\' --views front,side,threequarter --passes material,clay,normal,wire,silhouette --out renders/name --size 800x800 --pose Grasp --time 1.1 --focus ObjectName --glb\nnode scripts/render.mjs --doctor');
    else {session=await createRenderSession();if(options.doctor)console.log(JSON.stringify(session.capabilities,null,2));else{const r=await session.render(options);console.log(JSON.stringify({id:r.id,triangles:r.stats.triangles,images:r.images.length,totalMs:r.totalMs,out:options.out||'renders/study'},null,2));}}
  }catch(e){console.error(e.stack);process.exitCode=1;}finally{await session?.close();}
}
