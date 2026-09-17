import {defineModel,group,mesh,material} from '../src/lib/modeling.js';
import {surfaceContourGeometry} from '../src/lib/surface-contour.js';
import {solidifyGeometry} from '../src/lib/surface-thickness.js';
export default defineModel({id:'surface-contour',title:'Contoured duct hatch',parameters:{curved:{type:'boolean',default:true}},build:p=>{
 const support=(u,v)=>{const a=(u-.5)*2.2;return [Math.sin(a)*.34,(v-.5)*.60,p.curved?Math.cos(a)*.34:0];};
 const outline=[[.12,.10],[.43,.08],[.48,.28],[.64,.29],[.69,.08],[.90,.13],[.93,.84],[.79,.94],[.23,.91],[.09,.75]];
 const a=surfaceContourGeometry(support,{outline,refinement:3,rounding:.10}),g=solidifyGeometry(a,{thickness:.014,offset:-1,regionPrefix:'hatch'});a.dispose();
 return group('Service duct hatch',[mesh(g,{name:'Notched pressure cover',material:material('#a4b7ba',{metalness:.38,roughness:.48})})]);
}});
