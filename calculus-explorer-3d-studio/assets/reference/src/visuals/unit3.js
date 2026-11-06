// UNIT 3 — Composite, implicit, and inverse functions
// Three nested rings rotate at the local rates of an inner, middle, and outer
// function. The chain rule is literally the product of those angular speeds.

import * as THREE from "three";
import { clamp, formatNumber } from "../core/math.js";
import { arrow, dot, makeTextSprite } from "./common.js";

function ring(radius, color, tilt) {
  const group = new THREE.Group();
  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.032, 10, 120),
    new THREE.MeshStandardMaterial({
      color,
      emissive: new THREE.Color(color).multiplyScalar(0.45),
      roughness: 0.25,
      metalness: 0.5,
      transparent: true,
      opacity: 0.82,
    })
  );
  group.add(torus);
  const pivot = new THREE.Group();
  const beads = [];
  for (let i = 0; i < 4; i += 1) {
    const bead = dot(new THREE.Vector3(radius, 0, 0), color, 0.055, 1.6);
    bead.userData.offset = (i / 4) * Math.PI * 2;
    pivot.add(bead);
    beads.push(bead);
  }
  group.add(pivot);
  group.rotation.set(...tilt);
  return { group, torus, pivot, beads };
}

export function createUnit3Scene() {
  const group = new THREE.Group();
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(4.6, 64),
    new THREE.MeshStandardMaterial({ color: "#07111f", metalness: 0.2, roughness: 0.86, transparent: true, opacity: 0.72 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.45;
  group.add(floor);
  const grid = new THREE.GridHelper(9, 30, 0x1e4b57, 0x142833);
  grid.position.y = -2.43;
  grid.material.transparent = true;
  grid.material.opacity = 0.4;
  group.add(grid);

  const state = { x: 0.7, a: 1.4, power: 3, phaseInner: 0.4, phaseMiddle: 0.9, phaseOuter: 0.2, reduced: false };
  state.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const inner = ring(1.05, "#5eead4", [0, Math.PI / 2, 0]);
  const middle = ring(1.75, "#a78bfa", [Math.PI / 2, 0, 0]);
  const outer = ring(2.48, "#fbbf24", [0, 0, 0]);
  group.add(inner.group, middle.group, outer.group);

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.34, 2),
    new THREE.MeshStandardMaterial({ color: "#e0f2fe", emissive: 0x38bdf8, emissiveIntensity: 1.15, roughness: 0.2, metalness: 0.4 })
  );
  group.add(core);
  const coreHalo = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 24, 18),
    new THREE.MeshBasicMaterial({ color: "#7dd3fc", transparent: true, opacity: 0.055 })
  );
  group.add(coreHalo);

  const labels = [
    { text: "inner h′", color: "#5eead4", position: [1.05, 0.32, 0.1] },
    { text: "middle g′", color: "#a78bfa", position: [0, 1.95, 1.1] },
    { text: "outer f′", color: "#fbbf24", position: [0, 0.2, 2.72] },
  ].map((item) => {
    const sprite = makeTextSprite(item.text, { color: item.color, size: 0.26 });
    sprite.position.set(...item.position);
    group.add(sprite);
    return sprite;
  });

  const arrows = [
    { helper: arrow([1.05, 0, 0], [1.05, 0.7, 0], "#5eead4", 0.16, 0.1), anchor: [1.05, 0, 0], axis: "x" },
    { helper: arrow([0, 1.75, 0], [0.7, 1.75, 0], "#a78bfa", 0.16, 0.1), anchor: [0, 1.75, 0], axis: "y" },
    { helper: arrow([2.48, 0, 0], [2.48, 0.7, 0], "#fbbf24", 0.16, 0.1), anchor: [2.48, 0, 0], axis: "z" },
  ];
  arrows.forEach((item) => group.add(item.helper));

  function values() {
    const u = state.a * state.x;
    const v = Math.sin(u);
    const y = v ** state.power;
    const hPrime = state.a;
    const gPrime = Math.cos(u);
    const fPrime = state.power * v ** (state.power - 1);
    return { u, v, y, hPrime, gPrime, fPrime, product: hPrime * gPrime * fPrime };
  }

  function updateBeads() {
    const sets = [
      { ring: inner, phase: state.phaseInner, radius: 1.05 },
      { ring: middle, phase: state.phaseMiddle, radius: 1.75 },
      { ring: outer, phase: state.phaseOuter, radius: 2.48 },
    ];
    for (const item of sets) {
      for (const bead of item.ring.beads) {
        const angle = item.phase + bead.userData.offset;
        bead.position.set(Math.cos(angle) * item.radius, Math.sin(angle) * item.radius, 0);
      }
    }
  }

  function updateArrows() {
    const v = values();
    const rates = [v.hPrime, v.gPrime, v.fPrime];
    const colors = ["#5eead4", "#a78bfa", "#fbbf24"];
    arrows.forEach((item, index) => {
      const rate = rates[index];
      const magnitude = clamp(Math.abs(rate), 0.08, 2.6);
      const color = new THREE.Color(rate >= 0 ? colors[index] : "#fb7185");
      item.helper.setColor(color);
      const dir = index === 0 ? [0, 1, 0] : index === 1 ? [1, 0, 0] : [0, 1, 0];
      item.helper.setDirection(new THREE.Vector3(...dir).normalize());
      item.helper.setLength(0.25 + magnitude * 0.55, 0.15, 0.09);
      item.helper.position.set(...item.anchor);
      item.helper.visible = Math.abs(rate) > 0.02;
    });
  }

  function set(key, value) {
    if (key === "x") state.x = Number(value);
    else if (key === "a") state.a = Number(value);
    else if (key === "power") state.power = Number(value);
    updateArrows();
    updateBeads();
  }

  function readout() {
    const v = values();
    return [
      { label: "x", value: formatNumber(state.x, 2), tone: "muted" },
      { label: "u = a·x", value: formatNumber(v.u, 3), tone: "teal" },
      { label: "v = sin u", value: formatNumber(v.v, 3), tone: "violet" },
      { label: "y = v³", value: formatNumber(v.y, 3), tone: "amber" },
      { label: "h′ · g′ · f′", value: `${formatNumber(v.hPrime, 2)} · ${formatNumber(v.gPrime, 2)} · ${formatNumber(v.fPrime, 2)}`, tone: "muted" },
      { label: "dy/dx", value: formatNumber(v.product, 3), tone: v.product >= 0 ? "good" : "bad" },
    ];
  }

  function narration() {
    const v = values();
    return {
      title: "The chain rule multiplies rates",
      lead: `Let h(x) = ax, g(u) = sin u, and f(v) = v^${state.power}. A small change in x is amplified by h′, then rotated by g′, then scaled by f′.`,
      formula: `dy/dx = f′(g(h(x))) · g′(h(x)) · h′(x)<br>= ${formatNumber(v.fPrime, 3)} · ${formatNumber(v.gPrime, 3)} · ${formatNumber(v.hPrime, 2)} = <strong>${formatNumber(v.product, 3)}</strong>`,
      note: v.product >= 0
        ? "The product is positive, so the composed function is increasing at this x. All three rings are turning in the signed directions that multiply to that result."
        : "The product is negative, so the composed function is decreasing at this x. One of the rings has reversed direction.",
      status: `inner ${formatNumber(v.hPrime, 2)} · middle ${formatNumber(v.gPrime, 2)} · outer ${formatNumber(v.fPrime, 2)}`,
    };
  }

  updateArrows();
  updateBeads();

  return {
    group,
    camera: { position: [5.2, 4.2, 9.2], target: [0, 0, 0], fov: 42 },
    controls: [
      { type: "range", key: "x", label: "Input x", min: -1.6, max: 1.6, step: 0.01, value: 0.7 },
      { type: "range", key: "a", label: "Inner gain a", min: 0.4, max: 2.6, step: 0.01, value: 1.4 },
      { type: "select", key: "power", label: "Outer power", value: 3, options: [{ value: 2, label: "v²" }, { value: 3, label: "v³" }, { value: 4, label: "v⁴" }] },
    ],
    set,
    readout,
    narration,
    update(dt) {
      const v = values();
      if (!state.reduced) {
        state.phaseInner += dt * clamp(v.hPrime, -2.6, 2.6) * 0.85;
        state.phaseMiddle += dt * clamp(v.gPrime, -2.6, 2.6) * 0.85;
        state.phaseOuter += dt * clamp(v.fPrime, -2.6, 2.6) * 0.7;
      } else {
        state.phaseInner = 0.4;
        state.phaseMiddle = 0.9;
        state.phaseOuter = 0.2;
      }
      updateBeads();
      core.rotation.y += dt * 0.22;
      core.rotation.x += dt * 0.1;
      const pulse = 0.055 + Math.abs(v.product) * 0.006;
      coreHalo.material.opacity = pulse;
      core.scale.setScalar(1 + Math.sin(performance.now() / 400) * 0.025);
      labels.forEach((label, index) => {
        label.material.opacity = 0.82 + Math.sin(performance.now() / 500 + index) * 0.12;
      });
    },
    getState() {
      return { ...state, ...values() };
    },
    dispose() {},
  };
}
