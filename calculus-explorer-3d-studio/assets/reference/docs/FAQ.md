# FAQ

**Does it work offline?**
After the first load, the HTML/CSS/JS may be cached by the browser, but Three.js comes from jsDelivr and is not bundled. The repository is not a guaranteed offline package. Use a local static server for classroom machines with network access, or vendor `three.module.js` and change the import map if you need true offline.

**Why is there no build step?**
The app is one page and a handful of ES modules. A bundler would add a toolchain and a deploy artifact without changing the runtime. The source is the site.

**Why does the first load need internet?**
Pinned Three.js from a CDN. See above.

**Why are free-response answers numeric?**
There is no backend or symbolic grader. Numeric answers are objective and testable. The worked examples show the full reasoning; FRQs test the final value. Fractions and π multiples are accepted.

**I answered correctly but mastery did not reach 100%.**
Each unit has 12 questions. Mastery is per question. A correct answer removes that question; the other unmastered questions remain. The unit ring shows `mastered / 12`.

**I missed a review question. Why is it still mastered?**
Mastery is monotonic by design: one correct answer flags the question. A review miss increments `lapses` but does not revoke mastery. Reset the unit if you want a clean slate.

**How do I reset one unit?**
The UI currently resets all progress. Per-unit reset exists in the store (`resetUnit`) and is used by tests, but it is not exposed as a button. Add a button and call `mastery.resetUnit(id)` if you need it.

**Where is my progress stored?**
`localStorage` under `calc3d.mastery.v1`. Export it from Settings → Export mastery. Import it on another browser.

**Can I use it on a phone?**
Yes. The layout reflows at 1120, 860, 620, and 390 px. The canvas uses touch orbit/pinch, and the dock stacks. The 390 px layout hides the last two readout chips to keep the stage legible; the narration still contains the values.

**Why does the unit rail scroll sideways on mobile?**
Eight units do not fit in 390 px. The rail is a horizontal scroller with the scrollbar hidden. The active unit is highlighted.

**Why is the tangent line so thick?**
It is a glowing cylinder, not a 1 px line, so it reads at a distance. Change `radius` in `unit2.js` if you want a finer line.

**Why does the ladder disappear into the wall?**
It did in an early build. The ladder is now at z ≈ 1.82, in front of the wall face at z = 1.61. If you move the wall, move the ladder with it.

**Why does the solid of revolution look open at 180°?**
A partial lathe is open by definition. The custom builder adds flat caps at the two angular ends; at 360° the caps are omitted because the surface closes.

**Why does Unit 7 show a short curve?**
The field `dy/dx = x + y` grows quickly. RK4 clips at ±60 and display clips at ±4.3, so explosive starts produce short arcs. Try `dy/dx = sin x cos y` or `−0.6y` for longer curves.

**Why does the in-page self-test take a moment?**
It builds all eight scenes and renders a frame, then restores your unit. It uses an in-memory mastery store and does not touch your progress.

**Is this affiliated with Khan Academy or the College Board?**
No. The unit structure follows the public AP Calculus AB framework. All content is original. AP® is a College Board trademark; Khan Academy is a Khan Academy, Inc. trademark. See the README disclaimer.

**How was it built?**
With OpenCode and DeepSeek V4.1 Flash. See [state.json](../state.json) for elapsed time, token counters, verification, and deployment. The exact rebuild recipe is [REPRODUCTION.md](REPRODUCTION.md).

**Can I reuse it?**
MIT. Keep the license notice. Do not redistribute third-party trademarks or imply endorsement.
