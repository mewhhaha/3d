import { defineModel } from '../src/lib/modeling.js';
import { cyberAndroid } from '../src/lib/cyber/android.js';
export default defineModel({
 id:'cyber-android',title:'Prism / cyber android',
 description:'Reference-guided first-principles android: contour armor, articulated servo components, gradient bob, radial reactor and routed luminous cables. A design study, not a scan or an exact likeness.',
 parameters:{
  detail:{type:'select',options:['draft','hero'],default:'hero'},
  shell:{type:'color',default:'#dbdac4'},
  glow:{type:'number',min:0,max:1.5,step:.1,default:1},
  cables:{type:'boolean',default:true},
  turn:{type:'number',min:-65,max:0,step:5,default:-50},
 },
 build:p=>cyberAndroid(p),
});
