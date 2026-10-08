/**
 * Review stage for the roboPet model: renderer, studio lights, dark floor and a fixed camera.
 * Used by the dev preview route (src/app/dev/robopet) and by the offline capture harness.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  createRoboPetModel,
  disposeRoboPetModel,
  setRoboPetExplode,
  type RoboPetEyeMode,
} from "./createRoboPetModel";

export type RoboPetStageParams = {
  /** Camera azimuth in degrees, measured from +Z (front) toward +X (robot's left). Default 30 matches the reference. */
  az?: number;
  /** Camera elevation in degrees. */
  el?: number;
  /** Camera distance from the target. */
  dist?: number;
  /** Exploded view amount 0..1. */
  explode?: number;
  eyes?: RoboPetEyeMode;
  background?: string;
  /** Show the dark studio floor (default true). Evidence captures for silhouette gates turn it off. */
  floor?: boolean;
};

export type RoboPetStage = {
  model: THREE.Group;
  stats: { triangles: number; drawCalls: number; parts: unknown; bounds: unknown };
  render: () => void;
  dispose: () => void;
};

export function mountRoboPetStage(host: HTMLElement, params: RoboPetStageParams = {}): RoboPetStage {
  const background = params.background ?? "#07070c";
  const explode = THREE.MathUtils.clamp(params.explode ?? 0, 0, 1);
  const az = THREE.MathUtils.degToRad(params.az ?? 30);
  const el = THREE.MathUtils.degToRad(params.el ?? 8);
  const dist = params.dist ?? (explode > 0 ? 6.5 : 4.6);

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  scene.fog = new THREE.Fog(background, 5.5, 11);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.3;

  // key: large soft source upper front-left; rim: cool from upper rear; low hemisphere fill
  const key = new THREE.DirectionalLight("#ffead2", 2.6);
  key.position.set(-1.6, 4.2, 4.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5 });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.radius = 6;
  key.shadow.bias = -0.0004;
  scene.add(key);
  const rim = new THREE.DirectionalLight("#cfd8ff", 1.2);
  rim.position.set(3.5, 2.5, -3.5);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight("#e8ecff", "#0a0a10", 0.25));

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(12, 64),
    new THREE.MeshLambertMaterial({ color: "#121219" }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  if (params.floor ?? true) scene.add(floor);

  const model = createRoboPetModel({ eyeMode: params.eyes ?? "open" });
  scene.add(model);
  setRoboPetExplode(model, explode);

  const camera = new THREE.PerspectiveCamera(34, host.clientWidth / host.clientHeight, 0.05, 100);
  const target = new THREE.Vector3(0, explode > 0 ? 1.05 : 0.64, -0.12);
  camera.position.set(
    target.x + dist * Math.cos(el) * Math.sin(az),
    target.y + dist * Math.sin(el),
    target.z + dist * Math.cos(el) * Math.cos(az),
  );
  camera.lookAt(target);

  const render = () => renderer.render(scene, camera);
  const onResize = () => {
    renderer.setSize(host.clientWidth, host.clientHeight);
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
    render();
  };
  window.addEventListener("resize", onResize);
  render();
  render();

  return {
    model,
    stats: {
      triangles: model.userData.triangles as number,
      drawCalls: renderer.info.render.calls,
      parts: model.userData.parts,
      bounds: model.userData.bounds,
    },
    render,
    dispose: () => {
      window.removeEventListener("resize", onResize);
      disposeRoboPetModel(model);
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    },
  };
}
