# Constrain a two-link joint without stretching

`twoLinkPose()` accepts an optional `jointPlane: {normal, constant}` in the same
coordinate space as its root, target and pole. The plane equation is
`dot(normal, joint) = constant`. Scaling both normal and constant preserves the
constraint. As before, lengths are positive and endpoints are fixed.

```js
const pose = twoLinkPose({
  root: [0, 0, 0], target: [.30, .70, .12],
  lengths: [.46, .43], pole: [-.3, .4, .3],
  jointPlane: {normal: [0, 0, 1], constant: .055},
});
```

Two fixed link lengths leave a circle of possible middle-joint locations.
The extra plane intersects that circle in zero, one or two points. In the
last case, the pole (after optional swivel) chooses the nearer branch. Thus
`swivel` remains a preferred direction, not an extra exact angular constraint
when `jointPlane` is supplied. A coincident circle plane leaves the original
pole solution unchanged. Tangency and exact full extension are supported.
Impossible planes throw instead of stretching a link or clamping the artist's
requested placement. Normal/constant and returned coordinates must be finite.

This analytic construction is not a general IK constraint stack, collision
solver, reachability optimizer or skinned rig. It neither reads a reference
image nor projects geometry through a camera. Small floating-point boundary
errors use a relative positional tolerance; the model must still have meaningful
units. Omitting the option preserves previous results and return fields.

Examples: `studies/plane-boom.js` keeps a service boom's middle bearing on an
installation plane; the android's optional `gestureStyle: poised` uses a plane
in its guide space to control far-elbow placement after correcting shoulder
depth. The rib section is fitted to BOTH shoulder sockets, and its resolved
section transform drives the torso and connecting girdle. The initial
`torsoGesture` preset alone is not the resolved poised frame; use the stations
recorded by `applyBodyGesture`. Camera,
head, near-arm pose, all wrist/ankle targets and link lengths remain separate.

`panelStyle: swept` is an independent shell configuration: the proximal thigh
support extends over the hip socket, and the apron contour is reshaped. The
skeletal thigh does not lengthen. Geometry/UVs are recompiled for changed support
surfaces; no old tangent-space bake is transferred. Existing pigment and shader
controls still apply after geometry construction. The previous pose and panel
variants remain available.
