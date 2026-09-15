import { pointFields } from '../shape-deform.js';
const smooth=(x,a,b)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
/** Primary skull and jaw fields, deliberately zero in the scored eye region. */
export const portraitFields=pointFields(
 p=>{const w=smooth(p[1],.043,.130);return[p[0]*(1-.4*w),p[1]-.045*w,p[2]-.08*w];},
 p=>{const w=smooth(p[0],.054,.085)*smooth(p[1],-.055,.020);return[p[0]-.018*w,p[1],p[2]-.027*w];},
 p=>{const w=smooth(-p[1],.012,.105);return[p[0]*(1-.055*w)-.025*w,p[1]+.020*w,p[2]+.003*w];},
 p=>{const w=Math.exp(-((p[0]/.018)**2+((p[1]+.018)/.020)**2+((p[2]-.077)/.030)**2));return[p[0],p[1],p[2]-.004*w];},
);
