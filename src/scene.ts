import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/** Placeholder 3D scene: a simple mannequin stand-in. WebGPU with WebGL2 fallback. */
export async function startScene(canvas: HTMLCanvasElement, info: HTMLElement): Promise<string> {
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: true });
  await renderer.init();
  const backend = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ? "WebGPU" : "WebGL2";
  info.textContent = `Рендер: ${backend}`;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf2f2f2);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 50);
  camera.position.set(0, 1.2, 3.2);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1, 0);
  controls.update();

  scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 2));
  const dir = new THREE.DirectionalLight(0xffffff, 2);
  dir.position.set(2, 3, 2);
  scene.add(dir);

  const skin = new THREE.MeshStandardMaterial({ color: 0xd8b49c, roughness: 0.7 });
  const body = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.55, 8, 24), skin);
  torso.position.y = 1.2;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), skin);
  head.position.y = 1.67;
  const legGeo = new THREE.CapsuleGeometry(0.07, 0.75, 6, 16);
  const legL = new THREE.Mesh(legGeo, skin);
  legL.position.set(-0.09, 0.48, 0);
  const legR = legL.clone();
  legR.position.x = 0.09;
  body.add(torso, head, legL, legR);
  scene.add(body);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas.parentElement!;
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas.parentElement!);
  resize();
  renderer.setAnimationLoop(() => {
    body.rotation.y += 0.004;
    renderer.render(scene, camera);
  });
  return backend;
}
