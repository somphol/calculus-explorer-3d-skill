// UNIT 6 — Integration and accumulation of change
// Extruded Riemann prisms under a curve. n sweeps from 2 to 200 and the stepped
// solid converges on the smooth signed area.

import * as THREE from "three";
import { formatNumber, integrate, riemann } from "../core/math.js";
import { lineFromPoints, makeTextSprite, tubeFromPoints } from "./common.js";

const PRESETS = {
  quadratic: {
    label: "Quadratic bowl",
    f: (x) => 0.55 * x * x + 0.35,
    domain: [-2, 2],
    color: "#5eead4",
  },
  sine: {
    label: "Sine arch",
    f: (x) => 1.15 * Math.sin(1.3 * x) + 1.35,
    domain: [-2, 2],
    color: "#fbbf24",
  },
  cubic: {
    label: "Cubic rise",
    f: (x) => 0.16 * x ** 3 + 0.7,
    domain: [-2, 2],
    color: "#a78bfa",
  },
};

const METHODS = {
  left: { label: "Left", color: "#5eead4" },
  right: { label: "Right", color: "#fbbf24" },
  mid: { label: "Midpoint", color: "#a78bfa" },
  trap: { label: "Trapezoid", color: "#fb7185" },
};

function trapezoidGeometry(f, a, b, n) {
  const dx = (b - a) / n;
  const depth = 0.9;
  const positions = [];
  const push = (...values) => positions.push(...values);
  for (let i = 0; i < n; i += 1) {
    const x0 = a + i * dx;
    const x1 = x0 + dx;
    const y0 = f(x0);
    const y1 = f(x1);
    for (const z of [-depth, depth]) {
      // side triangles
      push(x0, 0, z, x1, 0, z, x1, y1, z);
      push(x0, 0, z, x1, y1, z, x0, y0, z);
    }
    // top
    push(x0, y0, -depth, x1, y1, -depth, x1, y1, depth);
    push(x0, y0, -depth, x1, y1, depth, x0, y0, depth);
    // bottom
    push(x0, 0, -depth, x1, 0, depth, x1, 0, -depth);
    push(x0, 0, -depth, x0, 0, depth, x1, 0, depth);
    // left/right walls
    push(x0, 0, -depth, x0, y0, depth, x0, 0, depth);
    push(x0, 0, -depth, x0, y0, -depth, x0, y0, depth);
    if (i === n - 1) {
      push(x1, 0, -depth, x1, y1, depth, x1, y1, -depth);
      push(x1, 0, -depth, x1, 0, depth, x1, y1, depth);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function createUnit6Scene() {
  const group = new THREE.Group();
  const state = { preset: "quadratic", method: "left", n: 8, refining: false, refineTime: 0 };
  const solidLayer = new THREE.Group();
  const smoothLayer = new THREE.Group();
  const staticLayer = new THREE.Group();
  group.add(staticLayer, smoothLayer, solidLayer);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 7),
    new THREE.MeshStandardMaterial({ color: "#07111f", roughness: 0.94, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.03;
  floor.receiveShadow = true;
  group.add(floor);
  const grid = new THREE.GridHelper(10, 34, 0x1c3a47, 0x122530);
  grid.position.y = -0.015;
  grid.material.transparent = true;
  grid.material.opacity = 0.42;
  group.add(grid);
  group.add(lineFromPoints([new THREE.Vector3(-3.4, 0, 1.9), new THREE.Vector3(3.4, 0, 1.9)], "#fb7185", 0.5));
  group.add(lineFromPoints([new THREE.Vector3(0, -0.01, 1.9), new THREE.Vector3(0, 3.4, 1.9)], "#5eead4", 0.45));

  const xLabel = makeTextSprite("x", { color: "#fb7185", size: 0.28 });
  xLabel.position.set(3.45, 0.18, 1.9);
  const yLabel = makeTextSprite("y", { color: "#5eead4", size: 0.28 });
  yLabel.position.set(0.1, 3.55, 1.9);
  group.add(xLabel, yLabel);

  let rare = null;
  let staticPreset = null;

  function preset() {
    return PRESETS[state.preset];
  }

  function clearLayer(layer) {
    for (const child of layer.children.slice()) {
      layer.remove(child);
      child.geometry?.dispose();
      child.material?.dispose();
    }
  }

  function buildStatic() {
    const p = preset();
    if (staticPreset === state.preset) return;
    staticPreset = state.preset;
    clearLayer(staticLayer);
    const points = [];
    const strip = [];
    const [a, b] = p.domain;
    for (let i = 0; i <= 320; i += 1) {
      const x = a + ((b - a) * i) / 320;
      const y = p.f(x);
      points.push(new THREE.Vector3(x, y, 1.2));
      strip.push(x, y, -0.95, x, 0, -0.95);
    }
    const ribbonGeometry = new THREE.BufferGeometry();
    ribbonGeometry.setAttribute("position", new THREE.Float32BufferAttribute(strip, 3));
    const indices = [];
    for (let i = 0; i < 320; i += 1) {
      const base = i * 2;
      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
    ribbonGeometry.setIndex(indices);
    ribbonGeometry.computeVertexNormals();
    rare = new THREE.Mesh(
      ribbonGeometry,
      new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })
    );
    smoothLayer.add(rare);
    staticLayer.add(tubeFromPoints(points, p.color, { radius: 0.026, emissive: 0.5 }));
  }

  function build() {
    buildStatic();
    clearLayer(solidLayer);
    const p = preset();
    const n = state.n;
    const [a, b] = p.domain;
    const dx = (b - a) / n;
    const method = state.method;
    const color = METHODS[method].color;

    if (method === "trap") {
      const mesh = new THREE.Mesh(
        trapezoidGeometry(p.f, a, b, n),
        new THREE.MeshStandardMaterial({
          color,
          emissive: new THREE.Color(color).multiplyScalar(0.22),
          roughness: 0.4,
          metalness: 0.2,
          transparent: true,
          opacity: 0.92,
          side: THREE.DoubleSide,
        })
      );
      mesh.castShadow = true;
      solidLayer.add(mesh);
    } else {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: new THREE.Color(color).multiplyScalar(0.16),
        roughness: 0.38,
        metalness: 0.22,
        vertexColors: false,
      });
      const mesh = new THREE.InstancedMesh(geometry, material, n);
      const dummy = new THREE.Object3D();
      const baseColor = new THREE.Color(color);
      for (let i = 0; i < n; i += 1) {
        const left = a + i * dx;
        const right = left + dx;
        const sample = method === "left" ? left : method === "right" ? right : (left + right) / 2;
        const height = Math.max(0.001, p.f(sample));
        dummy.position.set((left + right) / 2, height / 2, 0);
        dummy.scale.set(Math.max(0.015, dx * 0.88), height, 1.75);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        const shade = baseColor.clone().lerp(new THREE.Color("#ffffff"), Math.min(0.35, height * 0.07));
        mesh.setColorAt(i, shade);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      solidLayer.add(mesh);
    }

    const exact = integrate(p.f, a, b, 4000);
    const approx = riemann(p.f, a, b, n, method);
    state.last = {
      exact,
      approx,
      error: Math.abs(approx - exact),
      percent: exact === 0 ? 0 : (Math.abs(approx - exact) / Math.abs(exact)) * 100,
      dx,
      n,
    };
  }

  function set(key, value) {
    if (key === "preset") {
      state.preset = value;
      state.refining = false;
      build();
    } else if (key === "method") {
      state.method = value;
      if (state.method === "trap" && state.n > 120) state.n = 120;
      build();
    } else if (key === "n") {
      state.n = Math.max(2, Math.round(Number(value)));
      state.refining = false;
      build();
    }
  }

  function action(key) {
    if (key === "refine") {
      state.refining = true;
      state.refineTime = 0;
      state.n = 2;
      const slider = this.controls.find((control) => control.key === "n");
      if (slider) slider.value = 2;
      build();
    }
  }

  function readout() {
    const last = state.last || {};
    return [
      { label: "Subintervals n", value: String(state.n), tone: "muted" },
      { label: "Δx", value: formatNumber(last.dx ?? 0, 4), tone: "teal" },
      { label: `${METHODS[state.method].label} sum`, value: formatNumber(last.approx ?? 0, 4), tone: "amber" },
      { label: "Exact integral", value: formatNumber(last.exact ?? 0, 4), tone: "violet" },
      { label: "Absolute error", value: formatNumber(last.error ?? 0, 4), tone: (last.error ?? 1) < 0.05 ? "good" : "bad" },
      { label: "Relative error", value: `${formatNumber(last.percent ?? 0, 2)}%`, tone: (last.percent ?? 100) < 2 ? "good" : "bad" },
    ];
  }

  function narration() {
    const last = state.last || {};
    const p = preset();
    return {
      title: "Rectangles becoming an integral",
      lead: "Each prism is one term of the Riemann sum. Refining the partition changes the step size, not the underlying curve; the limit is the integral.",
      formula: `Σ f(x<sub>k</sub>*) Δx = ${formatNumber(last.approx ?? 0, 4)} &nbsp;→&nbsp; ∫<sub>a</sub><sup>b</sup> f(x)dx = ${formatNumber(last.exact ?? 0, 4)}<br>Δx = (b − a)/n = ${formatNumber(last.dx ?? 0, 4)}, n = ${state.n}`,
      note: (last.error ?? 1) < 0.05
        ? "The discrete sum is within 0.05 of the exact area. The prisms are now thinner than the visible gap, so the solid reads as smooth."
        : `The ${METHODS[state.method].label.toLowerCase()} approximation is still visibly stepped. Increase n or press “Refine to n = 200” to watch convergence.`,
      status: `${METHODS[state.method].label} · n = ${state.n}`,
    };
  }

  build();

  return {
    group,
    camera: { position: [4.8, 3.5, 8.2], target: [0, 0.9, 0], fov: 42 },
    controls: [
      { type: "select", key: "preset", label: "Curve", value: "quadratic", options: Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })) },
      { type: "select", key: "method", label: "Riemann method", value: "left", options: Object.entries(METHODS).map(([value, m]) => ({ value, label: m.label })) },
      { type: "range", key: "n", label: "Subintervals · n", min: 2, max: 200, step: 1, value: 8 },
      { type: "button", key: "refine", label: "Refine to n = 200" },
    ],
    set,
    action,
    readout,
    narration,
    update(dt) {
      if (state.refining) {
        state.refineTime += dt;
        const t = Math.min(1, state.refineTime / 4.2);
        const next = Math.round(2 + (198) * (1 - (1 - t) ** 2.2));
        if (next !== state.n) {
          state.n = next;
          const slider = this.controls.find((control) => control.key === "n");
          if (slider) slider.value = next;
          build();
        }
        if (t >= 1) state.refining = false;
      }
      if (rare) rare.material.opacity = 0.09 + Math.sin(performance.now() / 520) * 0.025;
    },
    getState() {
      return { ...state, ...state.last };
    },
    dispose() {},
  };
}
