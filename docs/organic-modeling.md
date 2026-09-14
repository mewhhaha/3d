# Organic modeling, textures, and reference studies

## Scope and accuracy

`atelier-bust` and `field-explorer` are **authored procedural interpretations** of generated reference images, not automatic image-to-3D reconstructions. The references show substantially more realistic anatomy and surface detail. No pixel-level likeness, anatomical accuracy, animation readiness, or printability is claimed. Feature labels in the generated concept boards are fictional design references, not implemented product specifications.

The API creates real geometry, named parts, UVs, and embedded base-color/normal/metallic-roughness maps. It supports adjustable faces, static humans, sculptures, cloth folds, hair locks and relief. It does not implement a trained reconstruction model, sculpting-brush UI, automatic retopology, rigging, animation, cloth simulation, or arbitrary scan-quality humans. The browser exports GLB, not FBX/USD/OBJ. The workflow additionally imports fine GLBs into background Blender and saves packed `.blend` files.

## Reference to inspected model

Generate consistent front/side/back views when possible. Record silhouette, scale, landmarks, materials and deliberate simplifications. A single image leaves hidden surfaces ambiguous. Build coarse geometry before adding detail; increasing triangle count does not establish likeness.

Open **Surface, UV & reference tools** in the inspector. Select a mesh, click **Close-up**, and inspect PBR, clay, normal and checker views. The generated reference thumbnail is explicitly separate from the rendered result. Download the UV SVG or the selected texture PNG there.

Reference thumbnails in `src/references.js` were cropped from the generated boards in the conversation, not downloaded from third-party asset libraries. The sculpture study uses curls, a turned head, drapery and marble; the character study uses swept/bun hair, olive clothing, scarf, boots, straps and backpack. Faces are approximations, not likeness reconstructions of specific people.

## Anatomy API

```js
import { defineModel } from '../src/lib/modeling.js';
import { humanoid } from '../src/lib/anatomy.js';

export default defineModel({
  id: 'my-character',
  title: 'My character',
  parameters: {
    height: { type: 'number', min: 1.5, max: 2, step: 0.01, default: 1.75 },
  },
  build(p) {
    return humanoid({
      height: p.height, quality: 'fine', jaw: 0.92, nose: 1.05,
      skinColor: '#c18b70', clothColor: '#465c68', backpack: false,
    });
  },
});
```

`humanHead(options)` returns a named head hierarchy, roughly one unit high. `jaw` and `nose` are ratios in 0.7–1.3. Supply `skin`, `hair`, `eyes`, `lips` materials, or use defaults. `stone: true` avoids painted eye/mouth details; `curls: true` selects carved curl geometry. Position/rotation/scale follow the original helper API; rotations are degrees.

`humanoid(options)` builds the clothed static character base. `height` is actual world-space bounding height in meters, with grounded feet. `sculptureBust(options)` supplies a turned head, neck/shoulders, mantle and pedestal; `finish` is `marble` or `bronze`.

## Reusable surfaces: src/lib/surfaces.js

| Helper | Contract |
| --- | --- |
| `patch({sample,uSegments,vSegments,...})` | `sample(u,v)` returns `[x,y,z]`. Explicit UV grid; U × V determines winding. Seam-normal averaging via `wrapU`/`wrapV`. |
| `loft({sections,radialSegments,heightSegments,...})` | Ordered `[height,halfWidth,halfDepth,centerZ?,centerX?]` profiles; smooth sides, explicit caps and separate UV charts. Optional `deform(point,{u,v,angle})`. |
| `sweep({points,radii,segments,sides,closed,...})` | Variable-radius curves for hair, folds, seams and fingers. Positive scalar/list radii. Ends are open: cap/merge separately when needed. |
| `ellipsoid({radii,segments,...})` | UV sphere with baked anisotropic scaling. |
| `displace(geometry,field,amount)` | Geometry copy displaced along normals. Finite `field(point,uv)` scalar; amount in meters. Recomputes normals, does not add tessellation. |
| `detail(level)` | Budget presets `draft`, `studio`, `fine`; not artistic fidelity guarantees. |

Builders are synchronous, deterministic, DOM/network-free. Allocate materials inside each build so disposing an old variant cannot invalidate a new one.

## PBR textures: src/lib/textures.js

```js
import { pbrMaterial } from '../src/lib/textures.js';
const stone = pbrMaterial('marble', {
  size: 1024, seed: 7, color: '#e5ded0', roughness: 0.48, relief: 0.0008,
});
```

Presets: `skin`, `marble`, `bronze`, `cloth`, `leather`, `hair`. These are procedural textures, not scans. `size` supports powers of two from 32 through 2048. Built-in tiers use 128/256/512 pixels per map for responsive editing; request larger maps deliberately in custom recipes.

Base color is **sRGB**. Normals and metallic/roughness are **linear/non-color**. The shared packed map has G = roughness, B = 1 multiplied by the material metalness factor, R unused. Sharing this map avoids a browser-canvas merge of raw DataTextures. Tangent normals use positive-Y/OpenGL convention. `relief` controls normal-map slopes, not geometry. Use `displace` for silhouette changes. No automatic AO or high-to-low normal baking is implemented.

All required images are embedded in GLB. The review job also emits separate PNGs at `assets/<id>/textures/`. The export does not depend on a custom procedural shader that Blender would need to recreate.

## UV API: src/lib/uv.js

`projectUV(geometry,{mode})` supports box, planar, cylindrical and spherical projections. It returns a copy with split vertices where needed. Angular seams can intentionally use U > 1 with repeat wrapping.

`packUV(meshes,{padding})` places already-authored bounded 0–1 mesh charts into cells. It returns geometry copies. It does not repack islands inside each mesh, remove internal overlap, or rebake textures. Applying it to an existing material changes the mapping.

`auditUV(root)` reports missing/invalid UV sets, out-of-range coordinates, degenerate UV triangles, textured meshes and unique textures. Out-of-range UVs can be intentional tiling; this is not an overlap/distortion proof.

`uvSVG(geometry,options)` exports a wire layout. Large previews may be decimated; the SVG description states this. The download includes all triangles up to its declared budget.

Default models use per-part UVs and tiled materials, not one unique paint-ready body atlas. Production animation/painting may require retopology and re-unwrapping in Blender. Blender imports evaluated meshes; it does not recover JS recipes as modifiers or Geometry Nodes.

## Verification and artifacts

`npm test` adds winding, unit-normal, deterministic map, color-space, packed-map, UV, displacement, world-scale and all-detail-tier tests.

The existing bake checks default/numeric-limit GLBs, geometry round trips, shared URL state and mobile layout. `node scripts/review-surfaces.mjs` adds PBR/clay/normals/checker portraits, UV SVGs, texture PNGs, embedded-image/UV assertions, display/export isolation and separately validated `*-fine.glb` files.

A separate workflow job installs the distribution Blender package and records its actual version. It imports both fine GLBs, checks UV layers and material image nodes, packs textures, and saves `.blend` files. This is an import smoke test, not topology, rigging, shading-match or watertightness certification.

Artifacts: `model-assets` = GLBs and review files; `diagnostics` = UI screenshots; `blender-assets` = packed Blender files and `blender-report.json`. Pages deploys after build and Blender checks pass, and still requires its one-time **Settings → Pages → Source: GitHub Actions** setting.
