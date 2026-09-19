import {defineModel,group,box,sphere,material} from '../src/lib/modeling.js';
import {twoLinkPose} from '../src/lib/two-link-pose.js';
import {link} from '../src/lib/cyber/mechanics.js';
// An offset service arm must carry its middle bearing through a fixed guide plane.
// The housing, tip and link lengths are unchanged in both configurations.
export default defineModel({id:'plane-boom',title:'Plane-constrained service boom',parameters:{constrained:{type:'boolean',default:true}},build:p=>{
 const root=group('Service boom'),shell=material('#7d9ca4',{roughness:.52}),dark=material('#1d292e'),accent=material('#e39845');
 const a=[0,0,0],c=[.30,.70,.12];
 const s=twoLinkPose({root:a,target:c,lengths:[.46,.43],pole:[-.3,.4,.30],...(p.constrained?{jointPlane:{normal:[0,0,1],constant:.055}}:{})});
 root.add(box({name:'Root pedestal',size:[.23,.08,.22],position:[0,-.06,0],material:dark}));
 for(const [i,[from,to]]of [[a,s.joint],[s.joint,c]].entries())root.add(link({name:'Rigid link '+i,from,to,radius:.032,material:shell,segments:12}));
 for(const [i,point] of [a,s.joint,c].entries())root.add(sphere({name:'Bearing '+i,radius:.055,segments:20,position:point,material:accent}));
 root.add(box({name:'Tip tool',size:[.17,.06,.12],position:[.30,.75,.12],material:dark}));
 root.userData.solve=s;return root;
}});
