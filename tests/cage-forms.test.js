import test from 'node:test';
import assert from 'node:assert/strict';
import { quadCage, topology, growFace, atlasCage, subdivideCage, cageGeometry, displaceCage } from '../src/lib/forms/cage.js';
import { normalSampler } from '../src/lib/forms/fair.js';
const cube = () => quadCage([[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],
  [[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]].map((vertices,i)=>({vertices,tag:`Face${i}`})));
test('shared quad cage subdivisions preserve manifold incidence and Euler characteristic', () => {
  for (const levels of [0,1,2,3]) { const c=subdivideCage(cube(),levels),t=topology(c);
    assert.equal(c.faces.length,6*4**levels); assert.equal(c.points.length-t.edges.size+c.faces.length,2);
    assert.ok([...t.edges.values()].every(e=>e.faces.length===2)); }
});
test('named socket extrusion composes with subdivision without duplicate seam vertices',()=>{
  const original=cube(), c=growFace(original,'Face3',[[[-.7,2,-.7],[-.7,2,.7],[.7,2,.7],[.7,2,-.7]]],{name:'Branch'});
  assert.equal(original.faces.length,6);assert.equal(c.faces.length,10);assert.equal(topology(c).edges.size,20);
  assert.equal(subdivideCage(c,2).faces.length,160);
});
test('low/high atlas domains agree exactly without UV-edge extension',()=>{
  const c=atlasCage(cube(),{size:256}),low=cageGeometry(subdivideCage(c,1)),high=cageGeometry(subdivideCage(c,3));
  const sample=normalSampler(high);const uv=low.attributes.uv;
  for(let i=0;i<uv.count;i+=3)for(const w of [[1,0,0],[.01,.49,.50],[.33,.33,.34]]){
    const u=w.reduce((s,a,k)=>s+a*uv.getX(i+k),0),v=w.reduce((s,a,k)=>s+a*uv.getY(i+k),0);assert.ok(sample(u,v).length()>.999);
  }
  assert.equal(sample.stats.edgeSamples,0);low.dispose();high.dispose();
});
test('relief displaces geometric vertices once while preserving topology and shared UV corners',()=>{
  const c=subdivideCage(atlasCage(cube(),{size:256}),2),d=displaceCage(c,()=>.001);
  assert.equal(d.points.length,c.points.length);assert.notDeepEqual(d.points,c.points);
  assert.deepEqual(d.faces,c.faces);assert.ok(cageGeometry(d).attributes.tangent);
});
test('invalid topology, UV budgets and unbounded subdivision are rejected',()=>{
  assert.throws(()=>quadCage(cube().points,[...cube().faces,cube().faces[0]]),/edge/);
  assert.throws(()=>subdivideCage(cube(),6),/budget/);assert.throws(()=>atlasCage(cube(),{size:64,gutter:12}),/eight/);
  assert.throws(()=>growFace(cube(),'Missing',[]),/socket/);
});
