import test from 'node:test';
import assert from 'node:assert/strict';
import { link, jointChain, contour, radialMass, sectionLoft } from '../src/lib/forms/structure.js';
import { surface } from '../src/lib/forms/surface.js';
test('chain relationships generate named rig positions and normalized stations', () => {
  const c = jointChain({ root: 'Shoulder', origin: [0,-.555,0] }, link('Elbow',{length:.3}),link('Wrist',{length:.255}));
  assert.ok(c.at('Wrist').length() < 1e-10); assert.equal(c.spec[2].parent, 'Elbow'); assert.ok(Math.abs(c.station('Elbow')-.3/.555)<1e-10);
  const p=c.at('Elbow');p.x=10;assert.equal(c.at('Elbow').x,0);
  assert.throws(()=>c.at('Missing'));assert.throws(()=>link('Elbow',{length:.3,direction:[0,0,0]}));assert.throws(()=>jointChain({},link('Root',{length:1})));
});
test('cubic contours preserve extrema and have continuous first derivatives', () => {
  const knots=[[0,.04],[.25,.06],[.55,.03],[1,.02]],f=contour(knots);
  for(let i=0;i<knots.length-1;i++)for(let n=0;n<=100;n++){const x=knots[i][0]+(knots[i+1][0]-knots[i][0])*n/100,y=f(x);assert.ok(y>=Math.min(knots[i][1],knots[i+1][1])-1e-9&&y<=Math.max(knots[i][1],knots[i+1][1])+1e-9);}
  for(const x of [.25,.55]){const h=1e-5;assert.ok(Math.abs((f(x)-f(x-h))/h-(f(x+h)-f(x))/h)<.001);}
  assert.throws(()=>contour([[0,1],[0,2],[1,3]]));
});
test('loft plus radial masses has periodic outward normals without altering endpoints', () => {
  const base={from:0,to:.55,breadth:()=>.03,depth:()=>.025};
  const a=sectionLoft(base),b=sectionLoft({...base,masses:[radialMass({amount:.004})]});
  assert.deepEqual(a(.2,0),b(.2,0));assert.deepEqual(a(.2,1),b(.2,1));
  const chart=surface(b,{wrapU:true});assert.ok(chart.normal(0,.5).z>.99);assert.ok(chart.point(0,.5).distanceTo(chart.point(1,.5))<1e-10);assert.ok(b(0,.5)[2]>a(0,.5)[2]);
});
