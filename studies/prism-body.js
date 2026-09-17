import {defineModel,group} from '../src/lib/modeling.js';
import {refinedAndroid} from '../src/lib/cyber/form-refinement.js';
export default defineModel({id:'prism-body',title:'Connected ribcage, limb roots and joint cowls',parameters:{gestureStyle:{type:'select',options:['fixed','counterpose'],default:'counterpose'},jointStyle:{type:'select',options:['open','housed'],default:'housed'}},build:p=>{
 const source=refinedAndroid({...p,headStyle:'illustrated',bodyStyle:'articulated',limbStyle:'scalloped',poseStyle:'relaxed',cables:false}),root=group('Body articulation study');
 for(const child of [...source.children])if(['BodyGesture','Shoulder.Near','Shoulder.Far','Hip.Near','Hip.Far','Elbow.Near','Elbow.Far','Wrist.Near','Wrist.Far'].includes(child.name))root.add(child);
 source.traverse(o=>{if(o.isMesh)o.geometry.dispose();});return root;
}});
