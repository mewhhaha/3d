import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

export const project = fileURLToPath(new URL('..', import.meta.url));
export async function modelFiles() {
  return (await readdir(path.join(project, 'models'))).filter(file => /^[a-z0-9]+(?:-[a-z0-9]+)*\.js$/.test(file)).sort();
}
export async function build() {
  const dist = path.join(project, 'dist');
  await rm(dist, { recursive: true, force: true });
  await mkdir(path.join(dist, 'vendor/three'), { recursive: true });
  for (const file of ['index.html', 'style.css', 'src', 'models']) {
    await cp(path.join(project, file), path.join(dist, file), { recursive: true });
  }
  // Self-host the pinned dependency: Pages has no CDN/runtime network dependency.
  for (const file of ['three.module.js', 'three.core.js']) {
    await cp(path.join(project, 'node_modules/three/build', file), path.join(dist, 'vendor/three', file));
  }
  await cp(path.join(project, 'node_modules/three/examples/jsm'), path.join(dist, 'vendor/three/addons'), { recursive: true });
  await cp(path.join(project, 'node_modules/three/LICENSE'), path.join(dist, 'vendor/three/LICENSE'));
  const files = await modelFiles();
  if (!files.length) throw new Error('Add at least one model recipe in models/');
  const imports = files.map((file, i) => `import m${i} from '../models/${file}';`).join('\n');
  const items = files.map((file, i) => `{ file: ${JSON.stringify(file)}, model: m${i} }`).join(',\n');
  await writeFile(path.join(dist, 'src/catalog.js'), `${imports}\nexport default [${items}];\n`);
  await writeFile(path.join(dist, 'build.json'), JSON.stringify({
    sha: process.env.GITHUB_SHA || 'local', repository: process.env.GITHUB_REPOSITORY || 'mewhhaha/3d',
  }, null, 2));
  await writeFile(path.join(dist, '.nojekyll'), '');
  console.log(`Built ${files.length} recipes into dist/`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await build();
