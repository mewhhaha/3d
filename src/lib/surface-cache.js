/** Cache an expensive regular support as a C1 bicubic sampled field.
 * This approximates PRIMARY SHAPE, never material/light detail. Validate the error
 * before using a cache for a new form. All generated representations share it.
 */
export function cacheSurface(source, { segments = [128,96], wrapU = false } = {}) {
 if(typeof source!=='function'||!Array.isArray(segments)||segments.length!==2||!segments.every(n=>Number.isInteger(n)&&n>=4&&n<=512))throw new TypeError('Surface cache requires a function and two 4..512 sample counts');
 const [nu,nv]=segments,cols=wrapU?nu:nu+1,values=new Float64Array(cols*(nv+1)*3);
 for(let y=0;y<=nv;y++)for(let x=0;x<cols;x++){
  const p=source(x/nu,y/nv);if(!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))throw new Error('Invalid cached source point');
  values.set(p,(y*cols+x)*3);
 }
 // Linear ghost points give the endpoints full one-sided tangents, not half tangents.
 const row=(x,y,k)=>{
  if(wrapU)x=((x%nu)+nu)%nu;
  else if(x<0)return 2*values[(y*cols)*3+k]-values[(y*cols+1)*3+k];
  else if(x>nu)return 2*values[(y*cols+nu)*3+k]-values[(y*cols+nu-1)*3+k];
  return values[(y*cols+x)*3+k];
 };
 const value=(x,y,k)=>y<0?2*row(x,0,k)-row(x,1,k):y>nv?2*row(x,nv,k)-row(x,nv-1,k):row(x,y,k);
 const basis=t=>[-.5*t+t*t-.5*t*t*t,1-2.5*t*t+1.5*t*t*t,.5*t+2*t*t-1.5*t*t*t,-.5*t*t+.5*t*t*t];
 const evaluate=(u,v)=>{
  if(![u,v].every(Number.isFinite)||v<0||v>1||(!wrapU&&(u<0||u>1)))throw new RangeError('Cache point outside parameter domain');
  if(wrapU)u=((u%1)+1)%1;
  const x=u*nu,y=v*nv,ix=Math.min(nu-1,Math.floor(x)),iy=Math.min(nv-1,Math.floor(y)),a=basis(x-ix),b=basis(y-iy),out=[0,0,0];
  for(let j=0;j<4;j++)for(let i=0;i<4;i++){const w=a[i]*b[j];for(let k=0;k<3;k++)out[k]+=w*value(ix+i-1,iy+j-1,k);}
  return out;
 };
 evaluate.approximation=Object.freeze({method:'C1 tensor-product cubic interpolation with linear boundary ghosts',segments:[nu,nv],wrapU,sourceSamples:cols*(nv+1),storageBytes:values.byteLength});
 return evaluate;
}
/** Independent interior samples, not the cache's grid points. */
export function measureSurfaceCache(source,cached,{samples=1024}={}){
 if(!Number.isInteger(samples)||samples<16||samples>100000)throw new RangeError('Expected 16..100000 samples');
 const sequence=(i,b)=>{let f=1,v=0;while(i){f/=b;v+=f*(i%b);i=Math.floor(i/b);}return v;};
 const errors=[];let square=0;
 for(let i=1;i<=samples;i++){
  const u=sequence(i,2),v=sequence(i,3),a=source(u,v),b=cached(u,v);
  const d=Math.hypot(...a.map((x,k)=>x-b[k]));if(!Number.isFinite(d))throw new Error('Nonfinite cache comparison');errors.push(d);square+=d*d;
 }
 errors.sort((a,b)=>a-b);
 return {samples,rmsMeters:Math.sqrt(square/samples),p95Meters:errors[Math.ceil(samples*.95)-1],maxMeters:errors.at(-1),scope:'Primary position approximation; not normal, silhouette, bake, pose or likeness error'};
}
