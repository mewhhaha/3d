import {defineModel} from '../src/lib/modeling.js';
import {humanoidMannequin} from '../src/lib/humanoid-mannequin.js';
import {humanoidPose} from '../src/lib/humanoid-rig.js';
// Same controls work on different builds. This is not a reference-image fit.
export default defineModel({id:'humanoid-support',title:'Plain support-leg study',parameters:{
 build:{type:'select',options:['slender','broad'],default:'slender'},
 height:{type:'number',min:1.4,max:2.1,default:1.72,step:.01},
 bend:{type:'number',min:8,max:25,default:12,step:1},
},build:({build,height,bend})=>{
 const pose=humanoidPose('contrapposto');
 return humanoidMannequin({build,height,poses:{baseline:pose,support:{...pose,support:{side:'Right',bend,maxShift:.08}}}});
}});
