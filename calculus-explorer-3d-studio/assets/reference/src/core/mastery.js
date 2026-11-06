// Mastery store: persistent per-question records plus adaptive selection.
// The storage object is injected so this module can be unit-tested in Node.

import { shuffled } from "./math.js";

export const STORAGE_KEY = "calc3d.mastery.v1";
export const SCHEMA_VERSION = 1;

const emptyRecord = () => ({
  mastered: false,
  attempts: 0,
  correct: 0,
  lapses: 0,
  lastResult: null,
  lastAt: null,
});

function freshState() {
  return {
    version: SCHEMA_VERSION,
    questions: {},
    stats: { answered: 0, correct: 0, streak: 0, bestStreak: 0, lastActive: null },
    updatedAt: null,
  };
}

function sanitize(raw) {
  if (!raw || typeof raw !== "object") return freshState();
  const state = freshState();
  if (raw.questions && typeof raw.questions === "object") {
    for (const [id, record] of Object.entries(raw.questions)) {
      if (!record || typeof record !== "object") continue;
      state.questions[id] = {
        mastered: Boolean(record.mastered),
        attempts: Number(record.attempts) || 0,
        correct: Number(record.correct) || 0,
        lapses: Number(record.lapses) || 0,
        lastResult: record.lastResult === "correct" || record.lastResult === "wrong" ? record.lastResult : null,
        lastAt: typeof record.lastAt === "string" ? record.lastAt : null,
      };
    }
  }
  if (raw.stats && typeof raw.stats === "object") {
    state.stats = {
      answered: Number(raw.stats.answered) || 0,
      correct: Number(raw.stats.correct) || 0,
      streak: Number(raw.stats.streak) || 0,
      bestStreak: Number(raw.stats.bestStreak) || 0,
      lastActive: typeof raw.stats.lastActive === "string" ? raw.stats.lastActive : null,
    };
  }
  if (typeof raw.updatedAt === "string") state.updatedAt = raw.updatedAt;
  return state;
}

export function createMasteryStore(storage, questions = []) {
  if (!storage || typeof storage.getItem !== "function") {
    throw new Error("createMasteryStore requires a Storage-like object");
  }
  const byId = new Map(questions.map((question) => [question.id, question]));
  let state = freshState();

  function load() {
    try {
      const text = storage.getItem(STORAGE_KEY);
      state = text ? sanitize(JSON.parse(text)) : freshState();
    } catch {
      state = freshState();
    }
    return state;
  }

  function save() {
    state.updatedAt = new Date().toISOString();
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  function getRecord(questionId) {
    return state.questions[questionId] || emptyRecord();
  }

  function record(questionId, correct) {
    const question = byId.get(questionId);
    if (!question) return { ok: false, reason: "unknown-question" };
    const previous = getRecord(questionId);
    const next = { ...previous };
    const wasMastered = previous.mastered;
    next.attempts += 1;
    next.lastAt = new Date().toISOString();
    next.lastResult = correct ? "correct" : "wrong";
    if (correct) {
      next.correct += 1;
      next.mastered = true;
    } else if (wasMastered) {
      // Mastery is not silently revoked by one review miss, but the lapse is
      // recorded so the dashboard can surface a shaky concept.
      next.lapses += 1;
    }
    state.questions[questionId] = next;

    state.stats.answered += 1;
    if (correct) {
      state.stats.correct += 1;
      state.stats.streak += 1;
      state.stats.bestStreak = Math.max(state.stats.bestStreak, state.stats.streak);
    } else {
      state.stats.streak = 0;
    }
    state.stats.lastActive = next.lastAt;
    save();
    return {
      ok: true,
      correct,
      newlyMastered: correct && !wasMastered,
      record: next,
      unitId: question.unitId,
    };
  }

  function questionStats(questionId) {
    return getRecord(questionId);
  }

  function unitStats(unitId) {
    const unitQuestions = questions.filter((question) => question.unitId === Number(unitId));
    let mastered = 0;
    let attempted = 0;
    let correct = 0;
    let lapses = 0;
    for (const question of unitQuestions) {
      const record = state.questions[question.id];
      if (!record) continue;
      if (record.mastered) mastered += 1;
      if (record.attempts > 0) attempted += 1;
      correct += record.correct;
      lapses += record.lapses;
    }
    return {
      unitId: Number(unitId),
      total: unitQuestions.length,
      mastered,
      remaining: unitQuestions.length - mastered,
      attempted,
      correct,
      lapses,
      percent: unitQuestions.length ? Math.round((mastered / unitQuestions.length) * 100) : 0,
    };
  }

  function totals() {
    const total = questions.length;
    const mastered = questions.filter((question) => getRecord(question.id).mastered).length;
    return {
      total,
      mastered,
      remaining: total - mastered,
      percent: total ? Math.round((mastered / total) * 100) : 0,
      answered: state.stats.answered,
      correct: state.stats.correct,
      accuracy: state.stats.answered ? Math.round((state.stats.correct / state.stats.answered) * 100) : 0,
      streak: state.stats.streak,
      bestStreak: state.stats.bestStreak,
    };
  }

  function resetUnit(unitId) {
    for (const question of questions) {
      if (question.unitId === Number(unitId)) delete state.questions[question.id];
    }
    save();
  }

  function resetAll() {
    state = freshState();
    save();
  }

  function exportState() {
    return {
      app: "calculus-explorer-3d",
      schema: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      state,
    };
  }

  function importState(payload) {
    try {
      const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
      if (!parsed || parsed.app !== "calculus-explorer-3d" || !parsed.state) {
        return { ok: false, reason: "not-a-calculus-explorer-export" };
      }
      state = sanitize(parsed.state);
      save();
      return { ok: true, totals: totals() };
    } catch {
      return { ok: false, reason: "invalid-json" };
    }
  }

  function adaptiveQueue({ unitId = null, includeMastered = false, rng = Math.random, limit = Infinity } = {}) {
    const pool = questions.filter((question) => {
      if (unitId !== null && question.unitId !== Number(unitId)) return false;
      if (!includeMastered && getRecord(question.id).mastered) return false;
      return true;
    });
    return shuffled(pool, rng).slice(0, limit);
  }

  function unmasteredForUnit(unitId) {
    return questions.filter((question) => question.unitId === Number(unitId) && !getRecord(question.id).mastered);
  }

  load();

  return {
    get state() { return state; },
    load,
    save,
    record,
    getRecord,
    questionStats,
    unitStats,
    totals,
    resetUnit,
    resetAll,
    exportState,
    importState,
    adaptiveQueue,
    unmasteredForUnit,
    isMastered: (questionId) => Boolean(getRecord(questionId).mastered),
  };
}
