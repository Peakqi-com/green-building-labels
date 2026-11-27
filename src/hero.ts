import * as THREE from 'three';

// 低多邊形建築：progress 0→1 時依序長樹、鋪太陽能板、屋頂綠化、風機轉動
export function initHero(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x7c9a3b, 1.6));
  const sun = new THREE.DirectionalLight(0xfff1c9, 2.4);
  sun.position.set(6, 10, 4);
  scene.add(sun);

  const mat = (c: number) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.9 });
  const box = (w: number, h: number, d: number, c: number, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    m.position.set(x, y, z);
    return m;
  };
  const world = new THREE.Group();
  scene.add(world);

  const ground = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.4, 0.5, 7), mat(0xc9d6ad));
  ground.position.y = -0.25;
  world.add(ground);
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(6.02, 6.02, 0.06, 7), mat(0x7c9a3b));
  grass.position.y = 0.01;
  grass.scale.setScalar(0.001);
  world.add(grass);

  // 主建築與窗
  world.add(box(3.2, 2.4, 2.4, 0xf4f6ef, 0, 1.2, 0));
  world.add(box(1.8, 1.4, 2.0, 0xe6ebde, 2.3, 0.7, 0.2));
  const glass = mat(0x8ed1ee);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.05), glass);
    w.position.set(-1 + i, 0.75 + j * 0.95, 1.22);
    world.add(w);
  }
  const door = box(0.6, 0.9, 0.05, 0x15372a, 2.3, 0.45, 1.22);
  world.add(door);

  // 太陽能板
  const panels: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const p = box(0.85, 0.05, 0.6, 0x1f4b73, -1.1 + (i % 3) * 1.1, 2.6, -0.45 + Math.floor(i / 3) * 0.8);
    p.rotation.x = -0.35;
    p.userData.y = p.position.y;
    panels.push(p);
    world.add(p);
  }
  // 屋頂綠化
  const roofGreen = box(1.7, 0.12, 1.9, 0x2f9e5b, 2.3, 1.46, 0.2);
  roofGreen.scale.set(1, 1, 0.001);
  world.add(roofGreen);

  // 樹
  const trees: THREE.Group[] = [];
  const spots = [[-4, 2], [-3.2, -2.4], [4.4, -1.6], [-4.4, -0.4], [3.6, 2.8], [0.2, -3.6], [-1.8, 3.6], [1.9, 3.8]];
  spots.forEach(([x, z], i) => {
    const t = new THREE.Group();
    const trunk = box(0.18, 0.7, 0.18, 0x6b4f2e, 0, 0.35, 0);
    const crown = new THREE.Mesh(i % 2 ? new THREE.IcosahedronGeometry(0.6, 0) : new THREE.ConeGeometry(0.6, 1.4, 6), mat(i % 3 ? 0x2f9e5b : 0x58b36d));
    crown.position.y = i % 2 ? 1.2 : 1.3;
    t.add(trunk, crown);
    t.position.set(x, 0, z);
    t.scale.setScalar(0.001);
    trees.push(t);
    world.add(t);
  });

  // 風機
  const turbine = new THREE.Group();
  turbine.add(box(0.1, 3.2, 0.1, 0xf4f6ef, 0, 1.6, 0));
  const rotor = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const b = box(0.12, 1.3, 0.04, 0xf4f6ef, 0, 0.65, 0);
    const arm = new THREE.Group();
    arm.add(b);
    arm.rotation.z = (i * Math.PI * 2) / 3;
    rotor.add(arm);
  }
  rotor.position.set(0, 3.2, 0.1);
  turbine.add(rotor);
  turbine.position.set(-3.6, 0, 0.8);
  turbine.scale.set(1, 0.001, 1);
  world.add(turbine);

  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const ease = (v: number) => 1 - Math.pow(1 - v, 3);
  const phase = (p: number, a: number, b: number) => ease(clamp((p - a) / (b - a)));
  let progress = 0, shown = 0, running = true, raf = 0;

  function resize() {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    const far = camera.aspect < 0.8 ? 21 : 15;
    camera.position.set(far * 0.62, far * 0.5, far * 0.72);
    camera.lookAt(camera.aspect < 0.8 ? 0 : -3.6, 1.2, camera.aspect < 0.8 ? 0 : 2);
    camera.updateProjectionMatrix();
  }

  function frame(t: number) {
    shown += (progress - shown) * 0.12;
    const p = shown;
    grass.scale.set(phase(p, 0, 0.2), 1, phase(p, 0, 0.2));
    trees.forEach((tr, i) => tr.scale.setScalar(Math.max(0.001, phase(p, 0.02 + i * 0.03, 0.22 + i * 0.03))));
    panels.forEach((pn, i) => {
      const k = phase(p, 0.28 + i * 0.04, 0.42 + i * 0.04);
      pn.position.y = pn.userData.y + (1 - k) * 3;
      pn.visible = k > 0.01;
    });
    roofGreen.scale.z = Math.max(0.001, phase(p, 0.55, 0.72));
    turbine.scale.y = Math.max(0.001, phase(p, 0.75, 0.9));
    rotor.rotation.z = t * 0.0015 * (0.3 + phase(p, 0.8, 1));
    world.rotation.y = -0.35 + p * 0.7 + Math.sin(t * 0.0003) * 0.04;
    renderer.render(scene, camera);
    raf = running ? requestAnimationFrame(frame) : 0;
  }

  resize();
  addEventListener('resize', resize);
  new IntersectionObserver(([e]) => {
    running = e.isIntersecting;
    if (running && !raf) raf = requestAnimationFrame(frame);
  }).observe(canvas);
  raf = requestAnimationFrame(frame);
  return { setProgress: (v: number) => (progress = v) };
}
