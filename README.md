# 3D Workshop

A small, code-first modeling workshop for human + assistant iteration. Describe an object, edit one JavaScript recipe, push to `main`, inspect it in the browser, and import its `.glb` into Blender.

**Gallery:** https://mewhhaha.github.io/3d/ · **Builds:** https://github.com/mewhhaha/3d/actions

## First-time Pages setup

In this repository, open **Settings → Pages → Build and deployment → Source → GitHub Actions**. The GitHub connector can write the workflow but does not expose this repository setting. Then re-run the deployment job, use **Actions → Build models and deploy Pages → Run workflow**, or push a new commit.

The workflow's build job produces downloadable artifacts even if Pages has not been enabled. No personal access token, backend, paid service, or Blender installation is needed.

## The loop

1. Describe a model and constraints: dimensions, style, part count, intended use, useful adjustable parameters.
2. Add or update `models/<slug>.js`. Push to `main`.
3. Actions tests geometry and parameters, builds the site, renders four review angles, exports and validates GLBs, and deploys Pages after all checks pass.
4. Open the gallery, orbit the model, adjust parameters, and click **Download .glb**.
5. In Blender use **File → Import → glTF 2.0 (.glb/.gltf)**. Named parts and standard materials are included. Save as `.blend` there.

The **Copy link** button includes the selected model and parameter values in the URL fragment. **Save parameters** writes the recipe ID, parameter values, and source commit to JSON. Parameters remain local to your browser; changing them does not commit to GitHub. To make a variant the new default, edit its recipe.

## Adding a model

Copy `models/_template.js` to `models/my-model.js` and make its `id` match the filename. Files are auto-discovered: no gallery registration and no viewer edits required. Names must be lowercase hyphenated slugs; underscore-prefixed files are ignored.

```js
import { defineModel, group, box, material } from '../src/lib/modeling.js';

export default defineModel({
  id: 'my-model',
  title: 'My model',
  description: 'A rounded block with adjustable width.',
  parameters: {
    width: { type: 'number', min: 0.5, max: 3, step: 0.1, default: 1 },
    color: { type: 'color', default: '#eeb568' },
  },
  build(p) {
    return group('Assembly', [
      box({ name: 'Body', size: [p.width, 1, 1], radius: 0.08,
        position: [0, 0.5, 0], material: material(p.color) }),
    ]);
  },
});
```

### Modeling API

`src/lib/modeling.js` returns ordinary Three.js objects. It is a convenience layer, not a separate modeling engine. Use `THREE` directly whenever a helper is insufficient.

| Helper | Key arguments |
| --- | --- |
| `box(options)` | `size: [x,y,z]`, `radius`, `segments` |
| `cylinder(options)` | `radius`, or `top`/`bottom`; `height`, `segments`, `open` |
| `sphere(options)` | `radius`, `segments` |
| `torus(options)` | `radius`, `tube`, `segments`; ring starts in the XY plane |
| `lathe(options)` | `points: [[radius,height],…]`, `segments`; revolves about Y |
| `extrude(options)` | `points: [[x,y],…]`, `holes`, `depth`, `bevel`; extrudes along +Z |
| `tube(options)` | `points: [[x,y,z],…]`, `radius`, `segments`, `closed` |
| `mesh(geometry, options)` | Wrap any Three.js BufferGeometry |
| `material(color, options)` | Named standard PBR material; roughness, metalness, emission |
| `group(name, children, options)` | Nested objects; children can include arrays and false/null |
| `repeat(count, fn)` | Array of objects, generated with `fn(index, count)` |
| `transform(object, options)` | Set position, rotation, scale, name |
| `buildModel(definition, values)` | Normalize parameters, build named root, validate |
| `inspect(root)` | Mesh/vertex/triangle/material counts and world-space bounds |
| `dispose(root)` | Release geometry, materials, and textures when replacing a model |

Common options: `name`, `material`, `position: [x,y,z]`, `rotation: [x,y,z]` **in degrees**, and positive `scale` as a number or vector. Geometry is centered unless stated otherwise. **1 unit = 1 meter, Y up, +Z forward.** Blender's glTF importer handles axis conversion; do not manually rotate exports to compensate.

Parameter types: `number` (`min`, `max`, `step`, `default`), `color` (six-digit hex), `boolean`, and `select` (string `options`, `default`). An optional `label` is shown in the inspector. Keep `build(p)` synchronous, deterministic, and free of network/DOM dependencies. Allocate materials inside `build` so disposing an old variant cannot invalidate a new one.

Start with `orbit-bot.js` for assembling named parts and `ripple-vase.js` for deforming generated geometry. Add reusable helpers only as actual models need them. Boolean operations, subdivision, rigs, and texture baking are not implemented in the initial helper layer.

## Local development

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
# Open http://127.0.0.1:4173
```

Source changes rebuild automatically. Refresh the page to see the update; this is intentionally not a hot-module-replacement framework.

```sh
npm test                                  # Geometry, schema, parameter, server tests
npm run build                             # Self-contained static site in dist/
npx playwright-core install chromium      # One-time browser download
npm run bake                              # Browser checks + GLBs + previews
npm run preview                           # Serve dist/
```

On a Linux machine missing browser libraries, use `npx playwright-core install --with-deps chromium`. An existing browser may be selected with `CHROMIUM_PATH=/path/to/chromium npm run bake`. CI uses Playwright-managed Chromium and software WebGL rendering. Dependency versions are pinned in `package-lock.json` and CI installs them with `npm ci`. The lockfile is also included in the diagnostics artifact.

## Outputs and checks

After a successful build:

```text
dist/
  index.html                  # Interactive workshop
  build.json                  # Source revision
  vendor/three/               # Self-hosted dependency + license
  assets/
    manifest.json             # Counts, bounds, parameters, hashes, preview paths
    orbit-bot/
      orbit-bot.glb
      parameters.json
      validation.json
      perspective.png
      front.png
      side.png
      top.png
```

The **model-assets** Actions artifact contains baked default GLBs and preview angles. **diagnostics** contains desktop/mobile screenshots (or a failure screenshot) and the dependency lockfile. These are a visual feedback path for assistant sessions with access to workflow artifacts. The gallery's GLB button exports the *current parameter values*, not just the baked default.

CI checks every recipe at its default and individual parameter limits. Browser checks validate default and combined numeric-limit GLBs with Khronos glTF Validator, re-import default GLBs through Three.js, compare geometry counts/bounds, test share-URL restoration and actual downloads, ensure wireframe does not alter export bytes, and check mobile overflow. It serves the test site under `/3d/` to catch project-Pages path mistakes. Browser errors and missing resources fail the build. CI reports validation warnings; errors block publishing.

The workflow validates pull requests without deploying them. Pushes to `main` and manual workflow runs also deploy. Generated binaries stay in Pages/Actions artifacts rather than Git history. Workflow permissions are limited to read-only source access for building and Pages/OIDC access for deploying; no secrets are used.

## What transfers to Blender

These exports are **real mesh geometry**, not screenshots. The model-only hierarchy, object names, transforms, geometry, and supported standard materials are exported. Preview lights, ground, grid, camera, wireframe mode, and environment are excluded.

This is a **one-way mesh handoff**, not a Blender document round-trip: GLB does not contain these JavaScript recipes, Blender modifier stacks, or Geometry Nodes. Meshes are triangulated; attractive shading is not a guarantee of subdivision-ready topology or a watertight printable solid. Assemblies can contain intersecting parts. Textures/UV work, retopology, rigs, and printability need explicit checks when requested. Procedural custom shaders do not automatically become portable glTF materials. Export/import validation is not a substitute for inspecting a model in Blender.

## Layout

```text
models/                     # Usually the only files changed for a model request
src/lib/modeling.js         # Reusable geometry helpers and recipe contract
src/app.js                  # Viewer, parameter UI, share URLs, model-only export
scripts/build.mjs           # Discover recipes and assemble static site
scripts/bake.mjs            # Headless rendering, exports, validation, browser tests
scripts/server.mjs          # Local static server, also used by CI
scripts/dev.mjs             # Watch and rebuild
tests/models.test.js        # Node tests
.github/workflows/pages.yml # Push-to-main pipeline
AGENTS.md                   # Instructions for future assistant sessions
```

## Technical references

- Three.js GLTFExporter: https://threejs.org/docs/pages/GLTFExporter.html
- Blender glTF importer: https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html
- GitHub custom Pages workflows: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- Playwright browser installation: https://playwright.dev/docs/browsers
- Khronos glTF Validator: https://github.com/KhronosGroup/glTF-Validator
