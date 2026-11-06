# Verification — three layers plus a self-test

## 1. Core (16 tests)

```sh
node --test tests/curriculum.test.mjs
```

- 8 units, 96 questions, 12/unit, 5 examples/unit, ≥5 concepts, ≥4 formulas.
- Unique IDs, valid MC indices, distinct choices, finite FRQ answers/tolerances.
- Explanations/hints/topics/difficulties complete.
- Numerical derivative, second derivative, Simpson, left/right/mid/trap.
- Numeric parser: decimals, fractions, π multiples, invalids.
- RK4 exponential accuracy, deterministic shuffle.
- Mastery record/persist/totals, corrupt storage, adaptive exclusion, export/import.
- Quiz correct/wrong/skip rotation, all-mastered completion, MC/FRQ checking.

## 2. Repository/static (17 tests)

```sh
node --test tests/static.test.mjs
```

- Required source, visuals, docs, community files, metadata.
- Exact import map pin, no latest/unpkg.
- Unique DOM IDs; every `$("<id>")` target exists (lookbehind excludes `$$`).
- `[hidden]` guard; `.explore-shell` grid; `.practice-shell` present.
- Design tokens; four responsive breakpoints; no remote font imports.
- All eight factories imported; stage instantiated; ready barrier.
- Pure data: no `document.`/`window.`/Three import.
- README relative links resolve; all five screenshots exist.
- `state.json` schema and credits.
- No analytics/tracking/eval/new Function.
- Canonical = sitemap = robots.
- Harness uses mock keychain and ephemeral port.
- Every module non-empty; docs have no placeholders; CI does not deploy over Pages.

## 3. Real browser (47 checks)

```sh
node tests/browser.test.mjs
TEST_URL=https://… node tests/browser.test.mjs
```

Harness:

- static server on port 0;
- one Chrome `--headless=new --use-mock-keychain --password-store=basic --use-unsafe-swiftshader`
  with a throwaway `--user-data-dir`;
- CDP over Node's built-in WebSocket, no Playwright/Puppeteer.

Checks:

- ready/title/API, canvas size, WebGL calls/triangles, six readouts/controls;
- all 8 units, each with readouts, controls, narration, triangles;
- Unit 1 asymptote + sweep, Unit 2 tangent + shrink, Unit 4 ladder/hidden controls, Unit 5 MVT,
  Unit 6 n=40 + refine, Unit 7 particle, Unit 8 cross-section + washer half-volume;
- practice correct answer, feedback, next, mastery, localStorage, remaining count;
- reload persistence, adaptive exclusion, different next question;
- wrong answer feedback, queue retention, no mastery;
- FRQ located by skipping, numeric answer accepted, mastered;
- export marker/schema;
- 390 px no horizontal overflow, stage/controls fit;
- deep link `#practice/4` opens the right session;
- in-page self-test 27/27;
- zero console errors/exceptions.

### Same-document navigation gotcha

`Page.navigate` to a URL that only changes the hash does **not** fire `Page.loadEventFired`. A helper
that waits for load will hang. Use:

```js
await evaluate('location.hash = "#practice/4"');
await waitFor("window.__calc3d.state.view === 'practice'");
```

## 4. In-page self-test (27 checks)

`?selftest` or:

```js
await window.__calc3d.runSelfTest()
```

It builds all eight scenes, checks data shape, math, parser, mastery with an in-memory store,
localStorage, duplicate IDs, WebGL triangles, DPR cap, routing and version. It restores the original
unit/view and never touches user progress. Sets:

```
document.body.dataset.selftest = "pass" | "fail"
document.body.dataset.selftestScore = "27/27"
window.__calc3d.state.selftest
```

The summary uses `{name, pass}`. A runner that filters `result.ok` will falsely report every check as
failed.

## 5. Screenshots

```sh
node scripts/screenshot.mjs
```

Writes `assets/studio.png` (Unit 8 hero), `unit-grid.png` (2×2 contact sheet), `mastery.png` (after
one correct answer), `mobile.png` (390 px explore), `og.png` (1200×630 social card). Same one-instance
mock-keychain browser. Temporary HTML pages for the contact sheet and OG card are written to the repo
root and removed.

## Acceptance

| Gate | Expected |
| --- | --- |
| Core | 16/16 |
| Static | 17/17 |
| Browser local | 47/47 |
| Browser live | 47/47 |
| Self-test | 27/27 |
| Console errors | 0 |
| Screenshots | 5 files, >8 KB each |
| Mobile | `scrollWidth === 390` |

If a gate is lower, fix the code. Do not lower the gate.
