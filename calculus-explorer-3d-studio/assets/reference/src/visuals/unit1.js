// UNIT 1 — Limits & Continuity
// A limit-convergence microscope on a floating graph plane. Two independent
// tracers approach c from the left and right; the scene classifies what happens.

import * as THREE from "three";
import { clamp, formatNumber } from "../core/math.js";
import { dot, labeledAxes, lineFromPoints, makeGlyphLabel, makeTextSprite, tubeFromPoints } from "./common.js";

const MODELS = {
  hole: {
    label: "Removable hole",
    c: 1,
    limit: 2,
    domain: [-0.6, 3.2],
    hole: true,
    type: "Removable discontinuity",
    verdict: "Limit exists · f(c) undefined",
    f: (x) => (x * x - 1) / (x - 1),
    valueAt: null,
    color: "#5eead4",
    note: "The factor (x − 1) cancels, leaving the line x + 1 with a puncture at x = 1.",
  },
  jump: {
    label: "Jump discontinuity",
    c: 1,
    limit: null,
    domain: [-0.8, 2.8],
    type: "Jump discontinuity",
    verdict: "One-sided limits disagree",
    f: (x) => (x < 1 ? x + 1 : 3 - x),
    leftLimit: 2,
    rightLimit: 2,
    valueAt: 2,
    color: "#fbbf24",
    note: "These pieces happen to meet at (1, 2); the visual still lets you approach independently.",
  },
  jumpBroken: {
    label: "True jump",
    c: 1,
    limit: null,
    domain: [-0.8, 2.8],
    type: "Jump discontinuity",
    verdict: "Left limit 1 · right limit 2",
    f: (x) => (x < 1 ? x : x + 1),
    leftLimit: 1,
    rightLimit: 2,
    valueAt: 1,
    color: "#fb7185",
    note: "The left branch approaches 1 while the right branch approaches 2, so no two-sided limit exists.",
  },
  asymptote: {
    label: "Infinite discontinuity",
    c: 1,
    limit: null,
    domain: [-1.4, 3.4],
    type: "Infinite discontinuity",
    verdict: "Left → −∞ · right → +∞",
    f: (x) => 1 / (x - 1),
    leftLimit: -Infinity,
    rightLimit: Infinity,
    valueAt: null,
    color: "#fb7185",
    note: "The two sides escape in opposite directions along the vertical asymptote x = 1.",
  },
  squeeze: {
    label: "Squeeze theorem",
    c: 1,
    limit: 2,
    domain: [0.18, 1.82],
    hole: true,
    type: "Oscillation, trapped",
    verdict: "Both walls converge to 2",
    f: (x) => 2 + (x - 1) * Math.sin(1 / (x - 1)),
    upper: (x) => 2 + Math.abs(x - 1),
    lower: (x) => 2 - Math.abs(x - 1),
    valueAt: null,
    color: "#a78bfa",
    note: "The function oscillates faster and faster, but its amplitude shrinks to zero at x = 1.",
  },
};

function addGrid(group) {
  const positions = [];
  for (let x = -2; x <= 4.001; x += 0.5) positions.push(x, -1.2, 0, x, 5.2, 0);
  for (let y = -1; y <= 5.001; y += 0.5) positions.push(-2, y, 0, 4, y, 0);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color: 0x2a4a5c, transparent: true, opacity: 0.34 });
  group.add(new THREE.LineSegments(geometry, material));

  const axesGroup = new THREE.Group();
  axesGroup.add(lineFromPoints([new THREE.Vector3(-2, 0, 0), new THREE.Vector3(3.6, 0, 0)], "#fb7185", 0.72));
  axesGroup.add(lineFromPoints([new THREE.Vector3(0, -1.1, 0), new THREE.Vector3(0, 5, 0)], "#5eead4", 0.72));
  group.add(axesGroup);
  const xLabel = makeTextSprite("x", { color: "#fb7185", size: 0.3 });
  xLabel.position.set(3.8, -0.05, 0);
  const yLabel = makeTextSprite("y", { color: "#5eead4", size: 0.3 });
  yLabel.position.set(0.08, 5.25, 0);
  group.add(xLabel, yLabel);
}

function buildCurve(points, color, z = 0.2, radius = 0.028, opacity = 1) {
  return tubeFromPoints(points.map((point) => new THREE.Vector3(point.x, point.y, z)), color, { radius, opacity, emissive: 0.55 });
}

export function createUnit1Scene() {
  const group = new THREE.Group();
  addGrid(group);

  const state = { model: "hole", left: 0.5, right: 0.5, sweeping: false, sweepTime: 0 };
  const layer = new THREE.Group();
  group.add(layer);

  const leftMarker = dot(new THREE.Vector3(0, 0, 0.42), "#5eead4", 0.13, 1.2);
  const rightMarker = dot(new THREE.Vector3(0, 0, 0.42), "#fbbf24", 0.13, 1.2);
  const leftHalo = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.25, 40),
    new THREE.MeshBasicMaterial({ color: "#5eead4", transparent: true, opacity: 0.4, side: THREE.DoubleSide })
  );
  const rightHalo = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.25, 40),
    new THREE.MeshBasicMaterial({ color: "#fbbf24", transparent: true, opacity: 0.4, side: THREE.DoubleSide })
  );
  leftHalo.position.z = 0.4;
  rightHalo.position.z = 0.4;

  const limitRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.032, 10, 44),
    new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: 0x7dd3fc, emissiveIntensity: 1.5, roughness: 0.2 })
  );
  const asymptoteLine = lineFromPoints(
    [new THREE.Vector3(1, -1, 0), new THREE.Vector3(1, 5, 0)],
    "#fb7185",
    0.8
  );
  asymptoteLine.material = new THREE.LineDashedMaterial({ color: "#fb7185", dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: 0.8 });
  asymptoteLine.computeLineDistances();

  const cPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 6.4),
    new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.045, side: THREE.DoubleSide })
  );
  cPlane.position.set(1, 2, -0.4);

  layer.add(leftHalo, rightHalo, leftMarker, rightMarker, limitRing, asymptoteLine, cPlane);

  function model() {
    return MODELS[state.model];
  }

  function rebuild() {
    const m = model();
    while (layer.children.length > 7) {
      const child = layer.children[layer.children.length - 1];
      child.geometry?.dispose();
      child.material?.dispose();
      layer.remove(child);
    }
    const segments = [];
    let current = [];
    const start = m.domain[0];
    const end = m.domain[1];
    const samples = 340;
    for (let i = 0; i <= samples; i += 1) {
      const x = start + ((end - start) * i) / samples;
      if (m.hole && Math.abs(x - m.c) < 0.012) {
        if (current.length) segments.push(current);
        current = [];
        continue;
      }
      const y = m.f(x);
      if (!Number.isFinite(y) || Math.abs(y) > 9) {
        if (current.length) segments.push(current);
        current = [];
        continue;
      }
      current.push({ x, y: clamp(y, -3.6, 7.4) });
    }
    if (current.length) segments.push(current);

    for (const segment of segments) {
      if (segment.length < 2) continue;
      layer.add(buildCurve(segment, m.color, 0.2, 0.03));
      const shadow = buildCurve(segment, m.color, -0.5, 0.018, 0.14);
      layer.add(shadow);
    }

    if (m.upper && m.lower) {
      for (const [fn, color] of [[m.upper, "#7dd3fc"], [m.lower, "#f472b6"]]) {
        const pts = [];
        for (let i = 0; i <= 120; i += 1) {
          const x = start + ((end - start) * i) / 120;
          pts.push(new THREE.Vector3(x, fn(x), 0.05));
        }
        layer.add(lineFromPoints(pts, color, 0.58));
      }
    }

    const finiteLimit = m.limit !== null && m.limit !== undefined;
    limitRing.visible = finiteLimit;
    if (finiteLimit) {
      limitRing.position.set(m.c, m.limit, 0.26);
      limitRing.rotation.x = Math.PI / 2;
    }
    const infinite = m.type === "Infinite discontinuity";
    asymptoteLine.visible = infinite;
    asymptoteLine.position.x = m.c;
    cPlane.visible = !infinite;
    cPlane.material.color.set(m.color);
    cPlane.position.x = m.c;

    if (m.valueAt !== null && m.valueAt !== undefined) {
      leftMarker.material.emissiveIntensity = 1.2;
    }
    updateMarkers();
  }

  function tracerPosition(side) {
    const m = model();
    const approach = side === "left" ? state.left : state.right;
    const sign = side === "left" ? -1 : 1;
    const x = m.c + sign * (1 - approach) * 1.15;
    const clampedX = clamp(x, m.domain[0], m.domain[1]);
    const y = m.f(clampedX);
    return { x: clampedX, y: Number.isFinite(y) ? clamp(y, -3.4, 7.2) : 0, raw: y, approach };
  }

  function updateMarkers() {
    const m = model();
    const l = tracerPosition("left");
    const r = tracerPosition("right");
    leftMarker.position.set(l.x, l.y, 0.42);
    rightMarker.position.set(r.x, r.y, 0.42);
    leftHalo.position.set(l.x, l.y, 0.4);
    leftHalo.rotation.x = -Math.PI / 2;
    rightHalo.position.set(r.x, r.y, 0.4);
    rightHalo.rotation.x = -Math.PI / 2;
    const pulse = 1 + Math.sin(performance.now() / 240) * 0.06;
    if (m.limit !== null && m.limit !== undefined) {
      limitRing.scale.setScalar(pulse);
      limitRing.position.y = m.limit;
    }
    // Colour feedback: green when the two one-sided approaches agree closely.
    if (m.limit !== null && m.limit !== undefined) {
      const closeness = Math.max(Math.abs(l.raw - m.limit), Math.abs(r.raw - m.limit));
      const settled = closeness < 0.12;
      leftHalo.material.color.set(settled ? "#ffffff" : "#5eead4");
      rightHalo.material.color.set(settled ? "#ffffff" : "#fbbf24");
    }
  }

  function set(key, value) {
    if (key === "model") {
      state.model = value;
      state.left = 0.5;
      state.right = 0.5;
      state.sweeping = false;
      rebuild();
    } else if (key === "left" || key === "right") {
      state[key] = Number(value);
      state.sweeping = false;
      updateMarkers();
    }
  }

  function action(key) {
    if (key === "sweep") {
      state.left = 0.04;
      state.right = 0.04;
      state.sweeping = true;
      state.sweepTime = 0;
    }
  }

  function readout() {
    const m = model();
    const l = tracerPosition("left");
    const r = tracerPosition("right");
    const lLimit = m.leftLimit !== undefined ? m.leftLimit : m.limit;
    const rLimit = m.rightLimit !== undefined ? m.rightLimit : m.limit;
    const finite = Number.isFinite(lLimit) && Number.isFinite(rLimit);
    const same = finite && Math.abs(lLimit - rLimit) < 1e-6;
    return [
      { label: "x → c⁻", value: formatNumber(l.x, 3), tone: "teal" },
      { label: "x → c⁺", value: formatNumber(r.x, 3), tone: "amber" },
      { label: "Left limit", value: Number.isFinite(lLimit) ? formatNumber(lLimit, 2) : lLimit < 0 ? "−∞" : "+∞", tone: "teal" },
      { label: "Right limit", value: Number.isFinite(rLimit) ? formatNumber(rLimit, 2) : rLimit < 0 ? "−∞" : "+∞", tone: "amber" },
      { label: "f(c)", value: m.valueAt === null || m.valueAt === undefined ? "undefined" : formatNumber(m.valueAt, 2), tone: "muted" },
      { label: "Verdict", value: same ? "limit exists" : "no two-sided limit", tone: same ? "good" : "bad" },
    ];
  }

  function narration() {
    const m = model();
    const left = m.leftLimit !== undefined ? m.leftLimit : m.limit;
    const right = m.rightLimit !== undefined ? m.rightLimit : m.limit;
    const leftText = Number.isFinite(left) ? formatNumber(left, 2) : left < 0 ? "−∞" : "+∞";
    const rightText = Number.isFinite(right) ? formatNumber(right, 2) : right < 0 ? "−∞" : "+∞";
    const exists = Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 1e-6;
    return {
      title: m.label,
      lead: m.note,
      formula: `lim<sub>x→${m.c}<sup>−</sup></sub> f(x) = ${leftText} &nbsp;·&nbsp; lim<sub>x→${m.c}<sup>+</sup></sub> f(x) = ${rightText}`,
      note: exists
        ? `The one-sided limits agree, so lim<sub>x→${m.c}</sub> f(x) = ${leftText}. Continuity additionally requires f(${m.c}) to equal that limit.`
        : "The one-sided limits disagree (or diverge), so the two-sided limit does not exist. A vertical asymptote is not a value.",
      status: m.verdict,
    };
  }

  rebuild();

  return {
    group,
    camera: { position: [3.2, 2.5, 8.8], target: [0.9, 2.1, 0], fov: 42 },
    controls: [
      { type: "select", key: "model", label: "Model", value: "hole", options: Object.entries(MODELS).map(([value, m]) => ({ value, label: m.label })) },
      { type: "range", key: "left", label: "Left approach · x → c⁻", min: 0, max: 1, step: 0.001, value: 0.5 },
      { type: "range", key: "right", label: "Right approach · x → c⁺", min: 0, max: 1, step: 0.001, value: 0.5 },
      { type: "button", key: "sweep", label: "Sweep both tracers" },
    ],
    set,
    action,
    readout,
    narration,
    update(dt) {
      if (state.sweeping) {
        state.sweepTime += dt;
        const t = clamp(state.sweepTime / 2.8, 0, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        state.left = 0.04 + eased * 0.96;
        state.right = 0.04 + eased * 0.96;
        const leftControl = this.controls.find((control) => control.key === "left");
        const rightControl = this.controls.find((control) => control.key === "right");
        if (leftControl) leftControl.value = state.left;
        if (rightControl) rightControl.value = state.right;
        updateMarkers();
        if (t >= 1) state.sweeping = false;
      }
      if (state.model === "squeeze") {
        const pulse = 0.28 + Math.sin(performance.now() / 420) * 0.04;
        limitRing.scale.setScalar(1 + pulse * 0.2);
      }
    },
    getState() {
      return { model: state.model, left: state.left, right: state.right };
    },
    dispose() {
      // The stage owns disposal of the group and its children.
    },
  };
}
