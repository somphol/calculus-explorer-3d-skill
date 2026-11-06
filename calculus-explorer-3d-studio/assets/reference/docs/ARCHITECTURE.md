# Architecture

## Deployment shape

One static site. `index.html` is the entry point, `style.css` is the only stylesheet, and `src/main.js` is the only module script. Everything else is imported from there. There is no bundler and no generated runtime artifact: the files in the repository are the files served by GitHub Pages.

```
index.html
style.css
src/
  main.js
  data/curriculum.js
  core/math.js
  core/mastery.js
  core/quiz.js
  visuals/common.js
  visuals/stage.js
  visuals/unit1.js ... unit8.js
tests/
  curriculum.test.mjs
  static.test.mjs
  browser.test.mjs
  lib/harness.mjs
scripts/
  screenshot.mjs
```

## Layering

### 1. Pure curriculum data

`src/data/curriculum.js` exports `UNITS`, `ALL_QUESTIONS`, `TOTAL_QUESTIONS`, `getUnit`, and `getQuestion`. It has no DOM or Three.js imports, so Node can import it directly. Each unit is:

```js
{
  id, slug, code, title, shortTitle, tagline, weight, hue, summary, bigIdea,
  concepts: string[],
  formulas: [{ label, html }],
  theorem: { name, statement },
  visual: { mode, hint },
  examples: [{ title, prompt, formula, steps, takeaway, visualCue }],
  questions: [mc(...) | frq(...)]
}
```

`ALL_QUESTIONS` flattens the units and attaches `unitId`, `unitTitle`, and `unitHue`. The mastery store is always constructed with this flat list.

### 2. Pure core

- `core/math.js` — clamp/lerp, formatting, numerical first and second derivatives, four Riemann methods, composite Simpson integration, RK4 path integration, a conservative numeric answer parser, and deterministic shuffle.
- `core/mastery.js` — the `localStorage` schema, validation/sanitisation, per-question records, unit and global totals, adaptive queue, reset, export/import. Storage is injected; tests pass an in-memory implementation.
- `core/quiz.js` — a session state machine around the mastery store. `submit(value)` checks the answer, records it, removes a correct question from the queue, and rotates a missed question to the back. `skip()` rotates without recording.

These modules must never import Three.js or touch `document`.

### 3. Browser shell

`src/main.js` owns:

- preferences (`calc3d.prefs.v1`) and the mastery store;
- unit rail, theorem/formula/concept panels, worked-example accordions;
- control dock rendering and descriptor syncing;
- readout/narration refresh loop (240 ms);
- routing, focus mode, settings, keyboard shortcuts, toasts, audio;
- the practice view and every DOM transition around it;
- the in-page self-test and `window.__calc3d` test API.

It never contains per-unit geometry.

### 4. Visual layer

`visuals/stage.js` creates exactly one `WebGLRenderer`, `Scene`, `PerspectiveCamera`, and `OrbitControls`. It owns:

- high-DPI sizing (`Math.min(devicePixelRatio, 2)`);
- ACES tone mapping, PCF soft shadows, fog, stars, hemisphere/key/fill/rim lights;
- `setVisual()` — dispose and remove the previous group, add the next, apply the scene's `camera` block;
- pointer click detection with a 6 px drag threshold, raycasting into the active scene;
- `renderer.setAnimationLoop` driving `visual.update(dt, elapsed)`, controls damping, and render;
- `resize()`, `resetCamera()`, `info()`, and `dispose()`.

Each `visuals/unitN.js` is a factory returning the contract:

| Member | Required | Meaning |
| --- | --- | --- |
| `group` | yes | `THREE.Group` added to the scene |
| `camera` | yes | `{position:[x,y,z], target:[x,y,z], fov?, minDistance?, maxDistance?, stars?}` |
| `controls` | yes | descriptor array for the dock |
| `set(key, value)` | yes | apply a control value |
| `action(key)` | for buttons | one-shot actions (sweep, refine, drop, toggle) |
| `readout()` | yes | six `{label, value, tone}` chips |
| `narration()` | yes | `{title, lead, formula, note, status}`; formula and note may contain authored HTML |
| `update(dt, elapsed)` | yes | animation; must not allocate a new renderer |
| `getState()` | optional | for button reflection and tests |
| `getHint()` | optional | replaces the stage hint after a parameter change |
| `onPointer({raycaster,...})` | optional | Unit 7 uses it to drop a particle |
| `dispose()` | optional | extra cleanup; the stage disposes the group |

## Construction order

```
imports
  → curriculum + core
  → stage (renderer, lights)
  → controller bindings
  → boot():
      initStage → initPreferences → bindEvents → renderRail
      → switchUnit(initial)        // builds the scene, controls, narration
      → switchView(initial)        // explore or practice
      → renderMasteryMap → renderSessionPanel → updateMasteryChrome
      → body.dataset.ready = "true"
      → hide boot veil
      → start 240 ms readout loop
```

`switchUnit()` creates a *fresh* visual each time. This is intentional: it avoids stale state leaking between units and makes disposal simple. The cost is a short rebuild when changing tabs (tens of milliseconds).

## Data flow: a slider move

```
input event
  → descriptor.value = Number(value)
  → visual.set(key, value)
  → visual mutates Three.js objects
  → updateReadouts()      // visual.readout()
  → updateNarration()     // visual.narration()
  → syncConditionalControls()
  → syncButtonStates()
  → getHint() if present
```

The 240 ms loop repeats readout/narration and syncs auto-animated sliders (Unit 1 sweep, Unit 2 shrink, Unit 4 fill, Unit 6 refine). Auto-animations must update the control descriptor object, not a copy.

## Data flow: a quiz answer

```
choice click / FRQ submit
  → session.submit(value)
      → checkAnswer(question, value)
      → mastery.record(question.id, correct)
          → localStorage setItem (calc3d.mastery.v1)
      → correct: shift queue; wrong: rotate queue
  → DOM: mark choices, feedback, next button
  → updateMasteryChrome() / renderMasteryMap() / renderSessionPanel()
  → updateHash()
```

## Routing

| Hash | View |
| --- | --- |
| `#unit-1` … `#unit-8` | Explore, selected unit |
| `#practice` | Mastery, no session |
| `#practice/3` | Mastery, Unit 3 session |

`history.replaceState` is used by `updateHash()`. A `hashchange` listener handles external navigation, back/forward, and test deep links.

## Persistence and failure modes

- Corrupt mastery JSON is sanitised into a fresh state; the app never crashes on bad storage.
- `writeJSON` returns `false` if storage is unavailable (private mode/quota); the in-memory session still works.
- WebGL construction is wrapped. If it fails, the 3D stage shows a fallback message; the lessons and practice UI remain usable.
- Import validates `app === "calculus-explorer-3d"` and a `state` object; anything else is rejected with a reason.

## Testing seams

- `window.__calc3d` exposes `switchUnit`, `switchView`, `setParam`, `getControls`, `getReadouts`, `getNarration`, `stageInfo`, `mastery`, `practice`, `exportMastery`, and `runSelfTest`.
- `document.body.dataset.ready === "true"` after boot.
- `document.body.dataset.selftest === "pass"` and `dataset.selftestScore` after the in-page suite.
- `window.__calc3d.state` returns unit, view, quiz unit, ready flag, focus, session stats, and the last self-test summary.
