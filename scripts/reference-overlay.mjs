import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const pngHeader = Buffer.from([137,80,78,71,13,10,26,10]);
export function checkReferencePNG(bytes, image, { verifyHash=true }={}) {
  if (!Buffer.isBuffer(bytes) || bytes.length<24 || bytes.length>32*1024*1024 || !bytes.subarray(0,8).equals(pngHeader)) throw new Error('Reference must be a PNG below 32 MiB');
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),sha256=createHash('sha256').update(bytes).digest('hex');
  if(width!==image.width||height!==image.height)throw new Error(`Reference dimensions differ: expected ${image.width}x${image.height}, got ${width}x${height}`);
  if(verifyHash && image.sha256 && sha256!==image.sha256)throw new Error('Reference image hash differs from its annotation record');
  return {width,height,sha256};
}
/** Self-contained, offline overlay: pink target / cyan projected model; no image generation. */
export function referenceOverlay(reference, candidate, report, image) {
  checkReferencePNG(reference,image);checkReferencePNG(candidate,image,{verifyHash:false});
  if(!Array.isArray(report.rows)||!report.rows.length)throw new Error('Overlay needs a measured landmark report');
  const vector=p=>{if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))throw new Error('Invalid overlay point');return p;};
  const lines=report.rows.map((r,i)=>{const [x,y]=vector(r.target),[u,v]=vector(r.actual),uncertainty=r.uncertaintyPixels||5;
    return `<path d="M ${x} ${y} L ${u} ${v}" stroke="#ffffff" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="${uncertainty}" fill="none" stroke="#ff609f" stroke-width="2"/><path d="M ${u-5} ${v} h 10 M ${u} ${v-5} v 10" stroke="#43fff1" stroke-width="2"/><text x="${u+9}" y="${v-8}" fill="white" font-size="14" stroke="black" stroke-width="3" paint-order="stroke">${i+1}</text>`;
  }).join('\n');
  const regions=Object.entries(report.regions||{}).filter(([,r])=>r.envelope).map(([name,r])=>[ ['target','#ff609f'],['actual','#43fff1'] ].map(([key,color])=>`<polygon points="${r.envelope[key].map(p=>vector(p).join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="2"><title>${escape(name)} ${key} convex envelope</title></polygon>`).join('\n')).join('\n');
  const legend=report.rows.map((r,i)=>`${i+1}. ${r.name}: ${r.errorPixels.toFixed(1)} pixels`).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${image.width}" height="${image.height}" viewBox="0 0 ${image.width} ${image.height}"><title>Reference alignment, not likeness acceptance</title><desc>${escape(legend)}</desc><image width="100%" height="100%" href="data:image/png;base64,${reference.toString('base64')}"/><image id="candidate" opacity="0.48" width="100%" height="100%" href="data:image/png;base64,${candidate.toString('base64')}"/>${lines}${regions}<rect x="8" y="8" width="450" height="24" fill="#001518" opacity=".85"/><text x="16" y="25" fill="white" font-family="sans-serif" font-size="13">Pink: manual target uncertainty. Cyan: actual 3D feature.</text></svg>`;
}
export async function writeReferenceOverlay({ reference, candidate, report, annotations='references/prism.json', out='renders/pose/overlay.svg' }) {
  const [ref,render,measurement,spec]=await Promise.all([readFile(reference),readFile(candidate),readFile(report,'utf8').then(JSON.parse),readFile(annotations,'utf8').then(JSON.parse)]);
  const text=referenceOverlay(ref,render,measurement,spec.image);await mkdir(path.dirname(out),{recursive:true});await writeFile(out,text);return out;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const [reference,candidate,report,out]=process.argv.slice(2);
  if(!reference||!candidate||!report)throw new Error('Usage: node scripts/reference-overlay.mjs reference.png render.png alignment.json [overlay.svg]');
  console.log(await writeReferenceOverlay({reference,candidate,report,out}));
}
