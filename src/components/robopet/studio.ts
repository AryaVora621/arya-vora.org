import type * as ThreeNS from "three";

type Three = typeof ThreeNS;

/**
 * Black and white studio shared by the hero and the exploded view, so both show the same
 * robot under the same light. Every light is white and the floor is neutral grey, which keeps
 * R = G = B all the way to the pixel. The floor is a soft disc that fades to transparent, so
 * the robot stands on something against the page's pure black and no disc edge ever shows.
 */
export function addStudio(
  THREE: Three,
  scene: ThreeNS.Scene,
  { shadowExtent, floorRadius }: { shadowExtent: number; floorRadius: number },
) {
  const key = new THREE.DirectionalLight("#ffffff", 2.3);
  key.position.set(-1.6, 4.2, 4.6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, {
    left: -shadowExtent,
    right: shadowExtent,
    top: shadowExtent,
    bottom: -shadowExtent,
  });
  key.shadow.bias = -0.0004;
  const rim = new THREE.DirectionalLight("#ffffff", 1.2);
  rim.position.set(3.5, 2.5, -3.5);
  scene.add(key, rim, new THREE.HemisphereLight("#ffffff", "#000000", 0.25));

  // Radial alpha: opaque under the robot, gone by the rim of the disc.
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.3, "#9e9e9e");
    gradient.addColorStop(0.65, "#303030");
    gradient.addColorStop(1, "#000000");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const fade = new THREE.CanvasTexture(canvas);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: "#202020",
    roughness: 0.6,
    metalness: 0,
    transparent: true,
    alphaMap: fade,
    depthWrite: false,
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(floorRadius, 64), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.renderOrder = -1;
  scene.add(floor);

  return {
    floor,
    floorMaterial,
    dispose() {
      floor.geometry.dispose();
      fade.dispose();
      floorMaterial.dispose();
    },
  };
}
