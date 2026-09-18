# Direction-profiled primary volumes

Use the existing `sectionLoft()` plus `radialMass()` from
`src/lib/forms/structure.js` for smooth axial forms. Breadth/depth, centerline,
radial masses, resolution, pose and material are independent. The loft convention
is Y up, radial u in turns, and longitudinal v in [0,1].

`radialMass({ at, span, angle, spread, amount })` accepts either a constant angle
in **radians**, or `angle(v)` returning radians. `spread` is angular width and
`amount` is in the support's spatial units. The directional path can follow an
oblique volume instead of inflating the entire section like a barrel:

```js
import {sectionLoft, radialMass, contour} from '../src/lib/forms/structure.js';
const direction = contour([[0, -.4], [.5, .2], [1, 1.2]]);
const support = sectionLoft({
  from: -.4, to: 0,
  breadth: contour([[0, .03], [.6, .05], [1, .04]]),
  depth: contour([[0, .035], [.6, .045], [1, .04]]),
  masses: [radialMass({at:.55, span:.32, angle:direction, spread:.7, amount:.008})],
});
```

Zero angle faces +Z. The contribution wraps around u with shortest angular distance
and fades to zero at v=0 and v=1. Existing constant-angle calls are unchanged.
Direction samples must be finite in [-4 pi,4 pi]; invalid functions fail at evaluation.
A negative amount can recess a mass, but the loft rejects inverted radial sections.
The field is not a normal-direction brush or a topology/skin-weight transfer tool.

The editable uses are `studies/spiral-grip.js` (a three-lobed mechanical grip) and
`src/lib/cyber/mass-forms.js` (robot humanoid envelopes). New robot volumes are
selected with `massStyle: 'sculpted'` together with `bodyStyle: 'articulated'` and
`limbStyle: 'scalloped'`; previous defaults remain `massStyle: 'profiled'`.
Contour shells, seams and surface-mounted hardware follow the changed support.
Joint poses and fixed limb endpoint rings do not change. Regenerate any dependent
normal bakes after editing a support; this pass makes no new baking claims.

```sh
node --test tests/mass-forms.test.js tests/structure-forms.test.js
node scripts/review-masses.mjs
```

No collision solver, exact muscle anatomy, shoulder skinning, retopology or constant
volume preservation is provided. Inspect more than one view; a single silhouette
cannot prove a correct body. See [source observations](research/humanoid-mass-groups.md).
