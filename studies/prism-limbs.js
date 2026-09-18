import {defineModel,group} from '../src/lib/modeling.js';
import {refinedAndroid} from '../src/lib/cyber/form-refinement.js';
export default defineModel({id:'prism-limbs',title:'Prism limb construction',parameters:{massStyle:{type:'select',options:['profiled','sculpted'],default:'profiled'},limbStyle:{type:'select',options:['legacy','scalloped'],default:'scalloped'},poseStyle:{type:'select',options:['reference','relaxed'],default:'relaxed'},region:{type:'select',options:['legs','arms'],default:'legs'}},build:p=>{
 const source=refinedAndroid({...p,headStyle:'illustrated',bodyStyle:'articulated',cables:false}),root=group('Limb construction');
 const prefixes=p.region==='legs'?['Hip.','Knee.','Boot.']:['Shoulder.','Elbow.','Wrist.'];
 for(const part of [...source.children])if(prefixes.some(n=>part.name.startsWith(n)))root.add(part);
 source.traverse(o=>{if(o.isMesh)o.geometry.dispose();});return root;
}});
