import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {twoLinkPose} from '../src/lib/two-link-pose.js';
const V=p=>new T.Vector3(...p),dist=(a,b)=>V(a).distanceTo(V(b));
const base={root:[0,0,0],target:[0,2,0],lengths:[Math.sqrt(2),Math.sqrt(2)],pole:[2,1,0]};
function check(pose,plane){
 assert.ok(Math.abs(dist(pose.root,pose.joint)-pose.lengths[0])<1e-9);
 assert.ok(Math.abs(dist(pose.joint,pose.target)-pose.lengths[1])<1e-9);
 assert.ok(Math.abs(V(plane.normal).dot(V(pose.joint))-plane.constant)<1e-9);
}
test('two-link plane selects either exact circle/plane branch by pole, without moving ends or changing lengths',()=>{
 const plane={normal:[0,0,1],constant:.6},a=twoLinkPose({...base,jointPlane:plane}),b=twoLinkPose({...base,pole:[-2,1,0],jointPlane:plane});
 check(a,plane);check(b,plane);assert.ok(dist(a.joint,[.8,1,.6])<1e-9);assert.ok(dist(b.joint,[-.8,1,.6])<1e-9);
 assert.deepEqual(a.root,base.root);assert.deepEqual(a.target,base.target);assert.deepEqual(plane,{normal:[0,0,1],constant:.6});
 assert.notEqual(a.root,base.root);assert.notEqual(a.jointPlane.normal,plane.normal);
});
test('constraint is invariant under rigid frames and scaled plane equations; omission retains exact old solve',()=>{
 const plane={normal:[0,0,1],constant:.6},a=twoLinkPose({...base,jointPlane:plane}),q=new T.Quaternion().setFromEuler(new T.Euler(.4,-.3,.8)),offset=new T.Vector3(2,-3,1);
 const point=p=>V(p).applyQuaternion(q).add(offset).toArray(),normal=V(plane.normal).applyQuaternion(q),moved={normal:normal.toArray(),constant:.6+normal.dot(offset)};
 const b=twoLinkPose({root:point(base.root),target:point(base.target),pole:point(base.pole),lengths:base.lengths,jointPlane:moved});
 check(b,moved);assert.ok(dist(b.joint,point(a.joint))<1e-9);
 assert.deepEqual(a,twoLinkPose({...base,jointPlane:{normal:[0,0,2],constant:1.2}}));
 assert.deepEqual(twoLinkPose(base),twoLinkPose({...base,jointPlane:null}));
});
test('tangent, coincident plane and full extension are supported; impossible planes fail instead of stretching',()=>{
 for(const plane of [{normal:[0,0,1],constant:1},{normal:[0,1,0],constant:1}])check(twoLinkPose({...base,jointPlane:plane}),plane);
 const straight={...base,lengths:[1,1],jointPlane:{normal:[0,1,0],constant:1}};check(twoLinkPose(straight),straight.jointPlane);
 for(const plane of [{normal:[0,0,1],constant:1.1},{normal:[0,1,0],constant:1.1},{normal:[0,0,0],constant:0},{normal:[0,0,1],constant:NaN},{normal:[1e308,0,0],constant:1}])assert.throws(()=>twoLinkPose({...base,jointPlane:plane}));
 assert.throws(()=>twoLinkPose({...straight,jointPlane:{normal:[0,0,1],constant:.01}}));
});
