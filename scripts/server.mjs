import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { project } from './build.mjs';

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.wasm': 'application/wasm' };
export async function startServer({ root = path.join(project, 'dist'), port = 0, base = '/' } = {}) {
  root = path.resolve(root);
  if (!base.startsWith('/') || !base.endsWith('/')) throw new Error('base must start and end with /');
  const server = http.createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (!pathname.startsWith(base)) { response.writeHead(404); response.end('Not found'); return; }
      let file = path.resolve(root, pathname.slice(base.length) || 'index.html');
      if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const data = await readFile(file);
      response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 400); response.end('Not found or invalid path');
    }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { server, url: `http://127.0.0.1:${server.address().port}${base}` };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { url } = await startServer({ port: Number(process.env.PORT || 4173) });
  console.log(`Preview: ${url}`);
}
