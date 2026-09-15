# Local sculpt–render–inspect loop

The fast authoring path now runs on the assistant's local machine. It does not need Blender, GitHub Pages, a model service, a GPU, or a network request for every render. A recipe executes in a fresh Node worker. Its evaluated geometry, materials, textures, skeleton and animation clips are serialized into an in-memory Three.js stage in Chromium. Software WebGL renders PNGs on demand. GitHub is the durable source checkpoint and independent CI, not a prerequisite for seeing the next edit.

## Setup and everyday commands

Requires Node 22+, the locked npm dependencies, and Chromium. After a fresh checkout:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run prepare:tangents
# Only needed when no suitable Chromium is already installed:
npx playwright-core install --with-deps chromium
npm run doctor
```

`CHROMIUM_PATH` selects an existing executable. The doctor actually probes WebGL2; finding a browser binary alone is not sufficient. On the current Linux authoring machine the installed Chromium requires a virtual X display even when headless. The renderer automatically tries Xvfb when its first WebGL probe fails, starts it without a TCP listener, and closes it with the session. A machine without WebGL/Xvfb receives an actionable failure. Different system browser builds are not automatically guaranteed compatible.

Only legacy `reference-explorer` requires the separately prepared MakeHuman assets. The hand cage and auricle studies need the generated tangent module, not those anatomical assets. Once dependencies and tangent data are present, their render loop is offline.

```sh
npm run render -- models/sculpt-ear.js \
  --params '{"representation":"baked"}' \
  --views front,side,threequarter \
  --passes material,clay,normal,wire,silhouette \
  --out renders/ear --glb

npm run render -- models/anatomy-cage-hand.js \
  --params '{"representation":"cage"}' \
  --pose Grasp --time 1.1 --skeleton \
  --size 512x640 --out renders/grasp --glb

npm run study -- studies/auricle.json
npm run measure:sculpt
```

`--focus ObjectName` fits a named part without hiding the rest of the object. Available names appear in `report.json`. Views are front/back/side/left/top/threequarter; the programmatic API also accepts a direction vector. `--projection perspective` is optional. The default is an orthographic camera. `--preset studio|daylight|dramatic` and `--exposure` control scene-owned lighting. Lights and cameras are never included in the character/object GLB.

Every render produces PNGs plus `report.json`: normalized parameters, actual mesh/rig statistics, framing, camera state, browser/WebGL capability, timings, image hashes and a SHA-256 of the local computational sources and dependency lockfile. Local reports do not invent a Git commit when the authoring kit is not a Git checkout. CI adds its actual `GITHUB_SHA`.

## Reuse the browser, reload the code

```js
import { createRenderSession } from './scripts/render.mjs';
const studio = await createRenderSession();
try {
  const first = await studio.render({
    module: 'models/sculpt-ear.js', values: { representation: 'sculpt' },
    views: ['front', 'side'], out: 'renders/high', glb: true,
  });
  const cameras = Object.fromEntries(first.images.map(i => [i.view, i.cameraState]));
  await studio.render({
    module: 'models/sculpt-ear.js', values: { representation: 'baked' },
    views: ['front', 'side'], cameras, out: 'renders/baked', glb: true,
  });
} finally {
  await studio.close();
}
```

Call a session's methods sequentially. One session reuses Chromium, but each render has a fresh Node worker and browser document. Editing an imported modeling helper is therefore picked up immediately, not hidden behind the JavaScript module cache. The regression test changes a helper's box height from one to two and verifies that the next build changes.

This is not a general website viewer or a recipe sandbox. The browser stage is a fixed local runtime with data-URI imports; recipe code runs as trusted local Node code. No HTTP navigation, localhost server, CDN, API key or external request is needed for its graphics. Browser network requests are blocked. This design leaves the authoring environment's local-HTTP restrictions intact.

Object serialization preserves evaluated BufferGeometry rather than reconstructing parametric constructor arguments. That distinction matters for rounded boxes and sculpted meshes: reconstructing their original constructors would silently discard edits. Explicit meshes, standard PBR materials, RGBA8 data textures, bones, skinning and clips are the supported path. Instanced/batched meshes are rejected rather than silently misframed; custom shaders, arbitrary material extensions, browser-only recipes and scene graphs with unsupported custom classes need separate support.

## Bounded studies instead of manual screenshots

A study JSON specifies the recipe, cases, views, passes, image size and optional per-case triangle budgets. `studies/auricle.json` builds four cases: high surface, low surface, low with a baked normal atlas, and the blockout. Its first case defines fixed cameras **and light placement** for later cases. Both are held fixed, so every version is not independently rescaled to look similar. Clipped cases fail the mechanical checks. The first case must itself be a suitable comparison view; fixed framing is not automatic reference-image alignment.

Each case saves its output and an atomically replaced `study.json` checkpoint. An error is recorded and the finite remaining cases are attempted. Failed GLB validation, an exceeded triangle budget, or clipping produce a failed study and nonzero CLI exit code. A successful run adds a labeled PNG contact sheet and foreground-only pixel comparisons against the first case.

The comparisons report silhouette intersection-over-union and mean/RMS sRGB pixel differences within the union of the two silhouettes. They do not compare only background pixels. They require identical camera dimensions and are measurements of these rendered views, not photographic likeness scores or geometric Hausdorff distances. The manifest deliberately says `visualAcceptance: "not-assessed"`; an assistant still opens the images and records visible defects. Never select a model just because its average metric is smaller.

## Sculpting by composition

`src/lib/forms/sculpt.js` works on shared quad control meshes before UV corner splitting or skin binding. Positions are in meters. Selection is a function returning a weight in [0,1]. Brushes are ordinary composable operations:

```js
import {
  ellipsoidCage, sculpt, ball, region, facing, intersect,
  inflate, pull, relax,
} from '../src/lib/forms/sculpt.js';
import { cageAsset } from '../src/lib/forms/cage-asset.js';

const seed = ellipsoidCage({ radii: [0.024, 0.039, 0.010], level: 3 });
const front = intersect(region('Front'), facing([0, 0, 1]));
const hollow = intersect(front, ball({ at: [0, 0, 0.008], radius: 0.016 }));
const primary = sculpt(seed,
  pull(hollow, [0, 0, -0.006]),
  inflate(intersect(front, ball({ at: [0, -0.025, 0], radius: 0.015 })), 0.003),
  relax(hollow, { strength: 0.15, iterations: 2 }),
);
const object = cageAsset(primary, { mode: 'baked', lowLevel: 1, highLevel: 3 });
```

`ball()` has compact, smooth support: points outside its radius remain exactly untouched. Ellipsoidal radii are supported. `stroke()` selects by continuous distance to a polyline, optionally projected into a plane. `facing()` limits a brush by orientation; `region()` selects stable control-face tags with an optional `*` wildcard. `intersect`, `union`, `invert` and `mirrorMask` combine masks. Mirroring selection does not double strength on the symmetry plane; it does not automatically mirror pull vectors or rename anatomical side tags.

`pull` moves along a vector, `inflate` moves along the current normal, `flatten` approaches a plane, and `relax` performs simultaneous neighbor averaging. Open boundary vertices are pinned by default when relaxing. Operations recompute normals sequentially, preserve topology/tags/corner UVs, reject invalid weights or collapsed normals, and leave the input cage unchanged. Relaxation can shrink volumes; none of these operations prevent self-intersections or automatically refit a rig.

## Primary shape versus baked detail

`cageAsset()` accepts any shared quad form, not a hard-coded hand. Primary sculpting belongs before compilation. High-only `detail` operations and scalar `relief` can add small creases or surface variation. The compiler produces:

- `sculpt`: evaluated high geometry;
- `cage`: low geometry without its normal atlas;
- `baked`: exactly the same low positions, normals, UVs and tangents, with transferred high-surface normals.

This is corresponding subdivision resampling, not arbitrary decimation. It uses actual high normals expressed in the low triangle's tangent frame, not a grayscale texture mislabeled as a normal map. Low and high use corresponding padded UV charts. Per-control-face chart packing is intentionally simple and inefficient; mip-safe production unwrapping is still future work. Normal maps do not restore silhouettes, cavities' geometric occlusion, displaced vertices, or correct skin deformation.

## What was actually observed locally

The 101-test repository suite passed after the sculpt checkpoint. The expanded local renderer additionally passed 20 hand view/pass captures, framing tests, perspective framing, actual rig transfer, GLB validation, byte-identical exports before/after posing, invalid-input recovery, locked-camera/light checks, exact repeated-image comparison and edited-helper freshness. Dedicated sculpt/study/runtime tests are separate from those browser checks.

An observed local run initialized the software renderer in about one second, produced the 20-image hand test and GLB in about 3.4 seconds after initialization, and completed the four-case/36-image ear study plus exports and pixel comparisons in about 14 seconds. These are measured runs on one environment, not performance guarantees.

The auricle has 49,152 high triangles versus 3,072 low triangles (93.75% fewer). All four study GLBs had zero errors and zero warnings. A separate 4,096-sample normal-transfer test measured 0.172 degrees mean, 0.280 degrees 95th percentile and 1.303 degrees maximum error, with zero UV-edge extension samples. This tests rest-pose level-zero normal correspondence, not visual realism.

The side silhouette overlap was about 0.971, whereas front/three-quarter overlap was about 0.996. Both low versions have exactly the same silhouette. The normal atlas improves the front material comparison substantially, but does not solve side-view shape loss; the side RMS pixel error is even slightly higher with the normal map in this particular run. Full reports retain these failures instead of reporting only favorable averages.

The modeled ear remains an oval relief with simplified ridges and a closed back, not a convincing detached anatomical auricle or a likeness of the character. The previous whole-character recipe is unchanged. This work establishes a faster tool-development loop, not completion of the character.

## Checkpoint discipline

Render locally, open the material/clay/side/posed images, improve one observed defect, run targeted tests, then push a coherent checkpoint to main. Re-read the branch tip and never force-push. Record the tested source fingerprint and exact code revision separately from deployment. The `Local sculpt and render checks` workflow runs this same small loop independently and saves `local-studio-review`; it does not require the whole-gallery/Blender workflow to finish.

Do not add an unattended self-modifying agent or claim work continues after the session ends. The explicit study runner automates repetitive builds, renders and mechanical checks during an active run. Modeling choices, image inspection and commits remain deliberate actions with saved evidence.
