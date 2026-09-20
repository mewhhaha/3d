import {defineModel,group,box,material,sphere} from '../src/lib/modeling.js';
import {twoLinkPose,slideRootForBend} from '../src/lib/two-link-pose.js';
import {mountSegment} from '../src/lib/reference-shot.js';
export default defineModel({id:'two-link-boom',title:'Pole-controlled inspection boom',parameters:{rootMode:{type:'select',options:['fixed','sliding'],default:'fixed'},bend:{type:'number',min:15,max:75,default:35,step:5},swivel:{type:'number',min:-60,max:60,default:32,step:5}},build:p=>{
 const endpoints={root:[0,.15,0],target:[.65,.7,.15],lengths:[.55,.43]};
 const slide=p.rootMode==='sliding'?slideRootForBend({...endpoints,bendDegrees:p.bend,maxSlide:.4}):null;
 const solved=twoLinkPose({...endpoints,...(slide?{root:slide.root}:{}),pole:[-.2,.5,.5],swivel:p.swivel});
 const dark=material('#243b43'),shell=material('#d8d1af'),accent=material('#df853c');
 const root=group('Inspection boom',[box({name:'Fixed base',size:[.25,.1,.25],position:slide?[0,solved.root[1]-.05,0]:[0,.1,0],material:dark}),box({name:'Fixed sensor',size:[.14,.08,.12],position:solved.target,material:accent})]);
 if(slide)root.add(box({name:'Vertical slider track',size:[.06,.48,.06],position:[0,.22,0],material:accent}));
 const points=[solved.root,solved.joint,solved.target];
 for(let i=0;i<2;i++){
  const length=solved.lengths[i];root.add(mountSegment(box({name:'Rigid boom link '+i,size:[.065,length,.045],position:[0,-length/2,0],material:shell}),points[i],points[i+1],{referenceLength:length,forward:[0,0,1]}));
 }
 for(const [i,point]of points.entries())root.add(sphere({name:'Solved pin '+i,radius:.055,position:point,material:dark,segments:20}));
 root.userData.pose=solved;if(slide)root.userData.slide=slide;return root;
}});
