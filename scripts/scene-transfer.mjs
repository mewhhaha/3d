/** Transfer the recipe's JSON representation without one enormous DevTools command.
 * Chromium 144's pipe rejects messages over 100 MiB. Numeric attribute arrays
 * grow further in Playwright's object serialization, even before that limit.
 * Each escaped UTF-16 chunk is bounded well below the transport cap; source
 * geometry is neither simplified nor re-encoded as an image. JSON-safe input only.
 */
export async function loadSceneJSON(page,json,{chunkSize=1024*1024}={}){
 if(!Number.isInteger(chunkSize)||chunkSize<1||chunkSize>4*1024*1024)throw new Error('Scene transfer chunkSize must be 1..4194304 UTF-16 units');
 const text=JSON.stringify(json);
 if(typeof text!=='string')throw new Error('Scene transfer requires serializable JSON');
 const chunks=await page.evaluateHandle(()=>[]);
 try{
  for(let i=0;i<text.length;i+=chunkSize)await chunks.evaluate((parts,part)=>{parts.push(part);},text.slice(i,i+chunkSize));
  return await chunks.evaluate(async parts=>{
   const json=JSON.parse(parts.join(''));parts.length=0;
   return window.stage.load({json});
  });
 }finally{await chunks.dispose();}
}
