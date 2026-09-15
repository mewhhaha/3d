# Reference pose before detail

The active recipe is `models/cyber-pose-study.js`, gallery title **Prism / pose before detail**. The earlier `cyber-android-scene` is intentionally retained as a baseline, not silently overwritten. This pass targets screen placement, proportions, depth hypotheses and scene hierarchy before sculpting new armor or adding greebles.

## Three representations, one guide

`prismGuide()` supplies named chest, pelvis, shoulder, elbow, wrist, hip, knee, ankle, head and reactor anchors. `posedAndroid({stage:'gesture'})`, `posedAndroid({stage:'masses'})` and `posedAndroid({stage:'assembly'})` consume the same positions. The cheap versions expose the placement decisions. The detailed version reuses existing component builders, rather than encoding an independent pose in their vertices.

```js
import { prismGuide, posedAndroid } from '../src/lib/cyber/reference-layout.js';
import { mountSegment } from '../src/lib/reference-shot.js';
const guide = prismGuide();
const blockout = posedAndroid({ stage: 'masses', cables: true });
// `forearm` is an independently owned component whose local -Y axis follows its length.
const posedForearm = mountSegment(forearm,
  guide.point('elbowNear'), guide.point('wristNear'),
  { referenceLength: 0.225, forward: [-0.6, 0, 0.8] },
);
```

The frame is right-handed. The axial fit scales the source component along its length; it is not skin deformation and can stretch circular details along that axis. A later component redesign should size armor directly from the skeleton instead of using this prototype fitting. Front/back axes stay explicit rather than being guessed from the camera each time.

`referenceCamera()` and `liftPoint()` provide an authored projection and a depth plane. The camera's focal length, distance, elevation and the anchor depth hints are modeling assumptions, not estimates of a true camera or automatic recovery of 3D anatomy from one image. An image point alone cannot determine its depth.

`liftOnSphere()` intersects the image ray with a sphere around the parent joint. It preserves both the chosen screen joint location and a specified 3D segment length. Two intersections can exist: the authored depth hint chooses a branch. Impossible rays throw an error instead of secretly stretching a bone. Left and right upper arms are both 0.25 m, forearms 0.30 m, thighs 0.43 m and shins 0.45 m in this study. These are chosen proportions for this android, not universal anatomical measurements. The soles are separately planted at the platform's 0.155 m deck plane.

## Mount equipment to equipment

`worldSocket(object,{at,normal})` transforms a connection point and direction into world coordinates. `routeSockets(start,end,{via,lead})` includes actual endpoints plus connector-aligned departure and arrival leads. The large luminous loop connects the lower coolant manifold to the secondary reactor. Its middle route still uses authored depth hints; it is not an equilibrium simulation or collision-free route solver. Connections resolve at build time, not continuously during arbitrary animation.

The main reactor's diameter and the protective hoop are now independent. The secondary reactor was moved separately rather than scaling the entire backpack to make one ring fit. `neonCity({ceiling,signs})` can keep the upper background quiet while retaining lower distant windows; defaults preserve the earlier scene. The oversized loop glow was reduced, but these tubes remain opaque emissive geometry, not transmissive glass.

## Compare observations, not the guide with itself

`references/prism.json` holds approximate manual observations, their pixel uncertainty, component lookup names, and the original image's SHA-256. It does not store or download the reference image. Nine observed features are the actual shoulder/elbow/palm/knee/ankle emitters, reactor centers and pupils, not the lifted skeleton anchors. `measureReference()` projects those evaluated feature locations. Missing scoped parts are errors, not silently substituted objects elsewhere in the scene.

The current local reference review measured RMS feature distance **166.680 pixels before** versus **9.357 pixels after**, with a largest remaining point error of **17.959 pixels**, in the 768 x 1376 reference coordinate system. These observations drove the edits; the result is not a held-out test, a percentage likeness, or proof of anatomical/3D accuracy. Individual uncertainty bands and the full error list remain in the report.

Point placement is only the first gate. The hair's projected convex mass envelope has an overlap of only **0.576** against the manually traced coarse envelope, below the editorial 0.85 target. This diagnostic ignores holes, visibility, occlusion, concavities and depth; it cannot certify a silhouette. It deliberately keeps the next priority as **hair mass envelope** even though the landmark alignment passes. `visualAcceptance` stays `not-assessed` in the automated reports.

A local trial lifted the nape and raised the crown. Its bounding rectangle became closer, but the convex envelope overlap barely changed (about 0.577) and the visible silhouette was still wrong. That trial was not adopted. A smaller bounding-box error is not a reason to accept a haircut.

## Repeat the review

```sh
npm run review:pose
# Include the user's original PNG to add a self-contained SVG overlay:
REFERENCE_IMAGE=/path/to/reference.png npm run review:pose
# A single quick construction render:
npm run render -- models/cyber-pose-study.js \
  --params '{"stage":"masses"}' --views hero --out renders/masses
# Regenerate the measurement without rendering:
npm run measure:reference
```

The study holds the same camera and lights across gesture, masses, assembly and a small Survey head-pose check. The baseline deliberately retains its old camera, so before/after comparison includes the composition correction; it is not a camera-locked deformation benchmark. Neutral side/back clay renders expose the chosen 3D depths separately from the hero image. No new texture detail or normal-map bake is claimed for this pass.

`reference-overlay.mjs` embeds both actual PNGs in an offline SVG, with target uncertainty circles, projected model crosses, displacement lines and mass outlines. It refuses a reference image with the wrong hash or dimensions. The overlay image is optional in CI; all geometry, projection and annotation checks run without copying the user's image into Git history.

`createRenderBatch()` creates a fresh browser for each sequential operation, with an explicit finite job budget and resource cleanup. This trades startup overhead for less shared graphics state. It rejects parallel calls; errors are not automatically retried or converted into successes. The study saves its manifest after each case. The local review was interrupted in earlier executions; an uninterrupted run completed all four exports, all 16 views/passes, side/back checks and measurements. These checks do not prove crash-free operation in every environment.

## Scope and next work

The dedicated workflow is `Reference pose and composition study`; its artifact is `reference-pose-review`. Run results and deployment must be reported separately. This component is a static rigid assembly plus a small head-motion clip, not a new skinned humanoid, complete mechanical skeleton, hand rig or native Blender scene. Exported GLBs include the authored camera, five lights and embedded maps; optics remain renderer-specific.

The remaining visible problems are the helmet-like bob, doll-like portrait, broad simplified armor boundaries, overly rectangular boots, approximate far-arm placement and bright loop materials. Next, work on these outlines one region at a time under the fixed reference camera and inspect alternative views before spending more triangles on detail. Do not move the target annotations to hide a failure. Preserve the previous recipe and keep short tested commits on main.
