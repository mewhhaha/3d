import * as THREE from 'three';
import {captureBonePose} from '../src/lib/bone-pose-state.js';
import {evaluatedSurfaceGeometry} from '../src/lib/evaluated-surface.js';
/** Resolve posed skin into each rigid owner's REST model space. Fit in that
 * space, then mount normally. This avoids treating blended spine skin as rigid.
 * A single selected pose is fitted, not collision freedom across all clips.
 */
export function posedArmorTargets(scene,skin,owners,clipName='upright'){
 const restore=captureBonePose(scene),rest=owners.map(b=>b.matrixWorld.clone()),mixer=new THREE.AnimationMixer(scene);
 let clip;scene.traverse(o=>{clip??=o.animations?.find(c=>c.name===clipName);});
 if(!clip)throw new Error('Missing fitting pose '+clipName);
 const result=[];
 try{
  mixer.clipAction(clip).play();mixer.setTime(.5);scene.updateMatrixWorld(true);
  for(let i=0;i<owners.length;i++){
   // Inverse frame = M_rest * inverse(M_posed). Retain meters despite .01 armature.
   const frame=owners[i].matrixWorld.clone().multiply(rest[i].clone().invert());
   result.push(evaluatedSurfaceGeometry(skin,{frame}));
  }
  return result;
 }catch(e){result.forEach(g=>g.dispose());throw e;}
 finally{mixer.stopAllAction();mixer.uncacheRoot(scene);restore();}
}
export function projectedArmorSupport(geometry,base,{clearance=.009,outline=null}={}){
 if(!geometry?.isBufferGeometry||typeof base!=='function'||!Number.isFinite(clearance)||clearance<0||clearance>.1||outline!==null&&(!Array.isArray(outline)||outline.length<3||outline.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))))throw new Error('Invalid projected panel input');
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),target=new THREE.Mesh(geometry,material),ray=new THREE.Raycaster();target.updateMatrixWorld(true);
 const powers=[];for(let total=0;total<=4;total++)for(let x=0;x<=total;x++)powers.push([x,total-x]);
 const n=powers.length,terms=(u,v)=>powers.map(([a,b])=>(2*u-1)**a*(2*v-1)**b);
 const contains=(u,v)=>{if(!outline)return true;let inside=false;for(let i=0,j=outline.length-1;i<outline.length;j=i++){const a=outline[i],b=outline[j];if((a[1]>v)!==(b[1]>v)&&u<(b[0]-a[0])*(v-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
 const samples=[],matrix=Array.from({length:n},()=>Array(n+1).fill(0));let misses=0;
 // A smooth fourth-order panel, not a copy of every crevice in the source skin.
 for(let j=0;j<=16;j++)for(let i=0;i<=16;i++){
  const u=i/16,v=j/16;if(!contains(u,v))continue;const p=base(u,v);ray.set(new THREE.Vector3(p[0],p[1],.45),new THREE.Vector3(0,0,-1));ray.near=0;ray.far=.65;
  const hit=ray.intersectObject(target,false)[0];if(!hit){misses++;continue;}
  const a=terms(u,v),z=hit.point.z;samples.push({u,v,z});
  for(let r=0;r<n;r++){for(let c=0;c<n;c++)matrix[r][c]+=a[r]*a[c];matrix[r][n]+=a[r]*z;}
 }
 material.dispose();if(samples.length<30)throw new Error('Too few surface samples for panel fit');
 // Pivoted elimination of the small least-squares normal system.
 for(let c=0;c<n;c++){
  let pivot=c;for(let r=c+1;r<n;r++)if(Math.abs(matrix[r][c])>Math.abs(matrix[pivot][c]))pivot=r;
  [matrix[c],matrix[pivot]]=[matrix[pivot],matrix[c]];
  const divisor=matrix[c][c];if(Math.abs(divisor)<1e-10)throw new Error('Singular panel fit');
  for(let k=c;k<=n;k++)matrix[c][k]/=divisor;
  for(let r=0;r<n;r++)if(r!==c){const factor=matrix[r][c];for(let k=c;k<=n;k++)matrix[r][k]-=factor*matrix[c][k];}
 }
 const coefficients=matrix.map(row=>row[n]),height=(u,v)=>terms(u,v).reduce((sum,x,i)=>sum+x*coefficients[i],0);
 const lift=Math.max(0,...samples.map(p=>p.z-height(p.u,p.v)));
 const support=(u,v)=>{const p=base(u,v);return[p[0],p[1],height(u,v)+lift+clearance];};
 const gaps=samples.map(p=>height(p.u,p.v)+lift+clearance-p.z).sort((a,b)=>a-b);
 support.fit={samples:samples.length,misses,clearance,envelopeLift:lift,sampledGap:{min:gaps[0],median:gaps[Math.floor(gaps.length/2)],p95:gaps[Math.floor(gaps.length*.95)],max:gaps.at(-1)},coefficients,method:'fourth-order envelope of posed skin samples in rigid rest space; sampled clearance only'};
 return support;
}
