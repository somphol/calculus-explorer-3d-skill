// UNIT 8 — Applications of integration
// A partial lathe studio for disk/washer solids plus a known-cross-section
// gallery. The rotation slider laths the solid from 0° to 360° in real time.

import * as THREE from "three";
import { clamp, formatNumber, integrate } from "../core/math.js";
import { arrow, dot, lineFromPoints, makeTextSprite, tubeFromPoints } from "./common.js";

const PRESETS = {
  sqrt: {
    label: "y = √x",
    f: (x) => Math.sqrt(Math.max(0, x)),
    domain: [0, 4],
    color: "#fbbf24",
  },
  parabola: {
    label: "y = 0.45x² + 0.25",
    f: (x) => 0.45 * x * x + 0.25,
    domain: [0, 2.6],
    color: "#5eead4",
  },
  sine: {
    label: "y = 1.15 + sin x",
    f: (x) => 1.15 + Math.sin(x),
    domain: [0, 3],
    color: "#a78bfa",
  },
  line: {
    label: "y = 0.35x + 0.5",
    f: (x) => 0.35 * x + 0.5,
    domain: [0, 3.2],
    color: "#fb7185",
  },
};

function revolutionProfile(f, a, b, innerFactor, samples = 72) {
  const outer = [];
  for (let i = 0; i <= samples; i += 1) {
    const x = a + ((b - a) * i) / samples;
    outer.push([f(x), x]);
  }
  const profile = outer.slice();
  if (innerFactor > 0.001) {
    for (let i = samples; i >= 0; i -= 1) {
      const x = a + ((b - a) * i) / samples;
      profile.push([f(x) * innerFactor, x]);
    }
  } else {
    profile.push([0, b], [0, a]);
  }
  const deduped = [];
  for (const point of profile) {
    const last = deduped[deduped.length - 1];
    if (!last || Math.hypot(point[0] - last[0], point[1] - last[1]) > 1e-7) deduped.push(point);
  }
  if (deduped.length > 1) {
    const first = deduped[0];
    const last = deduped[deduped.length - 1];
    if (Math.hypot(first[0] - last[0], first[1] - last[1]) < 1e-7) deduped.pop();
  }
  return deduped;
}

function buildRevolution(profile, angleRad, segments = 64) {
  const positions = [];
  const indices = [];
  const count = profile.length;
  const steps = Math.max(2, Math.ceil((segments * angleRad) / (Math.PI * 2)));
  if (angleRad < 0.02) return new THREE.BufferGeometry();
  for (let j = 0; j <= steps; j += 1) {
    const theta = (angleRad * j) / steps;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    for (const [radius, x] of profile) {
      positions.push(x, radius * cos, radius * sin);
    }
  }
  for (let j = 0; j < steps; j += 1) {
    for (let i = 0; i < count; i += 1) {
      const next = (i + 1) % count;
      const a1 = j * count + i;
      const b1 = j * count + next;
      const c1 = (j + 1) * count + i;
      const d1 = (j + 1) * count + next;
      indices.push(a1, c1, b1, b1, c1, d1);
    }
  }
  // Flat slice caps at the two angular ends. Triangulate the closed profile in
  // the (x, radius) plane once, then reuse the indices at each angle.
  if (angleRad < Math.PI * 2 - 0.02) {
    const shapePoints = profile.map(([radius, x]) => new THREE.Vector2(x, radius));
    const capFaces = THREE.ShapeUtils.triangulateShape(shapePoints, []);
    for (const [theta, reverse] of [[0, false], [angleRad, true]]) {
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const base = positions.length / 3;
      for (const [radius, x] of profile) positions.push(x, radius * cos, radius * sin);
      for (const face of capFaces) {
        if (reverse) indices.push(base + face[0], base + face[1], base + face[2]);
        else indices.push(base + face[0], base + face[2], base + face[1]);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function crossSectionGeometry(f, a, b, shape, slices) {
  const group = new THREE.Group();
  const span = b - a;
  for (let i = 0; i < slices; i += 1) {
    const t = slices === 1 ? 0.5 : i / (slices - 1);
    const x = a + span * (0.06 + t * 0.88);
    const radius = f(x);
    const thickness = Math.max(0.018, span / slices * 0.34);
    let mesh;
    if (shape === "square") {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, radius * 2, radius * 2),
        new THREE.MeshStandardMaterial({
          color: "#5eead4",
          emissive: 0x0d9488,
          emissiveIntensity: 0.28,
          roughness: 0.35,
          metalness: 0.25,
          transparent: true,
          opacity: 0.85,
        })
      );
    } else {
      const geometry = new THREE.CylinderGeometry(radius, radius, thickness, 28, 1, false, 0, Math.PI);
      geometry.rotateZ(Math.PI / 2);
      mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({
          color: "#a78bfa",
          emissive: 0x7c3aed,
          emissiveIntensity: 0.25,
          roughness: 0.35,
          metalness: 0.25,
          transparent: true,
          opacity: 0.85,
        })
      );
    }
    mesh.position.set(x, 0, 0);
    group.add(mesh);
  }
  return group;
}

export function createUnit8Scene() {
  const group = new THREE.Group();
  const state = { mode: "revolve", preset: "sqrt", angle: 360, washer: false, shape: "square", slices: 12 };
  const revolveLayer = new THREE.Group();
  const crossLayer = new THREE.Group();
  const axisLayer = new THREE.Group();
  group.add(axisLayer, revolveLayer, crossLayer);

  const axis = lineFromPoints([new THREE.Vector3(-0.8, 0, 0), new THREE.Vector3(5, 0, 0)], "#fb7185", 0.7);
  axisLayer.add(axis);
  const axisArrow = arrow([4.6, 0, 0], [5.2, 0, 0], "#fb7185", 0.2, 0.11);
  axisLayer.add(axisArrow);
  const axisLabel = makeTextSprite("axis of rotation", { color: "#fb7185", size: 0.24 });
  axisLabel.position.set(4.6, 0.28, 0);
  axisLayer.add(axisLabel);

  const floorGrid = new THREE.GridHelper(11, 34, 0x1d3b48, 0x132733);
  floorGrid.position.y = -2.2;
  floorGrid.material.transparent = true;
  floorGrid.material.opacity = 0.34;
  group.add(floorGrid);

  let surface = null;
  let wire = null;
  let slices = null;

  function preset() {
    return PRESETS[state.preset];
  }

  function clearLayer(layer) {
    for (const child of layer.children.slice()) {
      layer.remove(child);
      child.traverse((node) => {
        node.userData?.dispose?.();
        node.geometry?.dispose();
        node.material?.dispose();
      });
    }
  }

  function buildRevolve() {
    clearLayer(revolveLayer);
    const p = preset();
    const [a, b] = p.domain;
    const angle = (state.angle / 180) * Math.PI;
    const innerFactor = state.washer ? 0.45 : 0;
    const profile = revolutionProfile(p.f, a, b, innerFactor);

    const profilePoints = [];
    for (let i = 0; i <= 160; i += 1) {
      const x = a + ((b - a) * i) / 160;
      profilePoints.push(new THREE.Vector3(x, p.f(x), 0));
    }
    revolveLayer.add(tubeFromPoints(profilePoints, p.color, { radius: 0.028, emissive: 0.6 }));

    if (angle > 0.02) {
      const geometry = buildRevolution(profile, angle, 68);
      surface = new THREE.Mesh(
        geometry,
        new THREE.MeshPhysicalMaterial({
          color: p.color,
          transparent: true,
          opacity: 0.5,
          roughness: 0.18,
          metalness: 0.28,
          clearcoat: 0.8,
          clearcoatRoughness: 0.15,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      revolveLayer.add(surface);
      wire = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({ color: "#e2e8f0", wireframe: true, transparent: true, opacity: 0.045 })
      );
      revolveLayer.add(wire);

      for (let k = 0; k < 7; k += 1) {
        const x = a + ((b - a) * k) / 6;
        const r = p.f(x);
        const arc = [];
        for (let j = 0; j <= 64; j += 1) {
          const theta = (angle * j) / 64;
          arc.push(new THREE.Vector3(x, r * Math.cos(theta), r * Math.sin(theta)));
        }
        revolveLayer.add(lineFromPoints(arc, p.color, 0.45));
      }
    }

    state.last = { angle: state.angle, innerFactor, a, b };
  }

  function buildCross() {
    clearLayer(crossLayer);
    if (state.mode !== "cross") return;
    const p = preset();
    const [a, b] = p.domain;
    const shape = state.shape;
    const groupSlices = crossSectionGeometry(p.f, a, b, shape, state.slices);
    crossLayer.add(groupSlices);
    slices = groupSlices;

    for (const sign of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= 180; i += 1) {
        const x = a + ((b - a) * i) / 180;
        pts.push(new THREE.Vector3(x, sign * p.f(x), 0));
      }
      crossLayer.add(tubeFromPoints(pts, sign > 0 ? p.color : "#64748b", { radius: 0.018, emissive: 0.4 }));
    }
    const baseRibbon = [];
    for (let i = 0; i <= 180; i += 1) {
      const x = a + ((b - a) * i) / 180;
      const r = p.f(x);
      baseRibbon.push(new THREE.Vector3(x, -r, 0), new THREE.Vector3(x, r, 0));
    }
    crossLayer.add(lineFromPoints(baseRibbon, "#334155", 0.22));
    state.last = { a, b, shape };
  }

  function build() {
    revolveLayer.visible = state.mode === "revolve";
    crossLayer.visible = state.mode === "cross";
    axis.visible = state.mode === "revolve";
    axisArrow.visible = state.mode === "revolve";
    axisLabel.visible = state.mode === "revolve";
    if (state.mode === "revolve") buildRevolve();
    else buildCross();
  }

  function volume() {
    const p = preset();
    const [a, b] = p.domain;
    if (state.mode === "revolve") {
      const inner = state.washer ? 0.45 : 0;
      const full = Math.PI * integrate((x) => p.f(x) ** 2 * (1 - inner ** 2), a, b, 2000);
      return { full, partial: full * (state.angle / 360), formula: state.washer ? "π∫(R² − r²)dx" : "π∫R²dx" };
    }
    if (state.shape === "square") {
      const full = integrate((x) => (2 * p.f(x)) ** 2, a, b, 2000);
      return { full, partial: full, formula: "∫(2y)²dx" };
    }
    const full = (Math.PI / 2) * integrate((x) => p.f(x) ** 2, a, b, 2000);
    return { full, partial: full, formula: "(π/2)∫y²dx" };
  }

  function set(key, value) {
    if (key === "mode") {
      state.mode = value;
      build();
    } else if (key === "preset") {
      state.preset = value;
      build();
    } else if (key === "angle") {
      state.angle = Number(value);
      if (state.mode === "revolve") buildRevolve();
    } else if (key === "washer") {
      state.washer = Boolean(value);
      if (state.mode === "revolve") buildRevolve();
    } else if (key === "shape") {
      state.shape = value;
      if (state.mode === "cross") buildCross();
    } else if (key === "slices") {
      state.slices = Math.round(Number(value));
      if (state.mode === "cross") buildCross();
    }
  }

  function action(key) {
    if (key === "washer") {
      state.washer = !state.washer;
      if (state.mode === "revolve") buildRevolve();
    } else if (key === "full") {
      state.angle = 360;
      const slider = this.controls.find((control) => control.key === "angle");
      if (slider) slider.value = 360;
      if (state.mode === "revolve") buildRevolve();
    } else if (key === "half") {
      state.angle = 180;
      const slider = this.controls.find((control) => control.key === "angle");
      if (slider) slider.value = 180;
      if (state.mode === "revolve") buildRevolve();
    }
  }

  function readout() {
    const v = volume();
    if (state.mode === "revolve") {
      return [
        { label: "Mode", value: state.washer ? "Washer" : "Disk", tone: "muted" },
        { label: "Rotation", value: `${formatNumber(state.angle, 0)}°`, tone: "amber" },
        { label: "Full volume", value: formatNumber(v.full, 3), tone: "violet" },
        { label: "Current sweep", value: formatNumber(v.partial, 3), tone: "good" },
        { label: "Setup", value: v.formula, tone: "muted" },
        { label: "Family", value: "solid of revolution", tone: "muted" },
      ];
    }
    return [
      { label: "Cross-section", value: state.shape === "square" ? "Square" : "Semicircle", tone: "muted" },
      { label: "Slices shown", value: String(state.slices), tone: "teal" },
      { label: "Volume", value: formatNumber(v.full, 3), tone: "violet" },
      { label: "Setup", value: v.formula, tone: "muted" },
      { label: "Base", value: "y = ±f(x)", tone: "muted" },
      { label: "Slicing axis", value: "perpendicular to x", tone: "muted" },
    ];
  }

  function narration() {
    const p = preset();
    const [a, b] = p.domain;
    const v = volume();
    if (state.mode === "revolve") {
      return {
        title: "Solids of revolution",
        lead: "Rotate the region between the curve and the axis. Each slice perpendicular to the axis is a disk or a washer.",
        formula: `V = ${v.formula} = ${formatNumber(v.full, 3)}<br>swept ${formatNumber(state.angle, 0)}° ⇒ ${formatNumber(state.angle / 360, 3)} × V = <strong>${formatNumber(v.partial, 3)}</strong>`,
        note: state.washer
          ? "The inner radius is 45% of the outer radius, so each slice is a washer: π(R² − r²) dx."
          : "At 0° the profile is flat; at 360° the solid is complete. The transparent surface lets you see the slice structure.",
        status: `${state.washer ? "washer" : "disk"} · ${formatNumber(state.angle, 0)}°`,
      };
    }
    return {
      title: "Volumes with known cross-sections",
      lead: "The base is the region between y = f(x) and y = −f(x). Each slice perpendicular to the x-axis has the chosen shape, with its dimension set by the base.",
      formula: `A(x) = ${state.shape === "square" ? "(2f(x))²" : "(π/2)f(x)²"}<br>V = ∫<sub>${formatNumber(a, 2)}</sub><sup>${formatNumber(b, 2)}</sup> A(x)dx = <strong>${formatNumber(v.full, 3)}</strong>`,
      note: state.shape === "square"
        ? "The full vertical width 2f(x) is the side of the square, so the area is 4f(x)²."
        : "The full vertical width 2f(x) is the diameter, so the semicircle radius is f(x) and the area is (π/2)f(x)².",
      status: `${state.shape} cross-sections`,
    };
  }

  build();

  return {
    group,
    camera: { position: [5.9, 4.3, 8.6], target: [1.4, 0, 0], fov: 42 },
    controls: [
      { type: "select", key: "mode", label: "Studio mode", value: "revolve", options: [{ value: "revolve", label: "Solid of revolution" }, { value: "cross", label: "Known cross-sections" }] },
      { type: "select", key: "preset", label: "Profile", value: "sqrt", options: Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })) },
      { type: "range", key: "angle", label: "Rotation sweep", min: 0, max: 360, step: 1, value: 360, suffix: "°", visibleWhen: { key: "mode", value: "revolve" } },
      { type: "button", key: "washer", label: "Toggle washer hole", reflect: "washer", visibleWhen: { key: "mode", value: "revolve" } },
      { type: "button", key: "half", label: "Half sweep (180°)", visibleWhen: { key: "mode", value: "revolve" } },
      { type: "button", key: "full", label: "Full sweep (360°)", visibleWhen: { key: "mode", value: "revolve" } },
      { type: "select", key: "shape", label: "Cross-section shape", value: "square", options: [{ value: "square", label: "Squares" }, { value: "semicircle", label: "Semicircles" }], visibleWhen: { key: "mode", value: "cross" } },
      { type: "range", key: "slices", label: "Slices shown", min: 3, max: 24, step: 1, value: 12, visibleWhen: { key: "mode", value: "cross" } },
    ],
    set,
    action,
    readout,
    narration,
    update(dt) {
      if (state.mode === "revolve" && surface) {
        surface.material.opacity = 0.46 + Math.sin(performance.now() / 620) * 0.05;
        surface.rotation.y = Math.sin(performance.now() / 900) * 0.015;
      }
      if (state.mode === "cross" && slices) {
        slices.rotation.y = Math.sin(performance.now() / 1100) * 0.03;
      }
    },
    getHint() {
      return state.mode === "revolve"
        ? "Drag the rotation angle from 0° to 360° and watch the surface lath into existence."
        : "Change the cross-section shape and slice count; every slice has the same silhouette.";
    },
    getState() {
      return { ...state, ...volume() };
    },
    dispose() {},
  };
}
