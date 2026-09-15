import { deflateSync } from 'node:zlib';
/** Small deterministic RGBA PNG encoder for diagnostic masks; no native dependencies. */
export function rgbaPng(width,height,rgba){
 if(![width,height].every(n=>Number.isInteger(n)&&n>0&&n<=4096)||rgba.length!==width*height*4)throw new Error('Invalid RGBA image');
 const crc=bytes=>{let v=0xffffffff;for(const b of bytes){v^=b;for(let k=0;k<8;k++)v=(v>>>1)^((v&1)?0xedb88320:0);}return(v^0xffffffff)>>>0;};
 const chunk=(name,data)=>{const type=Buffer.from(name),size=Buffer.alloc(4),check=Buffer.alloc(4);size.writeUInt32BE(data.length);check.writeUInt32BE(crc(Buffer.concat([type,data])));return Buffer.concat([size,type,data,check]);};
 const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
 const rows=Buffer.alloc((width*4+1)*height);for(let y=0;y<height;y++)Buffer.from(rgba.buffer,rgba.byteOffset+y*width*4,width*4).copy(rows,y*(width*4+1)+1);
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
export function polygonMask({image:{width,height},outline,holes=[]}){
 if(![width,height].every(n=>Number.isInteger(n)&&n>0&&n<=4096))throw new Error('Invalid mask image');
 const loops=[outline,...holes];if(loops.some(p=>!Array.isArray(p)||p.length<3||p.some(v=>v.length!==2||!v.every(Number.isFinite))))throw new Error('Invalid mask polygon');
 const inside=(x,y,p)=>{let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
 const pixels=new Uint8Array(width*height*4).fill(255);let foregroundPixels=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(inside(x+.5,y+.5,outline)&&!holes.some(p=>inside(x+.5,y+.5,p))){const i=(y*width+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=0;foregroundPixels++;}
 return {png:rgbaPng(width,height,pixels),foregroundPixels,width,height};
}
