# Authored shots and portable punctual lighting

`src/lib/shot-rig.js` is the small scene-authoring layer for repeatable camera framing and exportable directional/point/spot lighting. It complements `studio-lighting.js`: studio presets are preview illumination, while an authored shot deliberately owns its camera and lights and can carry them through the scene GLB.

The API owns coordinate/framing mechanics, not artistic decisions. Authors still choose the camera direction/FOV/target and the type, color, intensity, and relative placement of each light.

## Frame a subject from its actual bounds

```js
import { framedPerspectiveCamera, inspectShotFraming } from '../src/lib/shot-rig.js';

const camera = framedPerspectiveCamera(subject, {
  name: 'HeroCamera',
  direction: [0.8, 0.3, 1.6], // target -> camera, geometry-local/world construction space
  fov: 38,
  aspect: 1,
  occupancy: 0.78,            // maximum NDC half-extent occupied by the bounds
});

const check = inspectShotFraming(camera, subject);
if (check.clipped) throw new Error('Authored subject is outside the intended shot');
```

The helper evaluates all eight world-space corners of the subject bounds in the chosen camera frame and solves a distance that keeps them inside the requested horizontal/vertical occupancy. Near/far are derived from those bounds unless explicitly supplied. `target` defaults to the bounds center but can be authored independently. Bounds framing is intentionally not a composition solver: it does not infer faces, horizons, leading room, focal hierarchy, or reference-image alignment.

## Place one portable punctual rig relative to subject scale

```js
import { punctualLightRig } from '../src/lib/shot-rig.js';

const lights = punctualLightRig(subject, {
  lights: [
    { name: 'Key', type: 'directional', offset: [-2.4, 3, 3.5], color: '#ffe7cf', intensity: 2.2 },
    { name: 'Fill', type: 'point', offset: [2, 1, 2], color: '#b8d9ff', intensity: 2, decay: 2 },
    { name: 'Rim', type: 'spot', offset: [1, 2, -3], color: '#ffb463', intensity: 4, angle: 44, penumbra: 0.5, decay: 2 },
  ],
});
```

Offsets are measured in one rig-scale unit; the default unit is the subject bounding-sphere radius. `scale` and `target` can be supplied explicitly. This removes repeated absolute-coordinate arithmetic while preserving the authored lighting design. It does **not** automatically normalize photometric intensity when subject scale changes, especially for inverse-square point/spot lights.

`punctualLight()` is also available when relative rig placement is not useful. Supported types are exactly the glTF `KHR_lights_punctual` set: `directional`, `point`, and `spot`. Directional and spot helpers align the node's local `-Z` direction with the Three.js runtime target and tag a local target child so `hydrateScene()` can restore the intended target after ordinary Object3D serialization.

## Assemble without hiding ownership

```js
import { authoredShot } from '../src/lib/shot-rig.js';

const shot = authoredShot({
  name: 'Product shot',
  subject,
  camera,
  lights,
  environment: [floor, backdrop],
  background: '#182028',
  fog: { near: 8, far: 16 },
});
```

`authoredShot()` keeps the subject, environment objects, light rig, and camera as independently named children. It writes the existing `sceneRecipe` metadata consumed by the renderer's `hero` view rather than introducing a second renderer contract. Environment pieces are tagged separately so framing can continue to target the subject instead of the floor/backdrop. Optional existing bloom/depth-of-field recipe values may be forwarded, but those optical passes remain renderer-specific rather than glTF lighting features.

Keep the default light-rig name `AuthoredSceneLights` unless the caller also updates the renderer's neutral-pass hiding contract. Material passes use the authored lights; clay/wire/silhouette passes hide the authored rig so form inspection is not mistaken for look-development approval.

## Minimal regression example

`models/shot-rig-study.js` deliberately uses the same API on two unrelated subjects: an organic stylized bust with warm/cool/rim lighting and a hard-surface survey drone with a neutral key, service spot, and rear practical. `studies/shot-rig.json` renders each through its independently authored hero camera in material, clay, wire, and silhouette passes and validates both exported GLBs.

The API is deliberately smaller than a scene graph or cinematography framework. It currently has no area/environment emitters, IES profiles, physical exposure calibration, collision-aware light placement, semantic composition rules, automatic shadows, camera animation, or cross-engine appearance guarantee. See `docs/research/authored-shot-lighting.md` for the source-backed design rationale and the matching checkpoint for measured validation.