// Folds a flat slotted-carton (shipping box) dieline into a 3D box.
// Four walls in a row (front, side, back, side) with top flaps on every wall
// and bottom flaps where the dieline has them. Coordinates are in the flat's
// own units (e.g. mm); the texture covers the whole flat (0..flatW, 0..flatH).
// Same API as box3d.js so a page can use either viewer.
import * as THREE from './three/three.module.min.js';
import { OrbitControls } from './three/OrbitControls.js';

const HALF = Math.PI / 2;

export function createBox(container, cfg) {
  const FW = cfg.flatW, FH = cfg.flatH, xs = cfg.walls, yT = cfg.topFold, yB = cfg.bottomFold;
  const k = 1 / 1000;
  const L = (xs[1] - xs[0]) * k, D = (xs[2] - xs[1]) * k, H = (yB - yT) * k;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none;cursor:grab";

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 2.3));
  const dl = new THREE.DirectionalLight(0xffffff, 0.8); dl.position.set(1.5, 3, 2); scene.add(dl);

  const loader = new THREE.TextureLoader();
  const tOut = loader.load(cfg.outside, () => draw());
  tOut.colorSpace = THREE.SRGBColorSpace; tOut.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const mOut = new THREE.MeshLambertMaterial({ map: tOut, side: THREE.FrontSide });
  const mIn = new THREE.MeshLambertMaterial({ color: new THREE.Color(cfg.insideColor || "#c9a67c"), side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });

  // one flat rectangle (fx0..fx1, fy0..fy1) placed with a mapping fn(fx, fy) -> Vector3 (local),
  // outside face pointing along `out` (local). Builds an outside mesh and an inside mesh.
  function sheet(fx0, fx1, fy0, fy1, map, out) {
    const g = new THREE.Group();
    const corners = [[fx0, fy0], [fx1, fy0], [fx1, fy1], [fx0, fy1]];
    for (const inside of [false, true]) {
      const pos = [], uv = [];
      for (const [x, y] of corners) {
        const v = map(x, y).addScaledVector(out, inside ? -0.0004 : 0.0004);
        pos.push(v.x, v.y, v.z); uv.push(x / FW, 1 - y / FH);
      }
      const p = i => new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      const n = new THREE.Vector3().crossVectors(p(1).sub(p(0)), p(2).sub(p(0)));
      const want = inside ? -1 : 1;
      const idx = Math.sign(n.dot(out)) === want ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx); geo.computeVertexNormals();
      g.add(new THREE.Mesh(geo, inside ? mIn : mOut));
    }
    return g;
  }

  const root = new THREE.Group(); scene.add(root);
  // walls: [start corner at top, direction along the flat's x, outward normal]
  const W = [
    { o: new THREE.Vector3(-L / 2, H, D / 2), u: new THREE.Vector3(1, 0, 0), n: new THREE.Vector3(0, 0, 1), span: L },
    { o: new THREE.Vector3(L / 2, H, D / 2), u: new THREE.Vector3(0, 0, -1), n: new THREE.Vector3(1, 0, 0), span: D },
    { o: new THREE.Vector3(L / 2, H, -D / 2), u: new THREE.Vector3(-1, 0, 0), n: new THREE.Vector3(0, 0, -1), span: L },
    { o: new THREE.Vector3(-L / 2, H, -D / 2), u: new THREE.Vector3(0, 0, 1), n: new THREE.Vector3(-1, 0, 0), span: D },
  ];
  const topFlaps = [];
  W.forEach((w, i) => {
    const x0 = xs[i], x1 = xs[i + 1];
    // wall
    root.add(sheet(x0, x1, yT, yB, (x, y) => w.o.clone().addScaledVector(w.u, (x - x0) * k).add(new THREE.Vector3(0, -(y - yT) * k, 0)), w.n));
    // flaps: hinge along the top / bottom edge, built standing straight out of the wall, then folded in
    const mk = (top) => {
      const lim = top ? (cfg.topEnd ? cfg.topEnd[i] : 0) : (cfg.bottomEnd ? cfg.bottomEnd[i] : FH);
      if (top ? lim >= yT - 1 : lim <= yB + 1) return null;
      const hy = top ? yT : yB, sgn = top ? 1 : -1;
      const hinge = w.o.clone().add(new THREE.Vector3(0, top ? 0 : -H, 0));
      const piv = new THREE.Group(); piv.position.copy(hinge); root.add(piv);
      piv.add(sheet(x0, x1, Math.min(hy, lim), Math.max(hy, lim), (x, y) => w.u.clone().multiplyScalar((x - x0) * k).add(new THREE.Vector3(0, sgn * Math.abs(y - hy) * k, 0)), w.n));
      // pick the rotation direction that folds the flap inward (toward -n)
      const up = new THREE.Vector3(0, sgn, 0), test = up.clone().applyAxisAngle(w.u, HALF);
      const dir = test.dot(w.n) < 0 ? 1 : -1;
      const minor = i % 2 === 1; // side flaps fold first, under the long flaps
      const fl = { piv, axis: w.u, dir, closed: dir * HALF, minor };
      piv.setRotationFromAxisAngle(w.u, fl.closed);
      const lift = minor ? 0.002 : (i === 2 ? 0.001 : 0); // side flaps under the long flaps, back flap under the front one
      piv.position.y += top ? -lift : lift;
      return fl;
    };
    const t = mk(true); if (t) topFlaps.push(t);
    mk(false);
  });

  // camera + controls
  const target = new THREE.Vector3(0, H / 2, 0);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  const R = Math.max(L, D, H) * 3.0;
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(target); controls.enableDamping = true; controls.enablePan = false;
  controls.minDistance = R * 0.45; controls.maxDistance = R * 1.8;
  controls.autoRotate = true; controls.autoRotateSpeed = cfg.spinSpeed || 2.2;
  function setView(az, el, dist) {
    const d = (dist || 1) * R;
    camera.position.set(target.x + d * Math.cos(el) * Math.sin(az), target.y + d * Math.sin(el), target.z + d * Math.cos(el) * Math.cos(az));
    camera.lookAt(target); controls.update();
  }
  setView(0.6, 0.45);

  let lidT = 0, lidGoal = 0;
  const OPEN = 2.6; // how far each top flap swings back out (radians)
  function placeFlaps(e) {
    for (const f of topFlaps) {
      // long flaps open first when opening and close last when closing
      const s = f.minor ? Math.min(1, Math.max(0, (e - 0.25) / 0.75)) : Math.min(1, e / 0.75);
      f.piv.setRotationFromAxisAngle(f.axis, f.closed - f.dir * s * OPEN);
    }
  }
  function size() {
    const w = container.clientWidth || 400, h = container.clientHeight || 300;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(size).observe(container); size();
  let last = performance.now();
  function draw() { renderer.render(scene, camera); }
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (lidT !== lidGoal) {
      lidT += Math.sign(lidGoal - lidT) * dt / 1.4;
      if ((lidGoal - lidT) * Math.sign(lidGoal - lidT + 1e-9) <= 0 || Math.abs(lidGoal - lidT) < 0.01) lidT = lidGoal;
      placeFlaps(lidT < 0.5 ? 2 * lidT * lidT : 1 - Math.pow(-2 * lidT + 2, 2) / 2);
    }
    controls.update(); draw(); requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  controls.addEventListener("start", () => { controls.autoRotate = false; renderer.domElement.style.cursor = "grabbing"; });
  controls.addEventListener("end", () => { renderer.domElement.style.cursor = "grab"; });

  return {
    setLid(open) { lidGoal = open ? 1 : 0; },
    isOpen() { return lidGoal === 1; },
    setSpin(on) { controls.autoRotate = on; },
    isSpinning() { return controls.autoRotate; },
    view(az, el, dist) { setView(az, el, dist); },
    snapLid(open) { lidGoal = lidT = open ? 1 : 0; placeFlaps(lidT); },
    render: draw,
    el: renderer.domElement,
  };
}
