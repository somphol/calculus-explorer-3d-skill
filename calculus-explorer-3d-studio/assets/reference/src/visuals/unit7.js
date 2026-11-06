// UNIT 7 — Differential equations
// A colour-coded slope field on a glass plane. Click anywhere to drop an RK4
// solution particle; it traces the integral curve through the vector flow.

import * as THREE from "three";
import { clamp, formatNumber, rk4Path } from "../core/math.js";
import { dot, lineFromPoints, makeTextSprite, tubeFromPoints } from "./common.js";

const PRESETS = {
  sum: { label: "dy/dx = x + y", f: (x, y) => x + y, equation: "dy/dx = x + y" },
  difference: { label: "dy/dx = y − x", f: (x, y) => y - x, equation: "dy/dx = y − x" },
  product: { label: "dy/dx = 0.35xy", f: (x, y) => 0.35 * x * y, equation: "dy/dx = 0.35xy" },
  trig: { label: "dy/dx = sin x cos y", f: (x, y) => Math.sin(x) * Math.cos(y), equation: "dy/dx = sin x cos y" },
  decay: { label: "dy/dx = −0.6y", f: (x, y) => -0.6 * y, equation: "dy/dx = −0.6y" },
  circle: { label: "dy/dx = −x/y", f: (x, y) => (Math.abs(y) < 0.18 ? 4 * Math.sign(y || 1) : -x / y), equation: "dy/dx = −x/y" },
};

const COLORS = ["#5eead4", "#fbbf24", "#a78bfa", "#fb7185", "#7dd3fc", "#f472b6"];

export function createUnit7Scene() {
  const group = new THREE.Group();
  const state = { preset: "sum", startX: 0, startY: 1, particles: 0 };
  const fieldLayer = new THREE.Group();
  const trailLayer = new THREE.Group();
  group.add(fieldLayer, trailLayer);

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(8.6, 8.6),
    new THREE.MeshStandardMaterial({ color: "#071421", roughness: 0.9, metalness: 0.12, transparent: true, opacity: 0.72 })
  );
  plane.position.z = -0.03;
  plane.receiveShadow = true;
  group.add(plane);
  const border = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-4.3, -4.3, 0), new THREE.Vector3(4.3, -4.3, 0),
      new THREE.Vector3(4.3, 4.3, 0), new THREE.Vector3(-4.3, 4.3, 0),
    ]),
    new THREE.LineBasicMaterial({ color: "#2b4d5e", transparent: true, opacity: 0.7 })
  );
  group.add(border);
  group.add(lineFromPoints([new THREE.Vector3(-4.3, 0, 0.02), new THREE.Vector3(4.3, 0, 0.02)], "#fb7185", 0.55));
  group.add(lineFromPoints([new THREE.Vector3(0, -4.3, 0.02), new THREE.Vector3(0, 4.3, 0.02)], "#5eead4", 0.55));
  group.add(lineFromPoints([new THREE.Vector3(-4.3, -4.3, -1.2), new THREE.Vector3(-4.3, -4.3, 0.8)], "#60a5fa", 0.5));
  const xLabel = makeTextSprite("x", { color: "#fb7185", size: 0.28 });
  xLabel.position.set(4.5, 0.15, 0.1);
  const yLabel = makeTextSprite("y", { color: "#5eead4", size: 0.28 });
  yLabel.position.set(0.12, 4.5, 0.1);
  group.add(xLabel, yLabel);

  let pickPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(8.6, 8.6),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
  );
  group.add(pickPlane);

  let trails = [];
  let colorIndex = 0;

  function preset() {
    return PRESETS[state.preset];
  }

  function buildField() {
    for (const child of fieldLayer.children.slice()) {
      fieldLayer.remove(child);
      child.geometry?.dispose();
      child.material?.dispose();
    }
    const positions = [];
    const colors = [];
    const p = preset();
    const step = 0.5;
    const teal = new THREE.Color("#5eead4");
    const amber = new THREE.Color("#fbbf24");
    const rose = new THREE.Color("#fb7185");
    for (let x = -4; x <= 4.001; x += step) {
      for (let y = -4; y <= 4.001; y += step) {
        const slope = p.f(x, y);
        if (!Number.isFinite(slope)) continue;
        const clamped = clamp(slope, -6, 6);
        const length = 0.24;
        const norm = Math.hypot(1, clamped);
        const dx = (length / norm) * 0.9;
        const dy = (length / norm) * clamped;
        positions.push(x - dx, y - dy, 0.01, x + dx, y + dy, 0.01);
        const t = Math.min(1, Math.abs(clamped) / 3.5);
        const color = clamped > 0.05 ? teal.clone().lerp(amber, t * 0.7) : clamped < -0.05 ? rose.clone().lerp(amber, t * 0.4) : amber;
        for (let k = 0; k < 2; k += 1) colors.push(color.r, color.g, color.b);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.82 });
    fieldLayer.add(new THREE.LineSegments(geometry, material));
  }

  function spawn(x0, y0) {
    const p = preset();
    const f = p.f;
    const forward = rk4Path({ f, x0, y0, step: 0.055, steps: 210, direction: 1 });
    const backward = rk4Path({ f, x0, y0, step: 0.055, steps: 210, direction: -1 });
    const combined = backward.slice(1).reverse().concat(forward);
    const points = combined.filter((point) => Math.abs(point.x) <= 4.3 && Math.abs(point.y) <= 4.3);
    if (points.length < 4) return null;
    const color = COLORS[colorIndex % COLORS.length];
    colorIndex += 1;
    const allPoints = points.map((point) => new THREE.Vector3(point.x, point.y, 0.08));
    const preview = lineFromPoints(allPoints, color, 0.22);
    const glow = tubeFromPoints(allPoints, color, { radius: 0.012, opacity: 0.3, emissive: 0.8 });
    const brightGeometry = new THREE.BufferGeometry().setFromPoints(allPoints);
    const bright = new THREE.Line(
      brightGeometry,
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.98 })
    );
    bright.geometry.setDrawRange(0, 0);
    const crumbs = new THREE.Points(
      new THREE.BufferGeometry().setFromPoints(allPoints),
      new THREE.PointsMaterial({ color, size: 0.045, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    crumbs.geometry.setDrawRange(0, 0);
    const head = dot(new THREE.Vector3(points[0].x, points[0].y, 0.12), color, 0.09, 1.4);
    const startRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.018, 8, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 })
    );
    startRing.position.set(x0, y0, 0.1);
    const trail = { points, preview, glow, bright, crumbs, head, startRing, color, progress: 0, speed: 0.42 };
    trailLayer.add(preview, glow, bright, crumbs, head, startRing);
    trails.push(trail);
    state.particles = trails.length;
    state.focus = points[Math.floor(points.length / 2)];
    if (trails.length > 8) {
      const oldest = trails.shift();
      for (const object of [oldest.preview, oldest.glow, oldest.bright, oldest.crumbs, oldest.head, oldest.startRing]) {
        trailLayer.remove(object);
        object.geometry?.dispose();
        object.material?.dispose();
      }
      state.particles = trails.length;
    }
    return trail;
  }

  function clear() {
    for (const trail of trails) {
      for (const object of [trail.preview, trail.glow, trail.bright, trail.crumbs, trail.head, trail.startRing]) {
        trailLayer.remove(object);
        object.geometry?.dispose();
        object.material?.dispose();
      }
    }
    trails = [];
    state.particles = 0;
    state.focus = null;
  }

  function set(key, value) {
    if (key === "preset") {
      state.preset = value;
      buildField();
      clear();
      spawn(0, 1);
    } else if (key === "startX") {
      state.startX = Number(value);
    } else if (key === "startY") {
      state.startY = Number(value);
    }
  }

  function action(key) {
    if (key === "drop") spawn(state.startX, state.startY);
    else if (key === "clear") clear();
    else if (key === "reset") {
      clear();
      state.startX = 0;
      state.startY = 1;
      const xSlider = this.controls.find((control) => control.key === "startX");
      const ySlider = this.controls.find((control) => control.key === "startY");
      if (xSlider) xSlider.value = 0;
      if (ySlider) ySlider.value = 1;
      spawn(0, 1);
    }
  }

  function onPointer({ raycaster }) {
    const hit = raycaster.intersectObject(pickPlane)[0];
    if (!hit) return;
    const x = clamp(hit.point.x, -4, 4);
    const y = clamp(hit.point.y, -4, 4);
    state.startX = x;
    state.startY = y;
    const xSlider = this.controls?.find((control) => control.key === "startX");
    const ySlider = this.controls?.find((control) => control.key === "startY");
    if (xSlider) xSlider.value = x;
    if (ySlider) ySlider.value = y;
    spawn(x, y);
  }

  function readout() {
    const p = preset();
    const focus = state.focus;
    return [
      { label: "Equation", value: p.equation, tone: "teal" },
      { label: "Particles", value: String(state.particles), tone: "muted" },
      { label: "Last start x", value: formatNumber(state.startX, 2), tone: "amber" },
      { label: "Last start y", value: formatNumber(state.startY, 2), tone: "amber" },
      { label: "Slope at start", value: formatNumber(p.f(state.startX, state.startY), 3), tone: "violet" },
      { label: "Curve point", value: focus ? `(${formatNumber(focus.x, 2)}, ${formatNumber(focus.y, 2)})` : "—", tone: "muted" },
    ];
  }

  function narration() {
    const p = preset();
    const startSlope = p.f(state.startX, state.startY);
    return {
      title: "Slope fields encode a differential equation",
      lead: "At every grid point, the segment’s slope is the value of dy/dx. A solution is a curve that is tangent to every segment it crosses.",
      formula: `${p.equation}<br>at (${formatNumber(state.startX, 2)}, ${formatNumber(state.startY, 2)}): m = ${formatNumber(startSlope, 3)}`,
      note: "Each click launches a particle integrated with fourth-order Runge–Kutta. The faint line is the whole trajectory; the bright line is the part the particle has already traced.",
      status: `RK4 · ${state.particles} particle${state.particles === 1 ? "" : "s"}`,
    };
  }

  buildField();
  spawn(0, 1);

  return {
    group,
    camera: { position: [6.2, 5.2, 9.9], target: [0, 0, 0], fov: 40 },
    controls: [
      { type: "select", key: "preset", label: "Differential equation", value: "sum", options: Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })) },
      { type: "range", key: "startX", label: "Drop x", min: -3.8, max: 3.8, step: 0.05, value: 0 },
      { type: "range", key: "startY", label: "Drop y", min: -3.8, max: 3.8, step: 0.05, value: 1 },
      { type: "button", key: "drop", label: "Drop solution particle" },
      { type: "button", key: "clear", label: "Clear trails" },
      { type: "button", key: "reset", label: "Reset lab" },
    ],
    set,
    action,
    onPointer,
    readout,
    narration,
    update(dt) {
      for (const trail of trails) {
        if (trail.progress >= 1) {
          trail.head.position.copy(trail.points[trail.points.length - 1]).setZ(0.12);
          continue;
        }
        trail.progress = Math.min(1, trail.progress + dt * trail.speed);
        const count = Math.max(2, Math.floor(trail.progress * trail.points.length));
        trail.bright.geometry.setDrawRange(0, count);
        trail.crumbs.geometry.setDrawRange(0, count);
        const point = trail.points[Math.min(trail.points.length - 1, count - 1)];
        trail.head.position.set(point.x, point.y, 0.12);
        trail.head.scale.setScalar(1 + Math.sin(performance.now() / 220) * 0.15);
        if (trail.progress > 0.45) state.focus = point;
      }
    },
    getState() {
      return { ...state, trails: trails.length };
    },
    dispose() {},
  };
}
