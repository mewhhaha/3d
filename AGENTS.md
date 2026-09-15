# Working in this repository

This is a code-first 3D workshop. The user describes objects; assistants author JavaScript recipes; Actions builds and renders them; Pages presents them; GLB and packed Blender scenes are the handoff.

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

The new character uses pinned CC0 MakeHuman graphical assets: connected topology, UVs, morph targets, landmarks and weight paint. These are not assistant-authored anatomical meshes or scans. Do not remove provenance from THIRD_PARTY.md. Application code is separately licensed and is not incorporated.

scripts/prepare-anatomy.py verifies checksums, caches source in ignored vendor-src and generates ignored src/generated/human-data.js. npm pretest/prebuild/predev run preparation. CI downloads from an immutable commit; the browser uses only self-hosted files.

fitSurface transfers UVs and weights, offsets surfaces, composes folds and removes covered skin. Continuous triangle projection avoids discontinuous vertex snapping. The vocabulary is one fitted adult archetype, not arbitrary automatic retopology, simulation or universal fitting. Height is anatomical stature before hair/accessories.

## Rendering and export

UI modes and preview poses must not mutate exports. Export rebuilds a clean bind pose and includes clips. Preview lighting, grid, floor and camera stay outside GLB. Native reference .blend scenes deliberately include their own studio camera and three area lights.

Keep generated references labeled as concept art; never substitute them for workflow renders. PBR maps are procedural/tiled, not automatically extracted from references. Validate embedded images, UVs, tangents, skin weights and morphs. Cloth/hair collision, contact-correct walks and production facial rigs are not implemented.

The site is static, self-hosts pinned dependencies and needs no credentials in browser code. Keep /3d/ subpath and mobile compatibility. Generated GLBs, native files and reviews belong in artifacts/Pages, not source history.

scripts/blender_reference.py imports the new GLB, checks deformation, textures, actions and morphs, saves and reopens a packed lit scene and renders CPU Cycles. Cite the actual report before claiming native success. GLB/BLEND preserve evaluated meshes, not JS recipes or modifier stacks.

Report model ID, tested revision, deployment state and honest caveats. Pages may remain unconfigured even when all checks pass: Settings > Pages > Source: GitHub Actions.
