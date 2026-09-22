import * as THREE from 'three';
import {defineModel,material} from '../src/lib/modeling.js';
import {tailBind} from './refitted-tail.js';
import {skeletonPose} from '../src/lib/skeleton-pose.js';
import {thickenSurface} from '../src/lib/shape-rails.js';
import {skinInPose} from '../src/lib/skin-in-pose.js';

// Original appendage fixture. Author a flexible cuff around its bent centerline,
// rather than forcing a rigid cover to pass through a multi-joint surface.
export default defineModel({id:'posed-tail-sleeve',title:'Pose-authored flexible cuff',parameters:{sleeve:{type:'boolean',default:true}},build:({sleeve})=>{
 const root=tailBind(),body=root.getObjectByName('Tail skin'),pose=skeletonPose(root);
 const bend=p=>{p.rotateLocal('Tail1',[0,0,-24]);p.rotateLocal('Tail2',[10,0,-18]);p.rotateLocal('Tail3',[0,0,-8]);};
 root.animations=[pose.hold('bend',bend),pose.hold('rest',()=>{})];
 if(sleeve){
  bend(pose);
  try{
   const curve=new THREE.CatmullRomCurve3([0,1,2,3].map(i=>new THREE.Vector3(...pose.position('Tail'+i))));
   const front=new THREE.Vector3(0,0,1);
   const support=(u,v)=>{
    const t=.14+v*.67,center=curve.getPoint(t),tangent=curve.getTangent(t).normalize();
    const right=tangent.clone().cross(front).normalize(),normal=right.clone().cross(tangent).normalize(),a=(u-.5)*2*Math.PI;
    const radius=.155-.050*v+.004*Math.cos(2*Math.PI*7*v);
    return center.addScaledVector(right,radius*Math.sin(a)).addScaledVector(normal,radius*Math.cos(a)).toArray();
   };
   const mat=material('#ca8455',{roughness:.68,metalness:.05});
   const shell=thickenSurface('Authored cuff',support,{segments:[28,28],thickness:.005,material:mat});
   try{
    // Explicit nearest-centerline weights give duplicated rim vertices the
    // same influences; rim UVs are not longitudinal construction coordinates.
    const path=Array.from({length:101},(_,i)=>curve.getPoint(i/100));
    const weights=p=>{
     let best=Infinity,t=0;
     for(let i=0;i<100;i++){const d=path[i+1].clone().sub(path[i]),f=THREE.MathUtils.clamp(p.clone().sub(path[i]).dot(d)/d.lengthSq(),0,1),q=path[i].clone().addScaledVector(d,f),distance=q.distanceToSquared(p);if(distance<best){best=distance;t=(i+f)/100*3;}}
     const j=Math.min(2,Math.floor(t));return [['Tail'+j,1-(t-j)],['Tail'+(j+1),t-j]];
    };
    root.add(skinInPose(shell.geometry,mat,body.skeleton,weights,{name:'Flexible tail cuff'}));
   }finally{shell.geometry.dispose();}
  }finally{pose.reset();}
 }
 return root;
}});
