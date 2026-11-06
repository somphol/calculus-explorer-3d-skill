// UNIT 2 — Derivatives: definition and basic rules
// A tangent cylinder glides along a 3D curve while a secant slope triangle
// collapses. The readout compares the secant slope with the true derivative.

import * as THREE from "three";
import { clamp, derivative, formatNumber } from "../core/math.js";
import { dot, lineFromPoints, makeTextSprite, tubeFromPoints } from "./common.js";

const PRESETS = {
  cubic: {
    label: "Cubic ridge",
    f: (x) => 0.35 * x ** 3 - 1.2 * x + 1,
    df: (x) => 1.05 * x ** 2 - 1.2,
    domain: [-2.6, 2.6],
    color: "#7dd3fc",
  },
  sine: {
    label: "Sine wave",
    f: (x) => 1.5 * Math.sin(1.15 * x) + 0.7,
    df: (x) => 1.725 * Math.cos(1.15 * x),
    domain: [-2.9, 2.9],
    color: "#5eead4",
  },
  parabola: {
    label: "Parabola",
    f: (x) => 0.5 * x * x - 1.4,
    df: (x) => x,
    domain: [-2.7, 2.7],
    color: "#a78bfa",
  },
  rational: {
    label: "Hyperbola",
    f: (x) => 1.8 / (x + 0.8) + 0.2,
    df: (x) => -1.8 / (x + 0.8) ** 2,
    domain: [-2.8, 2.8],
    color: "#fb7185",
  },
};

function cylinderBetween(a, b, color, radius = 0.035, opacity = 1) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const delta = end.clone().sub(start);
  const length = delta.length();
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 10, 1, true);
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color).multiplyScalar(0.6),
    roughness: 0.24,
    metalness: 0.4,
    transparent: opacity < 1,
    opacity,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return mesh;
}

function addGrid(group) {
  const positions = [];
  for (let x = -3; x <= 3.001; x += 0.5) positions.push(x, -2, 0, x, 3.6, 0);
  for (let y = -2; y <= 3.501; y += 0.5) positions.push(-3, y, 0, 3, y, 0);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  group.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0x2a4a5c, transparent: true, opacity: 0.3 })));
  group.add(lineFromPoints([new THREE.Vector3(-3.2, 0, 0), new THREE.Vector3(3.2, 0, 0)], "#fb7185", 0.65));
  group.add(lineFromPoints([new THREE.Vector3(0, -2.1, 0), new THREE.Vector3(0, 3.7, 0)], "#5eead4", 0.65));
  const xLabel = makeTextSprite("x", { color: "#fb7185", size: 0.28 });
  xLabel.position.set(3.35, -0.02, 0);
  const yLabel = makeTextSprite("y", { color: "#5eead4", size: 0.28 });
  yLabel.position.set(0.02, 3.85, 0);
  group.add(xLabel, yLabel);
}

export function createUnit2Scene() {
  const group = new THREE.Group();
  addGrid(group);

  const state = { preset: "cubic", x0: 0.65, dx: 1.4, auto: false, autoTime: 0 };
  const curveLayer = new THREE.Group();
  const overlay = new THREE.Group();
  group.add(curveLayer, overlay);

  const tangentMaterial = new THREE.MeshStandardMaterial({
    color: "#fbbf24",
    emissive: 0xf59e0b,
    emissiveIntensity: 1.4,
    roughness: 0.2,
    metalness: 0.5,
  });
  const tangent = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 12), tangentMaterial);
  const tangentGlow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 1, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: "#fbbf24", transparent: true, opacity: 0.12, side: THREE.DoubleSide })
  );
  const secantLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineDashedMaterial({ color: "#a78bfa", dashSize: 0.14, gapSize: 0.1, transparent: true, opacity: 0.95 })
  );
  const triangleGroup = new THREE.Group();
  const triangleX = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineBasicMaterial({ color: "#fbbf24", transparent: true, opacity: 0.85 })
  );
  const triangleY = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineBasicMaterial({ color: "#fb7185", transparent: true, opacity: 0.85 })
  );
  triangleGroup.add(triangleX, triangleY);
  const pointA = dot(new THREE.Vector3(), "#fbbf24", 0.12, 1.1);
  const pointB = dot(new THREE.Vector3(), "#a78bfa", 0.09, 0.9);
  const tangentHandle = dot(new THREE.Vector3(), "#ffffff", 0.075, 1.4);
  overlay.add(tangent, tangentGlow, secantLine, triangleGroup, pointA, pointB, tangentHandle);

  function preset() {
    return PRESETS[state.preset];
  }

  function clearCurveLayer() {
    for (const child of curveLayer.children.slice()) {
      curveLayer.remove(child);
      child.geometry?.dispose();
      child.material?.dispose();
    }
  }

  function addSegment(points, color) {
    if (points.length < 2) return;
    curveLayer.add(tubeFromPoints(points, color, { radius: 0.03, emissive: 0.55 }));
    const shadowPoints = points.map((point) => new THREE.Vector3(point.x, point.y, -0.55));
    curveLayer.add(tubeFromPoints(shadowPoints, color, { radius: 0.015, opacity: 0.13, emissive: 0.2 }));
  }

  function buildCurve() {
    clearCurveLayer();
    const p = preset();
    const points = [];
    for (let i = 0; i <= 320; i += 1) {
      const x = p.domain[0] + ((p.domain[1] - p.domain[0]) * i) / 320;
      const y = p.f(x);
      if (!Number.isFinite(y) || Math.abs(y) > 7) {
        addSegment(points, p.color);
        points.length = 0;
        continue;
      }
      points.push(new THREE.Vector3(x, clamp(y, -3.4, 5.2), 0.22));
    }
    addSegment(points, p.color);
    updateOverlay();
  }

  function curvePoint(x) {
    const p = preset();
    return { x, y: p.f(x), z: 0.22 };
  }

  function updateOverlay() {
    const p = preset();
    const x0 = state.x0;
    const x1 = clamp(x0 + state.dx, p.domain[0], p.domain[1]);
    const y0 = p.f(x0);
    const y1 = p.f(x1);
    if (!Number.isFinite(y0) || !Number.isFinite(y1)) return;
    const slope = p.df(x0);
    const secant = (y1 - y0) / (x1 - x0);
    const z0 = 0.22;
    const dz = 0.42 * Math.cos(0.85 * x0);
    const direction = new THREE.Vector3(1, slope, dz).normalize();

    const a = new THREE.Vector3(x0, y0, z0);
    const b = new THREE.Vector3(x0, y0, z0).addScaledVector(direction, 2.2);
    const c = new THREE.Vector3(x0, y0, z0).addScaledVector(direction, -2.2);
    const length = b.distanceTo(c);
    tangent.position.copy(b).add(c).multiplyScalar(0.5);
    tangent.scale.set(1, length, 1);
    tangent.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(c).normalize());
    tangentGlow.position.copy(tangent.position);
    tangentGlow.scale.set(1, length, 1);
    tangentGlow.quaternion.copy(tangent.quaternion);

    pointA.position.set(x0, y0, z0);
    pointB.position.set(x1, y1, z0);
    tangentHandle.position.copy(a);

    const bx = new THREE.Vector3(x1, y0, z0);
    triangleX.geometry.setFromPoints([a, bx]);
    triangleY.geometry.setFromPoints([bx, new THREE.Vector3(x1, y1, z0)]);
    triangleX.geometry.attributes.position.needsUpdate = true;
    triangleY.geometry.attributes.position.needsUpdate = true;
    secantLine.geometry.setFromPoints([a, new THREE.Vector3(x1, y1, z0)]);
    secantLine.computeLineDistances();

    state.last = { x0, x1, y0, y1, slope, secant, error: Math.abs(secant - slope), dz };
  }

  function set(key, value) {
    if (key === "preset") {
      state.preset = value;
      state.auto = false;
      state.x0 = clamp(state.x0, preset().domain[0] + 0.2, preset().domain[1] - 0.7);
      state.dx = Math.min(state.dx, preset().domain[1] - state.x0 - 0.1);
      buildCurve();
    } else if (key === "x0") {
      state.x0 = Number(value);
      state.auto = false;
      updateOverlay();
    } else if (key === "dx") {
      state.dx = Number(value);
      state.auto = false;
      updateOverlay();
    }
  }

  function action(key) {
    if (key === "shrink") {
      state.auto = true;
      state.autoTime = 0;
    }
  }

  function readout() {
    const last = state.last || {};
    return [
      { label: "x₀", value: formatNumber(last.x0 ?? 0, 2), tone: "amber" },
      { label: "f(x₀)", value: formatNumber(last.y0 ?? 0, 3), tone: "muted" },
      { label: "Δx", value: formatNumber(state.dx, 3), tone: "violet" },
      { label: "Secant slope", value: formatNumber(last.secant ?? 0, 3), tone: "violet" },
      { label: "Tangent f′(x₀)", value: formatNumber(last.slope ?? 0, 3), tone: "good" },
      { label: "Gap", value: formatNumber(last.error ?? 0, 4), tone: (last.error ?? 1) < 0.05 ? "good" : "bad" },
    ];
  }

  function narration() {
    const last = state.last || {};
    const closed = (last.error ?? 1) < 0.05;
    return {
      title: "The derivative is a collapsed secant",
      lead: "A secant slope is an average rate over an interval. As Δx shrinks, the secant’s slope approaches the instantaneous rate f′(x₀).",
      formula: `m<sub>sec</sub> = [f(x₀ + Δx) − f(x₀)] / Δx = ${formatNumber(last.secant ?? 0, 4)}<br>f′(x₀) = ${formatNumber(last.slope ?? 0, 4)}`,
      note: closed
        ? "The gap is below 0.05, so the secant is visually indistinguishable from the tangent. This is the derivative as a limit in action."
        : "The secant still has a visible gap. Shrink Δx further or press “Shrink Δx” to watch the limit collapse.",
      status: closed ? "limit reached" : "Δx still finite",
    };
  }

  buildCurve();

  return {
    group,
    camera: { position: [5.2, 3.6, 8.6], target: [0, 0.4, 0], fov: 42 },
    controls: [
      { type: "select", key: "preset", label: "Curve", value: "cubic", options: Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })) },
      { type: "range", key: "x0", label: "Probe position · x₀", min: -2.4, max: 2.4, step: 0.01, value: 0.65 },
      { type: "range", key: "dx", label: "Secant width · Δx", min: 0.02, max: 2.2, step: 0.005, value: 1.4 },
      { type: "button", key: "shrink", label: "Shrink Δx to the limit" },
    ],
    set,
    action,
    readout,
    narration,
    update(dt) {
      if (state.auto) {
        state.autoTime += dt;
        const t = clamp(state.autoTime / 3.4, 0, 1);
        const eased = 1 - (1 - t) ** 3;
        state.dx = 2.1 * (1 - eased) + 0.02 * eased;
        const slider = this.controls.find((control) => control.key === "dx");
        if (slider) slider.value = state.dx;
        updateOverlay();
        if (t >= 1) state.auto = false;
      }
      const pulse = 1.35 + Math.sin(performance.now() / 320) * 0.22;
      tangentMaterial.emissiveIntensity = pulse;
      const p = preset();
      const last = state.last;
      if (last) {
        const dx = Math.abs(last.x1 - last.x0);
        const secantColor = dx < 0.08 ? "#5eead4" : "#a78bfa";
        secantLine.material.color.set(secantColor);
        triangleX.material.color.set(dx < 0.08 ? "#5eead4" : "#fbbf24");
      }
    },
    getState() {
      return { preset: state.preset, x0: state.x0, dx: state.dx, ...state.last };
    },
    dispose() {},
  };
}
