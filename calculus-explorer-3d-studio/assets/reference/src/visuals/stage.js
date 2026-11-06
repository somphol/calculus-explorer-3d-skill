// Shared Three.js stage: one renderer, one camera, one OrbitControls instance,
// and a swap-in visual module per unit. Keeps GPU resources honest across tabs.

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { clearGroup, disposeObject } from "./common.js";

const BG = 0x050b14;

export class CalculusStage {
  constructor(canvas) {
    this.canvas = canvas;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.visual = null;
    this.elapsed = 0;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    this.renderer.setClearColor(BG, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG);
    this.scene.fog = new THREE.FogExp2(BG, 0.0135);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 240);
    this.camera.position.set(5.5, 4.2, 9);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.rotateSpeed = 0.72;
    this.controls.zoomSpeed = 0.82;
    this.controls.panSpeed = 0.65;
    this.controls.minDistance = 2.2;
    this.controls.maxDistance = 34;
    this.controls.maxPolarAngle = Math.PI * 0.92;
    this.controls.autoRotate = false;

    this.addAtmosphere();
    this.addLights();

    this.clock = new THREE.Clock();
    this.pointerDown = null;

    this.onPointerDown = (event) => {
      this.pointerDown = { x: event.clientX, y: event.clientY, at: performance.now() };
    };
    this.onPointerUp = (event) => {
      const start = this.pointerDown;
      this.pointerDown = null;
      if (!start || !this.visual || typeof this.visual.onPointer !== "function") return;
      const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      if (moved > 6 || performance.now() - start.at > 700) return;
      const rect = this.canvas.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(pointer, this.camera);
      this.visual.onPointer({ raycaster, camera: this.camera, scene: this.scene, event });
    };
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointerup", this.onPointerUp);

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas.parentElement);
    window.addEventListener("resize", () => this.resize());
    this.resize();

    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(0.05, this.clock.getDelta());
      this.elapsed += dt;
      if (document.hidden) return;
      if (this.visual && typeof this.visual.update === "function") {
        this.visual.update(dt, this.elapsed);
      }
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    });
  }

  addAtmosphere() {
    const count = 720;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const radius = 24 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi) * 0.7 + 4;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x7dd3fc,
      size: 0.075,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  addLights() {
    this.scene.add(new THREE.HemisphereLight(0xa5e4ff, 0x111827, 1.35));
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(6, 11, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -12;
    key.shadow.camera.right = 12;
    key.shadow.camera.top = 12;
    key.shadow.camera.bottom = -12;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 40;
    this.scene.add(key);
    this.keyLight = key;

    const fill = new THREE.PointLight(0x5eead4, 26, 30, 2);
    fill.position.set(-7, 4, -6);
    this.scene.add(fill);
    const rim = new THREE.PointLight(0xfb7185, 18, 26, 2);
    rim.position.set(7, 2, -7);
    this.scene.add(rim);
  }

  setVisual(visual) {
    if (this.visual) {
      if (typeof this.visual.dispose === "function") this.visual.dispose();
      if (this.visual.group) {
        this.scene.remove(this.visual.group);
        disposeObject(this.visual.group);
        clearGroup(this.visual.group);
      }
    }
    this.visual = visual;
    this.scene.add(visual.group);
    const camera = visual.camera || {};
    this.camera.fov = camera.fov || 42;
    this.camera.position.set(...(camera.position || [5.5, 4.2, 9]));
    this.controls.target.set(...(camera.target || [0, 0, 0]));
    this.controls.minDistance = camera.minDistance || 2.2;
    this.controls.maxDistance = camera.maxDistance || 34;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    if (this.stars) this.stars.visible = camera.stars !== false;
    this.resize();
  }

  resetCamera() {
    if (!this.visual) return;
    const camera = this.visual.camera || {};
    this.camera.position.set(...(camera.position || [5.5, 4.2, 9]));
    this.controls.target.set(...(camera.target || [0, 0, 0]));
    this.controls.update();
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const width = Math.max(1, parent.clientWidth);
    const height = Math.max(1, parent.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.fov = width < 760 ? Math.max(50, this.camera.fov) : this.visual?.camera?.fov || 42;
    this.camera.updateProjectionMatrix();
  }

  info() {
    return {
      calls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      pixelRatio: this.renderer.getPixelRatio(),
      width: this.renderer.domElement.width,
      height: this.renderer.domElement.height,
    };
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.observer.disconnect();
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    if (this.visual && this.visual.group) disposeObject(this.visual.group);
    this.controls.dispose();
    this.renderer.dispose();
  }
}
