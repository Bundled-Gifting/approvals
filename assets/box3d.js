// Folds a flat mailer-box dieline (outside + inside artwork) into a 3D box.
// Every panel is placed by folding at the real fold lines, so artwork lands
// exactly where it will be on the printed box.
import * as THREE from './three/three.module.min.js';
import { OrbitControls } from './three/OrbitControls.js';

const HALF = Math.PI / 2;

export function createBox(container, cfg) {
  const W = cfg.imgW, H = cfg.imgH, f = cfg.folds, k = 1 / 1000;
  const cx = (f.bottomL + f.bottomR) / 2, cy = (f.bottomT + f.bottomB) / 2;
  const P = (x, y) => new THREE.Vector3((x - cx) * k, 0, (cy - y) * k);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none;cursor:grab";

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 2.45));
  const dl = new THREE.DirectionalLight(0xffffff, 0.7); dl.position.set(1.5, 3, 2); scene.add(dl);

  const loader = new THREE.TextureLoader();
  const tex = src => { const t = loader.load(src, () => draw()); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; };
  const tOut = tex(cfg.outside), tIn = tex(cfg.inside);
  const mOut = new THREE.MeshLambertMaterial({ map: tOut, side: THREE.BackSide, alphaTest: 0.5 });
  const mIn = new THREE.MeshLambertMaterial({ map: tIn, side: THREE.FrontSide, alphaTest: 0.5 });

  // A panel = rectangle of the flat (x0..x1, y0..y1), drawn relative to its pivot's hinge point.
  function panel(x0, x1, y0, y1, hinge) {
    const g = new THREE.Group();
    for (const inside of [true, false]) {
      const pos = [], uv = [];
      const pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      for (const [x, y] of pts) {
        const v = P(x, y).sub(hinge); pos.push(v.x, v.y, v.z);
        uv.push(inside ? (W - x) / W : x / W, 1 - y / H);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      // winding so the +Y side (inside of the box) is the front face
      geo.setIndex([0, 1, 2, 0, 2, 3]);
      geo.computeVertexNormals();
      g.add(new THREE.Mesh(geo, inside ? mIn : mOut));
    }
    return g;
  }
  // pivot whose origin sits on a hinge (given in flat px), parented to another pivot
  function pivot(parent, parentHinge, hx, hy) {
    const h = P(hx, hy), p = new THREE.Group();
    p.position.copy(h.clone().sub(parentHinge)); parent.add(p); return { obj: p, hinge: h };
  }

  const root = new THREE.Group(); scene.add(root);
  const O = new THREE.Vector3(0, 0, 0);
  // bottom
  root.add(panel(f.bottomL, f.bottomR, f.bottomT, f.bottomB, O));
  // back wall + lid + front tuck flap + ears
  const back = pivot(root, O, f.bottomL, cy); back.obj.rotation.z = -HALF;
  back.obj.add(panel(f.lidBack, f.bottomL, f.bottomT, f.bottomB, back.hinge));
  const lid = pivot(back.obj, back.hinge, f.lidBack, cy); lid.obj.rotation.z = -HALF;
  lid.obj.add(panel(f.lidFront, f.lidBack, f.bottomT, f.bottomB, lid.hinge));
  const flap = pivot(lid.obj, lid.hinge, f.lidFront, cy); flap.obj.rotation.z = -HALF - 0.03;
  flap.obj.add(panel(f.flapEnd, f.lidFront, f.bottomT, f.bottomB, flap.hinge));
  for (const [y, top] of [[f.bottomT, true], [f.bottomB, false]]) {
    const e = pivot(lid.obj, lid.hinge, cx, y); e.obj.rotation.x = top ? -HALF - 0.04 : HALF + 0.04;
    e.obj.add(panel(f.earSplit || f.lidFront, f.lidBack, top ? f.earT : f.bottomB, top ? f.bottomT : f.earB, e.hinge));
  }
  // front wall
  const front = pivot(root, O, f.bottomR, cy); front.obj.rotation.z = HALF;
  front.obj.add(panel(f.bottomR, f.frontEnd, f.bottomT, f.bottomB, front.hinge));
  // end walls with roll-in inner panels
  for (const top of [true, false]) {
    const y = top ? f.bottomT : f.bottomB, y2 = top ? f.endT : f.endB, y3 = top ? f.innerT : f.innerB;
    const e = pivot(root, O, cx, y); e.obj.rotation.x = top ? -HALF : HALF;
    e.obj.add(panel(f.bottomL, f.bottomR, Math.min(y, y2), Math.max(y, y2), e.hinge));
    const i = pivot(e.obj, e.hinge, cx, y2); i.obj.rotation.x = top ? -Math.PI + 0.02 : Math.PI - 0.02;
    i.obj.add(panel(f.bottomL, f.bottomR, Math.min(y2, y3), Math.max(y2, y3), i.hinge));
  }

  // camera + controls
  const bw = (f.bottomR - f.bottomL) * k, bl = (f.bottomB - f.bottomT) * k, bh = (f.bottomL - f.lidBack) * k;
  const target = new THREE.Vector3(0, bh / 2, 0);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  const R = Math.max(bw, bl) * 2.9;
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

  let lidT = 0, lidGoal = 0; // 0 closed, 1 open
  const OPEN = 1.85; // radians the lid swings back
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
      const e = lidT < 0.5 ? 2 * lidT * lidT : 1 - Math.pow(-2 * lidT + 2, 2) / 2;
      lid.obj.rotation.z = -HALF + e * OPEN;
    }
    controls.update(); draw(); requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  let resumeTimer = null;
  controls.addEventListener("start", () => { controls.autoRotate = false; clearTimeout(resumeTimer); renderer.domElement.style.cursor = "grabbing"; });
  controls.addEventListener("end", () => { renderer.domElement.style.cursor = "grab"; });

  return {
    setLid(open) { lidGoal = open ? 1 : 0; },
    isOpen() { return lidGoal === 1; },
    setSpin(on) { controls.autoRotate = on; },
    isSpinning() { return controls.autoRotate; },
    view(az, el, dist) { setView(az, el, dist); },
    snapLid(open) { lidGoal = lidT = open ? 1 : 0; lid.obj.rotation.z = -HALF + lidT * OPEN; },
    render: draw,
    el: renderer.domElement,
  };
}
