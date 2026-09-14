import { watch } from 'node:fs';
import path from 'node:path';
import { build, project } from './build.mjs';
import { startServer } from './server.mjs';
await build();
const { url } = await startServer({ port: Number(process.env.PORT || 4173) });
console.log(`Workshop: ${url} — changes rebuild automatically; refresh to see them.`);
let timer, building = false, again = false;
async function rebuild() {
  if (building) { again = true; return; }
  building = true;
  try { await build(); } catch (error) { console.error(error); }
  finally { building = false; if (again) { again = false; await rebuild(); } }
}
for (const file of ['src', 'models', 'index.html', 'style.css']) {
  watch(path.join(project, file), { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(rebuild, 150); });
}
