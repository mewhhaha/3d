import { defineModel } from '../src/lib/modeling.js';
import { hand, palm, fingers, opposingThumb, skinDetail, forearm, buildHand } from '../src/lib/forms/hand.js';
export default defineModel({
  id:'anatomy-hand',title:'Anatomy lab / hand and forearm',
  description:'First-principles connected palm, thumb bridge, four fingers, nails and a 17-joint rig. Sculpt, low cage, or low mesh with a baked tangent normal map. A component study, not production hand topology.',
  parameters:{
    representation:{type:'select',options:['baked','sculpt','cage'],default:'baked',label:'Geometry / detail'},
    component:{type:'select',options:['hand','forearm'],default:'hand',label:'Component'},
    spread:{type:'number',min:0,max:1,step:.1,default:.3,label:'Finger spread'},
    side:{type:'select',options:['right','left'],default:'right',label:'Side'},
  },
  build(p){
    const form=hand(palm({arch:.45}),fingers({spread:p.spread}),opposingThumb(),skinDetail({creases:1,pores:.4}));
    return buildHand(p.component==='forearm'?forearm({},form):form,{mode:p.representation,side:p.side});
  },
});
