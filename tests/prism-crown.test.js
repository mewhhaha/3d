import test from 'node:test';
import assert from 'node:assert/strict';
import { bobGuides } from '../src/lib/cyber/hair-design.js';
import { portraitFields } from '../src/lib/cyber/head-form.js';

// Shape correction on the actual integration subject, not a camera/annotation edit.
test('rear crown rail profile preserves roots, blunt cuts and forward boundaries',()=>{
 const before=bobGuides({crownRoundness:0}),after=bobGuides({crownRoundness:1});
 let moved=0;
 for(const key of ['curtain','fringe'])for(let j=0;j<=20;j++)for(let i=0;i<=24;i++){
  const u=i/24,v=j/20,a=before[key](u,v),b=after[key](u,v);
  assert.ok(b.every(Number.isFinite));
  assert.ok(Math.abs(a[1]-b[1])<1e-12);assert.ok(Math.abs(a[2]-b[2])<1e-12);
  if(j===0||j===20)assert.ok(Math.hypot(...a.map((x,k)=>x-b[k]))<1e-12,`${key} boundary moved`);
  if(Math.abs(a[0]-b[0])>1e-5)moved++;
 }
 assert.ok(moved>60,'rear primary form must actually change');
 for(const u of [0,1])for(let j=0;j<=20;j++)assert.deepEqual(after.curtain(u,j/20),before.curtain(u,j/20));
 assert.throws(()=>bobGuides({crownRoundness:-.1}),/roundness/);
 assert.throws(()=>bobGuides({crownRoundness:NaN}),/roundness/);
 assert.throws(()=>bobGuides({crownRoundness:1.1}),/roundness/);
});
test('concealed temporal volume is recessed without moving the forward face chart',()=>{
 // Regression samples captured from the pre-correction portrait fields on 92269c9.
 // These lie beyond the temporal field's z=.05 cutoff (eyes, nose and mouth).
 const fixtures=[
  [[0,-.02,.077],[0,-.019682048,.07318728056235309]],
  [[.039,.027,.068],[.039,.027,.06799978836555408]],
  [[-.039,.027,.068],[-.039,.027,.06799978836555408]],
  [[0,-.058,.061],[0,-.05399474203618543,.06285007595318917]],
 ];
 const point=[.083,-.008,-.005],saved=point.slice(),recessed=portraitFields(point);
 assert.ok(Math.abs(recessed[0])<.074,'concealed side must fit under the curtain');
 assert.deepEqual(point,saved);
 for(const [p,expected]of fixtures)assert.deepEqual(portraitFields(p),expected);
});
