# Attribution

## Origin

This skill was distilled from a completed build of **Calculus Explorer 3D: AP Calculus AB
Interactive Visualizer & Mastery Engine** (2026), created in an OpenCode session with the DeepSeek
V4.1 Flash model.

- Live product: <https://somphol.github.io/calculus-explorer-3d/>
- Reference source: <https://github.com/somphol/calculus-explorer-3d>
- Local build: `~/Projects/calculus-explorer-3d`

The app, its curriculum text, 40 worked examples, 96 questions, eight procedural scenes, tests and
documentation are original work by the author, released under the MIT license.

## Reused

- **Three.js 0.169.0**, MIT, <https://threejs.org>. WebGL renderer, geometry, materials, lights,
  OrbitControls, math primitives. Loaded from jsDelivr; not vendored.
- The dependency-free Chrome DevTools Protocol harness pattern (static server + built-in WebSocket)
  is a small, widely used pattern; the implementation here is original and MIT.
- The eight-unit *structure* follows the publicly documented Khan Academy AP®/College Calculus AB
  framework. No Khan Academy text, video, exercise, image, or asset is copied or redistributed.
- AP® is a trademark registered by the College Board, which is not affiliated with and does not
  endorse this project. Khan Academy is a trademark of Khan Academy, Inc.

## New in this skill

- The extraction method: what to copy, what to strip, how to prove the scaffold.
- The build log with the actual bugs and fixes (hidden views, 1250 px mobile, partial lathe caps,
  same-document navigation, self-test `pass` vs `ok`).
- The visual contract, control descriptor rules, and eight scene recipes.
- The three-layer verification gate and keychain-safe browser recipe.
- The publication and catalog procedure.

## Third-party software

| Component | License | Shipped? |
| --- | --- | --- |
| Three.js 0.169.0 | MIT | No, CDN at runtime |
| Node.js test runner | MIT | No, build tooling |
| Google Chrome | Proprietary | No, verification tooling |
| OpenCode / DeepSeek V4.1 Flash | tool/model credits | No |

No webfonts, icon libraries, stock images, or audio files are included. Screenshots are generated
from the app itself.

## License status

The skill instructions, reference app, tests, docs, and scripts are MIT. The Three.js license notice
is in the reference's `THIRD_PARTY_NOTICES.md`. If you reuse the reference, keep the MIT notice and do
not imply endorsement by the College Board or Khan Academy.
