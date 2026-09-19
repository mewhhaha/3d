import {defineModel,group} from '../src/lib/modeling.js';
import {refinedAndroid} from '../src/lib/cyber/form-refinement.js';
export default defineModel({id:'prism-girdle',title:'Neck and shoulder-girdle construction',parameters:{shoulderStyle:{type:'select',options:['legacy','seated'],default:'legacy'},girdleStyle:{type:'select',options:['legacy','connected'],default:'connected'}},build:p=>{
 const source=refinedAndroid({...p,headStyle:'illustrated',bodyStyle:'articulated',limbStyle:'scalloped',poseStyle:'relaxed',gestureStyle:'counterpose',jointStyle:'housed',massStyle:'structured',handStyle:'relaxed',panelStyle:'cutaway',emitterStyle:'mapped',cables:false});
 const root=group('Girdle study');for(const child of [...source.children])if(['BodyGesture','Shoulder.Near','Shoulder.Far'].includes(child.name))root.add(child);
 source.traverse(o=>{if(o.isMesh)o.geometry.dispose();});return root;
}});
