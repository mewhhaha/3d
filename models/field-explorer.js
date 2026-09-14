import { defineModel } from '../src/lib/modeling.js';
import { humanoid } from '../src/lib/anatomy.js';
export default defineModel({
  id:'field-explorer',title:'Field explorer / character study',
  description:'A stylized, reference-guided human with a sculpted face, individual fingers, hair locks, clothing, boots, and embedded PBR textures. Static and unrigged.',
  parameters:{
    quality:{type:'select',options:['draft','studio','fine'],default:'studio',label:'Geometry / texture detail'},
    height:{type:'number',min:1.5,max:2,step:.01,default:1.75,label:'Height (m)'},
    jaw:{type:'number',min:.8,max:1.2,step:.01,default:.88,label:'Jaw width'},
    nose:{type:'number',min:.8,max:1.2,step:.01,default:.95,label:'Nose projection'},
    skinColor:{type:'color',default:'#c18b70',label:'Skin color'},
    clothColor:{type:'color',default:'#555e49',label:'Clothing color'},
    backpack:{type:'boolean',default:true,label:'Backpack'},
  },
  build: humanoid,
});
