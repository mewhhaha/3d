import { defineModel } from '../src/lib/modeling.js';
import { sculptureBust } from '../src/lib/anatomy.js';
export default defineModel({
  id:'atelier-bust',title:'Atelier / classical study',
  description:'Reference-guided marble portrait with carved curls, eyelids and draped cloth. An authored procedural study, not an exact reconstruction or a scan.',
  parameters:{
    quality:{type:'select',options:['draft','studio','fine'],default:'studio',label:'Geometry / texture detail'},
    finish:{type:'select',options:['marble','bronze'],default:'marble',label:'Surface'},
    height:{type:'number',min:.4,max:1,step:.02,default:.72,label:'Height (m)'},
    jaw:{type:'number',min:.85,max:1.2,step:.01,default:1.05,label:'Jaw width'},
    nose:{type:'number',min:.8,max:1.2,step:.01,default:1.04,label:'Nose projection'},
    turn:{type:'number',min:-25,max:25,step:1,default:-10,label:'Head turn'},
  },
  build: sculptureBust,
});
