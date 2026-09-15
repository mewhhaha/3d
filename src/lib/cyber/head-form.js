import { pointFields } from '../shape-deform.js';
const smooth=(x,a,b)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
/** Primary skull and jaw fields, deliberately zero in the scored eye region. */
export const portraitFields=pointFields(
 p=>{const w=smooth(p[1],.043,.130);return[p[0]*(1-.4*w),p[1]-.045*w,p[2]-.08*w];},
 p=>{const w=smooth(p[0],.054,.085)*smooth(p[1],-.055,.020);return[p[0]-.024*w,p[1],p[2]-.044*w];},
 p=>{const w=smooth(-p[1],.012,.105);return[p[0]*(1-.12*w)-.032*w,p[1],p[2]+.003*w];},
);
