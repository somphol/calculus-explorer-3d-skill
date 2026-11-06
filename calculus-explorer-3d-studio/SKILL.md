---
name: Calculus Explorer 3D Studio
description: Build and release a static, eight-unit AP Calculus AB Three.js studio with procedural visualizations, 40 worked examples, a 96-question adaptive mastery engine, three verification layers and GitHub Pages. Use for calculus/STEM visualizers, not for a single chart or a backend LMS.
version: 1.0.0
---

# Calculus Explorer 3D Studio

This skill turns “build an interactive AP Calculus visualizer” into a shipped, verified product: eight
Khan Academy-aligned units, eight distinct procedural Three.js scenes, live narration, 40 worked
examples, 96 auto-gradable questions, adaptive mastery in `localStorage`, a 27-check in-page suite,
a 47-check headless browser suite, release documentation and a live GitHub Pages URL.

It is written from a completed build: **Calculus Explorer 3D — AP Calculus AB Interactive Visualizer
& Mastery Engine**, MIT, live at
<https://somphol.github.io/calculus-explorer-3d/>. The full reference source is in
`assets/reference/`.

## When to use

Use this skill when the user wants:

- an AP Calculus AB / Calculus 1 visualizer with multiple units, not one chart;
- eight or more distinct 3D mathematical scenes sharing one renderer;
- a static educational app with worked examples and an auto-gradable question bank;
- adaptive practice that permanently removes mastered questions, with local-only persistence;
- a release-grade static repository: tests, docs, screenshots, accessibility, Pages.

Do **not** use it for:

- a symbolic grapher or a single-function plotter (too much scaffolding);
- a backend LMS, accounts, cloud sync, or a teacher dashboard with a server;
- a symbolic CAS grader — this engine checks numeric free-response answers with tolerances;
- redistributing Khan Academy videos/text or College Board questions; this is original content.

## What “done” means

Do not stop at “the page loads”. A release has all of these:

| Gate | Command | Expected |
| --- | --- | --- |
| Core | `node --test tests/curriculum.test.mjs` | 16/16 |
| Repository | `node --test tests/static.test.mjs` | 17/17 |
| In-page | `?selftest` or `__calc3d.runSelfTest()` | 27/27 |
| Local browser | `node tests/browser.test.mjs` | 47/47, zero console errors |
| Live browser | `TEST_URL=https://… node tests/browser.test.mjs` | 47/47 |
| Visuals | `node scripts/screenshot.mjs` | 5 assets |
| Docs | README, AGENTS, community files, 13 docs | links resolve |
| Metadata | `state.json` with measured elapsed/tokens | shape valid |
| Deployment | Pages 200 for `/`, `/style.css`, `/src/main.js` | live |
| Handoff | `AGENTS.md` in the same push | current |

If a count is lower, fix the cause; never edit the claim.

## Non-negotiables

1. **No backend, no build step, no runtime npm dependency.** ES modules served directly. Three.js
   pinned by import map at `0.169.0`. This keeps the artifact auditable and Pages-simple.
2. **One renderer/camera/controls.** `CalculusStage` owns them. Eight scene factories return groups.
   Never create a second renderer or animation loop.
3. **A single visual contract.** `group, camera, controls, set, readout, narration, update` plus
   optional `action, getState, getHint, onPointer, dispose`. The controller must not know unit
   geometry.
4. **Pure curriculum data.** `src/data/curriculum.js` imports nothing and touches no DOM. Node tests
   import it directly.
5. **Pure mastery/quiz core.** Inject storage; no `window` at import time. A corrupt store falls back
   to a fresh state, never a throw.
6. **Adaptive means adaptive.** The queue is the unmastered set. Correct answers remove; wrong answers
   rotate to the back. Mastery is monotonic; review misses increment `lapses`, not revoke.
7. **Numeric FRQ only.** Accept decimals, fractions, and simple π multiples; per-question tolerance.
   Do not pretend to grade prose.
8. **Question IDs are permanent.** `u<unit>-q<two digits>` is the `localStorage` key. Never renumber
   after release.
9. **`[hidden] { display: none !important; }`.** The two top-level views have explicit `display`
   values; without this guard, Explore and Mastery render at the same time.
10. **Keychain-safe Chrome.** `--use-mock-keychain`, `--password-store=basic`, one throwaway profile,
    one instance. Read a GitHub token once if needed; never put it in a URL or committed file.
11. **Measure, don’t invent, `state.json`.** Read elapsed and tokens from the OpenCode session DB at
    the end. Credit OpenCode and the model.
12. **Pin the acceptance counts.** A release with “all tests pass” and no numbers is not verifiable.

## Workflow

### Phase 0 — scope and skeleton (10 min)

```sh
mkdir -p project/{src/{core,data,visuals},tests/lib,scripts,docs,.github/workflows,assets}
cd project && git init -b main
```

Decide the eight units from the Khan Academy AP Calculus AB framework. Write the README headline,
`AGENTS.md` skeleton, and the visual contract now. Create `assets/favicon.svg`.

### Phase 1 — content before pixels (highest leverage)

Write `src/data/curriculum.js` with:

- 8 units, each `id, code, title, shortTitle, tagline, weight, hue, summary, bigIdea, concepts,
  formulas, theorem, visual`;
- 5 worked examples per unit (3+ numbered steps, formula, takeaway, visual cue);
- 12 questions per unit: 10 MC + 2 numeric FRQ = 96 (80 MC + 16 FRQ);
- zero-based MC answer indices, unique choices, finite FRQ answers with tolerances;
- permanent IDs `u1-q01` … `u8-q12`.

Then `src/core/{math,mastery,quiz}.js`. Test them before rendering:

```sh
node --test tests/curriculum.test.mjs
```

The reference content inventory and schemas are in [references/content.md](references/content.md).

### Phase 2 — stage and one scene

Build `src/visuals/stage.js` with one renderer, ACES tone mapping, PCF soft shadows, DPR cap 2,
starfield, lights, OrbitControls, ResizeObserver, pointer click threshold, and disposal.

Then Unit 1 — the simplest scene — and prove it in a browser before writing the other seven. Exact
stage constants and scene recipes are in [references/visuals.md](references/visuals.md).

### Phase 3 — controller and UI

`src/main.js` owns the rail, metadata, control dock, readouts, narration, examples, practice,
routing, settings, sound, toasts, self-test and test API. Build it in the order in
[references/method.md](references/method.md).

The control descriptor contract is the key:

```js
{ type: "range" | "select" | "button", key, label, value,
  min, max, step, options, suffix, visibleWhen, reflect }
```

Auto-animation must write back to the descriptor so the slider tracks the model.

### Phase 4 — remaining seven scenes

Each scene must have a reason to exist in 3D. Follow the recipes:

1. Limits — two tracers, hole/jump/asymptote/squeeze; ring and curtains.
2. Derivatives — tangent cylinder, secant, shrinking triangle.
3. Chain rule — three nested rings with rate arrows and a live product.
4. Related rates — filling cone and sliding ladder, rate vectors.
5. Analysis — curvature-coloured terrain, beacons, tangent plane, MVT chord.
6. Integration — instanced Riemann prisms, four methods, n = 2–200, exact/error.
7. Differential equations — slope field, click-to-drop RK4 trails.
8. Applications — partial lathe disk/washer plus known cross-sections.

### Phase 5 — verification

Write the harness first (copy `tests/lib/harness.mjs` from the reference), then:

```sh
node --test tests/curriculum.test.mjs
node --test tests/static.test.mjs
node tests/browser.test.mjs
```

Add `?selftest` with 25–30 checks, using an in-memory store so it never mutates user progress. Set
`document.body.dataset.ready = "true"` only after boot. Expose `window.__calc3d` for the browser
suite. Full checklist: [references/verification.md](references/verification.md).

### Phase 6 — documentation and release

Required: README, AGENTS, CHANGELOG, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, SUPPORT, LICENSE,
CITATION, THIRD_PARTY_NOTICES, ROADMAP, `.nojekyll`, `robots.txt`, `sitemap.xml`, `404.html`, and
`docs/` (ARCHITECTURE, CURRICULUM, VISUALS, MASTERY, REPRODUCTION, TESTING, DEPLOYMENT, DECISIONS,
ACCESSIBILITY, PERFORMANCE, PRIVACY, FAQ, STATE).

Capture screenshots with mock-keychain Chrome. Push, enable Pages at `main` / root, wait for
`"status": "built"`, and run the browser suite against the live URL.

### Phase 7 — state, credit, skill

Read `time_created`, token counters, model and provider from `session_v2` in
`~/.local/share/opencode/opencode.db`. Write `state.json`; do not invent numbers. Credit OpenCode and
the model. If asked, package this skill with the full reference source and a scaffold that copies it.

## Module map

```
index.html                  shell, import map, dialogs, self-test overlay
style.css                   dark design system, responsive layout
src/main.js                 controller / routing / practice / self-test / API
src/data/curriculum.js      pure 8-unit content
src/core/math.js            derivative, Riemann, Simpson, RK4, parser
src/core/mastery.js         schema, adaptive queue, export/import
src/core/quiz.js            quiz state machine
src/visuals/stage.js        single renderer + camera + controls
src/visuals/common.js       tubes, labels, dots, arrows, disposal
src/visuals/unit1..8.js     eight factories behind one contract
tests/                      16 core + 17 static + 47 browser
scripts/screenshot.mjs      five release assets
docs/                       release documentation
assets/reference/           the complete shipped project
```

## Recipes

### Scaffold a new project from this skill

```sh
node scripts/new-project.mjs --out ~/Projects/my-calculus-studio
cd ~/Projects/my-calculus-studio
node --test tests/curriculum.test.mjs tests/static.test.mjs
# optional real browser:
node tests/browser.test.mjs
```

Then replace the canonical/OG/GitHub URLs, the title, and the unit content. Keep the contract and the
test harness.

### Add a question

1. Append to the unit's `questions` with a new `uN-qNN` ID.
2. MC: exactly four distinct choices + zero-based answer.
3. FRQ: finite answer, positive tolerance, unit hint.
4. Update counts everywhere (README, CURRICULUM, tests, state.json) — the contract is 12/unit.
5. `node --test tests/curriculum.test.mjs`.

### Add a unit

Clone a scene factory, add a hue and data object, register it in `FACTORIES`, extend the rail count
and the self-test count. Do not special-case the controller. Keep six readouts.

### Change the palette

Edit the `:root` tokens in `style.css` and the unit `hue` fields. The body sets `--unit-hue`; the
stage/accents read it. Re-run the screenshot script and check contrast.

## Pitfalls and fixes

| Symptom | Cause | Fix |
| --- | --- | --- |
| Explore and Mastery both visible | author `display` beats `[hidden]` | global `[hidden]{display:none!important}` |
| 390 px page is 1250 px wide | grid item min-content from the horizontal rail | `min-width:0` on rail/workspace/shell |
| Live note prints `<sub>` | note rendered with `textContent` | `innerHTML` for authored note/formula HTML |
| Tangent looks like two lines | curve and tangent share a hue | give the curve a contrasting hue |
| Ladder disappears into the wall | ladder at z=0, wall spans ±1.6 | ladder at z≈1.82, wall face 1.61 |
| Partial lathe has no caps | `LatheGeometry` does not cap a partial sweep | custom revolution + triangulated end caps |
| Lathe cap throws on √x | duplicate profile point at (0,0) | dedupe consecutive/closed points |
| Trail is invisible | 1 px line | glow tube + additive `Points` crumbs |
| Slider stale after animation | state changed, descriptor didn’t | write `controls.find(...).value = state` |
| Practice count stale | remaining updated only on render | update count/progress in `checkCurrent` |
| Browser test hangs on hash link | same-document navigation fires no load event | use `location.hash` + `waitFor`, not `Page.navigate` |
| Self-test “fails” only in the test runner | summary uses `pass`, runner filtered `ok` | use `result.pass` |
| Keychain prompts | Chrome launches touch the login keychain | mock keychain + basic password store + one profile |

## Failure boundaries

- The app is not truly offline: Three.js comes from a pinned CDN. If the user needs offline, vendor
  `three.module.js` and the addons; update the import map and the privacy/testing docs.
- Numeric FRQs cannot grade justification. Keep the reasoning in worked examples.
- A 3D scene is not screen-reader accessible by itself. The narration and readouts are the textual
  equivalent; document that.
- Mastery is browser-local. Export/import is the only transfer.
- This skill does not publish the app for you. It gives the exact Pages/API recipe and the live gate.

## Reference

`assets/reference/` is the shipped v1.0.0 source, tests, docs, screenshots and state. The scaffold
copies it. `references/build-log.md` records what actually happened, including elapsed time and token
usage, so the next agent has a realistic budget.
