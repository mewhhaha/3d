import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {prismGuide} from '../src/lib/cyber/reference-layout.js';
import {refinedAndroid} from '../src/lib/cyber/form-refinement.js';
import {inspect,dispose} from '../src/lib/modeling.js';
import boom from '../studies/plane-boom.js';
import {sectionPose} from '../src/lib/section-pose.js';
import {segmentFrame} from '../src/lib/reference-shot.js';
const dist=(a,b)=>new T.Vector3(...a).distanceTo(new T.Vector3(...b));
const base={headStyle:'illustrated',bodyStyle:'articulated',limbStyle:'scalloped',poseStyle:'relaxed',gestureStyle:'lookback',jointStyle:'housed',massStyle:'structured',handStyle:'relaxed',panelStyle:'cutaway',footStyle:'bridged',emitterStyle:'mapped',girdleStyle:'connected',shoulderStyle:'seated',cables:false};
test('poised fits the shared rib frame and far arm while retaining fixed targets and link lengths',()=>{
 for(const poseStyle of ['reference','relaxed']){
 const old=prismGuide({poseStyle,gestureStyle:'lookback'}),g=prismGuide({poseStyle,gestureStyle:'poised'});
 for(const name of Object.keys(old.points))if(!['shoulderFar','elbowFar','chest'].includes(name))assert.ok(dist(g.points[name],old.points[name])<1e-10,name);
 for(const side of ['Near','Far'])for(const [a,b,l] of [['shoulder','elbow',.285],['elbow','wrist',.265],['hip','knee',.43],['knee','ankle',.45]])assert.ok(Math.abs(dist(g.point(a+side),g.point(b+side))-l)<1e-10);
 assert.ok(Math.abs(g.point('elbowFar')[0]+.20)<1e-10);assert.ok(g.point('shoulderFar')[2]>old.point('shoulderFar')[2]+.24);
 assert.deepEqual(g.camera.projectionMatrix.elements,old.camera.projectionMatrix.elements);assert.deepEqual(g.camera.matrixWorld.elements,old.camera.matrixWorld.elements);
 }
});
function meshes(root){const a=[];root.traverse(o=>{if(o.isMesh)a.push(o);});return a;}
test('far-shoulder correction keeps head, near arm, legs and planted foot buffers/transforms unchanged',()=>{
 const a=refinedAndroid(base),b=refinedAndroid({...base,gestureStyle:'poised'});a.updateMatrixWorld(true);b.updateMatrixWorld(true);
 assert.equal(inspect(a).triangles,inspect(b).triangles);
 for(const name of ['HeadMount','Shoulder.Near','Elbow.Near','Wrist.Near','Hip.Near','Hip.Far','Knee.Near','Knee.Far','Boot.L planted','Boot.R planted','Pack mount']){
 const aa=meshes(a.getObjectByName(name)),bb=meshes(b.getObjectByName(name));assert.equal(aa.length,bb.length,name);
 aa.forEach((m,i)=>{assert.ok(m.matrixWorld.elements.every((n,j)=>Math.abs(n-bb[i].matrixWorld.elements[j])<1e-10),name);assert.deepEqual(m.geometry.index?.array,bb[i].geometry.index?.array);for(const key of ['position','normal','uv','tangent'])assert.deepEqual(m.geometry.attributes[key]?.array,bb[i].geometry.attributes[key]?.array);});
 }
 const data=b.getObjectByName('Connected shoulder girdle').userData.girdle,torso=b.getObjectByName('Torso');
 for(const binding of data.bindings){const shoulder=b.getObjectByName(binding.to),local=new T.Vector3(...binding.end).applyMatrix4(torso.matrixWorld.clone().invert().multiply(shoulder.matrixWorld).invert());assert.ok(Math.abs(local.length()-.069*.82)<1e-10);}
 dispose(a);dispose(b);
});
test('swept thigh extends the cover proximally but pins knee end rings, with no topology-density increase',()=>{
 const a=refinedAndroid({...base,gestureStyle:'poised'}),b=refinedAndroid({...base,gestureStyle:'poised',panelStyle:'swept'});
 const name='thigh shaped dark core',aa=a.getObjectByName(name).geometry,bb=b.getObjectByName(name).geometry;
 assert.deepEqual(aa.index.array,bb.index.array);assert.deepEqual(aa.attributes.uv.array,bb.attributes.uv.array);
 const p=aa.attributes.position,q=bb.attributes.position,uv=aa.attributes.uv;let end=0;
 for(let i=0;i<p.count;i++)if(uv.getY(i)===0&&i<41){assert.ok(dist([p.getX(i),p.getY(i),p.getZ(i)],[q.getX(i),q.getY(i),q.getZ(i)])<1e-8);end++;}
 assert.equal(end,41);assert.ok(inspect(b).triangles<=inspect(a).triangles);
 assert.notDeepEqual(p.array,q.array);dispose(a);dispose(b);
});
test('independent service boom uses same plane solver with owned deterministic geometry',()=>{
 const a=boom.build({constrained:true}),b=boom.build({constrained:true}),c=boom.build({constrained:false});
 assert.deepEqual(inspect(a),inspect(b));assert.equal(inspect(a).triangles,inspect(c).triangles);assert.ok(Math.abs(a.userData.solve.joint[2]-.055)<1e-10);assert.notDeepEqual(a.userData.solve.joint,c.userData.solve.joint);
 assert.notEqual(a.children[0].geometry,b.children[0].geometry);dispose(a);dispose(b);dispose(c);
});


test('new rib support and both shoulder sockets use the SAME resolved section transform',()=>{
 const g=prismGuide({poseStyle:'relaxed',gestureStyle:'poised'}),rest=g.restBodyPoints;
 const v=p=>new T.Vector3(...p),forward=v(rest.shoulderNear).sub(v(rest.shoulderFar)).cross(v(rest.chest).sub(v(rest.pelvis))).normalize();
 const frame=segmentFrame(rest.chest,rest.pelvis,{referenceLength:.474,width:.88,forward:forward.toArray()});
 const toWorld=new T.Matrix4().compose(frame.position,frame.quaternion,frame.scale).multiply(new T.Matrix4().makeTranslation(0,-1.465,0));
 const toLocal=toWorld.clone().invert(),pose=sectionPose(g.bodyGesture.stations);
 for(const side of ['Near','Far']){
  const local=v(rest['shoulder'+side]).applyMatrix4(toLocal),mapped=v(pose.point(local.toArray(),1.465)).applyMatrix4(toWorld);
  assert.ok(mapped.distanceTo(v(g.points['shoulder'+side]))<1e-10);
  const recovered=v(g.points['shoulder'+side]).applyMatrix4(toLocal).applyMatrix4(pose.transform(1.465).invert());
  assert.ok((side==='Near'?1:-1)*recovered.x>0,'sockets remain on opposite sides of their rib frame');
 }
});
