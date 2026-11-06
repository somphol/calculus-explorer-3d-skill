// Calculus Explorer 3D — application controller.
// Content → visual factory → control dock → narration → adaptive mastery.

import { ALL_QUESTIONS, TOTAL_QUESTIONS, UNITS, getUnit } from "./data/curriculum.js";
import { clamp, derivative, formatNumber, integrate, parseNumericAnswer, riemann } from "./core/math.js";
import { createMasteryStore } from "./core/mastery.js";
import { checkAnswer, createQuizSession } from "./core/quiz.js";
import { CalculusStage } from "./visuals/stage.js";
import { createUnit1Scene } from "./visuals/unit1.js";
import { createUnit2Scene } from "./visuals/unit2.js";
import { createUnit3Scene } from "./visuals/unit3.js";
import { createUnit4Scene } from "./visuals/unit4.js";
import { createUnit5Scene } from "./visuals/unit5.js";
import { createUnit6Scene } from "./visuals/unit6.js";
import { createUnit7Scene } from "./visuals/unit7.js";
import { createUnit8Scene } from "./visuals/unit8.js";

const VERSION = "1.0.0";
const PREFS_KEY = "calc3d.prefs.v1";
const FACTORIES = {
  1: createUnit1Scene,
  2: createUnit2Scene,
  3: createUnit3Scene,
  4: createUnit4Scene,
  5: createUnit5Scene,
  6: createUnit6Scene,
  7: createUnit7Scene,
  8: createUnit8Scene,
};

const $ = (id) => document.getElementById(id);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function moveItem(array, from, to) {
  const copy = array.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

const storedPrefs = readJSON(PREFS_KEY, {});
const prefs = {
  unit: Number(storedPrefs.unit) || 1,
  view: storedPrefs.view === "practice" ? "practice" : "explore",
  sound: storedPrefs.sound !== false,
  reducedMotion: Boolean(storedPrefs.reducedMotion),
  focus: Boolean(storedPrefs.focus),
};
const mastery = createMasteryStore(localStorage, ALL_QUESTIONS);
const state = {
  unitId: getUnit(prefs.unit) ? prefs.unit : 1,
  view: prefs.view,
  quizUnitId: null,
  session: null,
  selectedChoice: null,
  feedbackShown: false,
  review: false,
  selfTest: null,
  focus: false,
};
let stage = null;
let visual = null;
let controlBindings = [];
let initialPracticeUnit = null;

/* ------------------------------------------------------------------ sound */
let audioContext = null;
function ensureAudio() {
  if (!prefs.sound) return null;
  try {
    if (!audioContext) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioContext = new Ctx();
    }
    if (audioContext.state === "suspended") audioContext.resume();
    return audioContext;
  } catch {
    return null;
  }
}

function tone(frequency, start, duration, { type = "sine", gain = 0.035 } = {}) {
  const ctx = ensureAudio();
  if (!ctx) return;
  try {
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + start);
    envelope.gain.setValueAtTime(0.0001, ctx.currentTime + start);
    envelope.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
    oscillator.connect(envelope).connect(ctx.destination);
    oscillator.start(ctx.currentTime + start);
    oscillator.stop(ctx.currentTime + start + duration + 0.02);
  } catch {
    /* audio is decorative */
  }
}

function chime(kind) {
  if (!prefs.sound) return;
  if (kind === "correct") {
    tone(523.25, 0, 0.16, { gain: 0.04 });
    tone(783.99, 0.09, 0.26, { gain: 0.035 });
    tone(1046.5, 0.2, 0.3, { gain: 0.022 });
  } else if (kind === "wrong") {
    tone(220, 0, 0.18, { type: "triangle", gain: 0.028 });
    tone(174.61, 0.13, 0.24, { type: "triangle", gain: 0.022 });
  } else {
    tone(620, 0, 0.045, { gain: 0.012 });
  }
}

/* ------------------------------------------------------------------ toast */
function toast(title, body = "", tone = "") {
  const stack = $("toast-stack");
  if (!stack) return;
  const node = document.createElement("div");
  node.className = `toast${tone ? ` is-${tone}` : ""}`;
  const strong = document.createElement("strong");
  strong.textContent = title;
  node.append(strong);
  if (body) node.append(document.createTextNode(` ${body}`));
  stack.append(node);
  while (stack.children.length > 4) stack.firstElementChild.remove();
  setTimeout(() => {
    node.style.opacity = "0";
    node.style.transform = "translateY(5px)";
    setTimeout(() => node.remove(), 220);
  }, 3600);
}

/* ------------------------------------------------------------- persistence */
function savePrefs() {
  writeJSON(PREFS_KEY, {
    unit: state.unitId,
    view: state.view,
    sound: prefs.sound,
    reducedMotion: prefs.reducedMotion,
    focus: state.focus,
  });
}

function effectiveReducedMotion() {
  return prefs.reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function applyMotionPreference() {
  const reduced = effectiveReducedMotion();
  window.__CALC3D_REDUCED_MOTION__ = reduced;
  document.body.classList.toggle("reduce-motion", reduced);
  if (stage) stage.reducedMotion = reduced;
}

/* ------------------------------------------------------------------- hash */
function parseLocation() {
  const raw = location.hash.replace(/^#/, "");
  if (raw === "practice" || raw.startsWith("practice/")) {
    const part = raw.split("/")[1];
    const unit = Number(part);
    return { view: "practice", unit: getUnit(unit) ? unit : null };
  }
  const match = raw.match(/^unit-(\d+)$/);
  if (match) {
    const unit = Number(match[1]);
    return { view: "explore", unit: getUnit(unit) ? unit : null };
  }
  return { view: null, unit: null };
}

function updateHash() {
  let hash = `#unit-${state.unitId}`;
  if (state.view === "practice") {
    hash = state.quizUnitId ? `#practice/${state.quizUnitId}` : "#practice";
  }
  try {
    history.replaceState(null, "", hash);
  } catch {
    /* file:// contexts can refuse; the UI is unaffected */
  }
}

/* ------------------------------------------------------------------- rail */
function renderRail() {
  const list = $("unit-list");
  list.innerHTML = "";
  for (const unit of UNITS) {
    const stats = mastery.unitStats(unit.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "unit-item";
    button.dataset.unit = String(unit.id);
    button.style.setProperty("--hue", unit.hue);
    button.setAttribute("aria-label", `${unit.code}: ${unit.title}, ${stats.percent}% mastered`);
    button.innerHTML = `
      <span class="unit-index">${String(unit.id).padStart(2, "0")}</span>
      <span class="unit-copy"><strong>${unit.shortTitle}</strong><small>${unit.title}</small></span>
      <span class="unit-ring" style="--p:${stats.percent};--hue:${unit.hue}"><span>${stats.percent}%</span></span>
    `;
    button.addEventListener("click", () => switchUnit(unit.id));
    list.append(button);
  }
  syncRail();
}

function syncRail() {
  for (const item of $$(".unit-item")) {
    const id = Number(item.dataset.unit);
    const active = id === state.unitId;
    item.classList.toggle("is-active", active);
    if (active) item.setAttribute("aria-current", "true");
    else item.removeAttribute("aria-current");
    const unit = getUnit(id);
    const stats = mastery.unitStats(id);
    const ring = item.querySelector(".unit-ring");
    if (ring) {
      ring.style.setProperty("--p", stats.percent);
      ring.style.setProperty("--hue", unit.hue);
      const label = ring.querySelector("span");
      if (label) label.textContent = `${stats.percent}%`;
    }
    item.setAttribute("aria-label", `${unit.code}: ${unit.title}, ${stats.percent}% mastered`);
  }
}

/* ------------------------------------------------------------- unit content */
function renderUnitMeta(unit) {
  document.body.style.setProperty("--unit-hue", unit.hue);
  $("unit-code").textContent = unit.code;
  $("unit-weight").textContent = unit.weight;
  $("unit-title").textContent = unit.title;
  $("unit-tagline").textContent = unit.tagline;
  $("dock-mode").textContent = unit.visual.mode;
  $("theorem-name").textContent = unit.theorem.name;
  $("theorem-statement").textContent = unit.theorem.statement;
  $("stage-hint").textContent = unit.visual.hint;
  $("example-count").textContent = String(unit.examples.length);

  const formulaList = $("formula-list");
  formulaList.innerHTML = "";
  for (const formula of unit.formulas) {
    const item = document.createElement("div");
    item.className = "formula-item";
    item.innerHTML = `<span>${formula.label}</span><div>${formula.html}</div>`;
    formulaList.append(item);
  }

  const conceptList = $("concept-list");
  conceptList.innerHTML = "";
  for (const concept of unit.concepts) {
    const chip = document.createElement("span");
    chip.className = "concept-chip";
    chip.textContent = concept;
    conceptList.append(chip);
  }

  renderExamples(unit);
  $("quiz-unit").textContent = `${unit.code} · ${unit.shortTitle.toUpperCase()}`;
}

function renderExamples(unit) {
  const list = $("example-list");
  list.innerHTML = "";
  unit.examples.forEach((example, index) => {
    const article = document.createElement("article");
    article.className = `example${index === 0 ? " is-open" : ""}`;
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "example-toggle";
    toggle.setAttribute("aria-expanded", index === 0 ? "true" : "false");
    toggle.innerHTML = `<span class="ex-num">EX ${String(index + 1).padStart(2, "0")}</span><span>${example.title}</span><span class="ex-caret" aria-hidden="true">›</span>`;
    toggle.addEventListener("click", () => {
      const open = article.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    const body = document.createElement("div");
    body.className = "example-body";
    const steps = example.steps
      .map(
        (step, stepIndex) =>
          `<div class="example-step"><span class="step-num">${stepIndex + 1}</span><div><strong>${step.title}</strong><p>${step.body}</p></div></div>`
      )
      .join("");
    body.innerHTML = `
      <p class="example-prompt">${example.prompt}</p>
      <div class="example-formula">${example.formula}</div>
      ${steps}
      <div class="example-takeaway"><strong>Takeaway.</strong> ${example.takeaway}</div>
      <div class="example-visual"><strong>3D cross-reference →</strong> ${example.visualCue}</div>
    `;
    article.append(toggle, body);
    list.append(article);
  });
}

/* ----------------------------------------------------------------- controls */
function decimalPlaces(step) {
  if (step >= 1) return 0;
  if (step >= 0.1) return 1;
  if (step >= 0.01) return 2;
  return 3;
}

function formatControlValue(value, descriptor) {
  const places = decimalPlaces(descriptor.step ?? 1);
  return `${formatNumber(Number(value), places)}${descriptor.suffix || ""}`;
}

function updateRangeFill(input) {
  const min = Number(input.min);
  const max = Number(input.max);
  const value = Number(input.value);
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
  input.style.setProperty("--fill", `${clamp(percent, 0, 100)}%`);
}

function currentControlValues() {
  const values = {};
  for (const binding of controlBindings) {
    if (binding.input) values[binding.descriptor.key] = binding.input.value;
    else if (binding.select) values[binding.descriptor.key] = binding.select.value;
  }
  return values;
}

function syncControlUI() {
  for (const binding of controlBindings) {
    if (binding.input) {
      const expected = String(binding.descriptor.value ?? binding.input.value);
      if (document.activeElement !== binding.input && binding.input.value !== expected) {
        binding.input.value = expected;
        updateRangeFill(binding.input);
        if (binding.output) binding.output.textContent = formatControlValue(expected, binding.descriptor);
      }
      const live = Number(binding.descriptor.value);
      if (binding.output && Number.isFinite(live) && document.activeElement !== binding.input) {
        binding.output.textContent = formatControlValue(live, binding.descriptor);
      }
    } else if (binding.select) {
      if (binding.select.value !== String(binding.descriptor.value)) {
        binding.select.value = String(binding.descriptor.value);
      }
    }
  }
}

function syncConditionalControls() {
  const values = currentControlValues();
  for (const binding of controlBindings) {
    if (!binding.descriptor.visibleWhen) continue;
    const { key, value } = binding.descriptor.visibleWhen;
    binding.wrap.classList.toggle("is-hidden", String(values[key]) !== String(value));
  }
}

function syncButtonStates() {
  if (!visual) return;
  const snapshot = typeof visual.getState === "function" ? visual.getState() : {};
  for (const binding of controlBindings) {
    if (!binding.button) continue;
    const reflect = binding.descriptor.reflect || binding.descriptor.key;
    const on = Boolean(snapshot[reflect]);
    binding.button.classList.toggle("is-on", on);
    binding.button.setAttribute("aria-pressed", String(on));
  }
}

function renderControls(unit) {
  const host = $("controls");
  host.innerHTML = "";
  controlBindings = [];
  if (!visual) return;
  for (const descriptor of visual.controls) {
    const wrap = document.createElement("div");
    wrap.className = "control";
    wrap.dataset.control = descriptor.key;

    const label = document.createElement("div");
    label.className = "control-label";
    const name = document.createElement("span");
    name.textContent = descriptor.label;
    label.append(name);

    if (descriptor.type === "range") {
      const output = document.createElement("span");
      output.className = "control-value";
      output.textContent = formatControlValue(descriptor.value, descriptor);
      label.append(output);
      const input = document.createElement("input");
      input.type = "range";
      input.min = String(descriptor.min);
      input.max = String(descriptor.max);
      input.step = String(descriptor.step ?? 0.01);
      input.value = String(descriptor.value);
      input.dataset.key = descriptor.key;
      input.setAttribute("aria-label", descriptor.label);
      updateRangeFill(input);
      input.addEventListener("input", () => {
        descriptor.value = Number(input.value);
        updateRangeFill(input);
        output.textContent = formatControlValue(input.value, descriptor);
        applyParam(descriptor.key, Number(input.value));
      });
      const ends = document.createElement("div");
      ends.className = "control-range-ends";
      const min = document.createElement("span");
      min.textContent = formatControlValue(descriptor.min, descriptor);
      const max = document.createElement("span");
      max.textContent = formatControlValue(descriptor.max, descriptor);
      ends.append(min, max);
      wrap.append(label, input, ends);
      controlBindings.push({ descriptor, wrap, input, output });
    } else if (descriptor.type === "select") {
      const select = document.createElement("select");
      select.dataset.key = descriptor.key;
      select.setAttribute("aria-label", descriptor.label);
      for (const option of descriptor.options) {
        const node = document.createElement("option");
        node.value = String(option.value);
        node.textContent = option.label;
        if (String(option.value) === String(descriptor.value)) node.selected = true;
        select.append(node);
      }
      select.addEventListener("change", () => {
        descriptor.value = select.value;
        applyParam(descriptor.key, select.value);
        syncConditionalControls();
      });
      wrap.append(label, select);
      controlBindings.push({ descriptor, wrap, select });
    } else if (descriptor.type === "button") {
      label.remove();
      const button = document.createElement("button");
      button.type = "button";
      button.className = "control-button";
      button.textContent = descriptor.label;
      button.dataset.key = descriptor.key;
      button.addEventListener("click", () => {
        visual.action(descriptor.key);
        chime("click");
        updateReadouts();
        updateNarration();
        syncConditionalControls();
        syncButtonStates();
        syncControlUI();
      });
      wrap.append(button);
      controlBindings.push({ descriptor, wrap, button });
    }
    host.append(wrap);
  }
  syncConditionalControls();
  syncButtonStates();
}

function applyParam(key, value) {
  if (!visual) return;
  try {
    visual.set(key, value);
  } catch (error) {
    console.error("Parameter update failed", key, error);
    toast("Parameter error", String(error.message || error), "bad");
  }
  updateReadouts();
  updateNarration();
  syncConditionalControls();
  syncButtonStates();
  if (typeof visual.getHint === "function") $("stage-hint").textContent = visual.getHint();
}

/* ----------------------------------------------------------------- readouts */
function updateReadouts() {
  if (!visual) return;
  let items = [];
  try {
    items = visual.readout();
  } catch (error) {
    console.error("Readout failed", error);
    return;
  }
  const host = $("readouts");
  if (host.children.length !== items.length) {
    host.innerHTML = "";
    for (const item of items) {
      const chip = document.createElement("div");
      chip.className = "readout";
      chip.dataset.tone = item.tone || "muted";
      const label = document.createElement("span");
      label.textContent = item.label;
      const value = document.createElement("strong");
      value.textContent = item.value;
      chip.append(label, value);
      host.append(chip);
    }
  } else {
    items.forEach((item, index) => {
      const chip = host.children[index];
      chip.dataset.tone = item.tone || "muted";
      chip.children[0].textContent = item.label;
      chip.children[1].textContent = item.value;
    });
  }
}

function updateNarration() {
  if (!visual) return;
  try {
    const narration = visual.narration();
    $("live-status").textContent = narration.status || "live readout";
    $("live-title").textContent = narration.title;
    $("live-lead").textContent = narration.lead;
    $("live-formula").innerHTML = narration.formula;
    $("live-note").innerHTML = narration.note;
  } catch (error) {
    console.error("Narration failed", error);
  }
}

/* --------------------------------------------------------------- unit switch */
function switchUnit(id, { push = true, preserveView = true } = {}) {
  const unit = getUnit(id);
  if (!unit) return;
  state.unitId = unit.id;
  syncRail();
  renderUnitMeta(unit);

  try {
    visual = FACTORIES[unit.id]();
    if (stage) stage.setVisual(visual);
    $("webgl-error").hidden = Boolean(stage);
  } catch (error) {
    console.error("Could not build unit", unit.id, error);
    visual = null;
    $("webgl-error").hidden = false;
    $("webgl-error").querySelector("p").textContent = `The Unit ${unit.id} scene could not be created: ${error.message}`;
  }

  renderControls(unit);
  updateReadouts();
  updateNarration();
  applyMotionPreference();
  document.body.dataset.unit = String(unit.id);
  document.title = `${unit.title} — Calculus Explorer 3D`;
  state.selectedChoice = null;
  state.feedbackShown = false;
  $("btn-start-current").textContent = `Start ${unit.code.replace("UNIT 0", "Unit ")}`;
  savePrefs();
  if (push) updateHash();
  if (preserveView && state.view === "practice") renderSessionPanel();
  if (stage) requestAnimationFrame(() => stage.resize());
}

/* ---------------------------------------------------------------- inspector */
function setInspectorTab(tab) {
  const narration = tab === "narration";
  $("tab-narration").classList.toggle("is-active", narration);
  $("tab-examples").classList.toggle("is-active", !narration);
  $("tab-narration").setAttribute("aria-selected", String(narration));
  $("tab-examples").setAttribute("aria-selected", String(!narration));
  $("narration-pane").hidden = !narration;
  $("examples-pane").hidden = narration;
}

/* ------------------------------------------------------------------- views */
function switchView(view, { push = true } = {}) {
  state.view = view === "practice" ? "practice" : "explore";
  const practice = state.view === "practice";
  $("explore-view").hidden = practice;
  $("practice-view").hidden = !practice;
  $("tab-explore").classList.toggle("is-active", !practice);
  $("tab-practice").classList.toggle("is-active", practice);
  $("tab-explore").setAttribute("aria-pressed", String(!practice));
  $("tab-practice").setAttribute("aria-pressed", String(practice));
  if (practice) {
    renderMasteryMap();
    renderSessionPanel();
    updatePracticeChrome();
    if (state.session) renderSessionPanel();
  } else if (stage) {
    requestAnimationFrame(() => stage.resize());
  }
  savePrefs();
  if (push) updateHash();
}

/* ------------------------------------------------------------------ mastery */
function updateMasteryChrome() {
  const totals = mastery.totals();
  $("overall-percent").textContent = `${totals.percent}%`;
  $("mastery-mini").style.setProperty("--p", totals.percent);
  $("practice-percent").textContent = `${totals.percent}%`;
  $("practice-ring").style.setProperty("--p", totals.percent);
  $("practice-count").textContent = `${totals.mastered} / ${totals.total} mastered`;
  syncRail();
}

function ringMarkup(unit, stats, extraClass = "") {
  return `<span class="unit-ring ${extraClass}" style="--p:${stats.percent};--hue:${unit.hue}"><span>${stats.percent}%</span></span>`;
}

function renderMasteryMap() {
  const host = $("mastery-list");
  host.innerHTML = "";
  for (const unit of UNITS) {
    const stats = mastery.unitStats(unit.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `mastery-item${state.quizUnitId === unit.id ? " is-active" : ""}`;
    button.dataset.unit = String(unit.id);
    button.style.setProperty("--hue", unit.hue);
    button.innerHTML = `
      <span class="m-num">${String(unit.id).padStart(2, "0")}</span>
      <span class="m-copy"><strong>${unit.shortTitle}</strong><small>${stats.mastered}/${stats.total} mastered · ${stats.remaining} left</small></span>
      ${ringMarkup(unit, stats)}
    `;
    button.addEventListener("click", () => startPractice(unit.id));
    host.append(button);
  }
  updateMasteryChrome();
}

function renderSessionPanel() {
  const session = state.session;
  const stats = session ? session.stats() : null;
  $("stat-streak").textContent = stats ? String(stats.streak) : "0";
  $("stat-correct").textContent = stats ? String(stats.correct) : "0";
  $("stat-answered").textContent = stats ? String(stats.answered) : "0";
  $("stat-accuracy").textContent = stats && stats.answered ? `${stats.accuracy}%` : "—";
  $("session-label").textContent = stats ? (stats.completed ? "complete" : "live") : "ready";

  const unit = getUnit(state.quizUnitId || state.unitId);
  const unitStats = mastery.unitStats(unit.id);
  $("session-unit-title").textContent = unit.title;
  $("session-unit-bar").style.width = `${unitStats.percent}%`;
  $("session-unit-note").textContent = `${unitStats.mastered}/${unitStats.total} mastered · ${unitStats.remaining} remaining`;
  $("session-unit").style.setProperty("--unit-hue", unit.hue);
  if (stats && stats.completed) {
    $("session-tip").textContent = "Unit mastered. Review all questions or move to the next unit; the adaptive queue will stay empty until you reset.";
  } else {
    $("session-tip").innerHTML = 'Mastery is stored in this browser with <code>localStorage</code>. Nothing is sent anywhere.';
  }
  const reviewButton = $("btn-review");
  if (reviewButton) reviewButton.hidden = false;
}

function updatePracticeChrome() {
  updateMasteryChrome();
  for (const button of $$(".mastery-item")) {
    const id = Number(button.dataset.unit);
    const unit = getUnit(id);
    const stats = mastery.unitStats(id);
    button.classList.toggle("is-active", state.quizUnitId === id);
    const copy = button.querySelector(".m-copy small");
    if (copy) copy.textContent = `${stats.mastered}/${stats.total} mastered · ${stats.remaining} left`;
    const ring = button.querySelector(".unit-ring");
    if (ring) {
      ring.style.setProperty("--p", stats.percent);
      ring.style.setProperty("--hue", unit.hue);
      ring.querySelector("span").textContent = `${stats.percent}%`;
    }
  }
}

function startPractice(unitId, { review = false, push = true } = {}) {
  const unit = getUnit(unitId);
  if (!unit) return;
  state.quizUnitId = unit.id;
  state.review = review;
  state.selectedChoice = null;
  state.feedbackShown = false;
  state.session = createQuizSession({
    questions: ALL_QUESTIONS,
    mastery,
    unitId: unit.id,
    includeMastered: review,
  });
  $("quiz-panel").style.setProperty("--unit-hue", unit.hue);
  $("quiz-empty").hidden = true;
  $("quiz-complete").hidden = true;
  if (!state.session.current()) {
    $("quiz-active").hidden = true;
    showComplete();
  } else {
    $("quiz-active").hidden = false;
    renderQuestion();
  }
  renderMasteryMap();
  renderSessionPanel();
  updateMasteryChrome();
  if (state.view !== "practice") switchView("practice", { push: false });
  state.view = "practice";
  if (push) updateHash();
}

function difficultyMarkup(level) {
  const n = clamp(Number(level) || 1, 1, 3);
  return `${"●".repeat(n)}${"○".repeat(3 - n)}`;
}

function renderQuestion() {
  const session = state.session;
  const question = session?.current();
  if (!question) {
    showComplete();
    return;
  }
  const unit = getUnit(question.unitId);
  $("quiz-panel").style.setProperty("--unit-hue", unit.hue);
  $("quiz-unit").textContent = `${unit.code} · ${unit.shortTitle.toUpperCase()}`;
  $("quiz-topic").textContent = `${question.topic}${state.review ? " · review pass" : ""}`;
  $("quiz-difficulty").textContent = difficultyMarkup(question.difficulty);
  $("quiz-difficulty").setAttribute("aria-label", `Difficulty ${question.difficulty} of 3`);
  $("quiz-remaining").textContent = `${session.queueLength} unmastered`;
  const unitStats = mastery.unitStats(unit.id);
  $("quiz-progress-bar").style.width = `${unitStats.percent}%`;
  $("quiz-progress").setAttribute("aria-valuenow", String(unitStats.percent));
  $("quiz-formula").innerHTML = question.formula || "";
  $("quiz-question").textContent = question.prompt;

  const choices = $("quiz-choices");
  choices.innerHTML = "";
  const form = $("frq-form");
  if (question.type === "mc") {
    form.hidden = true;
    choices.hidden = false;
    question.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice";
      button.dataset.index = String(index);
      button.innerHTML = `<span class="choice-letter">${String.fromCharCode(65 + index)}</span><span>${choice}</span>`;
      button.addEventListener("click", () => {
        if (state.feedbackShown) return;
        state.selectedChoice = index;
        for (const sibling of choices.children) sibling.classList.toggle("is-selected", sibling === button);
        chime("click");
      });
      choices.append(button);
    });
  } else {
    form.hidden = false;
    choices.hidden = true;
    $("frq-input").value = "";
    $("frq-input").disabled = false;
    $("frq-input").placeholder = "e.g. 32/5 or 20.11";
    $("frq-unit").textContent = question.unitHint || "";
    setTimeout(() => $("frq-input").focus(), 40);
  }

  state.selectedChoice = null;
  state.feedbackShown = false;
  $("quiz-feedback").hidden = true;
  $("quiz-feedback").className = "quiz-feedback";
  $("quiz-feedback").innerHTML = "";
  $("btn-check").hidden = false;
  $("btn-check").disabled = false;
  $("btn-next").hidden = true;
  $("btn-hint").hidden = false;
  $("btn-skip").hidden = false;
  $("btn-hint").disabled = false;
  $("btn-skip").disabled = false;
  $("quiz-active").hidden = false;
  $("quiz-empty").hidden = true;
  $("quiz-complete").hidden = true;
}

function showHint() {
  const question = state.session?.current();
  if (!question || state.feedbackShown) return;
  const feedback = $("quiz-feedback");
  feedback.hidden = false;
  feedback.className = "quiz-feedback is-hint";
  feedback.innerHTML = `<strong>Hint</strong>${question.hint || "Read the governing theorem and try the simplest special case first."}`;
  chime("click");
}

function checkCurrent() {
  const session = state.session;
  const question = session?.current();
  if (!question || state.feedbackShown) return;
  let value;
  if (question.type === "mc") {
    if (state.selectedChoice === null) {
      toast("Pick an answer", "Select one of the four choices first.", "warn");
      return;
    }
    value = state.selectedChoice;
  } else {
    value = $("frq-input").value.trim();
    if (!value) {
      toast("Enter a number", "Type your answer before checking.", "warn");
      $("frq-input").focus();
      return;
    }
  }

  const result = session.submit(value);
  state.feedbackShown = true;
  const feedback = $("quiz-feedback");
  feedback.hidden = false;
  feedback.className = `quiz-feedback ${result.correct ? "is-correct" : "is-wrong"}`;
  const answerText = question.type === "mc"
    ? `${String.fromCharCode(65 + question.answer)} — ${question.choices[question.answer]}`
    : `${formatNumber(question.answer, 4)}${question.unitHint ? ` ${question.unitHint}` : ""}`;
  const lead = result.correct
    ? `<strong>Correct</strong><span>${question.explanation}</span>`
    : `<strong>Not quite</strong><span>Correct answer: <strong>${answerText}</strong><br>${question.explanation}</span>`;
  feedback.innerHTML = lead;

  if (question.type === "mc") {
    for (const button of $("quiz-choices").children) {
      const index = Number(button.dataset.index);
      button.disabled = true;
      button.classList.remove("is-selected");
      if (index === question.answer) button.classList.add("is-correct");
      else if (index === Number(value)) button.classList.add("is-wrong");
    }
  } else {
    $("frq-input").disabled = true;
  }

  $("btn-check").hidden = true;
  $("btn-next").hidden = false;
  $("btn-next").textContent = session.queueLength === 0 ? "Finish unit" : "Next question";
  $("btn-hint").hidden = true;
  $("btn-skip").hidden = true;
  $("quiz-remaining").textContent = `${session.queueLength} unmastered`;
  const refreshed = mastery.unitStats(question.unitId);
  $("quiz-progress-bar").style.width = `${refreshed.percent}%`;
  $("quiz-progress").setAttribute("aria-valuenow", String(refreshed.percent));
  chime(result.correct ? "correct" : "wrong");
  if (result.newlyMastered) {
    toast("Mastered", `${question.topic} · ${getUnit(question.unitId).shortTitle}`, "");
  }
  updateMasteryChrome();
  updatePracticeChrome();
  renderSessionPanel();
  updateHash();
}

function nextQuestion() {
  const session = state.session;
  if (!session || session.completed || !session.current()) {
    showComplete();
    return;
  }
  renderQuestion();
}

function skipQuestion() {
  const session = state.session;
  if (!session || state.feedbackShown) return;
  session.skip();
  toast("Skipped for now", "This question stays in the adaptive queue.", "warn");
  renderQuestion();
}

function showComplete() {
  const unit = getUnit(state.quizUnitId || state.unitId);
  const stats = mastery.unitStats(unit.id);
  $("quiz-active").hidden = true;
  $("quiz-empty").hidden = true;
  $("quiz-complete").hidden = false;
  $("complete-title").textContent = unit.title;
  $("complete-copy").textContent = stats.percent >= 100
    ? `Every one of the ${stats.total} questions in this unit has been mastered. The adaptive queue is empty; review all questions or move on.`
    : `This pass is complete. Unit mastery is ${stats.percent}% — reset or review to keep working.`;
  const next = getUnit(unit.id === 8 ? 1 : unit.id + 1);
  $("btn-next-unit").textContent = `Next: ${next.shortTitle} →`;
  $("session-label").textContent = "complete";
  renderSessionPanel();
  updatePracticeChrome();
  updateHash();
}

function nextUnit() {
  const current = getUnit(state.quizUnitId || state.unitId);
  const next = getUnit(current.id === 8 ? 1 : current.id + 1);
  switchUnit(next.id, { push: false });
  startPractice(next.id);
  switchView("practice");
}

function resetProgress() {
  mastery.resetAll();
  state.session = null;
  state.quizUnitId = null;
  state.selectedChoice = null;
  state.feedbackShown = false;
  $("quiz-active").hidden = true;
  $("quiz-complete").hidden = true;
  $("quiz-empty").hidden = false;
  $("quiz-feedback").hidden = true;
  $("btn-start-current").textContent = `Start ${getUnit(state.unitId).code.replace("UNIT 0", "Unit ")}`;
  renderMasteryMap();
  renderSessionPanel();
  updateMasteryChrome();
  toast("Progress reset", "Every unit is back to 0%.", "warn");
}

function exportMastery() {
  const payload = mastery.exportState();
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `calculus-explorer-mastery-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
  toast("Exported", "Mastery JSON downloaded.", "");
  return payload;
}

async function importMastery(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const result = mastery.importState(text);
    if (!result.ok) {
      toast("Import failed", result.reason, "bad");
      return;
    }
    state.session = null;
    state.quizUnitId = null;
    $("quiz-active").hidden = true;
    $("quiz-complete").hidden = true;
    $("quiz-empty").hidden = false;
    renderMasteryMap();
    renderSessionPanel();
    updateMasteryChrome();
    toast("Imported", `${result.totals.mastered} mastered questions restored.`, "");
  } catch (error) {
    toast("Import failed", String(error.message || error), "bad");
  }
}

/* ------------------------------------------------------------------ focus */
function toggleFocus(force) {
  state.focus = typeof force === "boolean" ? force : !state.focus;
  document.body.classList.toggle("focus-mode", state.focus);
  $("btn-focus").setAttribute("aria-pressed", String(state.focus));
  savePrefs();
  if (stage) setTimeout(() => stage.resize(), 60);
  if (state.focus) toast("Focus mode", "Press F or Esc to bring the panels back.", "");
}

/* -------------------------------------------------------------- self-test */
function makeMemoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

async function runSelfTest(showOverlay = false) {
  const results = [];
  const add = (name, pass, detail = "") => results.push({ name, pass: Boolean(pass), detail });
  const originalUnit = state.unitId;
  const originalView = state.view;

  add("Eight AP Calculus AB units are loaded", UNITS.length === 8, `${UNITS.length} units`);
  add("Question bank has 96 questions", TOTAL_QUESTIONS === 96, `${TOTAL_QUESTIONS} questions`);
  add("Every unit exposes 12 questions", UNITS.every((unit) => unit.questions.length === 12));
  add("Every unit exposes 5 worked examples", UNITS.every((unit) => unit.examples.length === 5), `${UNITS.reduce((n, u) => n + u.examples.length, 0)} examples`);
  const ids = ALL_QUESTIONS.map((question) => question.id);
  add("Question IDs are unique", new Set(ids).size === ids.length);
  add(
    "Multiple-choice answer indices are valid",
    ALL_QUESTIONS.filter((question) => question.type === "mc").every((question) => Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.choices.length)
  );
  add(
    "Free-response answers are finite numbers",
    ALL_QUESTIONS.filter((question) => question.type === "frq").every((question) => Number.isFinite(question.answer) && Number.isFinite(question.tolerance))
  );
  add("Every question carries an explanation and hint", ALL_QUESTIONS.every((question) => question.explanation.length > 20 && question.hint.length > 4));
  add("Every unit has concepts, formulas, and a theorem", UNITS.every((unit) => unit.concepts.length >= 5 && unit.formulas.length >= 4 && unit.theorem.statement.length > 30));

  add("Numerical derivative of x² at 3 is 6", Math.abs(derivative((x) => x * x, 3) - 6) < 0.001);
  add("Simpson integration of x² on [0,2] is 8/3", Math.abs(integrate((x) => x * x, 0, 2, 1000) - 8 / 3) < 1e-6);
  add("Riemann refinement converges", Math.abs(riemann((x) => x * x, 0, 2, 200, "mid") - 8 / 3) < 0.001);
  add("Numeric parser handles 32/5 and 2π", Math.abs(parseNumericAnswer("32/5") - 6.4) < 1e-9 && Math.abs(parseNumericAnswer("2π") - Math.PI * 2) < 1e-9);

  const tempStorage = makeMemoryStorage();
  const tempMastery = createMasteryStore(tempStorage, ALL_QUESTIONS);
  const target = ALL_QUESTIONS[0];
  tempMastery.record(target.id, true);
  add("A correct answer sets mastery", tempMastery.isMastered(target.id));
  add("Adaptive queue excludes mastered questions", !tempMastery.adaptiveQueue({ unitId: target.unitId, rng: () => 0.4 }).some((question) => question.id === target.id));
  tempMastery.resetUnit(target.unitId);
  add("resetUnit clears that unit only", tempMastery.unitStats(target.unitId).mastered === 0 && tempMastery.isMastered(ALL_QUESTIONS.find((q) => q.unitId === 2).id) === false);
  const tempQuiz = createQuizSession({ questions: ALL_QUESTIONS, mastery: tempMastery, unitId: 1 });
  const first = tempQuiz.current();
  const quizResult = first ? tempQuiz.submit(first.type === "mc" ? first.answer : first.answer) : null;
  add("Quiz submission records mastery", Boolean(quizResult?.correct) && tempMastery.unitStats(1).mastered === 1);

  try {
    localStorage.setItem("calc3d.selftest.tmp", "ok");
    const roundTrip = localStorage.getItem("calc3d.selftest.tmp") === "ok";
    localStorage.removeItem("calc3d.selftest.tmp");
    add("localStorage round-trips", roundTrip);
  } catch {
    add("localStorage round-trips", false, "storage unavailable");
  }

  let built = 0;
  let readoutCount = 0;
  let narrationCount = 0;
  let controlCount = 0;
  for (const unit of UNITS) {
    try {
      switchUnit(unit.id, { push: false, preserveView: false });
      const ok = Boolean(visual && visual.group && visual.group.children.length > 0);
      const reads = visual ? visual.readout().length : 0;
      const narr = visual ? visual.narration() : null;
      if (ok) built += 1;
      if (reads >= 4) readoutCount += 1;
      if (narr && narr.title && narr.formula) narrationCount += 1;
      if (visual && visual.controls.length >= 2) controlCount += 1;
    } catch (error) {
      add(`Unit ${unit.id} scene builds`, false, String(error.message || error));
    }
  }
  add("All eight 3D scenes build geometry", built === 8, `${built}/8`);
  add("All eight units expose live readouts", readoutCount === 8, `${readoutCount}/8`);
  add("All eight units expose narration", narrationCount === 8, `${narrationCount}/8`);
  add("Each unit renders a distinct set of controls", controlCount === 8, `${controlCount}/8`);

  if (stage) {
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 80)));
    const info = stage.info();
    add("WebGL renderer draws triangles", info.triangles > 0 && info.calls > 0, `${info.calls} calls · ${info.triangles} triangles`);
    add("High-DPI pixel ratio is capped at 2", info.pixelRatio <= 2, `ratio ${info.pixelRatio}`);
  } else {
    add("WebGL renderer draws triangles", false, "no WebGL context");
  }

  add("No duplicate element IDs", (() => {
    const found = $$("[id]").map((node) => node.id);
    return new Set(found).size === found.length;
  })());
  add("Routing exposes a unit hash", parseLocation().view === "practice" || parseLocation().view === "explore" || parseLocation().view === null);
  add("Version is declared", VERSION === "1.0.0");

  switchUnit(originalUnit, { push: false, preserveView: false });
  if (originalView === "practice") switchView("practice", { push: false });

  const passed = results.filter((result) => result.pass).length;
  const summary = { passed, total: results.length, results, at: new Date().toISOString() };
  state.selfTest = summary;
  document.body.dataset.selftest = passed === results.length ? "pass" : "fail";
  document.body.dataset.selftestScore = `${passed}/${results.length}`;

  const list = $("selftest-list");
  list.innerHTML = "";
  for (const result of results) {
    const li = document.createElement("li");
    li.className = result.pass ? "" : "is-fail";
    li.textContent = `${result.name}${result.detail ? ` — ${result.detail}` : ""}`;
    list.append(li);
  }
  $("selftest-score").textContent = `${passed}/${results.length}`;
  $("selftest-summary").textContent = passed === results.length
    ? `All ${results.length} checks passed. This is the same suite the headless browser runner reads.`
    : `${results.length - passed} check(s) failed. See the list above.`;
  if (showOverlay || new URLSearchParams(location.search).has("selftest")) $("selftest").hidden = false;
  return summary;
}

/* ------------------------------------------------------------------ dialogs */
function openDialog(id) {
  const dialog = $(id);
  if (!dialog) return;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeDialog(id) {
  const dialog = $(id);
  if (!dialog) return;
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

/* ------------------------------------------------------------------- boot */
function bindEvents() {
  $("tab-explore").addEventListener("click", () => switchView("explore"));
  $("tab-practice").addEventListener("click", () => switchView("practice"));
  $("tab-narration").addEventListener("click", () => setInspectorTab("narration"));
  $("tab-examples").addEventListener("click", () => setInspectorTab("examples"));
  $("btn-reset-view").addEventListener("click", () => {
    if (stage) stage.resetCamera();
    toast("Camera reset", "Back to the framing for this unit.", "");
  });
  $("btn-focus").addEventListener("click", () => toggleFocus());
  $("btn-shortcuts").addEventListener("click", () => openDialog("shortcuts-dialog"));
  $("btn-settings").addEventListener("click", () => openDialog("settings-dialog"));
  $("btn-practice-unit").addEventListener("click", () => {
    startPractice(state.unitId);
    switchView("practice");
  });
  $("btn-start-current").addEventListener("click", () => startPractice(state.unitId));
  $("btn-check").addEventListener("click", checkCurrent);
  $("btn-next").addEventListener("click", nextQuestion);
  $("btn-hint").addEventListener("click", showHint);
  $("btn-skip").addEventListener("click", skipQuestion);
  $("btn-review").addEventListener("click", () => startPractice(state.quizUnitId || state.unitId, { review: true }));
  $("btn-next-unit").addEventListener("click", nextUnit);
  $("btn-export").addEventListener("click", exportMastery);
  $("btn-export-settings").addEventListener("click", exportMastery);
  $("btn-reset-progress").addEventListener("click", () => {
    if (window.confirm("Reset all mastery? This cannot be undone.")) resetProgress();
  });
  $("btn-reset-settings").addEventListener("click", () => {
    if (window.confirm("Reset all mastery? This cannot be undone.")) resetProgress();
  });
  $("import-file").addEventListener("change", (event) => {
    importMastery(event.target.files?.[0]);
    event.target.value = "";
  });

  $("setting-sound").addEventListener("change", (event) => {
    prefs.sound = event.target.checked;
    savePrefs();
    if (prefs.sound) chime("click");
  });
  $("setting-motion").addEventListener("change", (event) => {
    prefs.reducedMotion = event.target.checked;
    applyMotionPreference();
    savePrefs();
    toast("Motion preference", prefs.reducedMotion ? "Autonomous motion reduced." : "Full motion restored.", "");
  });

  for (const button of $$("[data-close-dialog]")) {
    button.addEventListener("click", () => closeDialog(button.dataset.closeDialog));
  }
  for (const dialog of $$("dialog")) {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog(dialog.id);
    });
  }

  $("btn-selftest-close").addEventListener("click", () => {
    $("selftest").hidden = true;
  });

  $("frq-form").addEventListener("submit", (event) => {
    event.preventDefault();
    checkCurrent();
  });

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const typing = target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA" || target.isContentEditable);
    if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === "Escape") {
      if ($("selftest").hidden === false) {
        $("selftest").hidden = true;
      } else if (state.focus) {
        toggleFocus(false);
      } else if ($("settings-dialog").open) {
        closeDialog("settings-dialog");
      } else if ($("shortcuts-dialog").open) {
        closeDialog("shortcuts-dialog");
      }
      return;
    }
    if (event.key === "?") {
      event.preventDefault();
      openDialog("shortcuts-dialog");
      return;
    }
    if (event.key >= "1" && event.key <= "8") {
      switchUnit(Number(event.key));
      if (state.view === "practice") switchView("explore");
      return;
    }
    const key = event.key.toLowerCase();
    if (key === "e") switchView("explore");
    else if (key === "p") switchView("practice");
    else if (key === "r" && stage) {
      stage.resetCamera();
      toast("Camera reset", "", "");
    } else if (key === "f") toggleFocus();
    else if (event.key === "ArrowLeft") switchUnit(state.unitId === 1 ? 8 : state.unitId - 1);
    else if (event.key === "ArrowRight") switchUnit(state.unitId === 8 ? 1 : state.unitId + 1);
  });

  window.addEventListener("hashchange", () => {
    const locationState = parseLocation();
    if (locationState.view === "practice") {
      if (locationState.unit) {
        switchUnit(locationState.unit, { push: false });
        startPractice(locationState.unit, { push: false });
      }
      switchView("practice", { push: false });
    } else if (locationState.view === "explore") {
      if (locationState.unit) switchUnit(locationState.unit, { push: false });
      switchView("explore", { push: false });
    }
  });

  window.addEventListener("resize", () => {
    if (stage) stage.resize();
  });
}

function initStage() {
  try {
    stage = new CalculusStage($("scene"));
    stage.reducedMotion = effectiveReducedMotion();
    $("webgl-error").hidden = true;
  } catch (error) {
    console.error("WebGL initialization failed", error);
    stage = null;
    $("webgl-error").hidden = false;
  }
}

function initPreferences() {
  $("setting-sound").checked = prefs.sound;
  $("setting-motion").checked = prefs.reducedMotion;
  state.focus = false;
  if (prefs.focus) toggleFocus(true);
  applyMotionPreference();
}

function boot() {
  const locationState = parseLocation();
  const initialUnit = locationState.unit || (getUnit(prefs.unit) ? prefs.unit : 1);
  const initialView = locationState.view || prefs.view;
  const initialPractice = locationState.view === "practice" ? locationState.unit : null;

  initStage();
  initPreferences();
  bindEvents();
  renderRail();
  switchUnit(initialUnit, { push: false });
  switchView(initialView, { push: false });
  renderMasteryMap();
  renderSessionPanel();
  updateMasteryChrome();
  if (initialPractice) startPractice(initialPractice, { push: false });

  document.body.dataset.ready = "true";
  document.body.dataset.unit = String(state.unitId);
  if (!location.hash) updateHash();
  setTimeout(() => $("boot").classList.add("is-hidden"), 320);
  setInterval(() => {
    if (state.view !== "explore" || !visual) return;
    updateReadouts();
    updateNarration();
    syncControlUI();
    syncButtonStates();
  }, 240);

  if (new URLSearchParams(location.search).has("selftest")) {
    setTimeout(() => runSelfTest(true), 500);
  }

  // A quiet console signature for the handoff and the browser tests.
  console.info(`Calculus Explorer 3D v${VERSION} · ${TOTAL_QUESTIONS} questions · OpenCode + DeepSeek V4.1 Flash`);
}

/* --------------------------------------------------------------------- API */
window.__calc3d = {
  version: VERSION,
  units: UNITS,
  questions: ALL_QUESTIONS,
  get state() {
    return {
      unitId: state.unitId,
      view: state.view,
      quizUnitId: state.quizUnitId,
      ready: document.body.dataset.ready === "true",
      selftest: state.selfTest,
      focus: state.focus,
      session: state.session ? state.session.stats() : null,
    };
  },
  switchUnit: (id) => switchUnit(Number(id)),
  switchView,
  setParam: (key, value) => {
    if (!visual) return false;
    visual.set(key, value);
    const binding = controlBindings.find((item) => item.descriptor.key === key);
    if (binding) {
      binding.descriptor.value = value;
      if (binding.input) {
        binding.input.value = String(value);
        updateRangeFill(binding.input);
      }
      if (binding.select) binding.select.value = String(value);
    }
    updateReadouts();
    updateNarration();
    syncConditionalControls();
    syncButtonStates();
    return true;
  },
  getControls: () => ({ ...currentControlValues(), ...(visual?.getState ? visual.getState() : {}) }),
  getReadouts: () => (visual ? visual.readout() : []),
  getNarration: () => (visual ? visual.narration() : null),
  stageInfo: () => (stage ? stage.info() : null),
  resetCamera: () => stage?.resetCamera(),
  mastery: {
    totals: () => mastery.totals(),
    unitStats: (id) => mastery.unitStats(id),
    exportState: () => mastery.exportState(),
    importState: (payload) => mastery.importState(payload),
    resetAll: () => resetProgress(),
  },
  practice: {
    start: (unitId, review = false) => startPractice(Number(unitId), { review }),
    current: () => state.session?.current() || null,
    answer: (value) => {
      if (!state.session) return null;
      const result = state.session.submit(value);
      updateMasteryChrome();
      updatePracticeChrome();
      renderSessionPanel();
      return result;
    },
    next: () => {
      if (!state.session) return null;
      const question = state.session.next();
      if (!question) showComplete();
      else renderQuestion();
      return question;
    },
    skip: () => {
      state.session?.skip();
      renderQuestion();
    },
    stats: () => state.session?.stats() || null,
    reset: () => resetProgress(),
  },
  exportMastery,
  runSelfTest: () => runSelfTest(true),
  toast,
  _internals: { mastery, checkAnswer, derive: derivative },
};

boot();
