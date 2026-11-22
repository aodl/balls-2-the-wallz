/** Offline art fixture using the production arena renderer. */
import {createArenaRenderer} from '../../apps/b2z-observer/render.mjs';
import {ReservoirOccupancy} from '../../apps/b2z-observer/reservoir-occupancy.mjs';
import {Camera} from '../../apps/b2z-observer/camera.mjs';
import {CameraController} from '../../apps/b2z-observer/camera-controller.mjs';
import {B2zView} from '../../apps/b2z-observer/model.mjs';
import {decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';

const {cases} = await (await fetch('fixture.json')).json();
const source = decodeCanonical(Uint8Array.from(cases.quantityLive.initial.match(/../g), n => parseInt(n, 16)));
const canvas = document.querySelector('#board'), label = document.querySelector('#fixture-status');
let contextLoss;
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const camera = new Camera(), controller = new CameraController(camera, {reducedMotion: () => motion.matches});
const errors = [];
const renderer = createArenaRenderer(canvas, {onError: message => errors.push(message), onRestore: () => draws++});
const WIDTH = 1000;
const wrap = n => (n + WIDTH) % WIDTH;
const cell = (x, z) => wrap(z) * WIDTH + wrap(x);
const rectangle = (x, z, w, h) => Array.from({length: w * h}, (_, i) => cell(x + i % w, z + Math.floor(i / w)));
const irregular = [...rectangle(503, 503, 5, 3), ...rectangle(504, 506, 2, 2), ...rectangle(503, 507, 1, 1)];
const gallery = [...irregular, ...rectangle(509, 500, 1, 1), ...rectangle(498, 507, 3, 2)];
const layouts = {
  gallery: {cells: gallery, x: 504, z: 504, scale: 76},
  single: {cells: rectangle(504, 504, 1, 1), x: 504.5, z: 504.5, scale: 96},
  rectangle: {cells: rectangle(502, 503, 6, 4), x: 505, z: 505, scale: 68},
  channel: {cells: [...rectangle(497, 505, 12, 1), ...rectangle(508, 501, 1, 4), ...rectangle(499, 506, 1, 4)], x: 503, z: 505, scale: 60},
  seam: {cells: [...rectangle(998, 998, 5, 5), ...rectangle(999, 1003, 3, 1)], x: .5, z: .5, scale: 70},
  stress: {cells: [...rectangle(484, 484, 40, 32), ...rectangle(490, 516, 28, 20), ...rectangle(465, 500, 19, 4)], x: 502, z: 502, scale: 17},
  empty: {cells: [], x: 504, z: 504, scale: 76}
};
let view, occupancy, stats, draws = 0, frame = null, current = 'gallery';
function world() {
  const v = new B2zView(source);
  v.ownership.base.fill(0);
  const ink = source.playability.territories[0].id;
  for (const z of [0, 15, 16, 17, 31]) {
    for (const x of [0, 15, 16, 17, 31]) v.ownership.base[z * 32 + x] = ink;
  }
  v.ownership.overrides = [];
  v.playerColor = () => '#48b2c3';
  v.color = v.playerColor;
  v.balls.clear();
  v.cannons.get(1).cell = cell(508, 502);
  v.cannons.get(1).heading = 8192;
  v.deflectors = new Map();
  v.deflectors.set(1, {id: 1, cell: cell(511, 504), owner: 1, generation: 1, orientation: 'SE', heading: 8192});
  return v;
}
function draw(now = performance.now(), force = false) {
  camera.configure(WIDTH, WIDTH, innerWidth, innerHeight, true);
  controller.update(now);
  const next = renderer.draw(view, camera, {time: force ? now / 1000 : 0, wallMs: now, frameTime: now, reducedMotion: motion.matches});
  if (next !== stats) draws++;
  stats = next;
  const water = renderer.reservoirs();
  const text = `${current} · ${water?.tier ?? 'no water'} · ${Math.round(camera.scale)} px/cell`;
  if (label.textContent !== text) label.textContent = text;
  return {stats, water, draws};
}
function load(name, scale, quarter = 0) {
  if (!layouts[name]) throw new RangeError('unknown reservoir layout');
  current = name;
  select.value = name;
  const layout = layouts[name];
  controller.rotation = null;
  camera.configure(WIDTH, WIDTH, innerWidth, innerHeight, true);
  camera.angle = -quarter * Math.PI / 2;
  camera.scale = scale ?? layout.scale * Math.min(1, innerWidth / 740);
  camera.centre(layout.x, layout.z);
  view = world();
  occupancy = layout.cells.length ? new ReservoirOccupancy(WIDTH, WIDTH, true) : null;
  occupancy?.setCells(layout.cells);
  renderer.setReservoirs(occupancy);
  return draw();
}
function stop() { cancelAnimationFrame(frame); frame = null; }
function animate() {
  stop();
  const step = now => {
    if (!document.hidden) draw(now);
    frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
}
const select = document.querySelector('#fixture-layout');
for (const name of Object.keys(layouts)) select.add(new Option(name, name));
select.addEventListener('change', () => load(select.value));
document.querySelector('#fixture-directions').addEventListener('click', event => {
  if (event.target.matches('button')) controller.rotate(Number(event.target.value));
});
canvas.addEventListener('wheel', event => {event.preventDefault(); camera.zoom(Math.exp(-event.deltaY * .002), event.offsetX, event.offsetY);}, {passive: false});
let drag = null;
canvas.addEventListener('pointerdown', event => {
  if (drag) return;
  drag = {id: event.pointerId, x: event.clientX, y: event.clientY};
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', event => {
  if (drag?.id !== event.pointerId) return;
  camera.pan(event.clientX - drag.x, event.clientY - drag.y);
  drag.x = event.clientX;
  drag.y = event.clientY;
});
canvas.addEventListener('lostpointercapture', () => {drag = null;});

globalThis.reservoirFixture = {
  load, camera, controller, draw, stop, animate, errors,
  inspect: () => ({stats, water: renderer.reservoirs(), draws}),
  edit(x, z, occupied) { occupancy.setCells([cell(x, z)], occupied); },
  contextLoss() { contextLoss = canvas.getContext('webgl2').getExtension('WEBGL_lose_context'); contextLoss.loseContext(); },
  restore() { contextLoss.restoreContext(); },
  async measure(n, forced) {
    stop();
    const frames = [], drawsMs = [];
    let last, before;
    const raf = () => new Promise(requestAnimationFrame);
    for (let i = 0; i <= n + 12; i++) {
      const now = await raf(), start = performance.now();
      draw(now, forced);
      if (i === 12) before = renderer.reservoirs();
      if (i > 12) {
        frames.push(now - last);
        drawsMs.push(performance.now() - start);
      }
      last = now;
    }
    const summary = samples => {
      const ordered = [...samples].sort((a,b) => a - b);
      return {n, p50: ordered[Math.ceil(n * .5) - 1], p95: ordered[Math.ceil(n * .95) - 1], max: ordered.at(-1)};
    };
    const gl = canvas.getContext('webgl2'), info = gl.getExtension('WEBGL_debug_renderer_info');
    return {frame: summary(frames), draw: summary(drawsMs), renderer: gl.getParameter(info?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER),
      gpuTimerAvailable: Boolean(gl.getExtension('EXT_disjoint_timer_query_webgl2')), before, after: renderer.reservoirs(), stats};
  }
};
load('gallery');
animate();
