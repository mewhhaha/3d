import { THREE } from './modeling.js';
const clamp = x => Math.max(0, Math.min(1, x));
const mix = (a, b, t) => a + (b-a)*t;
const hash = (x, y, seed) => {
  let h = Math.imul(x + seed, 374761393) ^ Math.imul(y + 11, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
// Periodic noise tiles at integer U/V boundaries.
export function noise(u, v, cells = 16, seed = 1) {
  const x = ((u % 1) + 1) % 1 * cells, y = ((v % 1) + 1) % 1 * cells;
  const ix = Math.floor(x), iy = Math.floor(y), fx = x-ix, fy = y-iy;
  const a = fx*fx*(3-2*fx), b = fy*fy*(3-2*fy);
  return mix(mix(hash(ix,iy,seed),hash((ix+1)%cells,iy,seed),a),mix(hash(ix,(iy+1)%cells,seed),hash((ix+1)%cells,(iy+1)%cells,seed),a),b);
}
const presets = {
  marble: { color: '#e5ded0', roughness: 0.48, relief: 0.0008 },
  bronze: { color: '#8f704b', roughness: 0.42, metalness: 0.82, relief: 0.0008 },
  skin: { color: '#c38a6c', roughness: 0.55, relief: 0.0012 },
  cloth: { color: '#58604b', roughness: 0.86, relief: 0.002 },
  leather: { color: '#513522', roughness: 0.62, relief: 0.0015 },
  hair: { color: '#37251f', roughness: 0.48, relief: 0.001 },
};
function field(kind, u, v, seed) {
  const a = noise(u,v,8,seed), b = noise(u,v,32,seed+7), c = noise(u,v,128,seed+11);
  if (kind === 'marble') {
    const vein = Math.exp(-Math.abs(Math.sin(Math.PI*2*(3*u+2*v) + 5*Math.sin(Math.PI*2*v) + (a-.5)*4))*22);
    return { tone: 0.92 - vein*0.29 + b*0.08, height: c*0.14 + vein*0.04, rough: b*0.08 };
  }
  if (kind === 'bronze') return { tone: 0.68+a*0.35, height: b*.4+c*.25, rough: a*.14, patina: Math.max(0,b-.58)*.8 };
  if (kind === 'skin') return { tone: 0.96+(a-.5)*.07-Math.max(0,c-.62)*.25, height: c*.7+b*.15, rough: (b-.5)*.12 };
  if (kind === 'cloth') {
    const weave = Math.sin(2*Math.PI*64*u)*Math.sin(2*Math.PI*64*v);
    return { tone: .92+(b-.5)*.1+weave*.035, height: weave*.35+c*.1, rough: .05*b };
  }
  if (kind === 'leather') return { tone: .85+(b-.5)*.2, height: c*.55+b*.2, rough: (b-.5)*.16 };
  return { tone: .65+.28*Math.sin(2*Math.PI*(48*u+Math.sin(2*Math.PI*v)*.15))**2, height: Math.sin(2*Math.PI*48*u)*.3, rough: (b-.5)*.07 };
}
function texture(data, size, name, color = false) {
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.name = name; t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.flipY = false; t.needsUpdate = true;
  return t;
}
export function pbrMaterial(kind, options = {}) {
  if (!Object.hasOwn(presets, kind)) throw new Error(`Unknown material: ${kind}`);
  const p = { ...presets[kind], size: 256, seed: 1, ...options };
  if (!Number.isInteger(p.size) || p.size < 32 || p.size > 2048 || (p.size & (p.size-1))) throw new Error('Texture size must be a power of two, 32..2048');
  if (!/^#[0-9a-f]{6}$/i.test(p.color) || !Number.isInteger(p.seed)) throw new Error('Invalid material color or seed');
  if (![p.roughness, p.relief, p.metalness || 0].every(Number.isFinite) || p.relief < 0 || p.roughness < 0 || p.roughness > 1) throw new Error('Invalid PBR properties');
  const size = p.size, count = size*size, color = new Uint8Array(count*4), normal = new Uint8Array(count*4), rough = new Uint8Array(count*4), heights = new Float32Array(count);
  const rgb = [1,3,5].map(i => parseInt(p.color.slice(i,i+2),16));
  for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
    const i=y*size+x, f=field(kind,x/size,y/size,p.seed);
    heights[i] = f.height;
    for (let c=0; c<3; c++) color[i*4+c] = Math.round(Math.min(255, rgb[c]*f.tone + (c===1 ? (f.patina||0)*70 : 0)));
    color[i*4+3]=255;
    const r=Math.round(clamp(p.roughness+f.rough)*255); rough.set([255,r,255,255],i*4);
  }
  for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
    const at=(a,b)=>heights[((b+size)%size)*size+(a+size)%size];
    const nx=-(at(x+1,y)-at(x-1,y))*size*.5*p.relief, ny=-(at(x,y+1)-at(x,y-1))*size*.5*p.relief;
    const len=Math.hypot(nx,ny,1), i=(y*size+x)*4;
    normal.set([Math.round((nx/len*.5+.5)*255),Math.round((ny/len*.5+.5)*255),Math.round((1/len*.5+.5)*255),255],i);
  }
  const name=p.name || kind, orm=texture(rough,size,`${p.name||kind}-metallic-roughness`);
  return new THREE.MeshStandardMaterial({ name, color: '#ffffff', roughness: 1, metalness: p.metalness || 0,
    map: texture(color,size,`${name}-basecolor`,true),
    normalMap: texture(normal,size,`${name}-normal`),
    roughnessMap: orm, metalnessMap: orm,
  });
}
export function checkerTexture(size = 256, cells = 16) {
  const data = new Uint8Array(size*size*4);
  for (let y=0;y<size;y++) for (let x=0;x<size;x++) {
    const a=(Math.floor(x*cells/size)+Math.floor(y*cells/size))%2;
    data.set(a ? [48,88,110,255] : [227,209,159,255],(y*size+x)*4);
  }
  return texture(data,size,'UV-checker',true);
}
