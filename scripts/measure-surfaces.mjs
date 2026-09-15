import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {bobGuides} from '../src/lib/cyber/hair-design.js';
import {prismHairGuides} from '../src/lib/cyber/hair-guides.js';
import {guideCurve,railSurface} from '../src/lib/shape-rails.js';
import {cacheSurface,measureSurfaceCache} from '../src/lib/surface-cache.js';
import {surfaceEdge,boundaryGap} from '../src/lib/surface-boundary.js';
/** Independent construction checks. None of these certify likeness or watertight render meshes. */
export async function measureSurfaces(out='renders/surface-checks'){
 const started=performance.now(),{curtain,fringe}=bobGuides();
 const seams={near:boundaryGap(surfaceEdge(curtain,'u0',{to:.47}),surfaceEdge(fringe,'u1')),
  far:boundaryGap(surfaceEdge(curtain,'u1',{to:.47}),surfaceEdge(fringe,'u0'))};
 for(const s of Object.values(seams))assert.ok(s.maxMeters<1e-10);
 const raw=railSurface(Object.values(prismHairGuides).map(p=>guideCurve(p))),cached=cacheSurface(raw,{segments:[192,192]});
 const approximation=measureSurfaceCache(raw,cached,{samples:2048});assert.ok(approximation.maxMeters<.00005);
 const report={schema:1,seams,cache:{...cached.approximation,quality:approximation,maxAllowedMeters:.00005},elapsedMs:performance.now()-started,
  scope:'Analytic primary-support positions. Render tessellation, separate UV meshes, high-only relief, shading and self-intersections need separate inspection.',visualAcceptance:'not-assessed'};
 await mkdir(out,{recursive:true});await writeFile(out+'/surface-quality.json',JSON.stringify(report,null,2));return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log(JSON.stringify(await measureSurfaces(process.argv[2]),null,2));
