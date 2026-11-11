/* Foundation adapted from awwwards-3d, MIT; vendor/AWWWARDS-LICENSE.txt.
 * Visibility, responsive pixel budget and disposal adapted from n7-site HeroCanvas.
 * Geometry, theme lighting and lifecycle are specific to Forma.
 */
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const canvas = document.querySelector('#sculpture');
const host = canvas.parentElement;
const lifetime = new AbortController();
const listen = (target, event, callback, options = {}) =>
  target.addEventListener(event, callback, { ...options, signal: lifetime.signal });
let paused =
  matchMedia('(prefers-reduced-motion: reduce)').matches ||
  document.body.classList.contains('motion-off');
let visible = false;
let contextLost = false;
let disposed = false;
let frame = 0;
let last = 0;
let time = 0;
let renderer, scene, camera, sculpture, environment, geometry, material, resizer;
const pointer = { x: 0, y: 0 };
const smooth = { x: 0, y: 0 };

function updateCaption() {
  host.querySelector('.live-dot').textContent = host.classList.contains('ready') ? 'VISUAL INTERATIVO' : 'MODO COMPATÍVEL';
}
function stop() {
  cancelAnimationFrame(frame);
  frame = 0;
  host.dataset.rendering = 'idle';
}
function dispose() {
  if (disposed) return;
  disposed = true;
  stop();
  observer.disconnect();
  resizer?.disconnect();
  lifetime.abort();
  geometry?.dispose();
  material?.dispose();
  environment?.dispose();
  renderer?.dispose();
}
function render(now) {
  frame = 0;
  if (!visible || document.hidden || contextLost || disposed || !renderer) return;
  const interval = innerWidth < 801 ? 1000 / 30 : 1000 / 45;
  if (!paused && now - last < interval) {
    frame = requestAnimationFrame(render);
    return;
  }
  const delta = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (!paused) time += delta;
  smooth.x += (pointer.x - smooth.x) * 0.045;
  smooth.y += (pointer.y - smooth.y) * 0.045;
  const scroll = Math.min(scrollY / Math.max(innerHeight, 1), 1.4);
  sculpture.rotation.set(
    0.35 + (paused ? 0 : Math.sin(time * 0.17) * 0.17 + smooth.y * 0.17 + scroll * 0.42),
    -0.35 + (paused ? 0 : time * 0.12 + smooth.x * 0.25 + scroll * 0.6),
    -0.2 + (paused ? 0 : Math.sin(time * 0.12) * 0.12),
  );
  sculpture.position.y = paused ? 0 : Math.sin(time * 0.5) * 0.065;
  renderer.render(scene, camera);
  host.classList.add('ready');
  host.dataset.rendering = paused ? 'static' : 'active';
  updateCaption();
  if (!paused) frame = requestAnimationFrame(render);
}
function resume() {
  if (!frame && visible && !document.hidden && !contextLost && !disposed && renderer) {
    last = performance.now() - 1000 / 30;
    frame = requestAnimationFrame(render);
  }
}
function syncVisibility() {
  host.classList.toggle('scene-idle', !visible || document.hidden);
  if (visible && !document.hidden) resume();
  else stop();
}
const observer = new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
  syncVisibility();
});
observer.observe(host);
updateCaption();
try {
  // Probe quietly: an unavailable context is an expected progressive fallback.
  const context = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
    stencil: false,
  });
  if (!context) {
    host.dataset.rendering = 'fallback';
    observer.disconnect();
    // Keep observing for the CSS fallback's visibility pause.
    observer.observe(host);
  } else {
    renderer = new THREE.WebGLRenderer({
      canvas,
      context,
      alpha: true,
      antialias: true,
      stencil: false,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(35, 1, 0.1, 40);
    camera.position.set(0, 0, 6.3);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    environment = pmrem.fromScene(room, 0.035);
    scene.environment = environment.texture;
    room.dispose();
    pmrem.dispose();
    const key = new THREE.DirectionalLight(0xffffff, 3);
    key.position.set(3, 5, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xd6e0ff, 1.2);
    fill.position.set(-4, 0, 2);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffdcc8, 1.8);
    rim.position.set(0, -3, 0);
    scene.add(rim);
    const mobile = innerWidth < 801;
    geometry = new THREE.TorusKnotGeometry(1, 0.33, mobile ? 128 : 192, mobile ? 24 : 32, 2, 3);
    material = new THREE.MeshStandardMaterial({
      color: 0xd2d5d1,
      metalness: 1,
      roughness: 0.18,
      envMapIntensity: 2.1,
    });
    sculpture = new THREE.Mesh(geometry, material);
    geometry.computeBoundingSphere();
    scene.add(sculpture);
    function resize() {
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 801 ? 1.35 : 1.7));
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      // Fit the bounding sphere in both axes, leaving room throughout rotation.
      const verticalFOV = THREE.MathUtils.degToRad(camera.fov);
      const horizontalFOV = 2 * Math.atan(Math.tan(verticalFOV / 2) * camera.aspect);
      camera.position.z =
        (geometry.boundingSphere.radius / Math.sin(Math.min(verticalFOV, horizontalFOV) / 2)) *
        1.08;
      camera.updateProjectionMatrix();
      resume();
    }
    function theme() {
      const dark = document.documentElement.dataset.theme === 'dark';
      renderer.toneMappingExposure = dark ? 1.05 : 1.25;
      material.color.setHex(dark ? 0xc0c9cb : 0xd2d5d1);
      resume();
    }
    resizer = new ResizeObserver(resize);
    resizer.observe(host);
    resize();
    theme();
    listen(window, 'auto-theme', theme);
    // Host is decorative; pointer input is bounded to its hero instead.
    listen(
      host.closest('.hero'),
      'pointermove',
      (event) => {
        if (
          event.pointerType === 'touch' ||
          paused ||
          !matchMedia('(hover: hover) and (pointer: fine)').matches
        )
          return;
        const rect = host.getBoundingClientRect();
        pointer.x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
        pointer.y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
      },
      { passive: true },
    );
    listen(host.closest('.hero'), 'pointerleave', () => {
      pointer.x = 0;
      pointer.y = 0;
    });
    listen(window, 'auto-motion', (event) => {
      paused = event.detail.paused;
      stop();
      resume();
    });
    listen(canvas, 'webglcontextlost', (event) => {
      event.preventDefault();
      contextLost = true;
      stop();
      host.classList.remove('ready');
      updateCaption();
    });
    listen(canvas, 'webglcontextrestored', () => {
      contextLost = false;
      theme();
      resize();
      resume();
    });
  }
} catch {
  // Dispose any partial GPU setup while retaining the CSS artwork and copy.
  host.classList.remove('ready');
  geometry?.dispose();
  material?.dispose();
  environment?.dispose();
  renderer?.dispose();
  renderer = undefined;
  resizer?.disconnect();
  host.dataset.rendering = 'fallback';
  updateCaption();
}
listen(document, 'visibilitychange', syncVisibility);
listen(window, 'pagehide', (event) => {
  if (event.persisted) stop();
  else dispose();
});
listen(window, 'pageshow', (event) => {
  if (event.persisted) syncVisibility();
});
