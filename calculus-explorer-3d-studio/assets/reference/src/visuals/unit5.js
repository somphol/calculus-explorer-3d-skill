// UNIT 5 — Analytical applications of differentiation
// A curvature-coloured terrain ribbon with critical and inflection beacons, a
// movable tangent plane, and an optional Mean Value Theorem chord.

import * as THREE from "three";
import { clamp, derivative, formatNumber, secondDerivative } from "../core/math.js";
import { arrow, dot, lineFromPoints, makeTextSprite, tubeFromPoints } from "./common.js";

const PRESETS = {
  cubic: {
    label: "Cubic ridge",
    f: (x) => 0.42 * x ** 3 - 1.26 * x,
    df: (x) => 1.26 * x ** 2 - 1.26,
    d2f: (x) => 2.52 * x,
    domain: [-2.4, 2.4],
    critical: [
      { x: -1, type: "max", label: "local max" },
      { x: 1, type: "min", label: "local min" },
    ],
    inflections: [{ x: 0, label: "inflection" }],
    color: "#60a5fa",
  },
  quartic: {
    label: "Quartic valley",
    f: (x) => 0.18 * x ** 4 - 0.9 * x ** 2 + 0.5,
    df: (x) => 0.72 * x ** 3 - 1.8 * x,
    d2f: (x) => 2.16 * x ** 2 - 1.8,
    domain: [-2.3, 2.3],
    critical: [
      { x: -Math.sqrt(2.5), type: "max", label: "local max" },
      { x: 0, type: "min", label: "local min" },
      { x: Math.sqrt(2.5), type: "max", label: "local max" },
    ],
    inflections: [
      { x: -Math.sqrt(0.8333333), label: "inflection" },
      { x: Math.sqrt(0.8333333), label: "inflection" },
    ],
    color: "#5eead4",
  },
  sine: {
    label: "Sine ridge",
    f: (x) => 1.55 * Math.sin(1.2 * x),
    df: (x) => 1.86 * Math.cos(1.2 * x),
    d2f: (x) => -2.232 * Math.sin(1.2 * x),
    domain: [-2.5, 2.5],
    critical: [
      { x: -Math.PI / 2.4, type: "max", label: "local max" },
      { x: Math.PI / 2.4, type: "min", label: "local min" },
    ],
    inflections: [
      { x: -Math.PI / 1.2, label: "inflection" },
      { x: 0, label: "inflection" },
      { x: Math.PI / 1.2, label: "inflection" },
    ],
    color: "#a78bfa",
  },
};

function buildSurface(preset) {
  const cols = 96;
  const rows = 26;
  const [a, b] = preset.domain;
  const depth = 1.35;
  const positions = [];
  const colors = [];
  const indices = [];
  const teal = new THREE.Color("#34d399");
  const rose = new THREE.Color("#fb7185");
  const violet = new THREE.Color("#a78bfa");
  const temp = new THREE.Color();
  for (let j = 0; j < rows; j += 1) {
    const z = -depth + (2 * depth * j) / (rows - 1);
    for (let i = 0; i < cols; i += 1) {
      const x = a + ((b - a) * i) / (cols - 1);
      const y = preset.f(x) + 0.16 * Math.sin(1.55 * z);
      positions.push(x, y, z);
      const curvature = preset.d2f(x);
      temp.copy(curvature >= 0 ? teal : rose);
      const mix = Math.min(0.55, Math.abs(curvature) * 0.12);
      temp.lerp(violet, mix * 0.22);
      temp.multiplyScalar(0.72 + 0.28 * Math.min(1, Math.abs(y) / 2.2));
      colors.push(temp.r, temp.g, temp.b);
    }
  }
  for (let j = 0; j < rows - 1; j += 1) {
    for (let i = 0; i < cols - 1; i += 1) {
      const a1 = j * cols + i;
      const b1 = a1 + 1;
      const c1 = a1 + cols;
      const d1 = c1 + 1;
      indices.push(a1, c1, b1, b1, c1, d1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createUnit5Scene() {
  const group = new THREE.Group();
  const state = { preset: "cubic", x0: 0.7, mvt: false };
  const terrain = new THREE.Group();
  const overlay = new THREE.Group();
  group.add(terrain, overlay);

  const probe = dot(new THREE.Vector3(0, 0, 0.35), "#ffffff", 0.1, 1.4);
  const probeStem = lineFromPoints([new THREE.Vector3(), new THREE.Vector3()], "#94a3b8", 0.6);
  const probeRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.022, 8, 40),
    new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.7 })
  );
  probeRing.rotation.x = Math.PI / 2;
  probeRing.position.z = 0.34;
  const tangentPlaneMaterial = new THREE.MeshStandardMaterial({
    color: "#fbbf24",
    transparent: true,
    opacity: 0.17,
    roughness: 0.25,
    metalness: 0.2,
    side: THREE.DoubleSide,
    emissive: 0x92400e,
    emissiveIntensity: 0.35,
  });
  const tangentPlane = new THREE.Mesh(new THREE.BufferGeometry(), tangentPlaneMaterial);
  const normalArrow = arrow([0, 0, 0], [0, 1, 0], "#fbbf24", 0.18, 0.1);
  overlay.add(probe, probeStem, probeRing, tangentPlane, normalArrow);

  const mvtGroup = new THREE.Group();
  group.add(mvtGroup);

  let surfaceMesh = null;
  let profileMesh = null;
  let beacons = [];

  function preset() {
    return PRESETS[state.preset];
  }

  function clearTerrain() {
    for (const child of terrain.children.slice()) {
      terrain.remove(child);
      child.geometry?.dispose();
      child.material?.dispose();
    }
    for (const beacon of beacons) {
      overlay.remove(beacon);
      beacon.traverse((child) => {
        child.userData?.dispose?.();
        child.geometry?.dispose();
        child.material?.dispose();
      });
    }
    beacons = [];
  }

  function buildTerrain() {
    clearTerrain();
    const p = preset();
    surfaceMesh = new THREE.Mesh(buildSurface(p), new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.52,
      metalness: 0.16,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    }));
    surfaceMesh.castShadow = true;
    surfaceMesh.receiveShadow = true;
    terrain.add(surfaceMesh);

    const wire = new THREE.Mesh(surfaceMesh.geometry, new THREE.MeshBasicMaterial({ color: "#0b1626", wireframe: true, transparent: true, opacity: 0.065 }));
    terrain.add(wire);

    const points = [];
    for (let i = 0; i <= 320; i += 1) {
      const x = p.domain[0] + ((p.domain[1] - p.domain[0]) * i) / 320;
      points.push(new THREE.Vector3(x, p.f(x), 0.02));
    }
    profileMesh = tubeFromPoints(points, "#e2e8f0", { radius: 0.02, emissive: 0.4 });
    terrain.add(profileMesh);

    const axis = lineFromPoints([new THREE.Vector3(p.domain[0] - 0.3, 0, 0), new THREE.Vector3(p.domain[1] + 0.3, 0, 0)], "#fb7185", 0.5);
    const vertical = lineFromPoints([new THREE.Vector3(0, -2, 0), new THREE.Vector3(0, 2.6, 0)], "#5eead4", 0.4);
    terrain.add(axis, vertical);

    for (const item of p.critical) {
      const color = item.type === "max" ? "#fbbf24" : "#34d399";
      const beacon = dot(new THREE.Vector3(item.x, p.f(item.x), 0.22), color, 0.105, 1.5);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.2, 0.02, 8, 40),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(item.x, p.f(item.x), 0.2);
      const label = makeTextSprite(item.label, { color, size: 0.2 });
      label.position.set(item.x, p.f(item.x) + 0.38, 0.3);
      const container = new THREE.Group();
      container.add(beacon, ring, label);
      overlay.add(container);
      beacons.push(container);
    }
    for (const item of p.inflections) {
      const beacon = dot(new THREE.Vector3(item.x, p.f(item.x), 0.2), "#a78bfa", 0.075, 1.2);
      const label = makeTextSprite("inflection", { color: "#a78bfa", size: 0.17 });
      label.position.set(item.x, p.f(item.x) - 0.34, 0.28);
      const container = new THREE.Group();
      container.add(beacon, label);
      overlay.add(container);
      beacons.push(container);
    }
    updateProbe();
    updateMvt();
  }

  function updateProbe() {
    const p = preset();
    const x = state.x0;
    const y = p.f(x);
    const slope = p.df(x);
    probe.position.set(x, y, 0.35);
    probeRing.position.set(x, y, 0.34);
    probeStem.geometry.setFromPoints([
      new THREE.Vector3(x, y, 0.3),
      new THREE.Vector3(x, 0, 0.3),
    ]);
    const dx = 0.82;
    const dz = 1.2;
    const positions = [];
    const corners = [
      [x - dx, y - slope * dx, -dz],
      [x + dx, y + slope * dx, -dz],
      [x + dx, y + slope * dx, dz],
      [x - dx, y - slope * dx, dz],
    ];
    const tris = [0, 1, 2, 0, 2, 3];
    for (const index of tris) positions.push(...corners[index]);
    tangentPlane.geometry.dispose();
    tangentPlane.geometry = new THREE.BufferGeometry();
    tangentPlane.geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    tangentPlane.geometry.computeVertexNormals();
    normalArrow.position.set(x, y, 0);
    normalArrow.setDirection(new THREE.Vector3(-slope, 1, 0).normalize());
    normalArrow.setLength(0.55, 0.16, 0.09);
    state.last = {
      x, y, slope,
      curvature: p.d2f(x),
      increasing: slope > 0,
      concaveUp: p.d2f(x) > 0,
    };
    updateMvt();
  }

  function findMvtC() {
    const p = preset();
    const a = p.domain[0];
    const b = p.domain[1];
    const average = (p.f(b) - p.f(a)) / (b - a);
    let previous = p.df(a) - average;
    for (let i = 1; i <= 500; i += 1) {
      const x = a + ((b - a) * i) / 500;
      const value = p.df(x) - average;
      if (previous === 0 || previous * value < 0) return x;
      previous = value;
    }
    return a + (b - a) * 0.5;
  }

  function updateMvt() {
    while (mvtGroup.children.length) {
      const child = mvtGroup.children.pop();
      child.geometry?.dispose();
      child.material?.dispose();
    }
    if (!state.mvt) return;
    const p = preset();
    const a = p.domain[0];
    const b = p.domain[1];
    const average = (p.f(b) - p.f(a)) / (b - a);
    const c = findMvtC();
    const chord = tubeFromPoints([
      new THREE.Vector3(a, p.f(a), 0.3),
      new THREE.Vector3(b, p.f(b), 0.3),
    ], "#fbbf24", { radius: 0.014, emissive: 0.7 });
    const tangentPts = [
      new THREE.Vector3(c - 0.8, p.f(c) - average * 0.8, 0.32),
      new THREE.Vector3(c + 0.8, p.f(c) + average * 0.8, 0.32),
    ];
    const parallel = tubeFromPoints(tangentPts, "#5eead4", { radius: 0.022, emissive: 0.7 });
    const marker = dot(new THREE.Vector3(c, p.f(c), 0.36), "#5eead4", 0.09, 1.2);
    mvtGroup.add(chord, parallel, marker);
    state.mvtC = c;
    state.mvtAverage = average;
  }

  function set(key, value) {
    if (key === "preset") {
      state.preset = value;
      state.x0 = clamp(state.x0, preset().domain[0] + 0.2, preset().domain[1] - 0.2);
      buildTerrain();
    } else if (key === "x0") {
      state.x0 = Number(value);
      updateProbe();
    }
  }

  function action(key) {
    if (key === "mvt") {
      state.mvt = !state.mvt;
      updateMvt();
    } else if (key === "critical") {
      const p = preset();
      const candidates = p.critical.slice().sort((a, b) => Math.abs(a.x - state.x0) - Math.abs(b.x - state.x0));
      const next = candidates.find((item) => Math.abs(item.x - state.x0) > 0.05) || candidates[0];
      state.x0 = next.x;
      const slider = this.controls.find((control) => control.key === "x0");
      if (slider) slider.value = state.x0;
      updateProbe();
    }
  }

  function readout() {
    const last = state.last || {};
    const curvature = last.curvature ?? 0;
    return [
      { label: "x", value: formatNumber(last.x ?? 0, 2), tone: "muted" },
      { label: "f(x)", value: formatNumber(last.y ?? 0, 3), tone: "blue" },
      { label: "f′(x)", value: formatNumber(last.slope ?? 0, 3), tone: (last.slope ?? 0) >= 0 ? "good" : "bad" },
      { label: "f″(x)", value: formatNumber(curvature, 3), tone: curvature >= 0 ? "teal" : "rose" },
      { label: "Behaviour", value: `${(last.slope ?? 0) >= 0 ? "increasing" : "decreasing"} · ${curvature >= 0 ? "concave up" : "concave down"}`, tone: "muted" },
      { label: "MVT c", value: state.mvt ? formatNumber(state.mvtC, 3) : "toggle to show", tone: state.mvt ? "amber" : "muted" },
    ];
  }

  function narration() {
    const last = state.last || {};
    const slope = last.slope ?? 0;
    const curvature = last.curvature ?? 0;
    const p = preset();
    if (state.mvt) {
      const a = p.domain[0];
      const b = p.domain[1];
      return {
        title: "Mean Value Theorem",
        lead: "The chord from a to b has the average slope. Somewhere inside the interval, the instantaneous slope must match it.",
        formula: `average slope = [f(${formatNumber(b, 2)}) − f(${formatNumber(a, 2)})] / (${formatNumber(b - a, 2)}) = ${formatNumber(state.mvtAverage, 3)}<br>f′(c) = ${formatNumber(state.mvtAverage, 3)} at c ≈ <strong>${formatNumber(state.mvtC, 3)}</strong>`,
        note: "The theorem guarantees at least one such c. The teal tangent is parallel to the amber chord; the marker is one witness.",
        status: "MVT active",
      };
    }
    return {
      title: "Read the shape from the signs",
      lead: "The first derivative gives direction, the second gives bending. The terrain colour flips when concavity changes.",
      formula: `f′(${formatNumber(last.x ?? 0, 2)}) = ${formatNumber(slope, 3)} ${slope >= 0 ? "> 0 ⇒ increasing" : "< 0 ⇒ decreasing"}<br>f″(${formatNumber(last.x ?? 0, 2)}) = ${formatNumber(curvature, 3)} ${curvature >= 0 ? "> 0 ⇒ concave up" : "< 0 ⇒ concave down"}`,
      note: slope === 0
        ? "The tangent plane is horizontal here: this is a critical point candidate. The beacons mark where the sign actually changes."
        : curvature === 0
          ? "Curvature is zero here; a true inflection also requires the sign of f″ to change across the point."
          : "Move the probe slowly across a beacon: the derivative sign or the curvature colour will flip on one side.",
      status: `${slope >= 0 ? "increasing" : "decreasing"} · ${curvature >= 0 ? "concave up" : "concave down"}`,
    };
  }

  buildTerrain();

  return {
    group,
    camera: { position: [5.4, 4.4, 8.6], target: [0, -0.1, 0], fov: 42 },
    controls: [
      { type: "select", key: "preset", label: "Terrain", value: "cubic", options: Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })) },
      { type: "range", key: "x0", label: "Probe position · x", min: -2.2, max: 2.2, step: 0.01, value: 0.7 },
      { type: "button", key: "critical", label: "Jump to next critical point" },
      { type: "button", key: "mvt", label: "Toggle MVT chord", reflect: "mvt" },
    ],
    set,
    action,
    readout,
    narration,
    update(dt) {
      const last = state.last;
      if (!last) return;
      const pulse = 1 + Math.sin(performance.now() / 330) * 0.05;
      probeRing.scale.setScalar(pulse);
      tangentPlaneMaterial.opacity = 0.14 + Math.sin(performance.now() / 420) * 0.025;
      beacons.forEach((beacon, index) => {
        const ring = beacon.children[1];
        if (ring && ring.geometry?.type === "TorusGeometry") {
          ring.scale.setScalar(1 + Math.sin(performance.now() / 440 + index) * 0.09);
        }
      });
      probe.rotation.y += dt * 0.4;
    },
    getState() {
      return { ...state, ...state.last };
    },
    dispose() {},
  };
}
