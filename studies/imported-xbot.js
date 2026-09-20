import {THREE,defineModel,group} from '../src/lib/modeling.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {loadXbot} from '../scripts/load-xbot.mjs';
import {skeletonPose} from '../src/lib/skeleton-pose.js';
import {xbotNames,xbotStance,xbotPoised,xbotSilhouette,xbotUpright} from './xbot-pose.js';
import {authoredShot,punctualLight} from '../src/lib/shot-rig.js';
import {referenceCamera} from '../src/lib/reference-shot.js';
import {refitSkinBind} from '../src/lib/refit-skin-bind.js';
import {xbotForm} from './xbot-form.js';
const loaded=await loadXbot();
export default defineModel({id:'imported-xbot',title:'Actual Mixamo Xbot / pose study',parameters:{form:{type:'select',options:['stock','tailored'],default:'stock'}},build:({form='stock'}={})=>{
 const root=clone(loaded.scene),geometries=new Map(),materials=new Map();
 root.traverse(o=>{if(o.isMesh){if(!geometries.has(o.geometry))geometries.set(o.geometry,o.geometry.clone());o.geometry=geometries.get(o.geometry);
 const own=m=>{if(!materials.has(m))materials.set(m,m.clone());return materials.get(m);};o.material=Array.isArray(o.material)?o.material.map(own):own(o.material);}});
 // The sample skins already use identity model-space bind matrices. Their
 // parent unit scale cancels in skinning; remove that misleading mesh parent
 // while retaining the armature conversion and every skin/geometry buffer.
 const skins=[];root.traverse(o=>{if(o.isSkinnedMesh)skins.push(o);});
 for(const skeleton of new Set(skins.map(s=>s.skeleton)))skeleton.boneInverses=skeleton.boneInverses.map(m=>m.clone());
 const identity=new THREE.Matrix4();
 for(const skin of skins){
  if(skin.children.length||!skin.bindMatrix.equals(identity)||!skin.matrix.equals(identity))throw new Error('Pinned input must have identity model-space skin bindings');
 }
 for(const skin of skins)root.add(skin);root.updateMatrixWorld(true);
 if(form==='tailored')refitSkinBind(root,xbotForm());
 const rig=skeletonPose(root,{names:xbotNames});
 root.animations=[rig.hold('neutral',r=>xbotStance(r,{confident:false})),rig.hold('confident',r=>xbotStance(r)),rig.hold('poised',r=>xbotPoised(r)),rig.hold('silhouette',r=>xbotSilhouette(r)),rig.hold('upright',r=>xbotUpright(r))];
 root.userData.exportSkinRoots=true;root.userData.importedRig={originalClips:loaded.animations.map(c=>c.name),source:'Adobe/Mixamo via Three.js r186; authored poses are workshop experiments'};
 return authoredShot({name:'Imported rig review',subject:root,camera:referenceCamera({target:[0,.875,0]}),background:'#e4e3e0',lights:group('Studio lights',[
  punctualLight({name:'Key',type:'directional',position:[-3,5,5],intensity:2.4}),punctualLight({name:'Fill',type:'directional',position:[3,2,2],intensity:.9}),
 ])});
}});
