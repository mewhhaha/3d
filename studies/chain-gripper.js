import {defineModel,group,box,cylinder,material} from '../src/lib/modeling.js';
import {rigidChain} from '../src/lib/rigid-chain.js';
export default defineModel({id:'chain-gripper',title:'FK gripper fingers / unrelated mechanical reuse',parameters:{bend:{type:'number',min:0,max:70,default:32,step:1}},build:p=>{
 const steel=material('#aab9c4',{metalness:.7,roughness:.28}),pad=material('#1d3342',{roughness:.75}),root=group('Gripper');
 root.add(box({name:'Gripper mounting crossbar',size:[.50,.08,.18],radius:.018,material:steel}));
 for(const side of [-1,1]){
  const chain=rigidChain({name:'Gripper '+side,lengths:[.23,.18,.12],rotations:[[0,0,side*-12],[0,0,side*-p.bend],[0,0,side*-p.bend*.55]]},(length,i)=>group('Link '+i,[
   box({name:'Link housing',size:[.08,length*.81,.09],radius:.018,position:[0,-length*.5,0],material:steel}),
   cylinder({name:'Hinge pin',radius:.05,height:.11,segments:24,rotation:[90,0,0],material:pad}),
   box({name:'Grip pad',size:[.015,length*.53,.08],radius:.006,position:[-side*.046,-length*.6,0],material:pad}),
  ]));chain.position.set(side*.21,-.02,0);root.add(chain);
 }
 return root;
}});
