# Working in this repository

This is a procedural 3D workshop. The user describes objects; the assistant authors JavaScript recipes; Actions builds/reviews them; Pages presents them; GLB and packed Blender artifacts are the handoff.

## Ordinary model requests

- Read README.md, src/lib/modeling.js, and a relevant recipe before editing. For organic forms, humans, sculptures, textures or UVs also read docs/organic-modeling.md.
- Add/edit models/<slug>.js with defineModel({id,title,description,parameters,build}); id must match the filename. Discovery/UI are automatic.
- Use meters, Y up, +Z forward. Helper rotations are degrees; raw Three.js rotations are radians. Name parts/materials and preserve meaningful separate objects.
- Builders must be synchronous, deterministic, DOM/network-free. Allocate materials inside builds. Prefer standard PBR materials and real geometry. Do not paint false holes when actual openings were requested.
- Expose useful dimensions and test numeric limits together and separately. Stay below one million default triangles unless a deliberate budget/test change is needed.
- The user authorized direct pushes to main. Preserve unrelated changes, re-read the branch tip before advancing it, and never force-push.
- Run npm test, npm run build, npm run bake, and node scripts/review-surfaces.mjs where available. Otherwise use Actions and distinguish actual checks from assumptions.
- Inspect perspective/front/side/top, close-up PBR/clay/normal/checker previews, validation and surface reports, and Blender import reports. Build success does not establish visual likeness, correct anatomy, topology quality, or printability.
- Report model ID, tested commit, actual deployment status, useful controls and export caveats. Never describe a static mesh as rigged or production-ready without appropriate checks.

## Organic modeling

- surfaces.js provides explicit UV patches, capped lofts, variable-radius sweeps, ellipsoids and geometric displacement. Sweeps have open ends. U × V sets patch winding.
- anatomy.js provides an authored stylized head, clothed human and sculpture base. The reference models are approximations, not automatic or photorealistic reconstructions.
- textures.js creates seeded procedural base-color, OpenGL normal and shared metallic/roughness maps. Base color is sRGB; data maps are linear. Texture sizes are budgeted; more pixels/triangles are not proof of fidelity.
- uv.js provides projections, existing-chart packing, audits and UV SVGs. Default models use tiled per-part UVs, not a uniquely unwrapped body atlas. Chart packing does not rebake materials or solve internal overlap.
- UI display modes must never mutate exported materials/geometry. Preserve export-isolation tests and complete UV/image embedding checks.
- Keep generated reference thumbnails clearly labeled as references, not actual workflow renders. Text in generated concept boards is not an implementation specification.

## Architecture

The site is static and self-hosts pinned dependencies. No production CDN/API credentials. Export only the model root, not lights/grid/camera. Generated GLBs and review renders belong in artifacts/Pages, not source history; intentionally authored reference thumbnails are source assets. Preserve /3d/ project-subpath and mobile compatibility.

Actions now has an explicit background-Blender job. It imports fine GLBs, checks mesh UVs and image nodes, packs images and saves .blend artifacts. Cite its actual report before claiming Blender import success. This is not a render comparison, rigging test, or watertightness proof. Blender imports evaluated mesh data, not JS recipes or modifiers.

Pages can remain unconfigured even when all build/import checks pass. The one-time repository setting is Settings → Pages → Source: GitHub Actions.
