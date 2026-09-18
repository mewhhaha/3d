import { defineModel } from '../src/lib/modeling.js';
import { refinedAndroid } from '../src/lib/cyber/form-refinement.js';
import { prismGuide } from '../src/lib/cyber/reference-layout.js';
import { sceneAssembly,neonPlatform,neonCity,neonLightRig,overheadFeeds } from '../src/lib/cyber/stage.js';
export default defineModel({id:'cyber-form-study',title:'Prism / guided form refinement',description:'Reference study with independent connected pose, primary supports and compiled hair detail.',parameters:{massStyle:{type:'select',options:['profiled','sculpted'],default:'profiled'},jointStyle:{type:'select',options:['open','housed'],default:'open'},gestureStyle:{type:'select',options:['fixed','counterpose'],default:'fixed'},poseStyle:{type:'select',options:['reference','relaxed'],default:'reference'},limbStyle:{type:'select',options:['legacy','scalloped'],default:'legacy'},bodyStyle:{type:'select',options:['legacy','articulated'],default:'legacy'},headStyle:{type:'select',options:['legacy','illustrated'],default:'legacy'},crownRoundness:{type:'number',label:'Rear crown fullness',default:1,min:0,max:1,step:.05},stage:{type:'select',options:['gesture','masses','assembly'],default:'assembly'},hairMode:{type:'select',options:['cage','sculpt','baked'],default:'cage'},city:{type:'boolean',default:true},cables:{type:'boolean',default:true}},build:p=>{
 const feeds=overheadFeeds({});feeds.position.x=-.10;
 const root=sceneAssembly({bloom:.12},refinedAndroid(p),neonPlatform({radius:.55}),p.city&&neonCity({ceiling:.3,signs:false}),neonLightRig(),prismGuide().camera,feeds);
 root.userData.sceneRecipe.fog={near:6.5,far:14};root.userData.sceneRecipe.depthOfField={target:'HeadMount',focus:6.7,aperture:.012,maxBlur:.023};return root;
}});
