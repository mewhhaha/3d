# Mechanical foot forms and curved apertures

Accessed 2026-09-18. Public written material only; no premium videos or assets
were accessed or copied.

- Stan Prokopenko, **How to Draw Feet**:
  https://www.proko.com/course-lesson/how-to-draw-feet
  The public notes separate the heel block, asymmetrical arch/bridge, and toe
  region. They stress different medial/lateral contours and the importance of
  actual ground contact rather than a uniform extruded footprint. Adaptation:
  a lower planted outsole, sloped off-centre instep and independent heel guards,
  keeping the prior ankle and sole datum. This is robot design interpretation,
  not reconstructed human anatomy. Tested as both handed foot configurations and
  in the fixed-camera complete scene; the new silhouette is less clog-like but
  still simplified and more regular than the illustration.
- Three.js authors, **ShapeUtils / Shape**:
  https://threejs.org/docs/pages/ShapeUtils.html
  https://threejs.org/docs/pages/Shape.html
  `triangulateShape` accepts an exterior plus arrays of holes. Shape documents
  opposite hole winding. Confirmed against locked r186 source. Adaptation:
  validate disjoint UV-domain aperture loops, triangulate outer-minus-holes,
  refine shared edges, then evaluate the curved support. Existing solidify owns
  wall generation. Boot carriers and an unrelated lightweight bracket exercise
  the same operation. Exact domain area, no ray hits through holes, unit normals,
  closed solidified geometric edges and invalid-loop rejection have tests.
  It is not arbitrary CSG, nested-island triangulation or collision repair.
- Playwright authors, **Page.evaluate / JSHandle**, and Chromium contributors,
  **DevTools pipe handler**:
  https://playwright.dev/docs/api/class-page#page-evaluate
  https://playwright.dev/docs/api/class-jshandle
  https://chromium.googlesource.com/chromium/src/+/main/content/browser/devtools/devtools_pipe_handler.cc
  Browser evaluation accepts serialized arguments; retained handles support
  evaluation against owned in-page data. The actual Chromium 144 stderr exposed
  a 104857600-byte pipe capacity while transferring this scene. Adaptation:
  bounded JSON strings accumulated on an owned JSHandle, then parsed and loaded
  in the fixed runtime. No new dependency or graphics approximation. Tested
  through the previously failing full scene and identical baseline PNG hashes.
  This does not bound total browser RAM or outgoing binary export size.
