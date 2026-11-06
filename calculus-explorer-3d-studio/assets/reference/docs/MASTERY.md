# Mastery engine

## What mastery means

A question is **mastered** when the student has answered it correctly at least once. Mastery is per question, not per topic. The quiz queue is built from questions that are *not* mastered, so repeated correct answers never waste time.

A later review miss does **not** silently revoke mastery. It increments `lapses` so the dashboard can show a shaky concept, but the question remains mastered. This is deliberate: one bad day should not erase weeks of work. If you want stricter semantics, change `createMasteryStore().record` and update the docs and tests together.

## Storage schema

Key: `calc3d.mastery.v1`

```json
{
  "version": 1,
  "questions": {
    "u1-q01": {
      "mastered": true,
      "attempts": 2,
      "correct": 1,
      "lapses": 1,
      "lastResult": "wrong",
      "lastAt": "2026-11-06T00:46:52.988Z"
    }
  },
  "stats": {
    "answered": 2,
    "correct": 1,
    "streak": 0,
    "bestStreak": 1,
    "lastActive": "2026-11-06T00:46:52.988Z"
  },
  "updatedAt": "2026-11-06T00:46:52.988Z"
}
```

The store sanitises unknown keys, coerces counters to numbers, and discards records that are not objects. A corrupt string starts a fresh state rather than throwing.

Preferences are separate, under `calc3d.prefs.v1`:

```json
{ "unit": 3, "view": "explore", "sound": true, "reducedMotion": false, "focus": false }
```

## Adaptive queue

```js
queue = shuffle(questions.filter(q =>
  q.unitId === unitId && (includeMastered || !isMastered(q.id))
))
```

- Correct answer → `mastery.record(id, true)` → question removed from the active queue.
- Wrong answer → `mastery.record(id, false)` → question moved to the back of the queue.
- Skip → question moved to the back with no record.
- Queue empty → the unit is 100% mastered (or a review pass is complete).
- “Review all questions” rebuilds with `includeMastered: true`; review answers still update attempts, streaks, and lapses.

The session exposes `current()`, `submit(value)`, `next()`, `skip()`, `stats()`, `queueLength`, and `completed`.

## Totals

`unitStats(id)` returns `{total, mastered, remaining, attempted, correct, lapses, percent}`. `totals()` aggregates all 96 questions and adds `answered`, `correct`, `accuracy`, `streak`, `bestStreak`. Unit mastery is rounded to the nearest integer for display, but the underlying count is exact.

## Free response

FRQ questions are numeric with a tolerance (typically 0.001, 0.02, or 0.5 for a rounded value). `parseNumericAnswer` accepts:

| Input | Value |
| --- | --- |
| `20.11` | 20.11 |
| `32/5` | 6.4 |
| `2π`, `2pi` | 2π |
| `π/4` | π/4 |
| `-3pi/2` | −3π/2 |
| `abc`, `1/0`, empty | `null` |

The checker is tolerance-based, not symbolic. `32π/5` and `20.11` both pass the Unit 8 volume question because the tolerance is 0.02.

## Export and import

`exportState()` returns:

```json
{
  "app": "calculus-explorer-3d",
  "schema": 1,
  "exportedAt": "ISO-8601",
  "state": { "version": 1, "questions": {}, "stats": {}, "updatedAt": "..." }
}
```

`importState(payload)` accepts an object or JSON string, requires `app === "calculus-explorer-3d"` and a `state` object, sanitises it, writes it, and returns `{ok, totals}` or `{ok:false, reason}`. It replaces the whole mastery state; it does not merge.

## Resetting

- `resetUnit(id)` deletes every record in that unit. Stats (global streak/answered) are not rolled back.
- `resetAll()` creates a fresh state and saves it. The UI confirms before calling it.
- `mastery.resetAll()` in `window.__calc3d` calls the UI reset, which also clears the active session and redraws the view.

## Verifying the engine

```sh
node --test tests/curriculum.test.mjs
```

The suite covers record/persist, corrupt storage, unit totals, adaptive exclusion, export/import, quiz rotation, skip, all-mastered completion, MC/FRQ checking, and π/fraction parsing. The browser suite covers the real DOM, reload persistence, and adaptive filtering after a correct answer.
