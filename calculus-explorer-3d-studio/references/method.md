# Method — construction order and invariants

## Order

```
1. Pure content         src/data/curriculum.js
2. Pure core            src/core/{math,mastery,quiz}.js
3. Core tests           node --test tests/curriculum.test.mjs
4. Stage                src/visuals/stage.js + common.js
5. Unit 1 + browser smoke
6. Controller           src/main.js (meta, controls, readouts, narration)
7. Units 2–8
8. Practice UI          mastery map, quiz card, session stats
9. In-page self-test
10. Static + browser suites
11. Docs, screenshots, state.json
12. Push, Pages, live suite
```

Do not write eight scenes before one scene works in a real browser. A broken stage makes every scene
look broken.

## Invariants

### Data

- `UNITS` has ids 1–8, 12 questions, 5 examples, ≥5 concepts, ≥4 formulas, a theorem and a visual.
- `ALL_QUESTIONS` is the flattened bank with `unitId`, `unitTitle`, `unitHue`.
- IDs are permanent and globally unique. MC answer is a zero-based index.
- FRQ answers are finite and have a positive tolerance.
- No DOM or Three.js in the data file.

### Core

- `createMasteryStore(storage, questions)` works with any `getItem/setItem` object.
- Corrupt JSON → fresh state, never a throw.
- `record(id, true)` sets `mastered`, increments counters, saves.
- `record(id, false)` after mastery increments `lapses` but keeps `mastered`.
- `adaptiveQueue` filters mastered unless `includeMastered`.
- `exportState` has `{app:"calculus-explorer-3d", schema:1, state}`.
- `createQuizSession` removes on correct, rotates on wrong, rotates on skip.
- `checkAnswer` uses the numeric parser and per-question tolerance.

### Stage

- One `WebGLRenderer`, one `Scene`, one `PerspectiveCamera`, one `OrbitControls`.
- DPR `Math.min(devicePixelRatio, 2)`.
- `setVisual()` disposes the old group and applies `camera.position/target/fov`.
- Pointer click threshold: ≤6 px and ≤700 ms.
- `ResizeObserver` on the canvas parent; mobile fov widens.
- `renderer.setAnimationLoop` is the only loop.
- `info()` returns calls, triangles, pixelRatio, width, height.

### Visual factory

Required:

```js
{
  group, camera, controls, set, readout, narration, update
}
```

Optional: `action`, `getState`, `getHint`, `onPointer`, `dispose`.

- `readout()` returns exactly six `{label,value,tone}` entries.
- `narration()` returns `{title, lead, formula, note, status}`.
- `update(dt, elapsed)` allocates little; no renderer/camera creation.
- Auto-animation updates the control descriptor it wants the slider to reflect.
- Buttons expose `reflect` so the controller can mark them active.
- Conditional controls use `visibleWhen: {key, value}`.

### Controller

- `switchUnit(id)` creates a fresh factory, renders metadata/controls/readouts/narration, sets
  `--unit-hue`, saves prefs.
- `switchView(view)` toggles the two shells; `[hidden]` guard is mandatory.
- `startPractice(unitId, {review})` creates the session and ensures the practice shell is visible.
- `checkCurrent()` updates feedback, choices, next, remaining, progress, mastery chrome.
- `updateHash()` uses `replaceState`; `hashchange` handles external links.
- `document.body.dataset.ready = "true"` after boot.
- `window.__calc3d` exposes switchUnit/switchView/setParam/readouts/narration/stageInfo/mastery/
  practice/export/selfTest.

## Content pipeline

1. Write the unit's concept list and theorem first.
2. Write five examples that each isolate one skill.
3. Write 10 MC + 2 FRQ around those examples, with explanations and hints.
4. Check every numeric answer analytically and with the Node helpers.
5. Only then build the scene so the visual supports the actual teaching sequence.

## Practice state machine

```
start(unit):
  queue = shuffle(unmastered)
  if empty -> complete card
show(question):
  MC -> 4 choices; FRQ -> numeric input
submit(value):
  correct -> mastery.record(true), shift queue
  wrong   -> mastery.record(false), rotate queue
  update feedback, next, remaining, progress, map
next():
  queue empty -> complete card
  else -> show current
skip():
  rotate queue, no record
review():
  includeMastered = true
```

## Release order

```
content -> core tests -> stage -> unit 1 -> controller -> units 2–8
 -> practice -> self-test -> static/browser -> docs -> screenshots
 -> state.json -> push -> Pages -> live browser -> skill
```

## Common architectural mistakes

- Rendering the mastery list from the controller's unit array instead of calling `mastery.unitStats`.
- Letting `switchUnit()` reuse a disposed visual.
- Forgetting to call `stage.resize()` after unhiding the explore shell.
- Updating a scene's internal value without updating its descriptor (slider goes stale).
- Rendering the same group into two scenes (double disposal).
- Adding a new unit but forgetting `FACTORIES`, the rail, or the self-test count.
- Using `innerHTML` for user input. Only authored content may use it.
