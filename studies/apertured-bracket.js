import {defineModel,mesh,material} from '../src/lib/modeling.js';
import {surfaceContourGeometry} from '../src/lib/surface-contour.js';
import {solidifyGeometry} from '../src/lib/surface-thickness.js';
export default defineModel({id:'apertured-bracket',title:'Curved lightweight bracket',parameters:{apertures:{type:'boolean',default:true}},build:p=>{
 const support=(u,v)=>[(u-.5)*.7,(v-.5)*.4,.12*Math.sin(u*Math.PI)+.018*Math.sin(v*Math.PI)];
 const outline=[[.02,.14],[.14,.02],[.86,.02],[.98,.14],[.98,.86],[.86,.98],[.14,.98],[.02,.86]];
 const holes=[[[.16,.25],[.38,.25],[.38,.74],[.16,.74]],[[.56,.30],[.76,.22],[.85,.44],[.73,.78],[.55,.67]]];
 const sheet=surfaceContourGeometry(support,{outline,holes:p.apertures?holes:[],rounding:.15,refinement:2});
 const geometry=solidifyGeometry(sheet,{thickness:.018,regionPrefix:'bracket'});sheet.dispose();
 return mesh(geometry,{name:'Lightweight curved bracket',material:material('#ce713e',{metalness:.4,roughness:.4})});
}});
