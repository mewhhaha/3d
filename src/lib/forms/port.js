import {smooth}from'./surface.js';
/** Round a chart-aligned opening before connecting another surface to it. */
export function roundOpening(base,{at,radius,falloff=1}={}){
 if(typeof base!=='function'||!Array.isArray(at)||at.length!==2||!at.every(Number.isFinite)||!Array.isArray(radius)||radius.length!==2||!radius.every(v=>v>0&&Number.isFinite(v))||!(falloff>0))throw new Error('Invalid rounded opening');
 return(u,v)=>{
  const a=(u-at[0])/radius[0],b=(v-at[1])/radius[1],distance=Math.max(Math.abs(a),Math.abs(b)),w=smooth((1+falloff-distance)/falloff);
  const aa=a*Math.sqrt(1-Math.min(b*b,1)*.5),bb=b*Math.sqrt(1-Math.min(a*a,1)*.5);
  return base(u+(aa-a)*radius[0]*w,v+(bb-b)*radius[1]*w);
 };
}
/** Concentrate samples around a rounded tip while leaving the shaft inexpensive. */
export function roundedTipSampling(v){return v<=.8?v*1.1:.88+.12*Math.sin((v-.8)*Math.PI/.4);}
