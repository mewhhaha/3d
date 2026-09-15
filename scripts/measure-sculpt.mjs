import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import ear from '../models/sculpt-ear.js';
import { buildModel, inspect, dispose } from '../src/lib/modeling.js';
import { measureBake } from '../src/lib/forms/bake-quality.js';
import { sourceFingerprint } from './render.mjs';
const out=path.resolve(process.argv[2] || 'renders/auricle');await mkdir(out,{recursive:true});
let high,low,baked;
try {
  high=buildModel(ear,{representation:'sculpt'});low=buildModel(ear,{representation:'cage'});baked=buildModel(ear,{representation:'baked'});
  const a=high.getObjectByName('Auricle'),b=baked.getObjectByName('Auricle'),c=low.getObjectByName('Auricle');
  for(const attr of ['position','normal','uv','tangent'])assert.deepEqual(b.geometry.attributes[attr].array,c.geometry.attributes[attr].array,`${attr} changed when baking`);
  const normalTransfer=measureBake(b.geometry,a.geometry,b.material.normalMap,{samples:4096});
  const report={sourceFingerprint:await sourceFingerprint(),high:inspect(high),low:inspect(low),normalTransfer};
  await writeFile(path.join(out,'normal-quality.json'),JSON.stringify(report,null,2));
  // These thresholds are regression gates for this specific fixture, not general anatomy claims.
  assert.equal(normalTransfer.boundaryExtension.edgeSamples,0);
  assert.ok(normalTransfer.baked.meanDegrees<.3 && normalTransfer.baked.p95Degrees<.6 && normalTransfer.baked.maxDegrees<3,'Normal transfer regression');
  console.log('SCULPT_BAKE_OK',JSON.stringify(report));
}finally{[high,low,baked].filter(Boolean).forEach(dispose);}
