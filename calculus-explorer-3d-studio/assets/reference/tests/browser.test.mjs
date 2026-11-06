// End-to-end verification in headless Chrome over the DevTools Protocol.
// Dependency-free: Node's built-in WebSocket + a local static server.
//
//   node tests/browser.test.mjs
//   TEST_URL=https://somphol.github.io/calculus-explorer-3d/ node tests/browser.test.mjs
//
// The harness launches one Chrome instance with --use-mock-keychain, a
// --password-store=basic profile and a throwaway user-data-dir, so macOS never
// opens repeated Keychain prompts.

import { ROOT } from "./lib/fixtures.mjs";
import { connect, launchBrowser, startServer } from "./lib/harness.mjs";

const results = [];
const consoleErrors = [];
const LIVE = process.env.TEST_URL?.replace(/\/$/, "") || null;
let server;
let browser;
let cdp;

function check(name, condition, detail = "") {
  const ok = Boolean(condition);
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function evaluate(expression) {
  const { result, exceptionDetails } = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
  return result.value;
}

async function waitFor(expression, timeout = 20000) {
  return cdp.waitFor(expression, { timeout });
}

async function navigate(url) {
  const loaded = cdp.once("Page.loadEventFired");
  await cdp.send("Page.navigate", { url });
  await loaded;
  await sleep(1000);
  await waitFor('document.body && document.body.dataset.ready === "true"', 30000);
  await sleep(300);
}

async function reload() {
  const loaded = cdp.once("Page.loadEventFired");
  await cdp.send("Page.reload");
  await loaded;
  await sleep(1000);
  await waitFor('document.body && document.body.dataset.ready === "true"', 30000);
  await sleep(300);
}

async function setRange(key, value) {
  return evaluate(`(() => {
    const wrap = document.querySelector('[data-control="${key}"]');
    const input = wrap && wrap.querySelector('input[type="range"]');
    if (!input) return false;
    input.value = ${JSON.stringify(String(value))};
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
}

async function setSelect(key, value) {
  return evaluate(`(() => {
    const wrap = document.querySelector('[data-control="${key}"]');
    const select = wrap && wrap.querySelector('select');
    if (!select) return false;
    select.value = ${JSON.stringify(String(value))};
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
}

async function clickAction(key) {
  return evaluate(`(() => {
    const wrap = document.querySelector('[data-control="${key}"]');
    const button = wrap && wrap.querySelector('button');
    if (!button) return false;
    button.click();
    return true;
  })()`);
}

async function readoutValues() {
  return evaluate("window.__calc3d.getReadouts().map((item) => item.value)");
}

async function startPractice(unitId) {
  await evaluate(`window.__calc3d.practice.start(${Number(unitId)})`);
  await sleep(250);
}

async function answerCurrentCorrectly() {
  const question = await evaluate("window.__calc3d.practice.current()");
  if (!question) return null;
  if (question.type === "mc") {
    await evaluate(`document.querySelectorAll('.choice')[${question.answer}].click(); document.getElementById('btn-check').click();`);
  } else {
    await evaluate(`document.getElementById('frq-input').value = ${JSON.stringify(String(question.answer))}; document.getElementById('btn-check').click();`);
  }
  await sleep(350);
  return question;
}

async function answerCurrentWrong() {
  const question = await evaluate("window.__calc3d.practice.current()");
  if (!question) return null;
  if (question.type === "mc") {
    const wrong = (question.answer + 1) % question.choices.length;
    await evaluate(`document.querySelectorAll('.choice')[${wrong}].click(); document.getElementById('btn-check').click();`);
  } else {
    await evaluate(`document.getElementById('frq-input').value = ${JSON.stringify(String(Number(question.answer) + 999))}; document.getElementById('btn-check').click();`);
  }
  await sleep(350);
  return question;
}

try {
  server = LIVE ? null : await startServer(ROOT);
  const base = LIVE || server.url;
  browser = await launchBrowser({ width: 1600, height: 1000 });
  const target = await (await fetch(`http://127.0.0.1:${browser.port}/json/new?about:blank`, { method: "PUT" })).json();
  cdp = await connect(target.webSocketDebuggerUrl);

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  cdp.on("Runtime.consoleAPICalled", (payload) => {
    if (payload.type !== "error") return;
    const text = payload.args.map((arg) => arg.description || arg.value).join(" ");
    consoleErrors.push(text);
  });
  cdp.on("Runtime.exceptionThrown", (payload) => {
    consoleErrors.push(payload.exceptionDetails.exception?.description || payload.exceptionDetails.text);
  });

  await navigate(`${base}/`);
  await waitFor("Boolean(window.__calc3d)");

  const boot = await evaluate(`(() => ({
    ready: document.body.dataset.ready,
    title: document.title,
    units: window.__calc3d.units.length,
    questions: window.__calc3d.questions.length,
    stage: window.__calc3d.stageInfo(),
    canvas: (() => { const r = document.getElementById('scene').getBoundingClientRect(); return { width: Math.round(r.width), height: Math.round(r.height) }; })(),
    readouts: window.__calc3d.getReadouts().length,
    controls: document.querySelectorAll('.control').length
  }))()`);
  check("Page reaches ready state", boot.ready === "true");
  check("Title names the product", /Calculus Explorer 3D/.test(boot.title), boot.title);
  check("Eight units and 96 questions are exposed", boot.units === 8 && boot.questions === 96, `${boot.units}/${boot.questions}`);
  check("Canvas has a non-zero size", boot.canvas.width > 300 && boot.canvas.height > 200, `${boot.canvas.width}×${boot.canvas.height}`);
  check("WebGL draws triangles", boot.stage && boot.stage.calls > 0 && boot.stage.triangles > 0, boot.stage ? `${boot.stage.calls} calls · ${boot.stage.triangles} triangles` : "no stage");
  check("Initial unit has six readouts and controls", boot.readouts === 6 && boot.controls >= 2, `${boot.readouts}/${boot.controls}`);

  // All eight units
  for (let unit = 1; unit <= 8; unit += 1) {
    await evaluate(`window.__calc3d.switchUnit(${unit})`);
    await sleep(450);
    const info = await evaluate(`(() => ({
      unit: window.__calc3d.state.unitId,
      readouts: window.__calc3d.getReadouts().length,
      controls: document.querySelectorAll('.control').length,
      title: document.getElementById('unit-title').textContent,
      narration: window.__calc3d.getNarration()?.title || "",
      stage: window.__calc3d.stageInfo()
    }))()`);
    check(`Unit ${unit} renders`, info.unit === unit && info.readouts === 6 && info.controls >= 2 && info.title.length > 3 && info.narration.length > 3, `${info.title} · ${info.controls} controls · ${info.stage.triangles} tris`);
  }

  // Unit 1: model and tracer
  await evaluate("window.__calc3d.switchUnit(1)");
  await sleep(250);
  await setSelect("model", "asymptote");
  await setRange("left", 0.9);
  await sleep(250);
  let values = await readoutValues();
  check("Unit 1 asymptote shows divergent one-sided limits", values.includes("−∞") && values.includes("+∞") && values.includes("no two-sided limit"), values.join(" | "));
  await clickAction("sweep");
  await sleep(900);
  const sweepState = await evaluate("window.__calc3d.getControls()");
  check("Unit 1 sweep writes back to the slider", Number(sweepState.left) > 0.5, `left=${sweepState.left}`);

  // Unit 2: probe and shrink
  await evaluate("window.__calc3d.switchUnit(2)");
  await setSelect("preset", "sine");
  await setRange("x0", 1.2);
  await sleep(200);
  values = await readoutValues();
  check("Unit 2 reports a tangent slope", values.length === 6 && Math.abs(Number(values[4])) > 0.01, values.join(" | "));
  await clickAction("shrink");
  await sleep(1200);
  const shrink = await evaluate("window.__calc3d.getControls()");
  check("Unit 2 shrink animation reduces Δx", Number(shrink.dx) < 1.2, `dx=${shrink.dx}`);

  // Unit 4: ladder
  await evaluate("window.__calc3d.switchUnit(4)");
  await setSelect("model", "ladder");
  await sleep(300);
  const ladder = await evaluate(`(() => ({
    controls: window.__calc3d.getControls(),
    hidden: document.querySelector('[data-control="h"]').classList.contains('is-hidden'),
    visible: !document.querySelector('[data-control="base"]').classList.contains('is-hidden'),
    readouts: window.__calc3d.getReadouts().map(r => r.value)
  }))()`);
  check("Unit 4 switches to the ladder model", ladder.hidden && ladder.visible && ladder.controls.model === "ladder", ladder.readouts.join(" | "));
  check("Unit 4 ladder has a negative vertical rate", Number(ladder.controls.dydt) < 0, `dy/dt=${ladder.controls.dydt}`);

  // Unit 5: MVT
  await evaluate("window.__calc3d.switchUnit(5)");
  await clickAction("mvt");
  await setSelect("preset", "quartic");
  await sleep(350);
  values = await readoutValues();
  check("Unit 5 MVT produces a witness c", values[5] !== "toggle to show" && Number.isFinite(Number(values[5])), values[5]);

  // Unit 6: refine
  await evaluate("window.__calc3d.switchUnit(6)");
  await setSelect("method", "trap");
  await setRange("n", 40);
  await sleep(300);
  values = await readoutValues();
  check("Unit 6 trapezoid at n = 40 is accurate", values[0] === "40" && Number(values[5].replace("%", "")) < 1, values.join(" | "));
  await clickAction("refine");
  await sleep(1400);
  const refined = await evaluate("window.__calc3d.getControls()");
  check("Unit 6 refine increases n", Number(refined.n) > 40, `n=${refined.n}`);

  // Unit 7: drop a particle
  await evaluate("window.__calc3d.switchUnit(7)");
  await setSelect("preset", "trig");
  await setRange("startX", -1);
  await setRange("startY", 2);
  await clickAction("drop");
  await sleep(500);
  const particles = await evaluate("window.__calc3d.getControls()");
  check("Unit 7 drop adds a solution particle", Number(particles.trails) >= 2, `trails=${particles.trails}`);

  // Unit 8: cross-sections then washer
  await evaluate("window.__calc3d.switchUnit(8)");
  await setSelect("mode", "cross");
  await setSelect("shape", "semicircle");
  await setRange("slices", 18);
  await sleep(400);
  values = await readoutValues();
  check("Unit 8 cross-section volume is 4π", Math.abs(Number(values[2]) - 4 * Math.PI) < 0.01, values[2]);
  await setSelect("mode", "revolve");
  await setRange("angle", 180);
  await clickAction("washer");
  await sleep(500);
  values = await readoutValues();
  check("Unit 8 washer at 180° sweeps half the volume", values[0] === "Washer" && Math.abs(Number(values[2]) / 2 - Number(values[3])) < 0.02, values.join(" | "));

  // Practice: correct answer
  await evaluate('document.getElementById("tab-practice").click()');
  await sleep(250);
  await startPractice(2);
  const practiceBefore = await evaluate("window.__calc3d.practice.stats()");
  const answered = await answerCurrentCorrectly();
  const afterCorrect = await evaluate(`(() => ({
    feedback: document.getElementById('quiz-feedback').className,
    nextVisible: !document.getElementById('btn-next').hidden,
    remainingText: document.getElementById('quiz-remaining').textContent,
    unitMastered: window.__calc3d.mastery.unitStats(2).mastered,
    current: window.__calc3d.practice.current()?.id || null,
    stored: Boolean(localStorage.getItem('calc3d.mastery.v1')),
    totals: window.__calc3d.mastery.totals()
  }))()`);
  check("Practice session starts with 12 unmastered", practiceBefore.remaining === 12);
  check("Correct answer produces feedback and a next action", afterCorrect.feedback.includes("is-correct") && afterCorrect.nextVisible);
  check("Correct answer masters the question", Boolean(answered) && afterCorrect.unitMastered >= 1);
  check("Practice queue shrinks after a correct answer", afterCorrect.remainingText.includes("11"), afterCorrect.remainingText);
  check("Mastery is written to localStorage", afterCorrect.stored);
  check("Mastery totals update", afterCorrect.totals.mastered >= 1, `${afterCorrect.totals.mastered}/${afterCorrect.totals.total}`);

  // Persistence and adaptive exclusion
  await reload();
  await waitFor("Boolean(window.__calc3d)");
  await evaluate('document.getElementById("tab-practice").click()');
  await startPractice(2);
  const persisted = await evaluate(`(() => ({
    mastered: window.__calc3d.mastery.unitStats(2).mastered,
    remaining: window.__calc3d.practice.stats().remaining,
    current: window.__calc3d.practice.current()?.id || null,
    totals: window.__calc3d.mastery.totals()
  }))()`);
  check("Mastery survives a reload", persisted.mastered >= 1 && persisted.totals.mastered >= 1);
  check("Adaptive queue excludes the mastered question", persisted.remaining === 11, `${persisted.remaining} remaining`);
  check("Reloaded queue starts on another question", persisted.current && persisted.current !== answered.id, `${persisted.current} vs ${answered.id}`);

  // Wrong answer behavior
  await startPractice(3);
  const wrongQuestion = await answerCurrentWrong();
  const afterWrong = await evaluate(`(() => ({
    feedback: document.getElementById('quiz-feedback').className,
    remaining: window.__calc3d.practice.stats().remaining,
    mastered: window.__calc3d.mastery.unitStats(3).mastered,
    queue: window.__calc3d.practice.stats().answered
  }))()`);
  check("Wrong answer shows the incorrect state", afterWrong.feedback.includes("is-wrong"));
  check("Wrong answer stays in the adaptive queue", afterWrong.remaining === 12, `${afterWrong.remaining} remaining`);
  check("Wrong answer does not master the question", afterWrong.mastered === 0 && Boolean(wrongQuestion));

  // Free-response flow: skip through Unit 6 until an FRQ appears
  await startPractice(6);
  let frqQuestion = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const current = await evaluate("window.__calc3d.practice.current()");
    if (current && current.type === "frq") {
      frqQuestion = current;
      break;
    }
    await evaluate('document.getElementById("btn-skip").click()');
    await sleep(120);
  }
  check("Free-response question is reachable", Boolean(frqQuestion), frqQuestion ? frqQuestion.id : "none found");
  if (frqQuestion) {
    await evaluate(`document.getElementById('frq-input').value = ${JSON.stringify(String(frqQuestion.answer))}; document.getElementById('btn-check').click();`);
    await sleep(350);
    const frqState = await evaluate(`(() => ({
      feedback: document.getElementById('quiz-feedback').className,
      unitMastered: window.__calc3d.mastery.unitStats(6).mastered,
      inputDisabled: document.getElementById('frq-input').disabled
    }))()`);
    check("Numeric FRQ answer is accepted", frqState.feedback.includes("is-correct") && frqState.inputDisabled);
    check("FRQ correct answer masters the question", frqState.unitMastered >= 1);
  }

  // Export
  const exported = await evaluate("window.__calc3d.mastery.exportState()");
  check("Mastery export has the app marker and schema", exported.app === "calculus-explorer-3d" && exported.schema === 1 && Boolean(exported.state));

  // Mobile layout
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await reload();
  await waitFor("Boolean(window.__calc3d)");
  await evaluate('document.getElementById("tab-explore").click()');
  await sleep(600);
  const mobile = await evaluate(`(() => ({
    inner: innerWidth,
    scroll: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    stage: Math.round(document.getElementById('stage-shell').getBoundingClientRect().width),
    controls: Math.round(document.getElementById('controls').getBoundingClientRect().width)
  }))()`);
  check("390 px viewport has no horizontal overflow", mobile.inner === 390 && mobile.scroll === 390 && mobile.body === 390, JSON.stringify(mobile));
  check("390 px stage and controls fit the viewport", mobile.stage <= 390 && mobile.controls <= 390, `${mobile.stage}/${mobile.controls}`);

  // Deep link (same-document hash change, so no load event)
  await cdp.send("Emulation.clearDeviceMetricsOverride");
  await evaluate('location.hash = "#practice/4"');
  await waitFor("window.__calc3d.state.view === 'practice' && window.__calc3d.state.quizUnitId === 4", 10000);
  await sleep(400);
  const deepLink = await evaluate(`(() => ({
    view: window.__calc3d.state.view,
    quizUnitId: window.__calc3d.state.quizUnitId,
    active: !document.getElementById('quiz-active').hidden || !document.getElementById('quiz-complete').hidden
  }))()`);
  check("Deep link opens the practice unit", deepLink.view === "practice" && deepLink.quizUnitId === 4 && deepLink.active, JSON.stringify(deepLink));

  // In-page self-test
  const selfTest = await evaluate("window.__calc3d.runSelfTest()");
  const selfTestBadge = await evaluate("document.body.dataset.selftest");
  check("In-page self-test passes every check", selfTest.passed === selfTest.total && selfTestBadge === "pass", `${selfTest.passed}/${selfTest.total}`);
  const selftestDetails = selfTest.results.filter((result) => !result.pass).map((result) => result.name);
  if (selftestDetails.length) check("Self-test failure detail", false, selftestDetails.join(", "));

  // Console hygiene
  check("No console errors or uncaught exceptions", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
} catch (error) {
  check("Test run completed without throwing", false, String(error.message || error));
  console.error(error);
} finally {
  if (cdp) cdp.close();
  if (browser) browser.proc.kill();
  if (server) await server.close();
}

const passed = results.filter((result) => result.ok).length;
console.log(`\n${passed}/${results.length} checks passed${LIVE ? " (live deployment)" : " (local)"}`);
if (consoleErrors.length) {
  console.log("\nConsole errors:");
  consoleErrors.slice(0, 10).forEach((error) => console.log("  " + error));
}
if (passed !== results.length) process.exitCode = 1;
