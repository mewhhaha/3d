import { pointFields, weightedTransform } from '../shape-deform.js';
const smooth=(x,a,b)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
/** Primary skull and jaw fields. These reshape mesh geometry without moving named feature origins. */
export const portraitFields=pointFields(
 // Keep the concealed scalp inside the bob; this region is not the visible facial silhouette.
 weightedTransform(p=>smooth(p[1],.043,.130),{scale:[.60,1,1],offset:[0,-.045,-.080]}),
 // Narrow and round the lower face symmetrically; pose rotation supplies the three-quarter view.
 weightedTransform(p=>smooth(-p[1],.008,.108),{scale:[.82,1,1],offset:[0,.008,.004]}),
 // Soften broad lower cheek corners while leaving the eye band essentially untouched.
 weightedTransform(p=>smooth(Math.abs(p[0]),.060,.105)*smooth(-p[1],-.010,.075),{scale:[.92,1,1],offset:[0,0,-.007]}),
 // Keep the nose as a small anime plane rather than a protruding button.
 p=>{const w=Math.exp(-((p[0]/.018)**2+((p[1]+.018)/.020)**2+((p[2]-.077)/.030)**2));return[p[0],p[1],p[2]-.004*w];},
);
