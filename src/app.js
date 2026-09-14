import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildModel, parametersFor, inspect, dispose } from './lib/modeling.js';
import catalog from './catalog.js';

const $ = selector => document.querySelector(selector);
const canvas = $('#canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#f1f2ed');
const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
const environment = pmrem.fromScene(room, 0.04);
scene.environment = environment.texture;
room.dispose(); pmrem.dispose();
const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 1000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.09;
controls.autoRotateSpeed = 1.5;
const fill = new THREE.HemisphereLight('#ffffff', '#a1aca3', 2);
const key = new THREE.DirectionalLight('#fff5e6', 3.2);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.normalBias = 0.025;
scene.add(fill, key, key.target);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.13 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
let grid = new THREE.GridHelper(10, 20, '#c6d2c7', '#dce2d8');
grid.material.transparent = true; grid.material.opacity = 0.48;
scene.add(grid);
const wireMaterial = new THREE.MeshBasicMaterial({ color: '#35554d', wireframe: true });
let selected, parameters = {}, root, stats, buildError = null;
let view = 'perspective', version = { sha: 'local', repository: 'mewhhaha/3d' };
let pending = 0, busy = false;

function report(error) {
  buildError = error;
  $('#error').hidden = false;
  $('#error').textContent = error.message || String(error);
  $('#status').textContent = 'Build failed';
  console.error(error);
}
function render() { renderer.render(scene, camera); }
function resize() {
  const bounds = $('#viewport').getBoundingClientRect();
  renderer.setSize(Math.max(1, bounds.width), Math.max(1, bounds.height), false);
  camera.aspect = bounds.width / Math.max(1, bounds.height);
  camera.updateProjectionMatrix();
  render();
}
new ResizeObserver(resize).observe($('#viewport'));
function frame(nextView = 'perspective') {
  if (!root) return;
  view = nextView;
  const bounds = new THREE.Box3().setFromObject(root, true);
  const center = bounds.getCenter(new THREE.Vector3());
  const radius = Math.max(bounds.getBoundingSphere(new THREE.Sphere()).radius, 0.01);
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  const distance = radius / Math.sin(Math.min(vfov, hfov) / 2) * 1.22;
  const directions = { perspective: [1, 0.6, 1.45], front: [0, 0, 1], side: [1, 0, 0], top: [0, 1, 0.0001] };
  camera.position.copy(center).add(new THREE.Vector3(...directions[nextView]).normalize().multiplyScalar(distance));
  camera.near = radius / 100; camera.far = distance + radius * 100;
  camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.minDistance = radius * 0.1; controls.maxDistance = distance * 8;
  controls.update();
  const span = radius * 3;
  ground.position.set(center.x, bounds.min.y - radius * 0.001, center.z);
  ground.scale.setScalar(span * 10);
  grid.position.set(center.x, bounds.min.y - radius * 0.002, center.z);
  grid.scale.setScalar(span / 10);
  key.position.copy(center).add(new THREE.Vector3(3, 5, 4).multiplyScalar(radius));
  key.target.position.copy(center);
  Object.assign(key.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: radius / 10, far: radius * 20 });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.normalBias = radius * 0.008;
  render();
}
function writeHash() {
  const hash = new URLSearchParams({ model: selected.id });
  for (const [name, value] of Object.entries(parameters)) hash.set(`p.${name}`, String(value));
  history.replaceState(null, '', `${location.pathname}${location.search}#${hash}`);
}
function showStats() {
  const rows = [
    ['Objects', stats.meshes.toLocaleString()],
    ['Triangles', stats.triangles.toLocaleString()],
    ['Materials', stats.materials.toLocaleString()],
    ['Size (X × Y × Z)', stats.dimensions.map(n => n.toFixed(2)).join(' × ') + ' m'],
  ];
  $('#stats').replaceChildren(...rows.flatMap(([label, value]) => {
    const dt = document.createElement('dt'), dd = document.createElement('dd');
    dt.textContent = label; dd.textContent = value;
    return [dt, dd];
  }));
}
function rebuild({ fit = false } = {}) {
  cancelAnimationFrame(pending); pending = 0;
  try {
    const next = buildModel(selected, parameters);
    const old = root;
    root = next; parameters = next.userData.parameters; stats = inspect(next);
    if (old) { scene.remove(old); dispose(old); }
    scene.add(root);
    buildError = null; $('#error').hidden = true;
    $('#status').textContent = '● Ready';
    showStats(); writeHash();
    if (fit) frame();
    else frame(view); // Keep the chosen view and reframe changed bounds.
    render();
  } catch (error) { report(error); }
}
function parameterInputs() {
  $('#parameters').replaceChildren();
  for (const [name, spec] of Object.entries(selected.parameters)) {
    const label = document.createElement('label');
    label.className = `parameter ${spec.type}`;
    const heading = document.createElement('span'); heading.className = 'parameter-heading';
    const text = document.createElement('span'); text.textContent = spec.label || name;
    const output = document.createElement('output');
    heading.append(text, output); label.append(heading);
    const input = document.createElement(spec.type === 'select' ? 'select' : 'input');
    input.name = name; input.id = `parameter-${name}`; input.setAttribute('aria-label', spec.label || name);
    if (spec.type === 'select') {
      for (const value of spec.options) { const option = document.createElement('option'); option.value = option.textContent = value; input.append(option); }
      input.value = parameters[name];
    } else if (spec.type === 'boolean') { input.type = 'checkbox'; input.checked = parameters[name]; }
    else if (spec.type === 'color') { input.type = 'color'; input.value = parameters[name]; }
    else { Object.assign(input, { type: 'range', min: spec.min, max: spec.max, step: spec.step, value: parameters[name] }); }
    output.value = spec.type === 'boolean' ? '' : String(parameters[name]);
    input.addEventListener('input', () => {
      parameters[name] = spec.type === 'boolean' ? input.checked : spec.type === 'number' ? Number(input.value) : input.value;
      output.value = spec.type === 'boolean' ? '' : String(parameters[name]);
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => rebuild());
    });
    label.append(input); $('#parameters').append(label);
  }
}
function select(id, values = {}) {
  const entry = catalog.find(item => item.model.id === id);
  if (!entry) throw new Error(`Unknown model: ${id}`);
  selected = entry.model; parameters = parametersFor(selected, values);
  $('#model-title').textContent = selected.title;
  $('#description').textContent = selected.description || '';
  $('#source-link').href = `https://github.com/${version.repository}/blob/${version.sha === 'local' ? 'main' : version.sha}/models/${entry.file}`;
  document.title = `${selected.title} · 3D Workshop`;
  for (const button of $('#model-list').children) button.setAttribute('aria-current', String(button.dataset.id === id));
  parameterInputs(); rebuild({ fit: true });
  if (buildError) throw buildError;
  return stats;
}
function setParameters(values) {
  parameters = parametersFor(selected, { ...parameters, ...values });
  parameterInputs(); rebuild();
  if (buildError) throw buildError;
  return stats;
}
function loadHash() {
  const hash = new URLSearchParams(location.hash.slice(1));
  const id = hash.get('model');
  const values = Object.fromEntries([...hash.entries()].filter(([key]) => key.startsWith('p.')).map(([key, value]) => [key.slice(2), value]));
  select(catalog.some(item => item.model.id === id) ? id : catalog[0].model.id, values);
}
async function exportGLB() {
  if (pending) rebuild();
  if (buildError) throw buildError;
  // Export only a cloned model hierarchy; never lights, helpers, or display materials.
  const exportScene = new THREE.Scene();
  exportScene.name = selected.title;
  exportScene.add(root.clone(true));
  return new GLTFExporter().parseAsync(exportScene, { binary: true, onlyVisible: true });
}
function download(blob, filename) {
  const url = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
async function action(button, fn) {
  if (busy) return;
  busy = true; button.disabled = true;
  try { await fn(); }
  catch (error) { $('#status').textContent = error.message || String(error); }
  finally { busy = false; button.disabled = false; }
}
$('#download-glb').onclick = event => action(event.currentTarget, async () => {
  const id = selected.id;
  const data = await exportGLB();
  download(new Blob([data], { type: 'model/gltf-binary' }), `${id}.glb`);
});
$('#download-png').onclick = event => action(event.currentTarget, async () => {
  render();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not capture image');
  download(blob, `${selected.id}.png`);
});
$('#download-recipe').onclick = () => {
  if (pending) rebuild();
  download(new Blob([JSON.stringify({ model: selected.id, parameters, commit: version.sha }, null, 2)], { type: 'application/json' }), `${selected.id}.parameters.json`);
};
$('#share').onclick = event => action(event.currentTarget, async () => {
  if (pending) rebuild();
  try { await navigator.clipboard.writeText(location.href); $('#status').textContent = 'Link copied'; }
  catch { $('#status').textContent = 'Copy the URL from your address bar'; }
});
$('#reset').onclick = () => select(selected.id);
$('#fit').onclick = () => frame();
for (const button of document.querySelectorAll('[data-view]')) button.onclick = () => frame(button.dataset.view);
$('#wireframe').onchange = event => { scene.overrideMaterial = event.target.checked ? wireMaterial : null; ground.visible = !event.target.checked; render(); };
$('#grid').onchange = event => { grid.visible = event.target.checked; render(); };
$('#rotate').onchange = event => { controls.autoRotate = event.target.checked; };
$('#parameters').onsubmit = event => event.preventDefault();
canvas.addEventListener('keydown', event => { if (event.key.toLowerCase() === 'f') frame(); });
window.addEventListener('hashchange', () => { try { loadHash(); } catch (error) { report(error); } });

if (!catalog.length) throw new Error('No recipes found in models/');
try {
  const response = await fetch(new URL('../build.json', import.meta.url));
  if (response.ok) version = await response.json();
} catch { /* The workshop also works with local build metadata. */ }
$('#build-label').textContent = version.sha === 'local' ? 'LOCAL WORKSPACE' : `BUILD ${version.sha.slice(0, 7)}`;
$('#model-count').textContent = String(catalog.length).padStart(2, '0');
for (const [index, entry] of catalog.entries()) {
  const button = document.createElement('button');
  button.className = 'model-button'; button.dataset.id = entry.model.id;
  const number = document.createElement('span'); number.className = 'model-number'; number.textContent = String(index + 1).padStart(2, '0');
  const label = document.createElement('span'); label.textContent = entry.model.title;
  const sub = document.createElement('small'); sub.textContent = 'PARAMETRIC RECIPE'; label.append(sub);
  button.append(number, label); button.onclick = () => { try { select(entry.model.id); } catch (error) { report(error); } };
  $('#model-list').append(button);
}
resize(); loadHash();
window.studio = {
  ready: true,
  models: catalog.map(({ model }) => ({ id: model.id, title: model.title, parameters: model.parameters })),
  select, setParameters, frame, render, exportGLB,
  get state() { return { model: selected.id, parameters: { ...parameters }, commit: version.sha }; },
  get stats() { return inspect(root); },
};
renderer.setAnimationLoop(() => { controls.update(); render(); });
