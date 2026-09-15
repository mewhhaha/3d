import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validateStudy, runStudy } from '../scripts/study.mjs';
const spec=()=>({schema:1,id:'test',module:'models/orbit-bot.js',cases:[{id:'one'}]});
test('study schema rejects unsafe, ambiguous and unbounded cases',()=>{
  assert.equal(validateStudy(spec()).id,'test');
  for(const change of [{id:'../escape'},{module:'../secret.js'},{cases:[]},{cases:[{id:'a'},{id:'a'}]},{cases:[{id:'a',maxTriangles:-1}]},{passes:['unknown']},{width:0},{typo:1},{lockCamera:'yes'}])assert.throws(()=>validateStudy({...spec(),...change}));
});
test('study checkpoints errors instead of losing earlier state and continues bounded cases',async()=>{
  const out=await mkdtemp(path.join(os.tmpdir(),'studio-test-'));let calls=0;
  try {
    const session={capabilities:{fixture:true},async render(){calls++;throw new Error('deliberate test failure');}};
    const result=await runStudy({...spec(),cases:[{id:'a'},{id:'b'}]},{out,session});
    assert.equal(calls,2);assert.equal(result.status,'failed');assert.equal(result.cases.length,2);
    const saved=JSON.parse(await readFile(path.join(out,'study.json'),'utf8'));
    assert.equal(saved.status,'failed');assert.match(saved.cases[0].error,/deliberate/);assert.equal(saved.visualAcceptance,'not-assessed');
  }finally{await rm(out,{recursive:true,force:true});}
});
