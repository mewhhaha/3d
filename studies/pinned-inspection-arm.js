import * as THREE from 'three';
import {defineModel,group,box,sphere,material} from '../src/lib/modeling.js';
import {skeletonPose} from '../src/lib/skeleton-pose.js';
// A rigid two-link tool, not a humanoid-shaped second example. Its carriage can
// move while the probe's complete pose is retained by the same pin operation.
export default defineModel({id:'pinned-inspection-arm',title:'Pinned inspection probe',parameters:{},build:()=>{
 const root=group('Inspection carriage'),dark=material('#34464c'),shell=material('#d7b974');
 const pivot=new THREE.Bone(),elbow=new THREE.Bone(),tool=new THREE.Bone();
 pivot.name='Carriage';elbow.name='Elbow';tool.name='Probe';
 pivot.position.set(0,.56,0);elbow.position.set(0,-.40,0);tool.position.set(0,-.34,0);
 root.add(pivot);pivot.add(elbow);elbow.add(tool);
 for(const [bone,length]of [[pivot,.40],[elbow,.34]]){
  bone.add(box({name:bone.name+' link',size:[.055,length,.065],position:[0,-length/2,0],material:shell}));
  bone.add(sphere({name:bone.name+' pin',radius:.047,segments:16,material:dark}));
 }
 tool.add(box({name:'Probe housing',size:[.10,.09,.11],material:dark}));
 tool.add(box({name:'Probe tip',size:[.023,.026,.11],position:[0,0,.09],material:shell}));
 root.add(box({name:'Inspection target',size:[.17,.16,.024],position:[.34,.23,.22],material:shell}));
 root.add(box({name:'Carriage rail',size:[.30,.035,.11],position:[-.08,.55,0],rotation:[0,0,-22],material:dark}));
 const pose=skeletonPose(root);
 const neutral=r=>{r.solve({root:'Carriage',joint:'Elbow',tip:'Probe',target:[.34,.23,.06],pole:[-.2,0,.4]});r.orientWorld('Probe',[0,0,0]);};
 root.animations=[pose.hold('before',neutral),pose.hold('shifted',r=>{
  neutral(r);r.withPins([{root:'Carriage',joint:'Elbow',tip:'Probe',pole:[-.2,0,.4]}],edit=>edit.translateWorld('Carriage',[-.16,.06,0]));
 })];return root;
}});
