import * as THREE from 'three';
import {defineModel,group,material} from '../src/lib/modeling.js';
import {skeleton,skin} from '../src/lib/rigging.js';
import {refitSkinBind} from '../src/lib/refit-skin-bind.js';
import {skeletonPose} from '../src/lib/skeleton-pose.js';
/** Independently authored flexible tail: same topology/weights can be refitted
 * to a longer swept form before authoring bend clips. No humanoid assumptions. */
export const tailField=([x,y,z])=>[x*(1-.45*y)+.16*Math.sin(Math.PI*y),y*1.2,z*(1-.45*y)];
export function tailBind(){
 const rig=skeleton([0,1,2,3].map(i=>({name:'Tail'+i,...(i?{parent:'Tail'+(i-1)}:{}),position:[0,i/3,0]})));
 const root=group('Flexible tail',[rig.root]);
 const g=new THREE.CylinderGeometry(.065,.12,1,24,36,false);g.translate(0,.5,0);
 const weights=p=>{const t=THREE.MathUtils.clamp(p.y,0,1)*3,i=Math.min(2,Math.floor(t));return[['Tail'+i,1-(t-i)],['Tail'+(i+1),t-i]];};
 root.add(skin(g,material('#809d91',{roughness:.68}),rig,weights,'Tail skin'));
 const tip=new THREE.SphereGeometry(.073,16,12);tip.translate(0,1,0);
 root.add(skin(tip,material('#bb935a',{roughness:.6}),rig,()=>[['Tail3',1]],'Tail tip'));
 root.userData.exportSkinRoots=true;return root;
}
export default defineModel({id:'refitted-tail',title:'Rest-field tail construction',parameters:{refitted:{type:'boolean',default:true}},build:({refitted})=>{
 const root=tailBind();if(refitted)refitSkinBind(root,tailField);
 const controller=skeletonPose(root);
 root.animations=[controller.hold('bend',pose=>{pose.rotateLocal('Tail1',[0,0,-15]);pose.rotateLocal('Tail2',[14,0,-20]);pose.rotateLocal('Tail3',[5,0,-10]);})];return root;
}});
