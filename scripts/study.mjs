import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import validator from 'gltf-validator';
import { createRenderSession, project, sourceFingerprint } from './render.mjs';

const nameOK = s => typeof s === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(s);
export function validateStudy(spec) {
  if (!spec || spec.schema !== 1 || !nameOK(spec.id)) throw new Error('Study requires schema:1 and a safe id');
  const unknown=Object.keys(spec).filter(k=>!['schema','id','title','module','lockCamera','width','height','views','passes','cases'].includes(k));
  if(unknown.length)throw new Error(`Unknown study fields: ${unknown.join(', ')}`);
  if(spec.lockCamera!==undefined && typeof spec.lockCamera!=='boolean')throw new Error('lockCamera must be boolean');
  if (typeof spec.module !== 'string' || !/^(models|studies)\/[\w/-]+\.(m?js)$/.test(spec.module) || spec.module.includes('..')) throw new Error('Invalid study recipe path');
  if (!Array.isArray(spec.cases) || spec.cases.length < 1 || spec.cases.length > 16) throw new Error('A study needs 1..16 explicit cases');
  const names = new Set();
  for (const item of spec.cases) {
    if(!item || Object.keys(item).some(k=>!['id','label','values','maxTriangles','clip','time','skeleton'].includes(k)))throw new Error('Unknown case fields');
    if(item.skeleton!==undefined && typeof item.skeleton!=='boolean')throw new Error('skeleton must be boolean');
    if (!nameOK(item.id) || names.has(item.id)) throw new Error('Case ids must be unique safe names');
    names.add(item.id);
    if (item.values && (typeof item.values !== 'object' || Array.isArray(item.values))) throw new Error('Case values must be a parameter object');
    if (item.maxTriangles !== undefined && (!Number.isInteger(item.maxTriangles) || item.maxTriangles < 1)) throw new Error('Triangle budget must be a positive integer');
    if (item.clip !== undefined && typeof item.clip !== 'string') throw new Error('Clip must be a name');
    if (item.time !== undefined && (!Number.isFinite(item.time) || item.time < 0)) throw new Error('Pose time must be nonnegative');
  }
  for (const [key,allowed] of [['views',['front','back','side','left','top','threequarter','hero']], ['passes',['material','clay','normal','wire','silhouette']]]) {
    if (spec[key] && (!Array.isArray(spec[key]) || !spec[key].length || spec[key].some(s => !allowed.includes(s)))) throw new Error(`Invalid study ${key}`);
  }
  for (const key of ['width','height']) if (spec[key] !== undefined && (!Number.isInteger(spec[key]) || spec[key]<64 || spec[key]>4096)) throw new Error('Image size must be 64..4096');
  return spec;
}
async function atomicJSON(file, value) {
  await writeFile(file + '.tmp', JSON.stringify(value, null, 2));
  await rename(file + '.tmp', file);
}
/** Bounded, explicit local experiment. Checkpoints each case; no unbounded agent or automatic pushes. */
export async function runStudy(spec, { root = project, out = `renders/${spec.id}`, session } = {}) {
  validateStudy(spec);
  const output = path.resolve(root, out); await mkdir(output, { recursive: true });
  const started = performance.now(), manifest = {
    schema:1, id:spec.id, title:spec.title || spec.id, sourceFingerprint:await sourceFingerprint(root),
    status:'running', comparisons:[], visualAcceptance:'not-assessed', lockCamera:spec.lockCamera !== false, cases:[],
    limitations:'Mechanical checks and image comparisons do not certify likeness, collision-free geometry, mipmaps or production animation.',
  };
  const save = () => atomicJSON(path.join(output,'study.json'),manifest);
  await save();
  let studio = session; const cameras = {}, tiles = [];
  try {
    studio ||= await createRenderSession({ root });
    manifest.capabilities = studio.capabilities;
    for (const item of spec.cases) {
      const entry = { id:item.id, label:item.label || item.id, status:'running' };
      manifest.cases.push(entry); await save();
      try {
        const folder = path.join(output,item.id);
        const report = await studio.render({
          module:spec.module, values:item.values || {}, views:spec.views || ['front','threequarter','side'],
          passes:spec.passes || ['material','clay','silhouette'], width:spec.width || 640, height:spec.height || 640,
          clip:item.clip || '', time:item.time || 0, skeleton:item.skeleton || false,
          cameras:manifest.lockCamera ? cameras : {}, out:folder, glb:true,
        });
        // First case is the declared reference camera AND lighting placement, not per-case auto-framing.
        if (!Object.keys(cameras).length) report.images.forEach(image => { cameras[image.view] = image.cameraState; });
        const bytes = await readFile(path.join(folder,report.glb));
        const validation = await validator.validateBytes(new Uint8Array(bytes),{maxIssues:10000});
        await atomicJSON(path.join(folder,'validation.json'),validation);
        const failures=[];
        if(validation.issues.truncated)failures.push('Validation report was truncated');
        if(validation.issues.numErrors)failures.push(`${validation.issues.numErrors} GLB validation errors`);
        if(item.maxTriangles && report.stats.triangles > item.maxTriangles)failures.push('Triangle budget exceeded');
        if(report.images.some(image=>image.framing.clipped))failures.push('Reference camera clips this case');
        Object.assign(entry,{status:failures.length?'failed':'passed',failures,stats:report.stats,parameters:report.parameters,
          totalMs:report.totalMs,validation:{errors:validation.issues.numErrors,warnings:validation.issues.numWarnings},report:`${item.id}/report.json`});
        const picture=report.images.find(i=>i.view==='threequarter'&&i.pass==='material') || report.images[0];
        tiles.push({file:path.join(folder,picture.file),label:`${entry.label} | ${report.stats.triangles.toLocaleString('en-US')} tris`});
      } catch(error) {
        Object.assign(entry,{status:'failed',error:error.stack || error.message});
      }
      await save(); // A later crash cannot erase the earlier successful cases.
    }
    if(tiles.length){await studio.sheet({tiles,out:path.join(output,'contact.png'),columns:Math.min(4,tiles.length),title:manifest.title});manifest.contactSheet='contact.png';}
    const reference=manifest.cases[0];
    if (manifest.lockCamera && reference.status==='passed' && (spec.passes||['material','clay','silhouette']).includes('material') && (spec.passes||['material','clay','silhouette']).includes('silhouette')) {
      for(const item of manifest.cases.slice(1).filter(c=>c.status==='passed'))for(const view of spec.views||['front','threequarter','side']){
        const image=(id,pass)=>path.join(output,id,`${view}-${pass}.png`);
        const metrics=await studio.compare({reference:image(reference.id,'material'),candidate:image(item.id,'material'),referenceMask:image(reference.id,'silhouette'),candidateMask:image(item.id,'silhouette')});
        manifest.comparisons.push({reference:reference.id,candidate:item.id,view,...metrics});
      }
    }
    manifest.status=manifest.cases.every(c=>c.status==='passed')?'passed':'failed';
  } catch(error) {manifest.status='failed';manifest.error=error.stack || error.message;}
  finally {manifest.totalMs=performance.now()-started;await save();if(!session)await studio?.close();}
  return manifest;
}
if(process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const file=process.argv[2];
    if(!file || process.argv.length>4) throw new Error('Usage: node scripts/study.mjs studies/name.json [output-directory]');
    const spec=JSON.parse(await readFile(file,'utf8'));
    const report=await runStudy(spec,{out:process.argv[3] || `renders/${spec.id}`});
    console.log(JSON.stringify({id:report.id,status:report.status,cases:report.cases.length,totalMs:report.totalMs,visualAcceptance:report.visualAcceptance},null,2));
    if(report.status!=='passed') process.exitCode=1;
  } catch(error) {console.error(error.stack);process.exitCode=1;}
}
