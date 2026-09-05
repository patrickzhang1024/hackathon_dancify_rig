// Scene setup: renderer, camera, lights, ground, grid.
window.DANCE = window.DANCE || {};

DANCE.createScene = function createScene(canvas) {
  const T = window.THREE;

  const renderer = new T.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  const scene = new T.Scene();
  scene.background = new T.Color(0x11151c);
  scene.fog = new T.Fog(0x11151c, 8, 22);

  const camera = new T.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(1.7, 1.25, 2.9);

  // Lights
  const hemi = new T.HemisphereLight(0xbfd4ff, 0x20242c, 0.7);
  scene.add(hemi);
  const key = new T.DirectionalLight(0xffffff, 1.1);
  key.position.set(3, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 20;
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  scene.add(key);
  const rim = new T.DirectionalLight(0x6ea8ff, 0.4);
  rim.position.set(-4, 3, -3);
  scene.add(rim);

  // Ground + grid
  const ground = new T.Mesh(
    new T.PlaneGeometry(40, 40),
    new T.MeshStandardMaterial({ color: 0x171b22, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new T.GridHelper(40, 40, 0x2a3442, 0x1c232c);
  grid.position.y = 0.001;
  scene.add(grid);

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  return { scene, camera, renderer, resize };
};
