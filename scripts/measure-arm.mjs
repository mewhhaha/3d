import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { buildArm, arm } from '../src/lib/forms/arm.js';
import { measureBake } from '../src/lib/forms/bake-quality.js';
import { inspect, dispose } from '../src/lib/modeling.js';
import { auditSeams } from '../src/lib/forms/audit.js';

const definition=arm(), high=buildArm(definition,{mode:'sculpt'});
const low=buildArm(definition,{mode:'baked',textureSize:256}), cage=buildArm(definition,{mode:'cage'});
try {
  const parts=[];
  low.traverse(part=>{
    if(!part.isMesh)return;
    const base=cage.getObjectByName(part.name);
    for(const key of ['position','normal','uv','tangent','skinIndex','skinWeight']) {
      const a=part.geometry.attributes[key],b=base.geometry.attributes[key];
      assert.equal(Boolean(a),Boolean(b));if(a)assert.deepEqual(a.array,b.array,`${part.name} ${key}: baked must retain exact cage geometry and rig`);
    }
    if(part.material.normalMap)parts.push({name:part.name,...measureBake(part.geometry,high.getObjectByName(part.name).geometry,part.material.normalMap,{samples:2048})});
  });
  const report={commit:process.env.GITHUB_SHA||'local',model:'anatomy-arm',sculpt:inspect(high),baked:inspect(low),
    exactCageAttributes:true,triangleReduction:1-inspect(low).triangles/inspect(high).triangles,
    topology:{sculpt:auditSeams(high),baked:auditSeams(low)},normalComparisons:parts};
  await mkdir('reports',{recursive:true});await writeFile('reports/arm-detail-quality.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}finally{dispose(high);dispose(low);dispose(cage);}
