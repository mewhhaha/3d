# Working in this repository

This is a procedural 3D workshop. The user describes objects; the assistant authors JavaScript recipes; GitHub Actions builds and reviews them; GitHub Pages presents them; GLB is the Blender handoff.

## For an ordinary model request

- Read `README.md`, `src/lib/modeling.js`, and a relevant existing recipe before editing.
- Add/edit `models/<slug>.js`. Its default export is `defineModel({ id, title, description, parameters, build })`; `id` must match the filename. The catalog and UI are generated automatically. Do not edit the viewer just to register a model.
- Use meters, Y up, +Z forward. Helper rotations are degrees; raw Three.js rotations are radians. Name important parts and materials. Preserve meaningful origins and separate objects when useful in Blender.
- Make `build(parameters)` deterministic and synchronous. No DOM, network requests, random unseeded geometry, secrets, or external runtime URLs. Create materials inside the builder. Prefer standard PBR materials and real geometry over custom shaders.
- Expose a few useful dimensions/style controls. Ensure every parameter limit and combined numeric limits generate valid geometry. Stay below one million default triangles unless there is an explicit need and tests are intentionally updated.
- Use the helpers first; use exported `THREE` for custom geometry. Extend the helper library only when it genuinely simplifies reuse. Do not fake holes with dark paint when a real opening was requested.
- Run `npm test`, `npm run build`, and `npm run bake` where dependencies/browser are available. Otherwise use Actions and state which checks actually ran. Never claim a model was inspected in Blender without doing so.
- The user has requested a direct-to-main workflow for this repository. Preserve unrelated files and avoid force-pushing. Re-read the current branch tip before advancing it.
- Inspect the workflow's `model-assets` previews (perspective/front/side/top), `validation.json`, `manifest.json`, and diagnostics screenshots when available. Use them to check shape, proportions, framing, and errors before claiming completion.
- Give the model ID, tested revision, deployment status, useful parameter choices, and export caveats. Do not call meshes watertight, print-ready, rigged, or subdivision-ready without appropriate checks.

## Architecture constraints

The entire site is static. Dependencies are pinned and copied into `dist/vendor/`; no production CDN requests or API credentials. Export only the model root, never the preview scene. Generated GLBs/images belong in workflow artifacts and Pages, not Git source history. Preserve project-subpath compatibility (`/3d/`) and mobile layout. A workflow may build successfully while deployment waits for the one-time Pages setting.

GLB preserves evaluated mesh data, not JS recipes or Blender modifiers. This initial project does not run Blender. Native `.blend` generation or Blender import smoke tests would require a separate, explicit headless-Blender step.
