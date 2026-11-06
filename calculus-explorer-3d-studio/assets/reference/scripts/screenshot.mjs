// Regenerates the README screenshots and social card.
//
//   node scripts/screenshot.mjs
//
// One headless Chrome instance, mock keychain, throwaway profile, local server.
// Writes assets/studio.png, unit-grid.png, mastery.png, mobile.png, og.png.

import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../tests/lib/fixtures.mjs";
import { connect, launchBrowser, startServer } from "../tests/lib/harness.mjs";

const OUT = join(ROOT, "assets");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const server = await startServer(ROOT);
const browser = await launchBrowser({ width: 1600, height: 1000 });
const target = await (await fetch(`http://127.0.0.1:${browser.port}/json/new?about:blank`, { method: "PUT" })).json();
const cdp = await connect(target.webSocketDebuggerUrl);

const evaluate = async (expression) => {
  const { result, exceptionDetails } = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
  return result.value;
};

const shot = async (name, clip) => {
  const { data } = await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    ...(clip ? { clip: { ...clip, scale: 1 } } : {}),
  });
  writeFileSync(join(OUT, name), Buffer.from(data, "base64"));
  console.log(`wrote assets/${name}`);
};

const setViewport = (width, height, deviceScaleFactor = 1, mobile = false) =>
  cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor, mobile });

try {
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cdp.send("Page.navigate", { url: `${server.url}/` });
  await cdp.waitFor('document.body && document.body.dataset.ready === "true"', { timeout: 30000 });
  await sleep(1000);

  // Hero: the solids of revolution studio
  await evaluate('window.__calc3d.switchUnit(8)');
  await evaluate('document.getElementById("tab-explore").click()');
  await sleep(900);
  await shot("studio.png");

  // Four units for a contact sheet
  const frames = [];
  for (const unit of [3, 4, 6, 8]) {
    await evaluate(`window.__calc3d.switchUnit(${unit})`);
    await sleep(900);
    const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
    frames.push({ unit, data });
  }

  // Mastery view with one correct answer
  await evaluate('window.__calc3d.switchUnit(1)');
  await evaluate('document.getElementById("tab-practice").click()');
  await sleep(250);
  await evaluate('window.__calc3d.practice.start(1)');
  await sleep(300);
  const question = await evaluate("window.__calc3d.practice.current()");
  if (question) {
    if (question.type === "mc") {
      await evaluate(`document.querySelectorAll('.choice')[${question.answer}].click(); document.getElementById('btn-check').click();`);
    } else {
      await evaluate(`document.getElementById('frq-input').value=${JSON.stringify(String(question.answer))}; document.getElementById('btn-check').click();`);
    }
  }
  await sleep(700);
  await shot("mastery.png");

  // Mobile explore
  await setViewport(390, 844, 2, true);
  await cdp.send("Page.reload");
  await cdp.waitFor('document.body && document.body.dataset.ready === "true"', { timeout: 30000 });
  await evaluate('document.getElementById("tab-explore").click()');
  await evaluate('window.__calc3d.switchUnit(8)');
  await sleep(900);
  await shot("mobile.png");

  // Contact sheet built from the four frame data URLs
  const cards = frames
    .map(
      (frame) =>
        `<figure><img src="data:image/png;base64,${frame.data}" alt="Unit ${frame.unit}"><figcaption>UNIT 0${frame.unit}</figcaption></figure>`
    )
    .join("");
  const contactHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;background:#050b14;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#e8f0fa}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:2px;width:1600px;height:1000px;padding:2px;background:#050b14}
    figure{margin:0;position:relative;overflow:hidden;border:1px solid rgba(148,163,184,.18);border-radius:10px;background:#07111f}
    img{width:100%;height:100%;object-fit:cover;display:block}
    figcaption{position:absolute;left:14px;top:12px;padding:5px 9px;border-radius:6px;background:rgba(5,11,20,.8);border:1px solid rgba(94,234,212,.3);color:#5eead4;font-size:12px;font-weight:800;letter-spacing:.14em}
    .title{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:3;padding:18px 28px;border-radius:14px;background:rgba(5,11,20,.9);border:1px solid rgba(94,234,212,.35);text-align:center;box-shadow:0 20px 80px rgba(0,0,0,.6)}
    .title strong{display:block;font-family:Georgia,serif;font-size:34px;font-weight:500;letter-spacing:-.01em}
    .title span{display:block;margin-top:4px;color:#8aa0b6;font-size:10px;font-weight:800;letter-spacing:.2em}
  </style></head><body><div class="grid">${cards}</div><div class="title"><strong>Eight units. Eight living models.</strong><span>CALCULUS EXPLORER 3D</span></div></body></html>`;
  const contactPath = join(ROOT, "_contact.html");
  writeFileSync(contactPath, contactHtml);
  await setViewport(1600, 1000, 1, false);
  await cdp.send("Page.navigate", { url: `${server.url}/_contact.html` });
  await sleep(800);
  await shot("unit-grid.png");
  unlinkSync(contactPath);

  // Open Graph card
  const studio = readFileSync(join(OUT, "studio.png")).toString("base64");
  const ogHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;width:1200px;height:630px;overflow:hidden;background:#050b14;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#e8f0fa}
    .bg{position:absolute;inset:0;background:url(data:image/png;base64,${studio}) center/cover;filter:saturate(.85) brightness(.48)}
    .veil{position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,11,20,.96) 0%,rgba(5,11,20,.86) 46%,rgba(5,11,20,.25) 100%)}
    .wrap{position:relative;z-index:2;padding:62px 68px;height:100%;display:flex;flex-direction:column;justify-content:space-between}
    .mark{width:62px;height:62px;display:grid;place-items:center;border-radius:18px;border:1px solid rgba(94,234,212,.4);color:#5eead4;font-family:Georgia,serif;font-size:38px;background:rgba(94,234,212,.06)}
    .eyebrow{font-size:11px;font-weight:800;letter-spacing:.24em;color:#5eead4;margin-bottom:12px}
    h1{font-family:Georgia,serif;font-weight:500;font-size:62px;line-height:.98;letter-spacing:-.025em;margin:0 0 16px;max-width:760px}
    p{font-size:17px;line-height:1.5;color:#a9bdd0;max-width:620px;margin:0}
    .foot{display:flex;justify-content:space-between;align-items:flex-end;font-size:11px;color:#7b93a8;letter-spacing:.05em}
    .foot strong{color:#e8f0fa;font-weight:600}
    .chips{display:flex;gap:8px;margin-top:22px}
    .chip{padding:7px 12px;border:1px solid rgba(148,163,184,.24);border-radius:999px;background:rgba(5,11,20,.5);font-size:10px;font-weight:700;color:#a9bdd0}
  </style></head><body><div class="bg"></div><div class="veil"></div><div class="wrap">
    <div><div class="mark">∫</div><div style="height:34px"></div><div class="eyebrow">AP CALCULUS AB · INTERACTIVE 3D</div>
      <h1>See the calculus.<br>Don’t just solve it.</h1>
      <p>Eight live WebGL models, 40 worked examples, and an adaptive mastery engine that practices only what you haven’t mastered.</p>
      <div class="chips"><span class="chip">8 UNITS</span><span class="chip">96 QUESTIONS</span><span class="chip">100% LOCAL</span></div>
    </div>
    <div class="foot"><span>Built with <strong>OpenCode</strong> + <strong>DeepSeek V4.1 Flash</strong></span><span>somphol.github.io/calculus-explorer-3d</span></div>
  </div></body></html>`;
  const ogPath = join(ROOT, "_og.html");
  writeFileSync(ogPath, ogHtml);
  await setViewport(1200, 630, 1, false);
  await cdp.send("Page.navigate", { url: `${server.url}/_og.html` });
  await sleep(700);
  await shot("og.png");
  unlinkSync(ogPath);
} finally {
  cdp.close();
  browser.proc.kill();
  await server.close();
}
