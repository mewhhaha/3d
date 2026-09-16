# Automated leg segmentation checkpoint

Base remote revision: `4e86e56313e033c3dd1108176c55992c57be6636`.
Active recipe: `models/cyber-form-study.js`.
Reference image hash: `127f0f4216b12e279f01c77206720feb4e76ab989b7ed92576505faa4f329218`.

## Accepted change

The thigh and shin no longer use one continuous front shell from joint to joint. `segmentedArmor()` composes independently editable armor leaves on one shared `limbVolume()` support. Each leaf owns only its longitudinal window, curved side boundaries, thickness, normal offset and material; the pose, limb dimensions and support remain shared.

The actual cyber-form study now uses a knee tongue, split main thigh leaves, hip mantle, ankle blade, split calf leaves and knee flare. Narrow dark flex bridges sit under the deliberately exposed transverse gaps, and side/rear plates are split into shorter windows. The existing chassis, joint centers, ports, pose guide and camera are unchanged.

This is primary shell segmentation, not a boolean/retopology system. Gaps are authored on the common parameterization and separate rendered meshes are not welded to one another. `segmentedArmor()` does not resolve collisions or infer joint clearances automatically.

## Local evidence

- `npm run doctor` — WebGL2 / Chromium / SwiftShader available.
- `node --test tests/form-design.test.js tests/shape-rails.test.js tests/region-mask.test.js tests/compact-geometry.test.js tests/cyber-mechanics.test.js` — **22/22 passed**.
- `npm run build` — passed, 15 recipes built.
- `node scripts/measure-reference.mjs models/cyber-form-study.js` — **9.3566575468 px RMS**, **17.9592707268 px maximum** over the same nine reference feature points, unchanged from the established pose alignment.
- Isolated lower-limb export: **76,684 triangles**, GLB validator **0 errors / 0 warnings**. Informational messages concern unused UV sets and do not establish visual acceptance.
- Neutral material/clay captures were inspected in front and three-quarter views. A temporary legacy construction using the previous continuous shells was rendered from the same component camera for direct comparison. Those temporary comparison recipes are not source changes.

## Visual assessment

The old lower body read as four smooth ivory tubes. The new version exposes dark mechanical gaps at the upper/lower thigh and calf transitions, introduces a longitudinal split through the larger thigh/calf faces, and gives the knee/hip/ankle ends separately editable silhouettes. This is directionally closer to the supplied reference's layered mechanical leg armor.

The legs are still cleaner and more symmetrical than the artwork. The knee surround lacks the reference's irregular bracket stack, the outer shin remains too calm, and the boot upper/toe is still a smooth sneaker-like mass. The next lower-body pass should connect the knee port to asymmetric side brackets and reshape the boot upper/cuff before adding small surface greebles.
