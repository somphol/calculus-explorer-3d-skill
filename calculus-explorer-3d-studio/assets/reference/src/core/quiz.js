// Adaptive quiz session. Pure state machine around the mastery store.

import { parseNumericAnswer } from "./math.js";

export function checkAnswer(question, submitted) {
  if (!question) return false;
  if (question.type === "mc") return Number(submitted) === Number(question.answer);
  const parsed = parseNumericAnswer(submitted);
  if (parsed === null) return false;
  const tolerance = Number.isFinite(question.tolerance) ? question.tolerance : 0.005;
  return Math.abs(parsed - Number(question.answer)) <= tolerance;
}

export function createQuizSession({ questions, mastery, unitId, includeMastered = false, rng = Math.random }) {
  if (!mastery) throw new Error("createQuizSession requires a mastery store");
  const pool = questions.filter((question) => question.unitId === Number(unitId));
  let queue = mastery.adaptiveQueue({ unitId, includeMastered, rng });
  const total = pool.length;
  let answered = 0;
  let correct = 0;
  let streak = 0;
  let bestStreak = 0;
  let completed = queue.length === 0;
  let lastResult = null;

  function current() {
    return queue.length ? queue[0] : null;
  }

  function submit(value) {
    const question = current();
    if (!question) return { ok: false, reason: "complete" };
    const isCorrect = checkAnswer(question, value);
    const result = mastery.record(question.id, isCorrect);
    answered += 1;
    if (isCorrect) {
      correct += 1;
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
      queue.shift();
    } else {
      streak = 0;
      // Retry the missed question later in the same session rather than
      // dropping it, so an unmastered topic cannot be skipped accidentally.
      const [missed] = queue.splice(0, 1);
      queue.push(missed);
    }
    lastResult = {
      ...result,
      question,
      submitted: value,
      correct: isCorrect,
      newlyMastered: Boolean(result.newlyMastered),
    };
    if (queue.length === 0) completed = true;
    return { ok: true, ...lastResult, completed };
  }

  function next() {
    if (!queue.length) completed = true;
    return current();
  }

  function skip() {
    if (queue.length <= 1) return current();
    const [currentQuestion] = queue.splice(0, 1);
    queue.push(currentQuestion);
    return current();
  }

  function stats() {
    return {
      unitId: Number(unitId),
      total,
      answered,
      correct,
      accuracy: answered ? Math.round((correct / answered) * 100) : 0,
      streak,
      bestStreak,
      remaining: queue.length,
      completed,
      mastered: mastery.unitStats(unitId).mastered,
    };
  }

  return {
    current,
    submit,
    next,
    skip,
    stats,
    get lastResult() { return lastResult; },
    get completed() { return completed; },
    get queueLength() { return queue.length; },
  };
}
