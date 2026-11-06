# Reproduction blueprint

This is the shortest honest path to rebuild **Calculus Explorer 3D** from an empty directory. It assumes an agent that can write files, run Node, launch headless Chrome, and push to GitHub.

## 0. Target and acceptance

Build a static single-page AP Calculus AB studio with:

- 8 unit scenes, each a distinct procedural Three.js model;
- 5 worked examples and 12 questions per unit (96 total: 80 MC + 16 numeric FRQ);
- adaptive mastery in `localStorage`, excluding mastered questions;
- live narration, six readouts, keyboard shortcuts, focus mode, mobile layout;
- 40 examples and a theorem/formula/concept card per unit;
- three verification layers and a GitHub Pages deployment.

**Done means:**

```sh
node --test tests/curriculum.test.mjs tests/static.test.mjs
node tests/browser.test.mjs
TEST_URL=https://<user>.github.io/calculus-explorer-3d/ node tests/browser.test.mjs
```

all pass with zero console errors, `?selftest` is 27/27, and the live URL serves the app.

## 1. Scaffold

```sh
mkdir -p calculus-explorer-3d/{src/{core,data,visuals},tests/lib,scripts,docs,.github/workflows,assets}
cd calculus-explorer-3d
git init -b main
```

Create:

- `index.html`
- `style.css`
- `src/main.js`
- `src/data/curriculum.js`
- `src/core/{math,mastery,quiz}.js`
- `src/visuals/{common,stage,unit1..unit8}.js`
- `tests/lib/harness.mjs`
- `tests/{curriculum,static,browser}.test.mjs`
- `scripts/{screenshot,smoke}.mjs`
- `docs/*`
- `README.md`, `AGENTS.md`, `LICENSE`, `CHANGELOG.md`, community files
- `.nojekyll`, `.gitignore`, `robots.txt`, `sitemap.xml`, `404.html`, `assets/favicon.svg`

## 2. Pin Three.js

In `index.html`, *before* the module script:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/"
  }
}
</script>
```

Pin exactly `0.169.0`. Addon path layouts change. Do not use a bundler.

## 3. Write the data first

`src/data/curriculum.js` must be pure. Define helper constructors:

```js
const mc = (id, topic, difficulty, prompt, formula, choices, answer, explanation, hint) => ({...});
const frq = (id, topic, difficulty, prompt, formula, answer, tolerance, unitHint, explanation, hint) => ({...});
```

Eight units. Each has `id, slug, code, title, shortTitle, tagline, weight, hue, summary, bigIdea, concepts, formulas, theorem, visual, examples, questions`.

- `hue`: `#5eead4`, `#fbbf24`, `#a78bfa`, `#fb7185`, `#60a5fa`, `#34d399`, `#f472b6`, `#f59e0b`.
- `questions`: 12 per unit, IDs `u<unit>-qNN`, 10 MC + 2 FRQ.
- `examples`: 5 per unit, 3+ numbered steps, a takeaway, a `visualCue`.
- Append unit 5–8 after units 1–4 if you prefer a readable file; then flatten:

```js
export const ALL_QUESTIONS = UNITS.flatMap(unit => unit.questions.map(q => ({
  ...q, unitId: unit.id, unitTitle: unit.title, unitHue: unit.hue
})));
```

**Do not** renumber IDs after release — they are mastery keys.

## 4. Pure core

`math.js`:

```js
derivative(f, x, h=1e-4)            // central difference
secondDerivative(f, x, h=1e-3)
riemann(f, a, b, n, method)          // left | right | mid | trap
integrate(f, a, b, panels=2000)      // composite Simpson
rk4Path({f, x0, y0, step, steps, direction})
parseNumericAnswer(text)             // decimal | fraction | pi multiple
seededShuffle(items, seed)
formatNumber(value, digits=2)        // normalized -0 → 0
```

`mastery.js`:

- `STORAGE_KEY = "calc3d.mastery.v1"`.
- `createMasteryStore(storage, questions)` with injected storage.
- Methods: `load, save, record, getRecord, questionStats, unitStats, totals, resetUnit, resetAll, exportState, importState, adaptiveQueue, unmasteredForUnit, isMastered`.
- Sanitise every loaded field. A corrupt value must produce a fresh state, never a throw.
- Mastery is monotonic: correct once = mastered; review misses increment `lapses`.

`quiz.js`:

- `checkAnswer(question, submitted)`.
- `createQuizSession({questions, mastery, unitId, includeMastered, rng})`.
- Correct → remove current; wrong → move current to back; skip → move to back, no record.
- `completed` when the queue is empty.

## 5. Stage

`visuals/stage.js` must own exactly one renderer, scene, camera, and controls.

Key constants:

```js
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
scene.fog = new THREE.FogExp2(0x050b14, 0.0135);
camera fov 42, near .1, far 240
controls damping .06, maxPolarAngle PI*.92
```

Add a 720-point starfield, hemisphere light, key directional with shadows, teal fill point, rose rim point.

`setVisual()`:

1. call old `dispose()`;
2. remove and dispose old group;
3. add the new group;
4. apply `camera.position/target/fov/minDistance/maxDistance/stars`;
5. update projection, controls, resize.

Pointer clicks: record pointerdown; on pointerup, require ≤ 6 px movement and ≤ 700 ms; raycast into the scene and call `visual.onPointer({raycaster, camera, scene, event})`.

Resize: `ResizeObserver` on the canvas parent; `renderer.setSize(w,h,false)`; `aspect=w/h`; widen fov below 760 px.

`window.devicePixelRatio` cap 2; test it.

## 6. Eight scenes

Each factory returns the contract in [ARCHITECTURE.md](ARCHITECTURE.md). Exact geometry and math are in [VISUALS.md](VISUALS.md). Minimum acceptance per scene:

| Unit | Must show | Must respond to |
| --- | --- | --- |
| 1 | two tracers, limit marker, discontinuity | model select, left/right, sweep |
| 2 | tangent cylinder, secant, triangle | preset, x₀, Δx, shrink |
| 3 | three rings, vectors, chain product | x, gain, power |
| 4 | cone + ladder | model, h, inflow, base, speed, fill |
| 5 | terrain, beacons, tangent plane | preset, probe, MVT, critical |
| 6 | prisms, curve, exact area | preset, method, n, refine |
| 7 | field, particle trails | preset, drop x/y, drop, clear |
| 8 | lathe, washer, cross-sections | mode, profile, angle, washer, shape, slices |

Rules:

- Curves use `TubeGeometry`; helpers may use `Line`.
- Dispose old geometry when rebuilding.
- Auto-animation writes back to the control descriptor's `value`.
- Keep `update()` allocation-light. Unit 8 rebuilds on angle because the mesh genuinely changes.
- Never add a second renderer, camera, controls, or resize listener.

## 7. Interface

`index.html` shell IDs are part of the contract. The important ones:

```
boot, unit-list, unit-code, unit-weight, unit-title, unit-tagline,
scene, stage-hint, readouts, controls, dock-mode, webgl-error,
theorem-name, theorem-statement, live-status, live-title, live-lead,
live-formula, live-note, formula-list, concept-list, example-list,
tab-explore, tab-practice, tab-narration, tab-examples,
btn-reset-view, btn-focus, btn-settings, btn-shortcuts,
practice-view, mastery-list, practice-percent, practice-count, practice-ring,
quiz-panel, quiz-empty, quiz-active, quiz-complete, quiz-unit, quiz-topic,
quiz-difficulty, quiz-remaining, quiz-progress, quiz-progress-bar,
quiz-formula, quiz-question, quiz-choices, frq-form, frq-input, frq-unit,
quiz-feedback, btn-check, btn-next, btn-hint, btn-skip, btn-review,
btn-next-unit, btn-start-current, stat-streak, stat-correct, stat-answered,
stat-accuracy, session-unit-title, session-unit-bar, session-unit-note,
btn-export, btn-reset-progress, settings-dialog, shortcuts-dialog, selftest
```

CSS must include `[hidden] { display: none !important; }`. Without it, the explicit `display:flex/grid` on the two views defeats the hidden attribute and both views render at once. This was the single highest-cost UI bug in the reference build.

## 8. Controller

`main.js` order:

1. imports, constants, `$`/`$$`, storage helpers;
2. prefs + mastery store + `state`;
3. sound/toast/persistence;
4. hash parse/update;
5. rail render/sync;
6. unit meta/formulas/concepts/examples;
7. controls render/apply/sync;
8. readouts/narration;
9. unit switch;
10. practice engine and DOM;
11. settings/focus/audio;
12. self-test;
13. boot;
14. `window.__calc3d`.

Key invariants:

- `switchUnit()` creates a new visual, renders controls, updates readouts/narration, sets `--unit-hue`, saves prefs.
- `switchView()` toggles `hidden` on the two shells, renders the mastery map on entry, calls `stage.resize()` on exit.
- `startPractice(unitId, {review})` creates the session, shows the question, renders the map/stats, and ensures the practice view is visible.
- `checkCurrent()` records, marks choices, shows feedback, updates mastery chrome, and updates the remaining count.
- Auto-animated scenes and `syncControlUI()` keep sliders honest.
- `document.body.dataset.ready = "true"` is the boot barrier for tests.
- `window.__calc3d` exposes the test API described in ARCHITECTURE.md.

## 9. Verification harness

Copy `tests/lib/harness.mjs` from the reference. It is dependency-free: a static server on port 0 and Chrome DevTools Protocol over Node's built-in WebSocket.

Launch Chrome with:

```
--headless=new --no-sandbox --disable-dev-shm-usage
--enable-unsafe-swiftshader --use-mock-keychain --password-store=basic
--no-first-run --no-default-browser-check --disable-background-networking
--disable-component-update --disable-sync --mute-audio
--user-data-dir=<temp> --remote-debugging-port=<free> --window-size=1440,1000
```

`--use-mock-keychain` and a throwaway profile prevent repeated macOS Keychain prompts.

Tests to write:

- **Curriculum**: counts, IDs, MC indices, FRQ tolerances, math helpers, parser, mastery, quiz rotation, export/import.
- **Static**: files, pinned import map, no duplicate IDs, every `$("<id>")` target exists, docs present, CSS tokens, responsive rules, no analytics, no external font imports.
- **Browser**: boot, canvas/WebGL calls, 8 unit switches, control interaction, practice correct answer, persistence after reload, adaptive exclusion, export, 390 px overflow, self-test score, zero console errors.

## 10. Documentation and release

Write README, AGENTS, community files, and `docs/` before deploying. Add `state.json` with measured session time and token counters at the end. Create the GitHub repository, push `main`, enable Pages at `main` / root, wait for the build, and run the browser suite against the live URL.

## 11. Pitfalls that actually bit

| Symptom | Cause | Fix |
| --- | --- | --- |
| Both Explore and Practice visible | author `display` beats `[hidden]` | `[hidden]{display:none!important}` |
| Mobile page is 1250 px wide on a 390 px screen | grid item's min-content width from the horizontal rail | `min-width:0` on rail/workspace/shell; hide rail scrollbar |
| Live note shows `<sub>` text | note rendered with `textContent` | use `innerHTML` for authored formula/note HTML |
| Tangent looks like two lines | curve and tangent share a colour | give the curve a different hue |
| Ladder hidden inside wall | ladder at z=0, wall box spans z ±1.6 | put ladder at z≈1.82, wall front face at 1.61 |
| Partial lathe caps missing | `LatheGeometry` does not cap a partial sweep | custom revolution + `ShapeUtils.triangulateShape` caps |
| Lathe cap throws on √x | duplicate profile point at (0,0) | dedupe consecutive/closed points |
| Trail invisible | 1 px `LineBasicMaterial` | add a glow tube + `Points` crumbs |
| Slider stale after auto-animation | state changed but descriptor did not | write `controls.find(...).value = state` |
| Practice count stale after answer | remaining updated only on render | update `quiz-remaining` and progress in `checkCurrent` |
| Browser test hangs on navigation | evaluating in the old context | wait `Page.loadEventFired` + `dataset.ready` |
| Keychain prompts | every Chrome launch touches login keychain | `--use-mock-keychain` + throwaway profile, one instance |

## 12. Time budget

A competent agent should expect roughly 1–2 hours for a release of this scope: ~35% content, ~35% scenes, ~15% controller/UI, ~15% tests/docs/deploy. The reference build's measured wall-clock time and token usage are in [state.json](../state.json).
