import { defineModel } from '../src/lib/modeling.js';
import { hand, palm, fingers, opposingThumb, skinDetail } from '../src/lib/forms/hand.js';
import { buildCageHand } from '../src/lib/forms/cage-hand.js';
export default defineModel({
  id:'anatomy-cage-hand',title:'Anatomy lab / continuous quad hand',
  description:'One branching quad skin, grown from palm sockets. Corresponding subdivision levels share one padded normal atlas. An isolated first-principles study, not a finished character.',
  parameters:{
    representation:{type:'select',options:['baked','sculpt','cage'],default:'baked',label:'Geometry / detail'},
    spread:{type:'number',min:0,max:1,step:.1,default:.3,label:'Finger spread'},
  },
  build:p=>buildCageHand(hand(palm({arch:.45}),fingers({spread:p.spread}),opposingThumb(),skinDetail({creases:1,pores:.4})),{mode:p.representation}),
});
