import * as THREE from 'three';
import {defineModel,box} from '../src/lib/modeling.js';
import fixture from './pinned-inspection-arm.js';
import {mountOnBone} from '../src/lib/bone-mount.js';
import {segmentFrame} from '../src/lib/reference-shot.js';
import {armorLook} from './armor-look.js';
export default defineModel({id:'bone-mounted-prop',title:'Rigid guard on a moving inspection arm',parameters:{textured:{type:'boolean',default:true}},build:p=>{
 const root=fixture.build(),bone=root.getObjectByName('Carriage'),tip=root.getObjectByName('Elbow');root.updateMatrixWorld(true);
 const a=bone.getWorldPosition(new THREE.Vector3()),b=tip.getWorldPosition(new THREE.Vector3()),length=a.distanceTo(b);
 const frame=segmentFrame(a.toArray(),b.toArray(),{referenceLength:length});
 const guard=box({name:'Inspection enamel guard',size:[.13,length*.65,.038],radius:.014,segments:2,position:[0,-length*.45,.061],material:armorLook(p.textured).shell});
 mountOnBone(root,bone,guard,{frame:new THREE.Matrix4().compose(frame.position,frame.quaternion,new THREE.Vector3(1,1,1))});return root;
}});
