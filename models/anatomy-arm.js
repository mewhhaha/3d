import { defineModel } from '../src/lib/modeling.js';
import { arm, upperArm, elbow, buildArm } from '../src/lib/forms/arm.js';
import { forearm, hand, palm, fingers, opposingThumb, skinDetail } from '../src/lib/forms/hand.js';
export default defineModel({
  id:'anatomy-arm',title:'Anatomy lab / continuous arm',
  description:'First-principles section loft with shoulder, elbow, forearm twist and a connected procedural hand. Shared landmarks drive shape and a 19-joint rig; compare sculpt, low cage and baked normal detail.',
  parameters:{
    representation:{type:'select',options:['baked','sculpt','cage'],default:'baked',label:'Geometry / detail'},
    tone:{type:'number',min:0,max:1,step:.1,default:.5,label:'Muscle definition'},
    spread:{type:'number',min:0,max:1,step:.1,default:.3,label:'Finger spread'},
  },
  build:p=>buildArm(arm(
    upperArm({tone:p.tone}),elbow({definition:.5}),
    forearm({length:.255},hand(palm(),fingers({spread:p.spread}),opposingThumb(),skinDetail({creases:1,pores:.4}))),
  ),{mode:p.representation}),
});
