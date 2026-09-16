# Workflow-first authoring principles

The repository is a reusable code-first 3D workshop. Individual references are integration and regression examples, not the architecture.

- Prefer a small construction operation that makes another character, creature, prop, sculpture or environment easier to author over a one-off coordinate patch.
- Exercise a new general abstraction on at least two materially different small examples when practical. One may be an existing reference component; the second should prove the abstraction is not reference-specific.
- Keep shape intent, local frames, representation resolution, materials, pose, reference annotations and rendering separable. Reference data belongs to the project using it, not generic geometry helpers.
- Research the concrete modeling problem using primary artist/developer sources when possible. Record what the source actually establishes, then implement or reject a bounded adaptation. Do not turn research into a documentation-only substitute for modeling work.
- Render the smallest relevant examples first and inspect material/clay/alternative views. Mechanical tests and GLB validation are necessary but do not establish visual quality.
- Preserve old recipes as regressions when evolving the vocabulary; avoid hiding giant coordinate tables behind wrappers with no independent users.

Current workflow research notes live under `docs/research/`. The cyber-android remains a demanding reference case, but future references should be able to use the same construction vocabulary without inheriting its camera, dimensions, annotations or styling.

## Keep sheet shape, shell thickness, and shading finish separate

Thin authored surfaces should not need thickness baked into their guide/profile data. `src/lib/surface-thickness.js` provides a bounded topology stage after a surface has been designed:

```js
import { solidifyGeometry, creaseNormals } from '../src/lib/surface-thickness.js';

const shell = solidifyGeometry(authoredSheet, {
  thickness: 0.012,
  offset: -1,
  rim: 'smooth',
});
const finished = creaseNormals(shell, { angle: 40 });
```

`solidifyGeometry()` owns new topology and makes that ownership explicit: supported UVs are rebuilt, unsupported topology-dependent attributes are reported as invalidated, and skin/morph/material-group dependencies are rejected rather than silently copied. It is a simple normal-offset shell, not an even-thickness/self-intersection solver. `creaseNormals()` is an optional downstream shading stage, not a substitute for beveling or physical edge construction. This separation lets the same source sheet become a leaf, hair/card strip, cloth trim or hard-surface panel without changing the source path/profile merely to change wall depth.
