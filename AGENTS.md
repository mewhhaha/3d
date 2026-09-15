# Working in this repository

This is a code-first 3D workshop. The user describes objects; assistants author JavaScript recipes; Actions builds and renders them; Pages presents them; GLB and packed Blender scenes are the handoff.

## Local-first iteration

Read `docs/local-studio.md`. Run `npm run doctor`, then render only the changed recipe with `npm run render -- models/<id>.js`. Local rendering uses an in-memory Node-to-Three stage; it does not need Blender, a website server, or a push to see the next edit. Use `npm run study -- studies/auricle.json` as the pattern for finite cases, locked cameras/lights, export validation and partial checkpoints. Inspect images yourself; a passing study deliberately does not claim visual acceptance. Builders and imported helpers reload for every render.

Use `src/lib/forms/sculpt.js` for compact masks, strokes and shared-cage brushes, and `cage-asset.js` for corresponding high/low representations. Sculpt primary form before adding bake-only detail. Do not confuse the independent cage studies with the legacy MakeHuman-based character, or silently replace accepted components. Commit each tested improvement to main without force pushes. Keep source fingerprints, code revision and deployment status distinct.

## Ordinary requests

- Read README.md, src/lib/modeling.js, and a relevant recipe before editing. Organic forms use docs/organic-modeling.md. Characters now use docs/composable-characters.md and models/reference-explorer.js. Read docs/rigging.md for the general skeleton API.
- Add/edit models/<slug>.js with defineModel({id,title,description,parameters,build}). IDs match filenames; discovery and parameter UI are automatic.
- Compose meaningful operations rather than duplicating low-level coordinates in a recipe. For the adult character vocabulary, compose anatomy(), portrait(), wear(...), tiedBun(), equip(...) and animate(...). Add reusable stages only where actual modeling needs justify them.
- Use meters, Y up, +Z forward. Helper rotations are degrees; Three.js uses radians. Name parts/materials and preserve useful separate objects.
- Builders are synchronous, deterministic, DOM/network-free. Materials are owned by each build. Prefer real geometry and standard PBR maps over fake holes or preview-only shaders.
- Test parameter limits and keep default triangles under one million unless deliberately changing the budget. More triangles or pixels do not imply better likeness.
- Direct pushes to main are authorized. Preserve unrelated changes, reread the current branch tip, never force-push.
- Run npm test, npm run build, npm run bake and applicable review scripts where available. Use Actions otherwise. State which tests actually passed.
- Inspect actual rendered full views and close-ups before claiming visual success. For reference-explorer, inspect review-face, review-hand, review-boots, review-side, review-wave and the native Blender preview. A passing geometry test is not a likeness assessment.

## Anatomical source and fitting

The legacy `reference-explorer` uses pinned CC0 MakeHuman graphical assets: connected topology, UVs, morph targets, landmarks and weight paint. These are not assistant-authored anatomical meshes or scans. Do not remove provenance from THIRD_PARTY.md. Application code is separately licensed and is not incorporated.

scripts/prepare-anatomy.py verifies checksums, caches source in ignored vendor-src and generates ignored src/generated/human-data.js. npm pretest/prebuild/predev run preparation. CI downloads from an immutable commit; the browser uses only self-hosted files.

fitSurface transfers UVs and weights, offsets surfaces, composes folds and removes covered skin. Continuous triangle projection avoids discontinuous vertex snapping. The vocabulary is one fitted adult archetype, not arbitrary automatic retopology, simulation or universal fitting. Height is anatomical stature before hair/accessories.

## Rendering and export

UI modes and preview poses must not mutate exports. Export rebuilds a clean bind pose and includes clips. Preview lighting, grid, floor and camera stay outside object GLBs. Authored scene recipes are different: the cyber scene intentionally exports its camera and scene lights; optical postprocessing is retained only as metadata. Native reference .blend scenes deliberately include their own studio camera and three area lights.

Keep generated references labeled as concept art; never substitute them for workflow renders. PBR maps are procedural/tiled, not automatically extracted from references. Validate embedded images, UVs, tangents, skin weights and morphs. Cloth/hair collision, contact-correct walks and production facial rigs are not implemented.

The site is static, self-hosts pinned dependencies and needs no credentials in browser code. Keep /3d/ subpath and mobile compatibility. Generated GLBs, native files and reviews belong in artifacts/Pages, not source history.

scripts/blender_reference.py imports the legacy reference-explorer GLB, checks deformation, textures, actions and morphs, saves and reopens a packed lit scene and renders CPU Cycles. Cite the actual report before claiming native success. GLB/BLEND preserve evaluated meshes, not JS recipes or modifier stacks.

Report model ID, tested revision, deployment state and honest caveats. Pages may remain unconfigured even when all checks pass: Settings > Pages > Source: GitHub Actions.

## Current primary reference: cyber android

Read `docs/cyber-android.md` and `models/cyber-android-scene.js`. The user supplied the cyber-android artwork with mint/orange bob, pale mechanical armor, radial backpack, luminous loop and neon platform. Build and render actual repository geometry; do not substitute an image-generation result for a model render. Use local material and neutral-clay/side/portrait captures before checkpoints. The initial scene is a procedural blockout/material study, not accepted likeness. Its rigid Survey head motion, high draw-call count and draft geometry must not be described as the earlier hand's skinned, normal-baked pipeline. Render/export and Pages UI are independently tested by `Cyber android scene checks`; report deployment separately.

### Pose-first continuation

Start with `docs/reference-pose.md`, `docs/checkpoints/2534ae1.md` and `models/cyber-pose-study.js`. The user explicitly wants pose and scene elements resolved before adding model detail. `npm run review:pose` renders gesture, masses and assembly from one guide, validates GLBs, measures manually annotated features and saves partial checkpoints. `REFERENCE_IMAGE=/path/to/original.png` additionally produces a hash-checked overlay. CI uses the same annotations without storing the reference raster in Git.

The low point error is NOT visual acceptance. The hair mass envelope still fails; inspect that mismatch and side/back depth hypotheses before adding decorative geometry. Keep body lengths consistent with `liftOnSphere`, place components with `mountSegment`, and connect the main cable using `worldSocket`/`routeSockets`. These are build-time rigid helpers, not a full skin rig or collision solver. Use finite isolated render batches for longer reviews, allow the actual run to finish, and do not confuse an execution timeout with a completed study. Preserve the earlier recipe for before/after comparison and keep pushing coherent tested checkpoints.
