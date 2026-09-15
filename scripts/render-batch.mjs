import { createRenderSession } from './render.mjs';
/** Finite sequential batch with a fresh browser per operation. More startup work, less shared GPU state.
 * A failed job is not retried or marked successful; the caller retains its checkpoint and may continue. */
export function isolatedRenderJobs(factory, { maxJobs=32 }={}) {
  if(typeof factory!=='function'||!Number.isInteger(maxJobs)||maxJobs<1||maxJobs>256)throw new Error('Invalid render batch');
  let busy=false,closed=false,count=0,capabilities=null;
  async function run(method, spec) {
    if(closed)throw new Error('Render batch is closed');
    if(busy)throw new Error('Render batch operations must be sequential');
    if(count>=maxJobs)throw new Error('Render batch job budget exceeded');
    busy=true;count++;let session;
    try {session=await factory();capabilities=session.capabilities;return await session[method](spec);}
    finally {try{await session?.close();}finally{busy=false;}}
  }
  return {get capabilities(){return capabilities;},get jobs(){return count;},
    render:spec=>run('render',spec),compare:spec=>run('compare',spec),sheet:spec=>run('sheet',spec),
    async close(){if(busy)throw new Error('Finish the active render before closing the batch');closed=true;},
  };
}
export function createRenderBatch({maxJobs=32,...options}={}){
  return isolatedRenderJobs(()=>createRenderSession(options),{maxJobs});
}
