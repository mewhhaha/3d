import * as THREE from 'three';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { buildCageHand } from '../src/lib/forms/cage-hand.js';
import { measureBake } from '../src/lib/forms/bake-quality.js';
import { inspect, dispose } from '../src/lib/modeling.js';
import { auditSeams } from '../src/lib/forms/audit.js';

function regionGeometry(g, where){
  const lists=Object.fromEntries(Object.keys(g.attributes).map(k=>[k,[]]));
  for(let i=0;i<g.attributes.position.count;i+=3){
    const points=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(g.attributes.position,i+k));
    if(!where(points.reduce((s,p)=>s.add(p),new THREE.Vector3()).multiplyScalar(1/3)))continue;
    for(const [key,a]of Object.entries(g.attributes))for(let k=0;k<3;k++)for(let j=0;j<a.itemSize;j++)lists[key].push(a.array[(i+k)*a.itemSize+j]);
  }
  const result=new THREE.BufferGeometry();for(const [key,values]of Object.entries(lists))result.setAttribute(key,new THREE.Float32BufferAttribute(values,g.attributes[key].itemSize));return result;
}
const report={commit:process.env.GITHUB_SHA||'local',configurations:[]};
for(const textureSize of [512,1024]){
  const low=buildCageHand(undefined,{mode:'baked',textureSize}),high=buildCageHand(undefined,{mode:'sculpt',textureSize});
  try{
    const a=low.getObjectByName('ContinuousHand'),b=high.getObjectByName('ContinuousHand');
    const region=regionGeometry(a.geometry,p=>p.y>.061&&p.y<.10&&p.x>-.043);
    const whole=measureBake(a.geometry,b.geometry,a.material.normalMap,{samples:8192});
    const junction=measureBake(region,b.geometry,a.material.normalMap,{samples:8192});region.dispose();
    assert.equal(whole.boundaryExtension.edgeSamples,0);assert.equal(junction.boundaryExtension.edgeSamples,0);
    assert.ok(whole.baked.p95Degrees<2&&junction.baked.p95Degrees<2);
    assert.ok(whole.baked.maxDegrees<10&&junction.baked.maxDegrees<10);
    const config={textureSize,lowTriangles:inspect(low).triangles,highTriangles:inspect(high).triangles,
      triangleReduction:1-inspect(low).triangles/inspect(high).triangles,topology:auditSeams(low),whole,junction};
    report.configurations.push(config);console.log(JSON.stringify(config));
  }finally{dispose(low);dispose(high);}
}
await mkdir('reports',{recursive:true});await writeFile('reports/cage-hand-quality.json',JSON.stringify(report,null,2));
