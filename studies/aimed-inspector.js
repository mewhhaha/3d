import {defineModel,group,box,cylinder,sphere,material} from '../src/lib/modeling.js';
import {aimAroundAnchor} from '../src/lib/assembly-aim.js';
// Independent rigid inspection sensor: aim about the lower spherical seat,
// rather than revolving about the optical lens or moving a camera.
export default defineModel({id:'aimed-inspector',title:'Anchored inspection head',parameters:{aimed:{type:'boolean',default:true}},build:({aimed})=>{
 const shell=material('#8caaaa',{roughness:.4}),dark=material('#14262b',{metalness:.5,roughness:.32}),glass=material('#3e728f',{metalness:.6,roughness:.16});
 const root=group('Inspector',[cylinder({name:'Base',radius:.14,height:.04,position:[0,-.02,0],material:dark}),cylinder({name:'Post',radius:.027,height:.15,position:[0,.075,-.03],material:shell}),sphere({name:'Ball seat',radius:.031,position:[0,.15,-.03],material:dark,segments:24})]);
 const head=group('Sensor head',[
  box({name:'Inspection housing',size:[.26,.12,.14],radius:.018,material:shell}),
  box({name:'Stem',size:[.027,.08,.035],position:[0,-.074,-.03],radius:.008,material:dark}),
  cylinder({name:'Lens bezel',radius:.040,height:.030,rotation:[90,0,0],position:[.067,0,.078],material:dark}),
  cylinder({name:'Lens',radius:.033,height:.007,rotation:[90,0,0],position:[.067,0,.096],material:glass}),
  box({name:'Readout',size:[.060,.024,.004],position:[-.065,0,.073],radius:.001,material:dark}),
 ]);head.position.set(0,.25,0);root.add(head);
 if(aimed)aimAroundAnchor(head,{anchor:[0,-.10,-.03],direction:[.8,.35,1],space:'world'});
 return root;
}});
