import * as THREE from 'three';
import { hydrateTwoTone } from './illustration-material.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
/** Restore explicit light targets after ObjectLoader's generic graph transfer. */
export function hydrateScene(root) {
  root.traverse(node => {
    if(node.isMesh)for(const mat of Array.isArray(node.material)?node.material:[node.material])hydrateTwoTone(mat);
    if (node.isDirectionalLight || node.isSpotLight) {
      const target = node.children.find(child => child.userData.lightTarget);
      if (target) node.target = target;
    }
  });
  return root;
}
export function findSceneLook(root) {
  let result = null;
  root?.traverse(node => {
    if (node.userData.sceneRecipe) {
      if (result) throw new Error('Only one authored scene recipe is supported');
      result = node.userData.sceneRecipe;
    }
  });
  return result;
}
/** Optical preview effects. The GLB retains settings as metadata, not baked pixels. */
export function createLookRenderer(renderer, scene) {
  let composer, pass, bloom, output, dof;
  let width = 0, height = 0, ratio = 0;
  return {
    render(camera, settings = null) {
      const b = settings?.bloom, d = settings?.depthOfField;
      const bloomOn = b && b.strength > 0;
      const dofOn = d && d.aperture > 0 && camera.isPerspectiveCamera;
      if (!bloomOn && !dofOn) { renderer.render(scene, camera); return; }
      if (!composer) {
        composer = new EffectComposer(renderer);
        composer.renderTarget1.samples = 4; composer.renderTarget2.samples = 4;
        pass = new RenderPass(scene, camera);
        dof = new BokehPass(scene, camera, {});
        bloom = new UnrealBloomPass(new THREE.Vector2(1, 1));
        output = new OutputPass();
        [pass, dof, bloom, output].forEach(p => composer.addPass(p));
      }
      const size = renderer.getSize(new THREE.Vector2());
      const pixelRatio = renderer.getPixelRatio();
      if (size.x !== width || size.y !== height || pixelRatio !== ratio) {
        width = size.x; height = size.y; ratio = pixelRatio;
        composer.setPixelRatio(ratio); composer.setSize(width, height);
      }
      pass.camera = camera; dof.camera = camera;
      dof.enabled = !!dofOn; bloom.enabled = !!bloomOn;
      if (dofOn) {
        // A named world-space focal anchor stays useful when orbiting or zooming.
        const anchor = d.target && scene.getObjectByName(d.target);
        const focus = anchor
          ? -anchor.getWorldPosition(new THREE.Vector3()).applyMatrix4(camera.matrixWorldInverse).z
          : d.focus;
        dof.uniforms.focus.value = Math.max(camera.near, focus);
        dof.uniforms.aperture.value = d.aperture;
        dof.uniforms.maxblur.value = d.maxBlur;
      }
      if (bloomOn) {
        bloom.strength = b.strength; bloom.radius = b.radius; bloom.threshold = b.threshold;
      }
      composer.render();
    },
    dispose() {
      dof?.dispose(); bloom?.dispose(); output?.dispose(); pass?.dispose(); composer?.dispose();
    },
  };
}
