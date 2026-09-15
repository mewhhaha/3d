import {defineModel} from '../src/lib/modeling.js';
import {posedAndroid,prismGuide} from '../src/lib/cyber/reference-layout.js';
import {sceneAssembly,neonPlatform,neonCity,neonLightRig,overheadFeeds} from '../src/lib/cyber/stage.js';
export default defineModel({id:'cyber-pose-study',title:'Prism / pose before detail',description:'Reference-aligned gesture, volume and assembly studies sharing one 3D pose guide. Artist-authored depths, not automatic image reconstruction.',parameters:{stage:{type:'select',options:['gesture','masses','assembly'],default:'assembly'},detail:{type:'select',options:['draft','hero'],default:'hero'},city:{type:'boolean',default:true},cables:{type:'boolean',default:true}},build:p=>{
 const feeds=overheadFeeds({});feeds.position.x=-.10;
 const root=sceneAssembly({bloom:.12},posedAndroid(p),neonPlatform({radius:.55}),p.city&&neonCity({ceiling:.3,signs:false}),neonLightRig(),prismGuide().camera,feeds);
 root.userData.sceneRecipe.fog={near:6.5,far:14};root.userData.sceneRecipe.depthOfField={target:'HeadMount',focus:6.7,aperture:.012,maxBlur:.023};return root;
}});
