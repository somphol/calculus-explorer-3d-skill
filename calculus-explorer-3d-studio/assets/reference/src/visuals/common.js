// Small shared helpers for the eight procedural Three.js scenes.

import * as THREE from "three";

export function makeTextSprite(text, { color = "#e2e8f0", background = "rgba(5,11,20,0.82)", size = 0.24 } = {}) {
  const canvas = document.createElement("canvas");
  const scale = 3;
  const ctx = canvas.getContext("2d");
  const font = `600 ${34 * scale}px ui-sans-serif, -apple-system, "Segoe UI", sans-serif`;
  ctx.font = font;
  const width = Math.ceil(ctx.measureText(text).width) + 34 * scale;
  const height = 54 * scale;
  canvas.width = width;
  canvas.height = height;
  const draw = canvas.getContext("2d");
  draw.font = font;
  draw.fillStyle = background;
  const radius = 14 * scale;
  draw.beginPath();
  draw.roundRect(0, 0, width, height, radius);
  draw.fill();
  draw.fillStyle = color;
  draw.textBaseline = "middle";
  draw.fillText(text, 17 * scale, height / 2 + 2 * scale);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  const aspect = width / height;
  sprite.scale.set(size * aspect, size, 1);
  sprite.userData.dispose = () => {
    texture.dispose();
    material.dispose();
  };
  return sprite;
}

export function lineFromPoints(points, color = "#5eead4", opacity = 1) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
  return new THREE.Line(geometry, material);
}

export function tubeFromPoints(points, color = "#5eead4", { radius = 0.025, opacity = 1, emissive = 0.35 } = {}) {
  if (points.length < 2) return new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, Math.min(600, Math.max(24, points.length * 2)), radius, 7, false);
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color).multiplyScalar(emissive),
    roughness: 0.32,
    metalness: 0.28,
    transparent: opacity < 1,
    opacity,
  });
  return new THREE.Mesh(geometry, material);
}

export function dot(position, color = "#fbbf24", radius = 0.12, emissive = 0.8) {
  const geometry = new THREE.SphereGeometry(radius, 20, 16);
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color).multiplyScalar(emissive),
    roughness: 0.2,
    metalness: 0.35,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  return mesh;
}

export function arrow(from, to, color = "#fbbf24", headLength = 0.28, headWidth = 0.16) {
  const origin = new THREE.Vector3(...from);
  const target = new THREE.Vector3(...to);
  const direction = target.clone().sub(origin);
  const length = direction.length();
  if (length < 1e-6) return new THREE.Group();
  const helper = new THREE.ArrowHelper(direction.normalize(), origin, length, color, headLength, headWidth);
  return helper;
}

export function axes(length = 4, { x = "#fb7185", y = "#5eead4", z = "#60a5fa" } = {}) {
  const group = new THREE.Group();
  group.add(lineFromPoints([new THREE.Vector3(-length, 0, 0), new THREE.Vector3(length, 0, 0)], x, 0.55));
  group.add(lineFromPoints([new THREE.Vector3(0, -length, 0), new THREE.Vector3(0, length, 0)], y, 0.55));
  group.add(lineFromPoints([new THREE.Vector3(0, 0, -length), new THREE.Vector3(0, 0, length)], z, 0.55));
  return group;
}

export function labeledAxes(length = 4, labels = { x: "x", y: "y", z: "z" }) {
  const group = axes(length);
  const xLabel = makeTextSprite(labels.x, { color: "#fb7185", size: 0.34 });
  xLabel.position.set(length + 0.35, 0, 0);
  const yLabel = makeTextSprite(labels.y, { color: "#5eead4", size: 0.34 });
  yLabel.position.set(0, length + 0.4, 0);
  const zLabel = makeTextSprite(labels.z, { color: "#60a5fa", size: 0.34 });
  zLabel.position.set(0, 0, length + 0.35);
  group.add(xLabel, yLabel, zLabel);
  return group;
}

export function disposeObject(object) {
  if (!object) return;
  object.traverse((child) => {
    if (child.userData && typeof child.userData.dispose === "function") child.userData.dispose();
    if (child.geometry) child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : child.material ? [child.material] : [];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value && value.isTexture) value.dispose();
      }
      material.dispose();
    }
  });
}

export function clearGroup(group) {
  while (group.children.length) {
    const child = group.children.pop();
    disposeObject(child);
  }
}

export function makeFloor({ y = 0, size = 14, color = "#162233", accent = "#1f3a4a" } = {}) {
  const group = new THREE.Group();
  const grid = new THREE.GridHelper(size, 28, accent, color);
  grid.position.y = y;
  grid.material.transparent = true;
  grid.material.opacity = 0.42;
  group.add(grid);
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({ color: "#07111f", roughness: 0.92, metalness: 0.08, transparent: true, opacity: 0.48 })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = y - 0.012;
  group.add(plane);
  return group;
}

export function makeGlyphLabel(text, position, options = {}) {
  const sprite = makeTextSprite(text, options);
  sprite.position.set(...position);
  return sprite;
}

export function colorForSigned(value, positive = "#5eead4", negative = "#fb7185") {
  return value >= 0 ? positive : negative;
}

export const PI = Math.PI;
