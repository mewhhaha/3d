import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { project } from './build.mjs';
import { startServer } from './server.mjs';
const { server, url } = await startServer({ base: '/3d/' });
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${url}?capture`); await page.waitForFunction(() => window.studio?.ready);
  await page.evaluate(() => window.studio.select('rigged-explorer'));
  const folder = path.join(project, 'dist/assets/rigged-explorer'), bytes = await readFile(path.join(folder, 'rigged-explorer.glb'));
  const info = await page.evaluate(() => window.studio.rigInfo());
  const data = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  assert.equal(info.bones, 38); assert.equal(data.animations.length, 4); assert.ok(data.images?.length >= 3); assert.ok(data.skins?.length > 0);
  assert.ok(data.meshes.every(m => m.primitives.every(p => p.attributes.TEXCOORD_0 !== undefined)));
  assert.ok(data.meshes.some(m => m.primitives.some(p => p.targets?.length)));
  const compare = await page.evaluate(async bytes => {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const { THREE, buildModel, dispose } = await import('./src/lib/modeling.js');
    const { default: recipe } = await import('./models/rigged-explorer.js');
    const source = buildModel(recipe), loaded = await new GLTFLoader().parseAsync(new Uint8Array(bytes).buffer, '');
    const sourceClips = []; source.traverse(n => sourceClips.push(...n.animations));
    function sample(root, clips) {
      const mixer = new THREE.AnimationMixer(root), action = mixer.clipAction(clips.find(c => c.name === 'Wave'));
      const mesh = root.getObjectByName('L_ForearmMesh'); root.updateMatrixWorld(true);
      const rest = mesh.getVertexPosition(200, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).toArray();
      action.play(); mixer.setTime(1.25); root.updateMatrixWorld(true);
      const pose = mesh.getVertexPosition(200, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).toArray();
      mixer.stopAllAction(); mixer.uncacheRoot(root); return { rest, pose };
    }
    const result = { before: sample(source, sourceClips), after: sample(loaded.scene, loaded.animations) };
    dispose(source); dispose(loaded.scene); return result;
  }, Array.from(bytes));
  for (const key of ['rest', 'pose']) for (let i = 0; i < 3; i++) assert.ok(Math.abs(compare.before[key][i] - compare.after[key][i]) < 1e-5, 'Deformed vertex round-trip');
  assert.ok(compare.before.rest.some((v, i) => Math.abs(v - compare.before.pose[i]) > .02), 'Animation must deform geometry');
  for (const [name, time] of [['Idle', 2], ['Walk', .3], ['Wave', 1.25], ['Grasp', 1]]) {
    await page.evaluate(({ name, time }) => window.studio.setAnimation(name, time), { name, time });
    await page.locator('#canvas').screenshot({ path: path.join(folder, `${name.toLowerCase()}.png`) });
  }
  const posed = Buffer.from(await page.evaluate(async () => Array.from(new Uint8Array(await window.studio.exportGLB()))));
  assert.deepEqual(posed, bytes, 'Preview animation must not contaminate bind-pose exports');
  await page.evaluate(() => window.studio.setAnimation());
  await page.locator('#rig-skeleton').check(); await page.locator('#canvas').screenshot({ path: path.join(folder, 'skeleton.png') }); await page.locator('#rig-skeleton').uncheck();
  await page.screenshot({ path: path.join(folder, 'workshop.png'), fullPage: true });
  await writeFile(path.join(folder, 'rig-validation.json'), JSON.stringify({ ...info, deformationRoundTrip: true, poseExportIsolation: true, samples: compare }, null, 2));
  assert.deepEqual(errors, []); console.log('Rig, textures, UVs, morphs, clips and deformed round-trip verified');
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
