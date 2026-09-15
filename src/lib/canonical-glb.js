/** Stabilize buffer-view ordering after asynchronous image encoding. Payload bytes are unchanged. */
export function canonicalGLB(input) {
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(bytes.length<28||view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==bytes.length)throw new Error('Invalid GLB');
  const jsonLength=view.getUint32(12,true),binHeader=20+jsonLength;
  if(view.getUint32(16,true)!==0x4e4f534a||binHeader+8>bytes.length||view.getUint32(binHeader+4,true)!==0x004e4942)throw new Error('Expected JSON and BIN chunks');
  const json=JSON.parse(new TextDecoder().decode(bytes.subarray(20,binHeader))),bin=bytes.subarray(binHeader+8);
  if(json.buffers?.length!==1||json.buffers[0].uri)throw new Error('Canonical export expects a single embedded buffer');
  if(json.extensionsUsed?.includes('EXT_meshopt_compression'))throw new Error('Meshopt buffer offsets require a separate canonicalizer');
  const old=json.bufferViews||[],order=[],seen=new Set();
  const add=i=>{if(!Number.isInteger(i)||!old[i])throw new Error('Invalid bufferView reference');if(!seen.has(i)){seen.add(i);order.push(i);}};
  function collect(node){if(!node||typeof node!=='object')return;for(const[k,v]of Object.entries(node)){if(k==='bufferView')add(v);else collect(v);}}
  collect(json.accessors);collect(json.images);collect(json);old.forEach((_,i)=>add(i));
  const remap=new Map(order.map((old,i)=>[old,i])),chunks=[];let length=0;
  const next=order.map(i=>{
    const entry=old[i],start=entry.byteOffset||0,size=entry.byteLength;
    if(entry.buffer!==0||!Number.isInteger(size)||size<0||start<0||start+size>bin.length)throw new Error('Invalid embedded buffer view');
    const output={...entry,byteOffset:length};chunks.push([length,bin.subarray(start,start+size)]);length+=(size+3)&~3;return output;
  });
  function rewrite(node){if(!node||typeof node!=='object')return;for(const[k,v]of Object.entries(node)){if(k==='bufferView')node[k]=remap.get(v);else rewrite(v);}}
  rewrite(json);json.bufferViews=next;json.buffers[0].byteLength=length;
  const text=new TextEncoder().encode(JSON.stringify(json)),padded=(text.length+3)&~3,total=28+padded+length,out=new Uint8Array(total),header=new DataView(out.buffer);
  header.setUint32(0,0x46546c67,true);header.setUint32(4,2,true);header.setUint32(8,total,true);header.setUint32(12,padded,true);header.setUint32(16,0x4e4f534a,true);
  out.fill(32,20,20+padded);out.set(text,20);header.setUint32(20+padded,length,true);header.setUint32(24+padded,0x004e4942,true);
  for(const[offset,chunk]of chunks)out.set(chunk,28+padded+offset);
  return out.buffer;
}
