import {shapeProfile} from '../src/lib/shape-rails.js';
/** Artistic rest-shape hypotheses in source model meters. No pose/camera values,
 * triangle IDs or new topology. One field drives skin AND rest-joint positions. */
export function xbotForm({legLift=.07,torsoSlim=.12,depthSlim=.10}={}){
 if(![legLift,torsoSlim,depthSlim].every(Number.isFinite)||legLift<0||legLift>.1||torsoSlim<0||torsoSlim>.22||depthSlim<0||depthSlim>.2)throw new Error('Invalid Xbot form controls');
 const profile=keys=>{const f=shapeProfile(keys.map(([y,v])=>[y/1.82,v]));return y=>f(y/1.82);};
 const lift=profile([[0,0],[.09,0],[.53,legLift*.5],[.98,legLift],[1.15,legLift*.48],[1.34,legLift*.16],[1.51,0],[1.82,0]]);
 const width=profile([[0,0],[.65,0],[.99,.3],[1.15,.65],[1.31,1],[1.43,.50],[1.51,0],[1.82,0]]);
 const depth=profile([[0,0],[.72,0],[1.0,.55],[1.16,.72],[1.32,1],[1.44,.7],[1.53,0],[1.82,0]]);
 return ([x,y,z])=>{
  if(y<0||y>1.82)return[x,y,z];
  return[x-torsoSlim*width(y)*.22*Math.tanh(x/.22),y+lift(y),z*(1-depthSlim*depth(y))];
 };
}
