import test from 'node:test';
import assert from 'node:assert/strict';
import { browserPath, memoryRuntime, sourceFingerprint } from '../scripts/render.mjs';
test('local renderer reports an invalid explicit browser path',async()=>{await assert.rejects(browserPath('/nonexistent/browser'),/not executable/);});
test('in-memory stage is self-contained and has no external import targets',async()=>{
  const html=await memoryRuntime();
  const map=JSON.parse(html.split('<script type="importmap">')[1].split('</script>')[0]);
  assert.ok(Object.keys(map.imports).length>=10);
  for(const url of Object.values(map.imports))assert.ok(url.startsWith('data:text/javascript;base64,'));
  assert.ok(map.imports.three&&map.imports.stage&&map.imports.exporter);
});
test('source fingerprints are reproducible and cover more than the recipe',async()=>{const a=await sourceFingerprint(),b=await sourceFingerprint();assert.deepEqual(a,b);assert.ok(a.files>30);assert.match(a.sha256,/^[a-f0-9]{64}$/);});
