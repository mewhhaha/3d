import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {sectionLoft} from '../src/lib/forms/structure.js';
import {surface} from '../src/lib/forms/surface.js';
import {structuredTorsoSupport,sculptedTorsoSupport} from '../src/lib/cyber/mass-forms.js';
import {refinedAndroid} from '../src/lib/cyber/form-refinement.js';
import housing from '../studies/section-housing.js';
import {dispose,inspect} from '../src/lib/modeling.js';
const V=p=>new T.Vector3(...p),base={from:0,to:1,breadth:()=>.2,depth:()=>.1};
test('zero section shaping is exactly the previous ellipse; squared sections pin principal radii',()=>{
 const a=sectionLoft(base),b=sectionLoft({...base,squareness:()=>0,depthBias:()=>0}),c=sectionLoft({...base,squareness:()=>.3});
 for(let i=0;i<=48;i++){const u=i/48;assert.deepEqual(a(u,.5),b(u,.5));}
 for(const u of [0,.25,.5,.75,1])assert.ok(V(a(u,.5)).distanceTo(V(c(u,.5)))<1e-12);
 assert.ok(c(.125,.5)[0]>a(.125,.5)[0]);assert.ok(c(.125,.5)[2]>a(.125,.5)[2]);
});
test('depth bias is asymmetric, smooth and periodic; invalid combinations throw',()=>{
 for(const q of [0,.2,.4])for(const bias of [-.04,0,.04]){
  const f=sectionLoft({...base,squareness:()=>q,depthBias:()=>bias}),s=surface(f,{wrapU:true});
  assert.ok(Math.abs(f(0,.5)[2]-.1*(1+bias))<1e-12);assert.ok(Math.abs(f(.5,.5)[2]+.1*(1-bias))<1e-12);
  assert.ok(V(f(0,.5)).distanceTo(V(f(1,.5)))<1e-12);
  for(let i=0;i<96;i++){const u=i/96,p=V(f(u,.5)).sub(new T.Vector3(0,.5,0));assert.ok(s.normal(u,.5).dot(p)>0);}
 }
 for(const options of [{squareness:3},{depthBias:3}])assert.throws(()=>sectionLoft({...base,...options}));
 for(const options of [{squareness:()=>-.1},{depthBias:()=>Infinity},{squareness:()=>.3,depthBias:()=>.3}])assert.throws(()=>sectionLoft({...base,...options})(.2,.5));
});
test('structured torso narrows neckward rib sections, raises crest, and preserves posed endpoint rings',()=>{
 const old=sculptedTorsoSupport(),s=structuredTorsoSupport(),pose={point:p=>[p[0]+.04,p[1],p[2]]},posed=structuredTorsoSupport({pose});
 const width=(f,v)=>V(f(.25,v)).distanceTo(V(f(.75,v)));
 assert.ok(width(s,.92)<width(old,.92)*.86);assert.ok(width(s,.28)>width(s,.12));
 for(const u of [0,.2,.5,.8,1])for(const v of [0,1])assert.ok(V(old(u,v)).distanceTo(V(s(u,v)))<1e-12);
 for(const u of [0,.15,.67,1])for(const v of [.18,.44,.77])assert.deepEqual(posed(u,v),pose.point(s(u,v)));
 const ss=surface(s,{wrapU:true});for(let j=1;j<20;j++)for(let i=0;i<32;i++)assert.ok(ss.normal(i/32,j/20).toArray().every(Number.isFinite));
});
test('primary-shape variant retains pose, counts, head, mapped ports, hands and planted feet',()=>{
 const values={headStyle:'illustrated',bodyStyle:'articulated',limbStyle:'scalloped',poseStyle:'relaxed',gestureStyle:'counterpose',jointStyle:'housed',handStyle:'relaxed',panelStyle:'cutaway',footStyle:'bridged',emitterStyle:'mapped',cables:false};
 const a=refinedAndroid({...values,massStyle:'sculpted'}),b=refinedAndroid({...values,massStyle:'structured'});a.updateMatrixWorld(true);b.updateMatrixWorld(true);
 for(const n of ['BodyGesture','HeadMount','Shoulder.Near','Shoulder.Far','Hip.Near','Hip.Far','Knee.Near','Knee.Far','Wrist.Near','Wrist.Far','Pack mount','Boot.L planted','Boot.R planted'])assert.deepEqual(a.getObjectByName(n).matrixWorld.elements,b.getObjectByName(n).matrixWorld.elements,n);
 assert.deepEqual(a.userData.poseGuide,b.userData.poseGuide);assert.equal(inspect(a).triangles,inspect(b).triangles);
 for(const name of ['HeadMount','Wrist.Near','Wrist.Far','Boot.L planted','Boot.R planted']){
  const geometries=root=>{const parts=[];root.getObjectByName(name).traverse(o=>{if(o.isMesh)parts.push(o.geometry);});return parts;};
  const first=geometries(a),second=geometries(b);assert.equal(first.length,second.length);
  first.forEach((g,i)=>{assert.deepEqual(g.index?.array,second[i].index?.array);for(const key of ['position','normal','uv','tangent'])assert.deepEqual(g.attributes[key]?.array,second[i].attributes[key]?.array,name+' '+key);});
 }
 const before=a.getObjectByName('Contoured torso understructure').geometry,after=b.getObjectByName('Contoured torso understructure').geometry;
 assert.deepEqual(before.index.array,after.index.array);assert.deepEqual(before.attributes.uv.array,after.attributes.uv.array);assert.notDeepEqual(before.attributes.position.array,after.attributes.position.array);
 const c=refinedAndroid({...values,massStyle:'structured'});assert.deepEqual(inspect(b),inspect(c));assert.notEqual(c.getObjectByName('Contoured torso understructure').geometry,after);dispose(a);dispose(b);dispose(c);
});

test('independent housing retains outward caps and unchanged triangle count',()=>{
 const a=housing.build({shaped:false}),b=housing.build({shaped:true});
 assert.equal(inspect(a).triangles,inspect(b).triangles);
 for(const root of [a,b])for(const v of [0,1]){
  const n=root.getObjectByName('End '+v).geometry.attributes.normal;
  for(let i=0;i<n.count;i++)assert.ok(n.getY(i)*(v===1?1:-1)>.999);
 }
 dispose(a);dispose(b);
});
