import * as THREE from 'three';
import {defineModel,mesh,material} from '../src/lib/modeling.js';
import tail from './refitted-tail.js';
import {posedArmorTargets,projectedArmorSupport} from './armor-pose-fit.js';
import {surfaceContourGeometry} from '../src/lib/surface-contour.js';
import {solidifyGeometry} from '../src/lib/surface-thickness.js';
import {mountOnBone} from '../src/lib/bone-mount.js';
/** Independent flexible appendage: a rigid dorsal guard fitted at a selected bend.
 * Its silhouette data and one-bone owner remain separate from the posed skin. */
export default defineModel({id:'posed-tail-guard',title:'Pose-aware tail guard',parameters:{fitted:{type:'boolean',default:true}},build:({fitted})=>{
 const root=tail.build({refitted:true});root.updateMatrixWorld(true);
 const skin=root.getObjectByName('Tail skin'),bone=root.getObjectByName('Tail1');
 const base=(u,v)=>[.08+(u-.5)*.15,.36+v*.26,.13+.025*Math.sin(Math.PI*v)];
 const [target]=posedArmorTargets(root,skin,[bone],'bend');
 const support=fitted?projectedArmorSupport(target,base,{clearance:.012}):base;target.dispose();
 const front=surfaceContourGeometry(support,{outline:[[.08,.15],[.20,.03],[.85,.10],[.94,.88],[.70,.98],[.14,.83]],refinement:2,rounding:.12});
 const geometry=solidifyGeometry(front,{thickness:.005,offset:-1});front.dispose();
 mountOnBone(root,bone,mesh(geometry,{name:'Dorsal guard',material:material('#c9b993',{roughness:.65})}));
 root.userData.guardFit=support.fit??null;return root;
}});
