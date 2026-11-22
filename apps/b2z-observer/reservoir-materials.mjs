import * as T from 'three';
import {reservoirMarbling} from './reservoir-art.mjs';
import {EXCAVATION_DEPTH} from './reservoir-occupancy.mjs';

export const reservoirMaskShader = `
uniform sampler2D reservoirMask;
uniform float reservoirAtlasWidth;
uniform float reservoirWrap;
float reservoirAt(vec2 cell, vec2 size) {
  if (reservoirWrap > .5) cell = mod(cell, size);
  else if (any(lessThan(cell, vec2(0.))) || any(greaterThanEqual(cell, size))) return 0.;
  vec4 packedCells = texture2D(reservoirMask, (vec2(floor(cell.x / 4.), cell.y) + .5) / vec2(reservoirAtlasWidth, size.y));
  return packedCells[int(mod(cell.x, 4.))];
}`;

export function reservoirMaterials(occupancy, atlas, terrain) {
  const {width, height, atlasWidth, torus} = occupancy;
  const {pixels, size} = reservoirMarbling();
  const marbling = new T.DataTexture(pixels, size, size);
  marbling.colorSpace = T.SRGBColorSpace;
  marbling.wrapS = marbling.wrapT = T.RepeatWrapping;
  marbling.magFilter = T.LinearFilter;
  marbling.minFilter = T.LinearMipmapLinearFilter;
  marbling.generateMipmaps = true;
  marbling.repeat.set(Math.max(1, Math.round(width / 7)), Math.max(1, Math.round(height / 7)));
  marbling.needsUpdate = true;
  const worldSize = new T.Vector2(width, height);
  const wall = new T.ShaderMaterial({
    name: 'B2ZReservoirWall', toneMapped: false,
    uniforms: {worldSize: {value: worldSize}, ownership: terrain,
      depth: {value: EXCAVATION_DEPTH}, wrapWorld: {value: torus ? 1 : 0}},
    vertexShader: `
      varying vec3 wallPoint; varying vec2 outward;
      void main() {
        wallPoint = position; outward = -normal.xz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }`,
    fragmentShader: `
      uniform vec2 worldSize; uniform sampler2D ownership; uniform float depth, wrapWorld;
      varying vec3 wallPoint; varying vec2 outward;
      void main() {
        vec2 dry = floor(wallPoint.xz + outward * .025);
        dry = wrapWorld > .5 ? mod(dry, worldSize) : clamp(dry, vec2(0.), worldSize - 1.);
        vec3 soil = texture2D(ownership, (dry + .5) / worldSize).rgb * .91;
        float level = clamp(-wallPoint.y / depth, 0., 1.);
        float gradient = smoothstep(.01, .57, level);
        float underRim = smoothstep(.015, .070, level) * (1. - smoothstep(.070, .21, level));
        vec3 ink = mix(soil, vec3(.078, .117, .165), gradient * .92);
        ink *= 1. - .20 * underRim;
        float bevel = (1. - smoothstep(.005, .026, level)) * .13;
        ink = mix(ink, vec3(.81, .92, .96), bevel);
        ink *= 1. - .047 * abs(outward.y) * gradient;
        gl_FragColor = vec4(ink, 1.);
      }`
  });
  const clock = {value: 0}, tier = {value: 0};
  const liquid = new T.ShaderMaterial({
    name: 'B2ZReservoirLiquid', toneMapped: false,
    uniforms: {worldSize: {value: worldSize}, marbling: {value: marbling}, repeats: {value: marbling.repeat},
      features: {value: new T.Vector2(Math.max(1, Math.round(width / 1.9)), Math.max(1, Math.round(height / 1.9)))},
      clock, tier, reservoirMask: {value: atlas}, reservoirAtlasWidth: {value: atlasWidth}, reservoirWrap: {value: torus ? 1 : 0}},
    vertexShader: `
      varying vec2 basinUV;
      void main() {
        basinUV = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }`,
    fragmentShader: `
      uniform sampler2D marbling; uniform vec2 worldSize, repeats, features;
      uniform float clock, tier;
      varying vec2 basinUV;
      ${reservoirMaskShader}
      const float TAU = 6.28318530718;

      // Bilinear neighbourhood coverage pins the flow at exterior walls and
      // stays continuous at an exact join or through the toroidal cut.
      float interior(vec2 pos) {
        vec2 tile = floor(pos - .5), f = fract(pos - .5);
        float a = mix(reservoirAt(tile, worldSize), reservoirAt(tile + vec2(1., 0.), worldSize), f.x);
        float b = mix(reservoirAt(tile + vec2(0., 1.), worldSize), reservoirAt(tile + 1., worldSize), f.x);
        return smoothstep(.52, .98, mix(a, b, f.y));
      }

      float hash(vec2 tile) {
        vec3 p = fract(tile.xyx * vec3(.1031, .11369, .13787));
        p += dot(p, p.yzx + 19.19);
        return fract((p.x + p.y) * p.z);
      }

      vec3 surfaceDetail(vec2 uv, vec2 ribbon, float time, float inside) {
        float ripple = sin(TAU * (ribbon.x * 7. + ribbon.y * 5.) + sin(ribbon.y * TAU) - time * .84);
        float fine = .013 * ripple * inside;
        vec2 feature = uv * features;
        float seed = hash(mod(floor(feature), features));
        if (seed < .63) return vec3(fine);
        float life = fract(seed * 31. + time * (.046 + .024 * seed));
        float fade = smoothstep(.08, .28, life) * (1. - smoothstep(.64, .92, life));
        vec2 centre = vec2(.25 + .5 * fract(seed * 23.3), .30 + .38 * fract(seed * 9.7));
        vec2 local = fract(feature) - centre - vec2(.032 * sin(life * TAU), .070 * life);
        float r = length(local);
        float size = .026 + .028 * fract(seed * 16.);
        float aa = max(fwidth(feature.x) + fwidth(feature.y), .003) * .56;
        float disk = (1. - smoothstep(size - aa, size + aa, r));
        float ring = disk * smoothstep(size * .54 - aa, size * .78 + aa, r);
        float glint = (1. - smoothstep(size * .18, size * .43 + aa, length(local + size * vec2(.42, .38)))) * disk;
        return vec3(fine) + inside * fade * (vec3(.29, .40, .47) * ring + vec3(.45, .48, .37) * glint);
      }

      void main() {
        vec2 uv = basinUV * repeats;
        vec3 ink;
        if (tier > .5) {
          float inside = interior(basinUV * worldSize);
          vec2 phase = TAU * uv;
          vec2 flow = vec2(sin(phase.y + .6 * cos(phase.x) + clock * .16),
                           cos(phase.x - sin(phase.y) - clock * .13));
          vec2 ribbon = uv + .08 * inside * flow;
          if (tier > 1.5) {
            ribbon += inside * .036 * vec2(sin(phase.x + phase.y - clock * .37), cos(2. * phase.x - phase.y + clock * .29));
            vec2 broad = basinUV * max(vec2(1.), floor(repeats * .51)) + vec2(.32, .57);
            vec3 reflection = texture2D(marbling, broad - flow * .085 * inside).rgb;
            ink = mix(texture2D(marbling, ribbon).rgb, reflection, .16);
            ink += surfaceDetail(basinUV, ribbon, clock, inside);
          } else ink = texture2D(marbling, ribbon).rgb;
        } else ink = texture2D(marbling, uv).rgb;
        gl_FragColor = vec4(max(ink, vec3(0.)), 1.);
        #include <colorspace_fragment>
      }`
  });
  // Built-in shader, same authored texture, same geometry and waterline.
  const fallback = new T.MeshBasicMaterial({map: marbling, toneMapped: false});
  return {wall, liquid, fallback, clock, tier, dispose() {
    wall.dispose();
    liquid.dispose();
    fallback.dispose();
    marbling.dispose();
  }};
}
