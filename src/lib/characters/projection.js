/** Continuous triangle projection for clothing details; excludes all source helper geometry. */
export function surfaceProjector(surface,step=.025){
 const {points,faces}=surface,bins=new Map(),used=new Set(),key=(x,y)=>`${x},${y}`;
 for(const face of faces){face.ids.forEach(i=>used.add(i));for(let k=1;k<face.ids.length-1;k++){
 const t=[points[face.ids[0]],points[face.ids[k]],points[face.ids[k+1]]],minX=Math.floor(Math.min(...t.map(p=>p[0]))/step),maxX=Math.floor(Math.max(...t.map(p=>p[0]))/step),minY=Math.floor(Math.min(...t.map(p=>p[1]))/step),maxY=Math.floor(Math.max(...t.map(p=>p[1]))/step);
 for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++){const id=key(x,y);if(!bins.has(id))bins.set(id,[]);bins.get(id).push(t);}
 }}
 const vertices=[...used].map(i=>points[i]),cache=new Map();
 return(x,y,side=1)=>{
 const id=`${x.toFixed(6)},${y.toFixed(6)},${side}`;if(cache.has(id))return cache.get(id);let z=side>0?-Infinity:Infinity;
 for(const[a,b,c]of bins.get(key(Math.floor(x/step),Math.floor(y/step)))||[]){
 const d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(d)<1e-12)continue;
 const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/d,v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/d,w=1-u-v;
 if(Math.min(u,v,w)<-1e-6)continue;const depth=u*a[2]+v*b[2]+w*c[2];z=side>0?Math.max(z,depth):Math.min(z,depth);
 }
 if(!Number.isFinite(z)){let best=Infinity;for(const p of vertices){const d=(p[0]-x)**2+(p[1]-y)**2;if(d<best){best=d;z=p[2];}}}
 cache.set(id,z);return z;
 };
}
