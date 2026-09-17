import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {twoLinkPose} from '../src/lib/two-link-pose.js';
const V=p=>new T.Vector3(...p),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} vs ${b}`);
test('two-link solve preserves both endpoints and lengths while pole/swivel rotate only the common joint',()=>{
 const spec={root:[.2,.8,-.1],target:[.5,.3,.1],lengths:[.40,.31],pole:[.7,.6,.4]};const copy=JSON.stringify(spec);
 const a=twoLinkPose(spec),b=twoLinkPose({...spec,swivel:65});
 for(const r of [a,b]){assert.deepEqual(r.root,spec.root);assert.deepEqual(r.target,spec.target);near(V(r.root).distanceTo(V(r.joint)),.40);near(V(r.joint).distanceTo(V(r.target)),.31);}
 assert.ok(V(a.joint).distanceTo(V(b.joint))>.08);near(a.bendDegrees,b.bendDegrees);assert.equal(JSON.stringify(spec),copy);
});
test('two-link pose is equivariant under a rigid coordinate-space transform',()=>{
 const p={root:[0,.5,0],target:[.3,-.1,.2],lengths:[.45,.39],pole:[.4,.2,.7],swivel:-37};
 const transform=new T.Matrix4().compose(new T.Vector3(.2,-2,1),new T.Quaternion().setFromEuler(new T.Euler(.4,.8,-.6)),new T.Vector3(1,1,1));
 const f=x=>V(x).applyMatrix4(transform).toArray(),a=twoLinkPose(p),b=twoLinkPose({...p,root:f(p.root),target:f(p.target),pole:f(p.pole)});
 near(V(f(a.joint)).distanceTo(V(b.joint)),0);
});
test('unreachable and ambiguous chains fail; exact extension is finite and does not secretly stretch',()=>{
 const p={root:[0,0,0],target:[0,1,0],lengths:[.5,.5],pole:[0,2,0]};const r=twoLinkPose(p);assert.deepEqual(r.joint,[0,.5,0]);near(r.bendDegrees,0);
 for(const bad of [{target:[0,1.1,0]},{target:[0,0,0]},{lengths:[0,.5]},{swivel:NaN},{target:[0,.9,0]}])assert.throws(()=>twoLinkPose({...p,...bad}));
 assert.throws(()=>twoLinkPose({...p,lengths:[.8,.1],target:[0,.5,0],pole:[1,0,0]}),/unreachable/);
});
