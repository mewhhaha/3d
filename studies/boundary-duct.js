import * as THREE from 'three';
import {defineModel,group,material} from '../src/lib/modeling.js';
import {bridgeSurface} from '../src/lib/surface-boundary.js';
import {thickenSurface} from '../src/lib/shape-rails.js';
export function ductBoundaries(){
 const matrix=new THREE.Matrix4().makeRotationY(.65);matrix.setPosition(.14,.05,.42);
 const start=u=>[.14*Math.cos(u*2*Math.PI),.090*Math.sin(u*2*Math.PI),0];
 const end=u=>new THREE.Vector3(.08*Math.cos(u*2*Math.PI),.08*Math.sin(u*2*Math.PI),0).applyMatrix4(matrix).toArray();
 return {start,end,tangentStart:()=>[0,0,.48],tangentEnd:()=>new THREE.Vector3(0,0,1).transformDirection(matrix).multiplyScalar(.48).toArray()};
}
export default defineModel({id:'boundary-duct',title:'Offset duct between authored mouths',parameters:{curved:{type:'boolean',default:true}},build:p=>{
 const {start,end,...tangents}=ductBoundaries(),support=bridgeSurface(start,end,p.curved?tangents:{});
 const mat=material('#68948a',{roughness:.46,metalness:.25}),rim=material('#303b46',{metalness:.5,roughness:.4});
 const root=group('Boundary-driven duct');root.add(thickenSurface('Duct wall',support,{segments:[40,20],thickness:.008,material:mat}));
 for(const [i,curve] of [start,end].entries()){
  const center=new THREE.Vector3(...curve(0)).add(new THREE.Vector3(...curve(.5))).multiplyScalar(.5);
  const flange=(u,v)=>new THREE.Vector3(...curve(u)).sub(center).multiplyScalar(1+.18*v).add(center).toArray();
  // Reversed parameter orientation at inlet, outward face on each end.
  root.add(thickenSurface('Flange '+i,(u,v)=>flange(i===0?u:1-u,v),{segments:[40,4],thickness:.012,material:rim}));
 }
 root.rotation.x=-.8;return root;
}});
