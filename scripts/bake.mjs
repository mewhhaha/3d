import { chromium } from 'playwright-core';
import validator from 'gltf-validator';
import assert from 'node:assert/strict';
import { mkdir, writeFile, appendFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { project } from './build.mjs';
import { startServer } from './server.mjs';

const assets = path.join(project, 'dist/assets'), reports = path.join(project, 'reports');
await mkdir(assets, { recursive: true }); await mkdir(reports, { recursive: true });
// Deliberately test under /3d/, not just /, so broken Pages-relative paths fail CI.
const { server, url } = await startServer({ base: '/3d/' });
let browser, page;
const errors = [], manifest = { commit: process.env.GITHUB_SHA || 'local', models: [] };
try {
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.route('**/*', route => {
    if (route.request().url().startsWith(new URL(url).origin + '/')) return route.continue();
    errors.push(`Unexpected external request: ${route.request().url()}`); return route.abort();
  });
  await page.goto(url);
  await page.waitForFunction(() => window.studio?.ready || window.__studioError, null, { timeout: 45000 });
  const startupError = await page.evaluate(() => window.__studioError);
  assert.ok(!startupError, startupError);
  const models = await page.evaluate(() => window.studio.models);
  assert.ok(models.length > 0);
  for (const model of models) {
    const folder = path.join(assets, model.id); await mkdir(folder, { recursive: true });
    await page.evaluate(id => window.studio.select(id), model.id);
    const before = await page.evaluate(() => window.studio.stats);
    const state = await page.evaluate(() => window.studio.state);
    const bytes = Buffer.from(await page.evaluate(async () => Array.from(new Uint8Array(await window.studio.exportGLB()))));
    assert.equal(bytes.readUInt32LE(0), 0x46546c67, 'GLB magic');
    assert.equal(bytes.readUInt32LE(4), 2, 'glTF version 2');
    const report = await validator.validateBytes(new Uint8Array(bytes), { uri: `${model.id}.glb`, maxIssues: 100 });
    await writeFile(path.join(folder, 'validation.json'), JSON.stringify(report, null, 2));
    assert.equal(report.issues.numErrors, 0, `${model.id}: ${JSON.stringify(report.issues.messages)}`);
    await writeFile(path.join(folder, `${model.id}.glb`), bytes);
    await writeFile(path.join(folder, 'parameters.json'), JSON.stringify(state, null, 2));
    const roundtrip = await page.evaluate(async data => {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const { inspect, dispose } = await import('./src/lib/modeling.js');
      const result = await new GLTFLoader().parseAsync(new Uint8Array(data).buffer, '');
      const stats = inspect(result.scene); dispose(result.scene); return stats;
    }, Array.from(bytes));
    assert.equal(roundtrip.meshes, before.meshes, `${model.id}: mesh round-trip`);
    assert.equal(roundtrip.triangles, before.triangles, `${model.id}: triangle round-trip`);
    for (let i = 0; i < 3; i++) assert.ok(Math.abs(roundtrip.dimensions[i] - before.dimensions[i]) < Math.max(1, before.dimensions[i]) * 1e-5, 'Dimensions survive export/import');
    for (const view of ['perspective', 'front', 'side', 'top']) {
      await page.evaluate(view => window.studio.frame(view), view);
      await page.locator('#canvas').screenshot({ path: path.join(folder, `${view}.png`) });
    }
    for (const limit of ['min', 'max']) {
      const values = Object.fromEntries(Object.entries(model.parameters).filter(([, spec]) => spec.type === 'number').map(([key, spec]) => [key, spec[limit]]));
      await page.evaluate(({ id, values }) => window.studio.select(id, values), { id: model.id, values });
      const variant = Buffer.from(await page.evaluate(async () => Array.from(new Uint8Array(await window.studio.exportGLB()))));
      const validation = await validator.validateBytes(new Uint8Array(variant), { maxIssues: 100 });
      assert.equal(validation.issues.numErrors, 0, `${model.id} ${limit}: invalid GLB`);
    }
    // A shared URL must restore the same parameterized model after a full page load.
    const modified = await page.evaluate(() => window.studio.state);
    await page.reload();
    await page.waitForFunction(() => window.studio?.ready);
    assert.deepEqual(await page.evaluate(() => window.studio.state), modified, 'URL state round-trip');
    await page.evaluate(id => window.studio.select(id), model.id);
    await page.getByLabel('Wireframe', { exact: true }).check();
    const wireBytes = Buffer.from(await page.evaluate(async () => Array.from(new Uint8Array(await window.studio.exportGLB()))));
    assert.deepEqual(wireBytes, bytes, 'Preview wireframe must not change exported geometry or materials');
    await page.getByLabel('Wireframe', { exact: true }).uncheck();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#download-glb').click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), `${model.id}.glb`);
    assert.equal(await download.failure(), null);
    manifest.models.push({
      id: model.id, title: model.title, ...state, stats: before,
      glb: `${model.id}/${model.id}.glb`, sha256: createHash('sha256').update(bytes).digest('hex'),
      previews: ['perspective', 'front', 'side', 'top'].map(view => `${model.id}/${view}.png`),
      validation: { errors: report.issues.numErrors, warnings: report.issues.numWarnings },
    });
    console.log(`${model.id}: ${before.meshes} meshes, ${before.triangles} triangles, validated and rendered`);
  }
  await page.evaluate(id => window.studio.select(id), models[0].id);
  await page.screenshot({ path: path.join(reports, 'desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.studio.frame());
  await page.screenshot({ path: path.join(reports, 'mobile.png'), fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No mobile horizontal overflow');
  assert.equal(errors.length, 0, errors.join('\n'));
  await writeFile(path.join(assets, 'manifest.json'), JSON.stringify(manifest, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY,
    `## 3D Workshop\n\n${models.length} recipes built, exported, validated, and re-imported.\n\nDefault and numeric-limit GLBs passed the Khronos validator. URL restoration, mobile layout, download buttons, and wireframe export isolation passed.\n\nDownload **model-assets** for GLBs, four preview angles per model, parameters, and validation reports. **diagnostics** contains desktop/mobile screenshots and the dependency lockfile.\n`);
} catch (error) {
  if (page) await page.screenshot({ path: path.join(reports, 'failure.png'), fullPage: true }).catch(() => {});
  await writeFile(path.join(reports, 'error.txt'), `${error.stack}\n${errors.join('\n')}`);
  throw error;
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
