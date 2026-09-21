import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {evaluatedSurfaceGeometry} from '../src/lib/evaluated-surface.js';
import {captureBonePose} from '../src/lib/bone-pose-state.js';
import {tailBind} from '../studies/refitted-tail.js';
import {skeletonPose} from '../src/lib/skeleton-pose.js';
import {posedArmorTargets,projectedArmorSupport} from '../studies/armor-pose-fit.js';
import {roughArmorFoot} from '../studies/armor-foot.js';
import {armorLook} from '../studies/armor-look.js';
import {roundedBob} from '../src/lib/cyber/illustrated-head.js';
import {dispose,inspect} from '../src/lib/modeling.js';
const V=p=>new T.Vector3(...p);
test('snapshot evaluates actual skin into the chosen frame without changing bind buffers',()=>{
 const root=tailBind(),skin=root.getObjectByName('Tail skin'),pose=skeletonPose(root);
 const indices=skin.geometry.index.array.slice(),positions=skin.geometry.attributes.position.array.slice(),inverses=skin.skeleton.boneInverses.map(m=>m.toArray());
 pose.rotateLocal('Tail1',[0,0,20]);root.position.set(.3,.1,-.2);root.updateMatrixWorld(true);
 const frame=new T.Matrix4().makeRotationY(.4);frame.setPosition(.1,-.2,.1);
 const g=evaluatedSurfaceGeometry(skin,{frame});
 for(let i=0;i<g.attributes.position.count;i++){
  const expected=skin.getVertexPosition(i,new T.Vector3()).applyMatrix4(skin.matrixWorld).applyMatrix4(frame.clone().invert());
  assert.ok(expected.distanceTo(new T.Vector3().fromBufferAttribute(g.attributes.position,i))<1e-7);
 }
 assert.deepEqual(g.index.array,indices);assert.deepEqual(skin.geometry.attributes.position.array,positions);assert.deepEqual(skin.skeleton.boneInverses.map(m=>m.toArray()),inverses);
 assert.equal(g.attributes.skinWeight,undefined);assert.equal(g.attributes.uv,undefined);assert.equal(g.attributes.tangent,undefined);assert.notEqual(g.index,skin.geometry.index);g.dispose();dispose(root);
});
test('snapshot includes morph evaluation and rejects invalid/singular/reflected frames and empty selections',()=>{
 const geometry=new T.BoxGeometry(1,1,1),m=new T.Mesh(geometry);
 geometry.morphAttributes.position=[geometry.attributes.position.clone()];for(let i=0;i<geometry.attributes.position.count;i++)geometry.morphAttributes.position[0].setY(i,geometry.attributes.position.getY(i)+.2);
 m.updateMorphTargets();m.morphTargetInfluences[0]=.5;
 const g=evaluatedSurfaceGeometry(m,{includeFace:face=>face<2});assert.equal(g.index.count,6);assert.ok(Math.abs(g.attributes.position.getY(0)-geometry.attributes.position.getY(0)-.1)<1e-7);
 for(const frame of [new T.Matrix4().makeScale(0,1,1),new T.Matrix4().makeScale(-1,1,1)])assert.throws(()=>evaluatedSurfaceGeometry(m,{frame}));
 assert.throws(()=>evaluatedSurfaceGeometry(m,{includeFace:()=>false}),/empty/);g.dispose();dispose(m);
});
test('pose-aware target restores rest, and evaluates into the future rigid owner rest frame',()=>{
 const root=tailBind(),skin=root.getObjectByName('Tail skin'),bone=root.getObjectByName('Tail1'),pose=skeletonPose(root);
 root.animations=[pose.hold('bend',p=>p.rotateLocal('Tail1',[0,0,20]))];root.updateMatrixWorld(true);
 const before=skin.skeleton.bones.map(b=>b.matrixWorld.toArray()),[target]=posedArmorTargets(root,skin,[bone],'bend');
 assert.deepEqual(skin.skeleton.bones.map(b=>b.matrixWorld.toArray()),before);
 const restore=captureBonePose(root),rest=bone.matrixWorld.clone(),mixer=new T.AnimationMixer(root);mixer.clipAction(root.animations[0]).play();mixer.setTime(.5);root.updateMatrixWorld(true);skin.skeleton.update();
 const matrix=rest.multiply(bone.matrixWorld.clone().invert()).multiply(skin.matrixWorld);
 for(let i=0;i<target.attributes.position.count;i+=7)assert.ok(skin.getVertexPosition(i,new T.Vector3()).applyMatrix4(matrix).distanceTo(new T.Vector3().fromBufferAttribute(target.attributes.position,i))<1e-7);
 mixer.stopAllAction();mixer.uncacheRoot(root);restore();target.dispose();dispose(root);
});
test('smooth projected panel approximates a planar target without copying its topology',()=>{
 const g=new T.PlaneGeometry(.5,.5,4,4);g.translate(0,0,.07);
 const f=projectedArmorSupport(g,(u,v)=>[(u-.5)*.3,(v-.5)*.3,.1]);
 for(let j=0;j<=8;j++)for(let i=0;i<=8;i++)assert.ok(Math.abs(f(i/8,j/8)[2]-.079)<1e-7);
 assert.equal(f.fit.misses,0);assert.throws(()=>projectedArmorSupport(g,()=>[0,0,0],{clearance:NaN}));g.dispose();
});
test('coarse hair keeps previous construction available and spends fewer triangles on the same guides',()=>{
 const full=roundedBob({toon:false}),coarse=roundedBob({toon:false,segments:{crown:[40,14],curtain:[40,18],fringe:[20,6]}});
 assert.throws(()=>roundedBob({segments:{wrong:[4,4]}}));assert.throws(()=>roundedBob({segments:{crown:[1,4]}}));
 assert.ok(inspect(coarse).triangles<inspect(full).triangles*.3);for(const key of ['fringeHeight','opening','cutHeight'])assert.equal(coarse.userData.groom[key],full.userData.groom[key]);dispose(full);dispose(coarse);
});
test('rough foot keeps the planted sole datum and upward top-surface normals',()=>{
 const root=roughArmorFoot('Left',armorLook()),sole=root.getObjectByName('Left profiled orange sole');sole.geometry.computeBoundingBox();assert.ok(Math.abs(sole.geometry.boundingBox.min.y+.0805)<1e-7);
 const g=root.getObjectByName('Left boot flexible upper').geometry,n=g.attributes.normal;for(let row=0;row<=16;row++)assert.ok(n.getY(row*13+6)>.15);
 dispose(root);
});
