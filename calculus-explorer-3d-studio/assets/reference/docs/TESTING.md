# Testing

Three layers, plus a visual smoke script. None require npm installs.

## 1. Curriculum and core

```sh
node --test tests/curriculum.test.mjs
```

16 tests:

- 8 units, 96 questions, 12 per unit, 5 examples per unit;
- unique IDs, valid MC indices, distinct choices, finite FRQ answers;
- complete topics/explanations/hints/difficulties;
- numerical derivative, second derivative, Simpson, four Riemann methods, formatting;
- numeric parser (decimals, fractions, π multiples, invalid input);
- RK4 exponential accuracy and deterministic shuffle;
- mastery record/persist/totals, corrupt storage fallback, adaptive exclusion, export/import;
- quiz correct/incorrect/skip rotation, all-mastered completion, MC/FRQ checking.

## 2. Repository and static

```sh
node --test tests/static.test.mjs
```

Checks the release shape:

- required source, docs, community files, metadata;
- pinned import map (`three@0.169.0`), no `latest`, no unpkg;
- no duplicate DOM IDs; every `$("<id>")` in `main.js` exists in `index.html`;
- no external CSS imports/fonts, no analytics, no tracking;
- design tokens and responsive rules present;
- `[hidden]` guard present;
- package/state metadata valid;
- screenshots referenced by the README exist;
- docs contain no placeholder text.

## 3. Real browser

```sh
node tests/browser.test.mjs
TEST_URL=https://somphol.github.io/calculus-explorer-3d/ node tests/browser.test.mjs
```

Launch details are in `tests/lib/harness.mjs`: one headless Chrome, `--use-mock-keychain`, `--password-store=basic`, throwaway profile, local server on an ephemeral port. Set `CHROME` if the binary is not at the macOS default.

The suite has **47 checks**. It covers:

- `dataset.ready`, API presence, console errors, WebGL draw calls/triangles;
- all eight units switch, each with ≥ 4 readouts and ≥ 2 controls;
- a range change moves a readout; a select change rebuilds; a button action works;
- Unit 8 revolve → cross mode and washer toggle;
- practice: start, answer correctly through the real DOM, mastery increments, feedback appears, next question advances;
- a free-response question located by skipping, answered numerically, and mastered;
- reload persistence and adaptive exclusion;
- export payload shape;
- 390×844 mobile: `scrollWidth === innerWidth`, stage and controls fit;
- in-page self-test returns 27/27;
- deep link `#practice/2` opens the right view;
- zero console errors and zero uncaught exceptions.

## 4. In-page self-test

Open <http://localhost:8000/?selftest>. The overlay reports every check with PASS/FAIL and sets:

- `document.body.dataset.selftest = "pass" | "fail"`
- `document.body.dataset.selftestScore = "27/27"`
- `window.__calc3d.state.selftest`

Run it programmatically:

```js
await window.__calc3d.runSelfTest()
```

The suite uses an in-memory mastery store, so it never changes the user's progress. It builds all eight scenes, verifies readouts/narration/controls, measures WebGL triangles, checks duplicate IDs, and restores the original unit/view.

## 5. Screenshots

```sh
node scripts/screenshot.mjs
```

Writes:

- `assets/studio.png` — Unit 1 explore at 1600×1000
- `assets/unit-grid.png` — a 2×2 contact sheet of four units
- `assets/mastery.png` — mastery view after one correct answer
- `assets/mobile.png` — 390 px explore
- `assets/og.png` — 1200×630 social card

The script uses the same mock-keychain Chrome profile. It does not touch the login keychain.

## Acceptance gates

| Gate | Command | Expected |
| --- | --- | --- |
| Core | `node --test tests/curriculum.test.mjs` | 16/16 |
| Static | `node --test tests/static.test.mjs` | 17/17 |
| In-page | `?selftest` | 27/27 |
| Browser | `node tests/browser.test.mjs` | 47/47, 0 console errors |
| Live | `TEST_URL=… node tests/browser.test.mjs` | 47/47 |
| Visual | `node scripts/screenshot.mjs` | 5 assets |
| Docs | README + AGENTS + 13 docs | links resolve |

If a number is lower, fix the cause. Do not edit the claim.
