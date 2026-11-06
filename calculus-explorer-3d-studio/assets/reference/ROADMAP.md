# Roadmap

## Shipped in 1.0.0

- Eight unit visualizers, 40 worked examples, 96 questions.
- Adaptive mastery with local persistence, review, export/import, reset.
- Live narration, formula shelf, keyboard shortcuts, focus mode, mobile layout.
- Three test layers, in-page self-test, screenshots, Pages release.

## Next

### 1.1 — Teaching tools

- Per-unit reset button (the store already supports `resetUnit`).
- A “reset this question” action for a single lapse.
- Print stylesheet for the narration + worked examples.
- A shareable deep link that includes the current control values (`?u=3&x=0.7`).
- A small “copy formula” button in the formula shelf.

### 1.2 — More practice

- Additional FRQ variants with different functions but the same skill.
- A timed “exam mode” that samples across units without adaptive filtering.
- A misconception tag on each wrong choice, shown after submission.
- Spaced review: surface lapsed questions after a configurable interval.

### 1.3 — Accessibility and performance

- Keyboard camera controls (arrow/WASD with modifier) or a camera preset menu.
- MathML alternatives for formulas.
- Forced-colors/high-contrast audit.
- Optional DPR cap of 1.5 on low-end devices.
- Frame-time telemetry in the self-test (not analytics).

### 2.0 — Platform

- Optional offline bundle with a vendored Three.js build and a service worker.
- Teacher dashboard via a local file import/export (no backend).
- Additional courses (Calculus BC, Precalculus) behind the same scene contract.

## Non-goals

- Accounts, cloud sync, a backend, or a paid tier.
- Autoplay video lessons.
- A symbolic CAS grader.
- Redistributing Khan Academy or College Board content.
- A React/Vue rewrite. The vanilla module architecture is intentional.

Roadmap items are not commitments. Open an issue to discuss one.
