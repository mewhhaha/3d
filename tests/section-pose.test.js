import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {sectionPose} from '../src/lib/section-pose.js';
const near=(a,b,e=1e-10)=>assert.ok(new T.Vector3(...a).distanceTo(new T.Vector3(...b))<e,`${a} != ${b}`);
test('section poses are owned validated data; identity is exact and outputs independent',()=>{
 const spec=[{y:-1},{y:1,offset:[0,0,0],rotation:[0,0,0]}],f=sectionPose(spec);
 spec[1].offset[0]=9;near(f.point([.4,.2,-.3]),[.4,.2,-.3]);
 const a=f.transform(0);a.elements[12]=55;assert.equal(f.transform(0).elements[12],0);
 assert.throws(()=>sectionPose([{y:1},{y:0}]));assert.throws(()=>sectionPose([{y:0},{y:0}]));
 assert.throws(()=>sectionPose([{y:0},{y:1,rotation:[0,NaN,0]}]));assert.throws(()=>f.point([0,Infinity,0]));
});
test('rotations pivot around sections; offsets and shortest quaternion interpolation are independent',()=>{
 const f=sectionPose([{y:-1},{y:1,rotation:[0,90,0],offset:[.2,0,.1]}]);
 near(f.point([1,1,0]),[.2,1,-.9]);
 near(f.point([1,0,0]),[Math.SQRT1_2+.1,0,-Math.SQRT1_2+.05]);
 const wrap=sectionPose([{y:0,rotation:[0,170,0]},{y:1,rotation:[0,-170,0]}]);
 near(wrap.point([1,.5,0]),[-1,.5,0]);
});
test('section matrices place rigid collars and sockets exactly on sampled support; outside is rigid',()=>{
 const f=sectionPose([{y:-1,rotation:[20,0,0],offset:[0,.1,0]},{y:1,rotation:[0,30,-15],offset:[.2,0,.1]}]);
 for(const y of [-2,-1,-.37,0,1,2]){
  const p=[.1,y,.2],q=new T.Vector3(...p).applyMatrix4(f.transform(y)).toArray();near(q,f.point(p));
 }
 const a=f.point([.1,1,.2]),b=f.point([.1,1.6,.2]);
 assert.ok(Math.abs(new T.Vector3(...a).distanceTo(new T.Vector3(...b))-.6)<1e-10);
 const p=[.4,1.2,.2];near(new T.Vector3(...p).applyMatrix4(f.transform(1)).toArray(),f.point(p,1));
});
test('positive section scale changes form and sockets together, preserves old rotation behavior',()=>{
 const f=sectionPose([{y:0,scale:[1,1,1]},{y:1,scale:[.5,1,1.2],rotation:[0,30,0],offset:[.1,0,0]}]);
 for(const y of [0,.2,.5,1,1.2]){const p=[.2,y,.1];near(f.point(p),new T.Vector3(...p).applyMatrix4(f.transform(y)).toArray());}
 const pair=[f.point([-.2,1,0]),f.point([.2,1,0])];assert.ok(Math.abs(new T.Vector3(...pair[0]).distanceTo(new T.Vector3(...pair[1]))-.2)<1e-12);
 for(const scale of [[0,1,1],[-1,1,1],[Infinity,1,1],[5,1,1]])assert.throws(()=>sectionPose([{y:0},{y:1,scale}]));
 const input=[{y:0},{y:1,scale:[.5,1,1]}],p=sectionPose(input);input[1].scale[0]=4;near(p.point([1,1,0]),[.5,1,0]);
});
