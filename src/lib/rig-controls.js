import { THREE } from './modeling.js';
import { assetInfo } from './rigging.js';
export function installRigControls({ scene, render }) {
  const panel = document.createElement('details'); panel.className = 'surface-tools'; panel.open = true;
  panel.innerHTML = `<summary>Skeleton & animation</summary><p id="rig-summary"></p>
    <label><input id="rig-skeleton" type="checkbox"> Show skeleton</label>
    <label>Clip<select id="rig-clip" aria-label="Animation clip"></select></label>
    <div class="two-buttons"><button id="rig-play" type="button">Play</button><select id="rig-speed" aria-label="Animation speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></div>
    <label>Time<input id="rig-time" aria-label="Animation time" type="range" min="0" max="1" step="0.01" value="0" style="width:100%"></label>
    <p>GLB includes the clips. Native Blender artifacts are available only for recipes with a Blender build stage. The current preview pose does not alter exports.</p>`;
  document.querySelector('.export-actions').before(panel);
  const $ = id => panel.querySelector(id);
  let root, helper, mixer, clips = [], action, playing = false;
  function seek(time) {
    if (!action) return;
    mixer.setTime(Math.max(0, Math.min(action.getClip().duration - 1e-6, Number(time) || 0)));
    $('#rig-time').value = String(action.time); root.updateMatrixWorld(true); render();
  }
  function setAnimation(name = '', time = 0) {
    mixer?.stopAllAction(); action = null; playing = false; $('#rig-play').textContent = 'Play';
    if (name) {
      const clip = clips.find(c => c.name === name); if (!clip) throw new Error('Unknown animation');
      action = mixer.clipAction(clip); action.reset().play(); $('#rig-time').max = String(clip.duration);
    }
    $('#rig-clip').value = name; $('#rig-play').disabled = !action; $('#rig-time').disabled = !action; $('#rig-time').value = '0';
    if (action) seek(time); else render();
  }
  $('#rig-clip').onchange = e => setAnimation(e.target.value);
  $('#rig-play').onclick = () => { playing = !playing; $('#rig-play').textContent = playing ? 'Pause' : 'Play'; };
  $('#rig-time').oninput = e => { playing = false; $('#rig-play').textContent = 'Play'; seek(e.target.value); };
  $('#rig-skeleton').onchange = e => { if (helper) helper.visible = e.target.checked; render(); };
  return {
    refresh(model) {
      mixer?.stopAllAction(); if (root) mixer?.uncacheRoot(root);
      if (helper) { scene.remove(helper); helper.dispose(); }
      root = model; mixer = new THREE.AnimationMixer(root);
      const unique = new Set(); root.traverse(n => (n.animations || []).forEach(c => unique.add(c))); clips = [...unique];
      helper = new THREE.SkeletonHelper(root); helper.visible = $('#rig-skeleton').checked; helper.material.depthTest = false; helper.renderOrder = 10; scene.add(helper);
      const info = assetInfo(root);
      $('#rig-summary').textContent = `${info.bones} joints · ${info.skinnedMeshes} skinned parts · ${info.morphTargets} morphs · ${clips.length} clips`;
      $('#rig-clip').replaceChildren(...[['', 'Rest pose'], ...clips.map(c => [c.name, c.name])].map(([value, text]) => { const option = document.createElement('option'); option.value = value; option.textContent = text; return option; }));
      $('#rig-skeleton').disabled = !info.bones;
      setAnimation();
    },
    tick(delta) { if (playing && action) { mixer.update(Math.min(delta, .1) * Number($('#rig-speed').value)); $('#rig-time').value = String(action.time); } },
    api: { setAnimation, seek, rigInfo: () => assetInfo(root) },
  };
}
