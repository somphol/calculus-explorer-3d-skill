# Changelog

All notable changes to Calculus Explorer 3D are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-11-06

### Added

- Eight Khan Academy AP Calculus AB units with distinct procedural Three.js scenes.
- Unit 1: convergence microscope with removable hole, jump, infinite, and squeeze models; independent left/right tracers and sweep animation.
- Unit 2: tangent glider with secant triangle, shrink-to-limit animation, and four curve presets.
- Unit 3: nested rotation rings with live chain-rule factor vectors and product.
- Unit 4: filling cone and sliding ladder related-rates models with rate arrows.
- Unit 5: curvature-coloured terrain, extrema/inflection beacons, tangent plane, normal, and MVT chord.
- Unit 6: instanced Riemann prisms, four methods, n = 2–200, exact/error readouts, refine animation.
- Unit 7: colour-coded slope field, click-to-drop RK4 particles, trail glow and crumbs.
- Unit 8: partial lathe with disk/washer profiles and a square/semicircle cross-section gallery.
- 40 step-by-step worked examples and a 96-question bank (80 MC, 16 numeric FRQ).
- Adaptive mastery engine with `localStorage`, unit/global rings, review mode, export/import, reset.
- Live narration, six readouts per unit, formula shelf, theorem card, concept chips.
- Dark scientific design system, focus mode, keyboard shortcuts, settings, synthesized audio.
- Responsive layout from 390 px upward, reduced-motion support, ARIA labels.
- Three verification layers: 16 Node curriculum tests, static repository tests, headless Chrome suite, plus a 27-check in-page self-test.
- Release documentation, reproduction blueprint, GitHub Pages deployment, social card and screenshots.

### Known limitations

- Three.js is loaded from a pinned CDN; the app is not a fully offline bundle.
- FRQ grading is numeric, not symbolic or free-text.
- A review miss increments lapses but does not revoke mastery by design.
- The live browser suite is run manually; CI runs Node tests only.
