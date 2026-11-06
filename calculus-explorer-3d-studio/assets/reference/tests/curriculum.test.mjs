import assert from "node:assert/strict";
import test from "node:test";
import { ALL_QUESTIONS, TOTAL_QUESTIONS, UNITS, getQuestion, getUnit } from "../src/data/curriculum.js";
import { derivative, formatNumber, integrate, parseNumericAnswer, riemann, rk4Path, seededShuffle, secondDerivative } from "../src/core/math.js";
import { createMasteryStore, STORAGE_KEY } from "../src/core/mastery.js";
import { checkAnswer, createQuizSession } from "../src/core/quiz.js";

function memoryStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    dump: () => Object.fromEntries(data),
  };
}

test("curriculum exposes the eight AP units and a 96-question bank", () => {
  assert.equal(UNITS.length, 8);
  assert.equal(TOTAL_QUESTIONS, 96);
  assert.deepEqual(UNITS.map((unit) => unit.id), [1, 2, 3, 4, 5, 6, 7, 8]);
  for (const unit of UNITS) {
    assert.equal(unit.questions.length, 12, `unit ${unit.id} question count`);
    assert.equal(unit.examples.length, 5, `unit ${unit.id} example count`);
    assert.ok(unit.concepts.length >= 5);
    assert.ok(unit.formulas.length >= 4);
    assert.ok(unit.theorem.statement.length > 30);
    assert.ok(unit.visual.mode.length > 3);
  }
});

test("question identifiers are unique and metadata is complete", () => {
  const ids = ALL_QUESTIONS.map((question) => question.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const question of ALL_QUESTIONS) {
    assert.match(question.id, /^u\d-q\d{2}$/);
    assert.ok(question.topic.length > 2);
    assert.ok(question.prompt.length > 8);
    assert.ok(question.explanation.length > 20);
    assert.ok(question.hint.length > 3);
    assert.ok(question.difficulty >= 1 && question.difficulty <= 3);
    assert.ok(question.unitId >= 1 && question.unitId <= 8);
  }
  assert.equal(getUnit(3).slug, "composite-implicit-inverse");
  assert.equal(getQuestion("u8-q12").unitId, 8);
});

test("multiple-choice answers are valid indexes and choices are distinct", () => {
  const mc = ALL_QUESTIONS.filter((question) => question.type === "mc");
  assert.equal(mc.length, 80);
  for (const question of mc) {
    assert.equal(question.choices.length, 4);
    assert.ok(Number.isInteger(question.answer));
    assert.ok(question.answer >= 0 && question.answer < 4);
    assert.equal(new Set(question.choices).size, 4, `${question.id} choices are not distinct`);
  }
});

test("free-response answers are finite and tolerance is positive", () => {
  const frq = ALL_QUESTIONS.filter((question) => question.type === "frq");
  assert.equal(frq.length, 16);
  for (const question of frq) {
    assert.ok(Number.isFinite(question.answer), `${question.id} answer`);
    assert.ok(question.tolerance > 0 && question.tolerance < 1, `${question.id} tolerance`);
    assert.equal(question.type, "frq");
  }
});

test("numerical calculus helpers agree with known values", () => {
  assert.ok(Math.abs(derivative((x) => x * x, 3) - 6) < 1e-5);
  assert.ok(Math.abs(derivative(Math.sin, 0) - 1) < 1e-5);
  assert.ok(Math.abs(secondDerivative((x) => x ** 3, 2) - 12) < 0.02);
  assert.ok(Math.abs(integrate((x) => x * x, 0, 2, 2000) - 8 / 3) < 1e-8);
  assert.ok(Math.abs(riemann((x) => x * x, 0, 2, 2, "left") - 1) < 1e-12);
  assert.ok(Math.abs(riemann((x) => x * x, 0, 2, 2, "right") - 5) < 1e-12);
  assert.ok(Math.abs(riemann((x) => x * x, 0, 2, 2, "mid") - 2.5) < 1e-12);
  assert.ok(Math.abs(riemann((x) => x * x, 0, 2, 2, "trap") - 3) < 1e-12);
  assert.equal(formatNumber(4), "4");
  assert.equal(formatNumber(4.2), "4.2");
  assert.equal(formatNumber(-0.0000001), "0");
});

test("numeric answer parser accepts decimals, fractions, and pi multiples", () => {
  assert.equal(parseNumericAnswer("20.11"), 20.11);
  assert.equal(parseNumericAnswer("32/5"), 6.4);
  assert.ok(Math.abs(parseNumericAnswer("2π") - Math.PI * 2) < 1e-12);
  assert.ok(Math.abs(parseNumericAnswer("π/4") - Math.PI / 4) < 1e-12);
  assert.ok(Math.abs(parseNumericAnswer("-3pi/2") + (3 * Math.PI) / 2) < 1e-12);
  assert.equal(parseNumericAnswer("abc"), null);
  assert.equal(parseNumericAnswer("1/0"), null);
  assert.equal(parseNumericAnswer(""), null);
});

test("RK4 follows an exponential differential equation", () => {
  const path = rk4Path({ f: (x, y) => y, x0: 0, y0: 1, step: 0.01, steps: 100, direction: 1 });
  const last = path[path.length - 1];
  assert.ok(Math.abs(last.y - Math.exp(1)) < 0.001);
  assert.ok(path.length > 100);
});

test("seeded shuffle is deterministic and preserves membership", () => {
  const input = Array.from({ length: 12 }, (_, index) => index);
  const one = seededShuffle(input, 42);
  const two = seededShuffle(input, 42);
  assert.deepEqual(one, two);
  assert.deepEqual(one.slice().sort((a, b) => a - b), input);
});

test("mastery records, persists, and computes unit progress", () => {
  const storage = memoryStorage();
  const store = createMasteryStore(storage, ALL_QUESTIONS);
  assert.equal(store.totals().mastered, 0);
  const question = ALL_QUESTIONS[0];
  const result = store.record(question.id, true);
  assert.equal(result.newlyMastered, true);
  assert.equal(store.isMastered(question.id), true);
  assert.equal(store.unitStats(question.unitId).mastered, 1);
  assert.ok(storage.getItem(STORAGE_KEY).includes(question.id));
  store.record(question.id, false);
  assert.equal(store.getRecord(question.id).lapses, 1);
  assert.equal(store.isMastered(question.id), true, "one review miss does not revoke mastery");
  store.resetUnit(question.unitId);
  assert.equal(store.unitStats(question.unitId).mastered, 0);
});

test("mastery falls back safely on corrupt storage", () => {
  const storage = memoryStorage({ [STORAGE_KEY]: "{not json" });
  const store = createMasteryStore(storage, ALL_QUESTIONS);
  assert.equal(store.totals().mastered, 0);
  const storage2 = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ questions: { "u1-q01": { mastered: true, attempts: 1 } } }) });
  const store2 = createMasteryStore(storage2, ALL_QUESTIONS);
  assert.equal(store2.isMastered("u1-q01"), true);
});

test("adaptive queue removes mastered questions", () => {
  const store = createMasteryStore(memoryStorage(), ALL_QUESTIONS);
  const mastered = ALL_QUESTIONS.find((question) => question.unitId === 1);
  store.record(mastered.id, true);
  const queue = store.adaptiveQueue({ unitId: 1, rng: () => 0.5 });
  assert.equal(queue.length, 11);
  assert.ok(!queue.some((question) => question.id === mastered.id));
  const all = store.adaptiveQueue({ unitId: 1, includeMastered: true, rng: () => 0.5 });
  assert.equal(all.length, 12);
});

test("export and import round-trip mastery", () => {
  const source = createMasteryStore(memoryStorage(), ALL_QUESTIONS);
  source.record("u2-q01", true);
  source.record("u2-q02", false);
  const payload = source.exportState();
  const target = createMasteryStore(memoryStorage(), ALL_QUESTIONS);
  const imported = target.importState(payload);
  assert.equal(imported.ok, true);
  assert.equal(target.isMastered("u2-q01"), true);
  assert.equal(target.getRecord("u2-q02").attempts, 1);
  assert.equal(target.importState({ hello: "world" }).ok, false);
});

test("quiz session filters, masters, and retries misses", () => {
  const store = createMasteryStore(memoryStorage(), ALL_QUESTIONS);
  const session = createQuizSession({ questions: ALL_QUESTIONS, mastery: store, unitId: 1, rng: () => 0.3 });
  assert.equal(session.queueLength, 12);
  const question = session.current();
  assert.equal(question.unitId, 1);
  const result = session.submit(question.type === "mc" ? question.answer : question.answer);
  assert.equal(result.correct, true);
  assert.equal(session.queueLength, 11);
  assert.equal(store.isMastered(question.id), true);
  assert.equal(session.stats().mastered, 1);
});

test("a missed question stays in the queue and rotates", () => {
  const store = createMasteryStore(memoryStorage(), ALL_QUESTIONS);
  const session = createQuizSession({ questions: ALL_QUESTIONS, mastery: store, unitId: 1, rng: () => 0.2 });
  const first = session.current();
  const wrong = first.type === "mc" ? (first.answer + 1) % 4 : first.answer + 999;
  const result = session.submit(wrong);
  assert.equal(result.correct, false);
  assert.equal(session.queueLength, 12);
  assert.equal(store.isMastered(first.id), false);
  session.skip();
  assert.equal(session.queueLength, 12);
});

test("all-mastered units start complete", () => {
  const store = createMasteryStore(memoryStorage(), ALL_QUESTIONS);
  for (const question of ALL_QUESTIONS.filter((item) => item.unitId === 8)) store.record(question.id, true);
  const session = createQuizSession({ questions: ALL_QUESTIONS, mastery: store, unitId: 8 });
  assert.equal(session.current(), null);
  assert.equal(session.completed, true);
  const review = createQuizSession({ questions: ALL_QUESTIONS, mastery: store, unitId: 8, includeMastered: true });
  assert.equal(review.queueLength, 12);
});

test("checkAnswer handles MC and FRQ tolerance", () => {
  const mc = getQuestion("u1-q01");
  assert.equal(checkAnswer(mc, 2), true);
  assert.equal(checkAnswer(mc, 1), false);
  const frq = getQuestion("u8-q11");
  assert.equal(checkAnswer(frq, "20.11"), true);
  assert.equal(checkAnswer(frq, "32π/5"), true);
  assert.equal(checkAnswer(frq, "20.5"), false);
});
