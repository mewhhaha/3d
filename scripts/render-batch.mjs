import { createRenderSession } from './render.mjs';
/** Finite sequential batch with a fresh browser per operation. More startup work, less shared GPU state.
 * A browser/page termination may be retried once with a fresh session; model, validation and ordinary render failures are never retried. */
export function isolatedRenderJobs(factory, { maxJobs=32, transientRetries=1 }={}) {
  if(typeof factory!=='function'||!Number.isInteger(maxJobs)||maxJobs<1||maxJobs>256||!Number.isInteger(transientRetries)||transientRetries<0||transientRetries>2)throw new Error('Invalid render batch');
  const transient=e=>/target (?:page, context or browser|page|browser) has been closed|browser has been closed|target closed|browser.*disconnected|browser.*crashed/i.test(String(e?.stack||e?.message||e));
  let busy=false,closed=false,count=0,capabilities=null;
  async function run(method, spec) {
    if(closed)throw new Error('Render batch is closed');
    if(busy)throw new Error('Render batch operations must be sequential');
    if(count>=maxJobs)throw new Error('Render batch job budget exceeded');
    busy=true;count++;
    try {
      for(let attempt=0;;attempt++){let session;
        try {session=await factory();capabilities=session.capabilities;return await session[method](spec);}
        catch(error){if(attempt>=transientRetries||!transient(error))throw error;}
        finally {await session?.close().catch(()=>{});}
      }
    } finally {busy=false;}
  }
  return {get capabilities(){return capabilities;},get jobs(){return count;},
    render:spec=>run('render',spec),compare:spec=>run('compare',spec),sheet:spec=>run('sheet',spec),
    async close(){if(busy)throw new Error('Finish the active render before closing the batch');closed=true;},
  };
}
export function createRenderBatch({maxJobs=32,transientRetries=1,...options}={}){
  return isolatedRenderJobs(()=>createRenderSession(options),{maxJobs,transientRetries});
}
