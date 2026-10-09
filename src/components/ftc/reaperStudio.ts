/**
 * Lights, floor and camera for the Reaper model, shared by the page stage and the offline
 * capture harness (assets-src/reaper-img2threejs/harness) so review renders match the page.
 *
 * The robot is mostly black printed parts, so on a black page it is drawn out of the background
 * by two rim lights from behind and a soft room environment that puts a sheen on the black PLA.
 * The lights are white by default. setLightTint takes the theme's accent and pulls the rims, the
 * sky of the fill and the room's light panels toward it (the key less), so in the violet theme the
 * model carries the same cast as the duotoned photos beside it; with a white accent (the mono
 * theme) every light stays white. The floor is a disc that fades to transparent, tinted with the page's surface
 * color so it never shows an edge.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/** Where the camera looks, in model units (the model is about 1.1 units tall). */
export const REAPER_TARGET = new THREE.Vector3(0, 0.5, 0.03);

/** How far each light moves toward the accent in setLightTint (0 keeps it white). */
const TINT = { key: 0.22, rim: 0.4, sky: 0.3, room: 0.35 };

export type ReaperStudio = {
  floorMaterial: THREE.MeshStandardMaterial;
  setFloorColor: (color: THREE.ColorRepresentation) => void;
  /** Pull the lights toward `accent`; white (or null) leaves them all white. */
  setLightTint: (accent: THREE.ColorRepresentation | null) => void;
  dispose: () => void;
};

export function addReaperStudio(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  {
    shadows,
    floorColor = "#1c1c1c",
    tint = null,
  }: {
    shadows: boolean;
    floorColor?: THREE.ColorRepresentation;
    /** The theme's accent, for setLightTint. */
    tint?: THREE.ColorRepresentation | null;
  },
): ReaperStudio {
  const pmrem = new THREE.PMREMGenerator(renderer);
  // The room's light panels take `panel` as their color, so the sheen it puts on the black PLA
  // and the aluminium follows the tint. Rebuilt only when that color changes.
  let env: THREE.WebGLRenderTarget | null = null;
  const envColor = new THREE.Color();
  const setEnvironment = (panel: THREE.Color) => {
    if (env && envColor.equals(panel)) return;
    envColor.copy(panel);
    const room = new RoomEnvironment();
    room.traverse((obj) => {
      const material = (obj as THREE.Mesh).material as THREE.MeshLambertMaterial | undefined;
      if (material?.isMeshLambertMaterial) material.emissive.multiply(panel);
    });
    const next = pmrem.fromScene(room, 0.04);
    room.dispose();
    scene.environment = next.texture;
    env?.dispose();
    env = next;
  };
  scene.environmentIntensity = 0.42;

  const key = new THREE.DirectionalLight("#ffffff", 2.5);
  key.position.set(-2.2, 4.4, 3.6);
  if (shadows) {
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -1.2, right: 1.2, top: 1.4, bottom: -1.0, near: 1, far: 12 });
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.01;
  }
  key.target.position.copy(REAPER_TARGET);
  const rimLeft = new THREE.DirectionalLight("#ffffff", 2.1);
  rimLeft.position.set(3.2, 2.6, -3.4);
  const rimRight = new THREE.DirectionalLight("#ffffff", 1.5);
  rimRight.position.set(-3.6, 1.6, -2.6);
  const fill = new THREE.HemisphereLight("#ffffff", "#000000", 0.45);
  scene.add(key, key.target, rimLeft, rimRight, fill);

  const white = new THREE.Color("#ffffff");
  const accent = new THREE.Color();
  const panel = new THREE.Color();
  const setLightTint = (color: THREE.ColorRepresentation | null) => {
    accent.set(color ?? white);
    key.color.lerpColors(white, accent, TINT.key);
    rimLeft.color.lerpColors(white, accent, TINT.rim);
    rimRight.color.lerpColors(white, accent, TINT.rim);
    fill.color.lerpColors(white, accent, TINT.sky);
    setEnvironment(panel.lerpColors(white, accent, TINT.room));
  };
  setLightTint(tint);

  // Radial alpha: opaque under the robot, gone by the rim.
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.4, "#9a9a9a");
    grad.addColorStop(0.75, "#1e1e1e");
    grad.addColorStop(0.92, "#000000");
    grad.addColorStop(1, "#000000");
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  const fade = new THREE.CanvasTexture(c);
  // The key light is strong, so the floor takes a darkened copy of the page's soft surface.
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(floorColor).multiplyScalar(0.5),
    roughness: 0.7,
    metalness: 0,
    transparent: true,
    alphaMap: fade,
    depthWrite: false,
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.92, 64), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = shadows;
  floor.renderOrder = -1;
  scene.add(floor);

  return {
    floorMaterial,
    setFloorColor(color) {
      floorMaterial.color.set(color).multiplyScalar(0.5);
    },
    setLightTint,
    dispose() {
      scene.remove(key, key.target, rimLeft, rimRight, fill, floor);
      key.dispose();
      rimLeft.dispose();
      rimRight.dispose();
      fill.dispose();
      floor.geometry.dispose();
      fade.dispose();
      floorMaterial.dispose();
      if (scene.environment === env?.texture) scene.environment = null;
      env?.dispose();
      pmrem.dispose();
    },
  };
}

/** Place `camera` on an orbit around the robot. Azimuth 0 looks at the front (the intake). */
export function orbitCamera(
  camera: THREE.PerspectiveCamera,
  azimuthDeg: number,
  elevationDeg: number,
  distance: number,
) {
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  const el = THREE.MathUtils.degToRad(elevationDeg);
  camera.position.set(
    REAPER_TARGET.x + Math.sin(az) * Math.cos(el) * distance,
    REAPER_TARGET.y + Math.sin(el) * distance,
    REAPER_TARGET.z + Math.cos(az) * Math.cos(el) * distance,
  );
  camera.lookAt(REAPER_TARGET);
}
