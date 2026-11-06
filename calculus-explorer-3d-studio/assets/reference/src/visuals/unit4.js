// UNIT 4 — Contextual applications of differentiation
// Two physical related-rates models: an inverted cone filling with water and a
// ladder sliding down a wall. Every rate vector is driven by the same sliders.

import * as THREE from "three";
import { clamp, formatNumber } from "../core/math.js";
import { arrow, dot, makeTextSprite, tubeFromPoints } from "./common.js";

const CONE_HEIGHT = 3;
const CONE_RADIUS = 1.8;
const LADDER_LENGTH = 3.4;

function buildCone() {
  const group = new THREE.Group();
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(CONE_RADIUS, 0, CONE_HEIGHT, 64, 1, true),
    new THREE.MeshStandardMaterial({
      color: "#7dd3fc",
      transparent: true,
      opacity: 0.1,
      roughness: 0.2,
      metalness: 0.1,
      side: THREE.DoubleSide,
    })
  );
  glass.position.y = CONE_HEIGHT / 2 - 1.55;
  group.add(glass);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(CONE_RADIUS, 0.025, 8, 80),
    new THREE.MeshStandardMaterial({ color: "#7dd3fc", emissive: 0x0ea5e9, emissiveIntensity: 0.8, roughness: 0.25 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = CONE_HEIGHT - 1.55;
  group.add(rim);

  const wire = new THREE.Mesh(
    new THREE.CylinderGeometry(CONE_RADIUS, 0, CONE_HEIGHT, 18, 1, true),
    new THREE.MeshBasicMaterial({ color: "#38bdf8", wireframe: true, transparent: true, opacity: 0.16 })
  );
  wire.position.copy(glass.position);
  group.add(wire);

  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0, 0.5, 48, 1, false),
    new THREE.MeshPhysicalMaterial({
      color: "#22d3ee",
      transparent: true,
      opacity: 0.56,
      roughness: 0.05,
      metalness: 0.1,
      emissive: 0x0891b2,
      emissiveIntensity: 0.35,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      side: THREE.DoubleSide,
    })
  );
  group.add(water);

  const surfaceRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.014, 6, 64),
    new THREE.MeshBasicMaterial({ color: "#a5f3fc", transparent: true, opacity: 0.9 })
  );
  surfaceRing.rotation.x = Math.PI / 2;
  group.add(surfaceRing);

  const apexGlow = new THREE.PointLight(0x22d3ee, 12, 6, 2);
  apexGlow.position.set(0, -1.4, 0);
  group.add(apexGlow);

  const pipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 1.15, 16),
    new THREE.MeshStandardMaterial({ color: "#94a3b8", metalness: 0.85, roughness: 0.22 })
  );
  pipe.position.set(0.9, 2.1, 0.3);
  pipe.rotation.z = -0.5;
  group.add(pipe);

  const drops = [];
  for (let i = 0; i < 18; i += 1) {
    const drop = dot(new THREE.Vector3(0.62, 1.5, 0.14), "#a5f3fc", 0.025, 1.2);
    drop.userData.phase = Math.random();
    group.add(drop);
    drops.push(drop);
  }

  const hLabel = makeTextSprite("h", { color: "#a5f3fc", size: 0.28 });
  hLabel.position.set(0.25, 0.5, 0.9);
  const rLabel = makeTextSprite("r = 0.6h", { color: "#7dd3fc", size: 0.26 });
  rLabel.position.set(1.5, 1.7, 0.5);
  group.add(hLabel, rLabel);

  const rateArrow = arrow([0, -1.4, 0], [0, 0, 0], "#fbbf24", 0.24, 0.15);
  group.add(rateArrow);

  return { group, water, surfaceRing, drops, rateArrow, hLabel, rLabel, apexGlow };
}

function buildLadder() {
  const group = new THREE.Group();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(7.6, 4.8),
    new THREE.MeshStandardMaterial({ color: "#0b1626", roughness: 0.9, metalness: 0.1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -1.55, 0);
  group.add(floor);
  const floorGrid = new THREE.GridHelper(7.6, 19, 0x24414f, 0x162a36);
  floorGrid.position.y = -1.53;
  floorGrid.material.transparent = true;
  floorGrid.material.opacity = 0.4;
  group.add(floorGrid);

  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 4.7, 3.2),
    new THREE.MeshStandardMaterial({ color: "#142433", roughness: 0.8, metalness: 0.15, transparent: true, opacity: 0.82 })
  );
  wall.position.set(2.2, 0.7, 0);
  group.add(wall);
  const wallEdge = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 4.7, 0.04),
    new THREE.MeshStandardMaterial({ color: "#38bdf8", emissive: 0x0ea5e9, emissiveIntensity: 0.45, roughness: 0.3 })
  );
  wallEdge.position.set(2.13, 0.7, 1.61);
  group.add(wallEdge);

  const ladder = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: "#c98a4b", roughness: 0.55, metalness: 0.08 });
  for (const offset of [-0.24, 0.24]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, LADDER_LENGTH, 10), wood);
    rail.position.x = offset;
    ladder.add(rail);
  }
  for (let y = -LADDER_LENGTH / 2 + 0.25; y < LADDER_LENGTH / 2; y += 0.32) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.48, 8), wood);
    rung.rotation.z = Math.PI / 2;
    rung.position.y = y;
    ladder.add(rung);
  }
  group.add(ladder);

  const baseDot = dot(new THREE.Vector3(0, -1.5, 2.03), "#5eead4", 0.09, 1);
  const topDot = dot(new THREE.Vector3(0, 0, 2.03), "#fbbf24", 0.09, 1);
  group.add(baseDot, topDot);

  const downArrow = arrow([2.2, 0, 2.12], [2.2, -0.4, 2.12], "#fb7185", 0.2, 0.12);
  group.add(downArrow);
  const baseArrow = arrow([0, -1.45, 2.08], [0.7, -1.45, 2.08], "#5eead4", 0.2, 0.12);
  group.add(baseArrow);

  const lengthLabel = makeTextSprite("L = 3.4", { color: "#fbbf24", size: 0.25 });
  group.add(lengthLabel);

  return { group, ladder, baseDot, topDot, downArrow, baseArrow, lengthLabel };
}

export function createUnit4Scene() {
  const group = new THREE.Group();
  const state = { model: "cone", h: 1.2, inflow: 9, base: 1.2, speed: 0.9, filling: false };
  const cone = buildCone();
  const ladder = buildLadder();
  group.add(cone.group, ladder.group);

  function coneNarration() {
    const radius = 0.6 * state.h;
    const volume = (Math.PI / 3) * radius ** 2 * state.h;
    const dhdt = state.inflow / (0.36 * Math.PI * state.h ** 2);
    return { radius, volume, dhdt };
  }

  function ladderNarration() {
    const y = Math.sqrt(Math.max(0.001, LADDER_LENGTH ** 2 - state.base ** 2));
    const dydt = -(state.base / y) * state.speed;
    return { y, dydt };
  }

  function refresh() {
    const coneMode = state.model === "cone";
    cone.group.visible = coneMode;
    ladder.group.visible = !coneMode;

    if (coneMode) {
      const radius = 0.6 * state.h;
      const g = cone.water.geometry;
      g.dispose();
      cone.water.geometry = new THREE.CylinderGeometry(radius, 0, state.h, 48, 1, false);
      cone.water.position.y = -1.55 + state.h / 2;
      cone.surfaceRing.geometry.dispose();
      cone.surfaceRing.geometry = new THREE.TorusGeometry(radius, 0.014, 6, 64);
      cone.surfaceRing.position.y = -1.55 + state.h;
      cone.hLabel.position.y = -1.55 + state.h * 0.55;
      cone.rLabel.position.set(radius * 0.9, -1.55 + state.h + 0.2, 0.4);
      const rate = clamp(coneNarration().dhdt, 0, 6);
      cone.rateArrow.position.set(0, -1.55 + state.h * 0.2, 0);
      cone.rateArrow.setDirection(new THREE.Vector3(0, 1, 0));
      cone.rateArrow.setLength(0.25 + rate * 0.28, 0.18, 0.11);
      cone.apexGlow.intensity = 8 + rate * 2;
    } else {
      const y = Math.sqrt(Math.max(0.001, LADDER_LENGTH ** 2 - state.base ** 2));
      const baseX = 2.2 - state.base;
      const basePoint = new THREE.Vector3(baseX, -1.5, 0);
      const topPoint = new THREE.Vector3(2.2, -1.5 + y, 0);
      const midpoint = basePoint.clone().add(topPoint).multiplyScalar(0.5);
      ladder.ladder.position.copy(midpoint);
      ladder.ladder.position.z = 1.82;
      ladder.ladder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), topPoint.clone().sub(basePoint).normalize());
      ladder.baseDot.position.copy(basePoint).setZ(2.03);
      ladder.topDot.position.copy(topPoint).setZ(2.03);
      const dydt = ladderNarration().dydt;
      const len = clamp(Math.abs(dydt) * 0.8, 0.25, 2.2);
      ladder.downArrow.position.set(2.2, -1.5 + y - 0.05, 2.12);
      ladder.downArrow.setDirection(new THREE.Vector3(0, Math.sign(dydt) || -1, 0));
      ladder.downArrow.setLength(len, 0.18, 0.11);
      ladder.downArrow.setColor(new THREE.Color(dydt <= 0 ? "#fb7185" : "#5eead4"));
      ladder.baseArrow.position.set(baseX, -1.45, 2.08);
      ladder.baseArrow.setDirection(new THREE.Vector3(-1, 0, 0));
      ladder.baseArrow.setLength(clamp(state.speed * 0.7, 0.25, 2), 0.18, 0.11);
      ladder.lengthLabel.position.set((baseX + 2.2) / 2 - 0.35, -1.0, 2.24);
      ladder.lengthLabel.visible = true;
    }
  }

  function set(key, value) {
    if (key === "model") {
      state.model = value;
      state.filling = false;
      updateVisibility();
    } else if (key === "h") {
      state.h = Number(value);
      state.filling = false;
    } else if (key === "inflow") state.inflow = Number(value);
    else if (key === "base") state.base = Number(value);
    else if (key === "speed") state.speed = Number(value);
    refresh();
  }

  function updateVisibility() {
    // The dock re-evaluates visibleWhen from current control values.
    refresh();
  }

  function action(key) {
    if (key === "fill") {
      state.filling = !state.filling;
      if (state.h >= CONE_HEIGHT - 0.02) state.h = 0.35;
    } else if (key === "reset") {
      state.h = 1.2;
      state.base = 1.2;
      state.filling = false;
      refresh();
    }
  }

  function readout() {
    if (state.model === "cone") {
      const { radius, volume, dhdt } = coneNarration();
      return [
        { label: "Water height h", value: `${formatNumber(state.h, 2)} u`, tone: "teal" },
        { label: "Surface radius r", value: `${formatNumber(radius, 2)} u`, tone: "muted" },
        { label: "Volume V", value: formatNumber(volume, 2), tone: "violet" },
        { label: "dV/dt", value: `${formatNumber(state.inflow, 1)} u³/s`, tone: "amber" },
        { label: "dh/dt", value: formatNumber(dhdt, 3), tone: "good" },
        { label: "Model", value: "r = 0.6h", tone: "muted" },
      ];
    }
    const { y, dydt } = ladderNarration();
    return [
      { label: "Base distance x", value: `${formatNumber(state.base, 2)} u`, tone: "teal" },
      { label: "Wall height y", value: `${formatNumber(y, 2)} u`, tone: "muted" },
      { label: "dx/dt", value: `${formatNumber(state.speed, 2)} u/s`, tone: "amber" },
      { label: "dy/dt", value: formatNumber(dydt, 3), tone: "bad" },
      { label: "Ladder L", value: "3.4 u", tone: "muted" },
      { label: "Constraint", value: "x² + y² = L²", tone: "muted" },
    ];
  }

  function narration() {
    if (state.model === "cone") {
      const { radius, volume, dhdt } = coneNarration();
      return {
        title: "A cone filling with water",
        lead: "Volume grows at the inflow rate. Because the cone widens with height, the same dV/dt produces a smaller dh/dt as the water rises.",
        formula: `V = (1/3)πr²h = (π/3)(0.6h)²h = 0.12πh³<br>dV/dt = 0.36πh² · dh/dt<br>dh/dt = ${formatNumber(state.inflow, 1)} / (0.36π · ${formatNumber(state.h, 2)}²) = <strong>${formatNumber(dhdt, 3)}</strong>`,
        note: `At h = ${formatNumber(state.h, 2)}, the surface radius is ${formatNumber(radius, 2)} and the stored volume is ${formatNumber(volume, 2)} cubic units.`,
        status: "related rates · cone",
      };
    }
    const { y, dydt } = ladderNarration();
    return {
      title: "A ladder sliding down a wall",
      lead: "The ladder length is constant, so differentiating x² + y² = L² links the two speeds. As the base moves out, the top must move down.",
      formula: `x² + y² = 3.4² ⇒ 2x·dx/dt + 2y·dy/dt = 0<br>dy/dt = −(x/y)·dx/dt = −(${formatNumber(state.base, 2)}/${formatNumber(y, 2)})( ${formatNumber(state.speed, 2)} ) = <strong>${formatNumber(dydt, 3)}</strong>`,
      note: "The negative sign is geometric: height is decreasing. When y approaches zero, the vertical speed blows up — the classic ladder paradox.",
      status: "related rates · ladder",
    };
  }

  refresh();

  return {
    group,
    camera: { position: [5.6, 3.3, 8.6], target: [0.4, 0.2, 0], fov: 42 },
    controls: [
      { type: "select", key: "model", label: "Physical model", value: "cone", options: [{ value: "cone", label: "Filling cone" }, { value: "ladder", label: "Sliding ladder" }] },
      { type: "range", key: "h", label: "Water height · h", min: 0.35, max: 2.95, step: 0.01, value: 1.2, visibleWhen: { key: "model", value: "cone" } },
      { type: "range", key: "inflow", label: "Inflow · dV/dt", min: 2, max: 20, step: 0.1, value: 9, visibleWhen: { key: "model", value: "cone" } },
      { type: "range", key: "base", label: "Base distance · x", min: 0.7, max: 2.95, step: 0.01, value: 1.2, visibleWhen: { key: "model", value: "ladder" } },
      { type: "range", key: "speed", label: "Base speed · dx/dt", min: 0.2, max: 2.2, step: 0.01, value: 0.9, visibleWhen: { key: "model", value: "ladder" } },
      { type: "button", key: "fill", label: "Fill / pause water", reflect: "filling", visibleWhen: { key: "model", value: "cone" } },
      { type: "button", key: "reset", label: "Reset model" },
    ],
    set,
    action,
    readout,
    narration,
    update(dt) {
      if (state.model === "cone") {
        if (state.filling) {
          const dhdt = coneNarration().dhdt;
          state.h = clamp(state.h + dhdt * dt * 0.45, 0.35, 2.95);
          const slider = this.controls.find((control) => control.key === "h");
          if (slider) slider.value = state.h;
          refresh();
          if (state.h >= 2.949) state.filling = false;
        }
        for (const drop of cone.drops) {
          drop.userData.phase = (drop.userData.phase + dt * 1.8) % 1;
          const t = drop.userData.phase;
          drop.position.set(0.62 - t * 0.62, 1.55 - t * (1.55 + state.h - 1.55), 0.14 * (1 - t));
          drop.visible = state.h < 2.9;
        }
        const pulse = 0.5 + Math.sin(performance.now() / 360) * 0.08;
        cone.surfaceRing.material.opacity = pulse;
      } else {
        const pulse = 0.85 + Math.sin(performance.now() / 300) * 0.15;
        ladder.downArrow.setColor(new THREE.Color(ladderNarration().dydt <= 0 ? "#fb7185" : "#5eead4"));
        ladder.downArrow.setLength(clamp(Math.abs(ladderNarration().dydt) * 0.8, 0.25, 2.2) * pulse, 0.18, 0.11);
      }
    },
    getState() {
      return { ...state, ...(state.model === "cone" ? coneNarration() : ladderNarration()) };
    },
    dispose() {},
  };
}
