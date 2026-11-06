# Content — units, examples, questions, accuracy

## Inventory that shipped

| Unit | Concepts | Examples | MC | FRQ |
| --- | --- | --- | --- | --- |
| 1 Limits & Continuity | 6 | 5 | 10 | 2 |
| 2 Derivatives: Definition & Rules | 6 | 5 | 10 | 2 |
| 3 Composite, Implicit & Inverse | 5 | 5 | 10 | 2 |
| 4 Contextual Applications | 5 | 5 | 10 | 2 |
| 5 Analytical Applications | 6 | 5 | 10 | 2 |
| 6 Integration & Accumulation | 5 | 5 | 10 | 2 |
| 7 Differential Equations | 6 | 5 | 10 | 2 |
| 8 Applications of Integration | 5 | 5 | 10 | 2 |

Totals: 40 examples, 96 questions (80 MC, 16 FRQ), 48 concepts, 32 formula cards, 8 theorem cards.

## Unit object schema

```js
{
  id: 1,
  slug: "limits-and-continuity",
  code: "UNIT 01",
  title: "Limits & Continuity",
  shortTitle: "Limits",
  tagline: "Approach, don’t arrive.",
  weight: "10–12% of the exam",
  hue: "#5eead4",
  summary: "...",
  bigIdea: "...",
  concepts: ["..."],
  formulas: [{ label: "Two-sided limit", html: "lim<sub>x→c</sub> f(x) = L" }],
  theorem: { name: "...", statement: "..." },
  visual: { mode: "Convergence microscope", hint: "..." },
  examples: [/* 5 */],
  questions: [/* 12 */]
}
```

## Question schemas

```js
// Multiple choice — answer is a zero-based index
{
  id: "u1-q01", type: "mc", topic: "Algebraic limits", difficulty: 1,
  prompt: "Evaluate the limit.", formula: "lim<sub>x→2</sub> …",
  choices: ["0", "2", "4", "Does not exist"], answer: 2,
  explanation: "Factor …", hint: "Can you cancel a common factor?"
}

// Free response — numeric, tolerance-based
{
  id: "u8-q11", type: "frq", topic: "Volume of revolution", difficulty: 2,
  prompt: "Find the volume, rounded to two decimals.",
  formula: "V = π∫₀² x⁴ dx",
  answer: 20.11, tolerance: 0.02, unitHint: "cubic units",
  explanation: "V = 32π/5 ≈ 20.11.", hint: "The radius is x²."
}
```

Flattening attaches `unitId`, `unitTitle`, `unitHue`.

## Rules

- **Explanation must teach the method**, not just restate the answer. At least 20 characters; in
  practice 80–250.
- **Hint must not reveal the final value.** One sentence, a nudge.
- **MC choices must be distinct** and plausible. Avoid “all of the above”.
- **FRQ tolerance** matches the requested rounding: 0.001 for exact integers, 0.02 for two decimals,
  0.05 for a value with π, 0.5 for a medium rounding.
- **Difficulty 1–3** is presentation only; it does not weight mastery.
- **Topics** are short labels used in the quiz header and toasts.
- **No copied text.** The eight-unit structure is public; every sentence, example, and question is
  original.
- **No calculator-dependent arithmetic** that a student cannot reasonably do. The point is calculus.

## Worked example schema

```js
{
  title: "A removable hole",
  prompt: "Evaluate lim<sub>x→1</sub> (x² − 1)/(x − 1).",
  formula: "(x² − 1)/(x − 1) = x + 1 for x ≠ 1",
  steps: [
    { title: "Try direct substitution", body: "At x = 1 …" },
    { title: "Factor the numerator", body: "…" },
    { title: "Evaluate", body: "…" }
  ],
  takeaway: "A function need not be defined at c …",
  visualCue: "Choose “Removable hole” in Unit 1 …"
}
```

Five per unit covers the unit's core skill sequence, not five random problems.

## Accuracy workflow

1. Solve analytically.
2. Evaluate numerically with `math.js` where applicable.
3. Check the MC index and that the correct choice is not duplicated.
4. Check FRQ tolerance by entering a rounded value and a nearby wrong value.
5. Run `node --test tests/curriculum.test.mjs`.
6. Run `?selftest`.

The test suite verifies shape, not mathematical truth. The author is responsible for truth. If you
change an answer, change the explanation, run both layers, and update any count claims in the README
and docs.

## Tone

Khan-style clarity: short sentences, named steps, a takeaway, no jargon without a plain-language
gloss. Avoid “obviously”, “simply”, and “just”. The student may be seeing the idea for the first time.
