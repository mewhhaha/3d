import { defineModel } from '../src/lib/modeling.js';
import { cyberAndroid } from '../src/lib/cyber/android.js';
import { sceneAssembly, neonPlatform, neonCity, neonLightRig, heroCamera, overheadFeeds } from '../src/lib/cyber/stage.js';
export default defineModel({
 id:'cyber-android-scene',title:'Prism / neon arrival',
 description:'Real 3D scene study guided by the supplied cyber-android artwork. Includes procedural armor, gradient hair, reactor and cables, geometric city, luminous platform, named camera and authored lights. Bloom is a renderer effect, not baked into the GLB.',
 parameters:{detail:{type:'select',options:['draft','hero'],default:'hero'},city:{type:'boolean',default:true},cables:{type:'boolean',default:true},shell:{type:'color',default:'#dbdac4'},glow:{type:'number',min:0,max:1.5,step:.1,default:1}},
 build:p=>sceneAssembly({},
  cyberAndroid(p),neonPlatform(),p.city&&neonCity(),neonLightRig(),heroCamera(),overheadFeeds({}),
 ),
});
