import * as THREE from 'three';
import {defineModel,group,mesh,material} from '../src/lib/modeling.js';
import {sectionPose} from '../src/lib/section-pose.js';
import {thickenSurface} from '../src/lib/shape-rails.js';
export default defineModel({id:'section-duct',title:'Section-posed duct and rigid flanges',parameters:{posed:{type:'boolean',default:true}},build:p=>{
 const f=sectionPose(p.posed?[
  {y:-.4,rotation:[0,0,0]},
  {y:0,offset:[.16,0,.04],rotation:[8,0,-20]},
  {y:.4,offset:[.25,0,.06],rotation:[0,35,0]},
 ]:[{y:-.4},{y:.4}]);
 const shell=material('#d2b677',{roughness:.48}),metal=material('#345961',{metalness:.5,roughness:.4});
 const support=(u,v)=>{const a=(u-.5)*Math.PI*2;return f.point([Math.sin(a)*.08,-.4+.8*v,Math.cos(a)*.08]);};
 const root=group('Section duct',[thickenSurface('Posed duct sleeve',support,{thickness:.006,segments:[40,48],material:shell})]);
 for(const y of [-.4,.4]){
  const flange=group('Rigid end flange '+y,[mesh(new THREE.TorusGeometry(.085,.016,10,40),{name:'Round flange',material:metal,rotation:[90,0,0],position:[0,y,0]})]);
  flange.applyMatrix4(f.transform(y));root.add(flange);
 }
 root.userData.pose={stations:f.stations,description:'same section transforms drive sleeve and rigid flanges'};return root;
}});
