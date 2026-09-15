import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import { writeFile, mkdir } from 'node:fs/promises';
import { guidedBob } from '../src/lib/cyber/hair-design.js';
import { inspect, dispose } from '../src/lib/modeling.js';
import { measureBake } from '../src/lib/forms/bake-quality.js';
import { rgbaPng } from './raster-mask.mjs';
export async function measureHair(out='renders/hair-transfer'){
 await mkdir(out,{recursive:true});const high=guidedBob({mode:'sculpt'}),low=guidedBob({mode:'cage'}),baked=guidedBob({mode:'baked'});
 const report={schema:1,triangles:{high:inspect(high).triangles,low:inspect(low).triangles,baked:inspect(baked).triangles},scope:'Hair component only; not the complete character',charts:{}};
 try{for(const name of ['Guided curtain','Guided fringe']){
  const h=high.getObjectByName(name),l=low.getObjectByName(name),b=baked.getObjectByName(name);
  for(const key of ['position','normal','uv','tangent'])assert.deepEqual(l.geometry.attributes[key].array,b.geometry.attributes[key].array,`${name} ${key}`);
  const expanded=h.geometry.index?h.geometry.toNonIndexed():h.geometry;
  assert.deepEqual(l.geometry.index.array,b.geometry.index.array);
  const m=measureBake(b.geometry,expanded,b.material.normalMap,{samples:4096});if(expanded!==h.geometry)expanded.dispose();assert.ok(m.baked.meanDegrees<m.base.meanDegrees);
  report.charts[name]=m;const {width,height,data}=b.material.normalMap.image;
  await writeFile(out+'/'+name.replaceAll(' ','-')+'-normal.png',rgbaPng(width,height,data));
 }
 report.triangleReduction=1-report.triangles.low/report.triangles.high;
 report.attributesIdentical=true;report.visualAcceptance='not-assessed';
 // Keep tail errors visible: a low mean is not a lossless normal transfer.
 report.remainingTargets=Object.entries(report.charts).filter(([,r])=>r.baked.maxDegrees>5).map(([n])=>n+' normal-bake tail error > 5 degrees');
 await writeFile(out+'/normal-transfer.json',JSON.stringify(report,null,2));return report;
 }finally{dispose(high);dispose(low);dispose(baked);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log(JSON.stringify(await measureHair(process.argv[2]),null,2));
