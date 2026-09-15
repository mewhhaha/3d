import { defineModel } from '../src/lib/modeling.js';
import { ellipsoidCage, sculpt, ball, stroke, facing, intersect, pull, inflate, relax } from '../src/lib/forms/sculpt.js';
import { cageAsset } from '../src/lib/forms/cage-asset.js';

/** A small auricle relief study to exercise sculpt tools; not a finished anatomical ear. */
export function earForm({definition=1}={}){
  const front=facing([0,0,1]), oval=ellipsoidCage({radii:[.024,.039,.010],at:[0,.04,0],level:4});
  const concha=intersect(front,ball({at:[-.003,.037,.007],radius:[.014,.020,.022]}));
  const lobe=ball({at:[-.003,.008,0],radius:[.016,.014,.020]});
  const rim=Array.from({length:29},(_,i)=>{const a=-.45+i/28*5.5;return [.020*Math.sin(a),.043+.030*Math.cos(a),0];});
  return sculpt(oval,
    pull(ball({at:[-.02,.05,0],radius:.045}),[-.003*definition,0,0]),
    pull(concha,[0,0,-.010*definition]),
    pull(intersect(front,stroke(rim,{radius:.005,plane:'xy'})),[0,0,.004*definition]),
    pull(intersect(front,stroke([[-.004,.017,0],[.008,.029,0],[.010,.046,0],[.004,.061,0]],{radius:.0045,plane:'xy'})),[0,0,.0045*definition]),
    pull(intersect(front,stroke([[.010,.046,0],[.003,.055,0],[-.005,.063,0]],{radius:.0035,plane:'xy'})),[0,0,.003*definition]),
    inflate(intersect(front,ball({at:[-.016,.029,.003],radius:[.009,.010,.018]})),.004*definition),
    inflate(intersect(front,lobe),.003*definition),
    relax(ball({at:[0,.04,0],radius:.10}),{strength:.12,iterations:2}),
  );
}
export default defineModel({
  id:'sculpt-ear',title:'Sculpt lab / auricle relief',
  description:'First-principles sculpting of one small form: hollow, rim, inner ridge and lobe. A tool study, not a photoreal ear or full character.',
  parameters:{
    representation:{type:'select',options:['cage','sculpt','baked'],default:'baked',label:'Geometry / detail'},
    definition:{type:'number',min:0,max:1,step:.1,default:1,label:'Primary form'},
  },
  build:p=>cageAsset(earForm(p),{name:'Auricle',mode:p.representation,lowLevel:0,highLevel:2,
    detail:[inflate(intersect(facing([0,0,1]),stroke([[.010,.034,0],[.014,.046,0],[.009,.059,0]],{radius:.0018,plane:'xy'})),-.0003)],
    relief:(point,normal)=>.000012*Math.max(0,normal.z)*Math.sin(point.x*5600)*Math.sin(point.y*6500),
  }),
});
