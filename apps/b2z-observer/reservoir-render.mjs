import * as T from 'three';
import {EXCAVATION_DEPTH, RESERVOIR_CHUNK, reservoirChunk} from './reservoir-occupancy.mjs';
import {reservoirMaterials} from './reservoir-materials.mjs';

const REGION = 8 * RESERVOIR_CHUNK;
const WATER_LEVEL = -EXCAVATION_DEPTH / 2;
const REFRESH_MS = 1000 / 18;

function geometry(quads, width, height, wall) {
  const positions = new Float32Array(quads.length * 18);
  const uvs = wall ? null : new Float32Array(quads.length * 12);
  let p = 0, u = 0;
  for (const [x, z, endX, endZ] of quads) {
    const corners = wall ? [
      [x, 0, z], [endX, 0, endZ], [endX, -EXCAVATION_DEPTH, endZ], [x, -EXCAVATION_DEPTH, z]
    ] : [
      [x, WATER_LEVEL, z], [x, WATER_LEVEL, endZ], [endX, WATER_LEVEL, endZ], [endX, WATER_LEVEL, z]
    ];
    for (const i of [0, 1, 2, 0, 2, 3]) {
      const point = corners[i];
      positions.set(point, p);
      p += 3;
      if (uvs) {
        uvs[u++] = point[0] / width;
        uvs[u++] = point[2] / height;
      }
    }
  }
  const mesh = new T.BufferGeometry();
  mesh.setAttribute('position', new T.BufferAttribute(positions, 3));
  if (wall) mesh.computeVertexNormals();
  else mesh.setAttribute('uv', new T.BufferAttribute(uvs, 2));
  return mesh;
}

function bounds(quads) {
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const [x, z, endX, endZ] of quads) {
    left = Math.min(left, x);
    top = Math.min(top, z);
    right = Math.max(right, endX);
    bottom = Math.max(bottom, endZ);
  }
  return [left, top, right, bottom];
}

// A rectangle clipped conservatively to the viewport for fill-rate budgeting.
function visibleArea(camera, copy, rectangle, height, margin = 0) {
  const [x, z, endX, endZ] = rectangle;
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const [a, b] of [[x, z], [endX, z], [endX, endZ], [x, endZ]]) {
    const p = camera.screen(a + copy.x, b + copy.y, height);
    left = Math.min(left, p.x);
    top = Math.min(top, p.y);
    right = Math.max(right, p.x);
    bottom = Math.max(bottom, p.y);
  }
  return Math.max(0, Math.min(right, camera.viewport.width + margin) - Math.max(-margin, left))
    * Math.max(0, Math.min(bottom, camera.viewport.height + margin) - Math.max(-margin, top));
}

export function createReservoirLayer(occupancy, scene, groundMaterial, renderer) {
  const atlas = new T.DataTexture(occupancy.bytes, occupancy.atlasWidth, occupancy.height);
  atlas.magFilter = atlas.minFilter = T.NearestFilter;
  atlas.needsUpdate = true;
  const {width, height} = occupancy;
  const materials = reservoirMaterials(occupancy, atlas, groundMaterial.uniforms.ownership);
  const regions = new Map(), active = new Map();
  let revision = -1, viewKey = '', fallback = false, shaderChecked = false;
  let atlasUploads = 0, atlasBytesUploaded = 0, chunksBuilt = 0, regionsBuilt = 0;
  let pendingAtlasBytes = occupancy.bytes.byteLength;
  atlas.onUpdate = () => {
    atlasUploads++;
    atlasBytesUploaded += pendingAtlasBytes;
    pendingAtlasBytes = 0;
  };
  let coverage = 0, clock = 0, lastTick = null, timeBucket = -1, tier = 0;
  let frameMs = null, slow = 0, fast = 0, cap = 2, visibleWater = false, draws = 0;
  let waterQuads = 0, wallQuads = 0, geometryBytes = 0;

  function groupMask(enabled) {
    const defines = groundMaterial.defines;
    if (enabled === Boolean(defines.USE_RESERVOIRS)) return;
    if (enabled) defines.USE_RESERVOIRS = 1;
    else delete defines.USE_RESERVOIRS;
    groundMaterial.uniforms.reservoirMask.value = enabled ? atlas : null;
    groundMaterial.uniforms.reservoirAtlasWidth.value = occupancy.atlasWidth;
    groundMaterial.uniforms.reservoirWrap.value = occupancy.torus ? 1 : 0;
    groundMaterial.needsUpdate = true;
  }

  function rebuild() {
    const first = revision < 0;
    revision = occupancy.revision;
    const {chunks, rows} = occupancy.takeChanges();
    if (first) {
      for (const key of occupancy.chunkCounts.keys()) chunks.add(key);
    } else if (rows.size && pendingAtlasBytes !== occupancy.bytes.byteLength) {
      let rangeBytes = 0;
      // Pending partial ranges from earlier offscreen edits must survive until
      // the renderer gets a chance to read the mask.
      for (const range of atlas.updateRanges) rangeBytes += range.count;
      if (atlas.updateRanges.length + rows.size <= 32) {
        for (const [row, {first, last}] of rows) {
          const count = (last - first + 1) * 4;
          atlas.addUpdateRange(row * occupancy.stride + first * 4, count);
          rangeBytes += count;
        }
      } else {
        atlas.clearUpdateRanges();
        rangeBytes = occupancy.bytes.byteLength;
      }
      atlas.needsUpdate = true;
      pendingAtlasBytes = rangeBytes;
    }

    const dirtyRegions = new Set();
    for (const key of chunks) {
      const chunk = reservoirChunk(occupancy, key);
      chunksBuilt++;
      const x = (key % occupancy.chunkColumns) * RESERVOIR_CHUNK;
      const z = Math.floor(key / occupancy.chunkColumns) * RESERVOIR_CHUNK;
      const regionKey = Math.floor(x / REGION) + Math.floor(z / REGION) * Math.ceil(width / REGION);
      if (!chunk && !regions.has(regionKey)) continue;
      if (!regions.has(regionKey)) regions.set(regionKey, {patches: new Map()});
      const region = regions.get(regionKey);
      if (chunk) region.patches.set(key, {...chunk, bounds: bounds(chunk.water)});
      else region.patches.delete(key);
      dirtyRegions.add(regionKey);
    }
    for (const key of dirtyRegions) {
      const region = regions.get(key);
      region.water?.dispose();
      region.walls?.dispose();
      if (!region.patches.size) {
        regions.delete(key);
        continue;
      }
      const water = [], walls = [];
      for (const patch of region.patches.values()) {
        for (const quad of patch.water) water.push(quad);
        for (const quad of patch.walls) walls.push(quad);
      }
      region.bounds = bounds(water);
      region.water = geometry(water, width, height, false);
      region.walls = walls.length ? geometry(walls, width, height, true) : null;
      region.waterQuads = water.length;
      region.wallQuads = walls.length;
      regionsBuilt++;
    }
    waterQuads = wallQuads = 0;
    for (const region of regions.values()) {
      waterQuads += region.waterQuads;
      wallQuads += region.wallQuads;
    }
    geometryBytes = waterQuads * 120 + wallQuads * 144;
    const clip = groundMaterial.uniforms.reservoirBounds.value;
    clip.set(width, height, 0, 0);
    for (const region of regions.values()) {
      const [x, z, endX, endZ] = region.bounds;
      clip.set(Math.min(clip.x,x), Math.min(clip.y,z), Math.max(clip.z,endX), Math.max(clip.w,endZ));
    }
    viewKey = '';
  }

  function position(camera) {
    const shown = new Set(), copies = camera.copies(1);
    let pixels = 0;
    visibleWater = false;
    for (const copy of copies) {
      for (const [key, region] of regions) {
        if (!visibleArea(camera, copy, region.bounds, WATER_LEVEL, camera.scale)) continue;
        const id = key + '/' + copy.x + '/' + copy.y;
        let meshes = active.get(id);
        if (!meshes) {
          const group = new T.Group();
          const water = new T.Mesh(region.water, fallback ? materials.fallback : materials.liquid);
          const wall = new T.Mesh(region.walls ?? region.water, materials.wall);
          group.add(water, wall);
          group.position.set(copy.x, 0, copy.y);
          scene.add(group);
          meshes = {group, water, wall};
          active.set(id, meshes);
        }
        meshes.water.geometry = region.water;
        meshes.wall.geometry = region.walls ?? region.water;
        meshes.wall.visible = !!region.walls;
        shown.add(id);
        for (const patch of region.patches.values()) {
          const projection = visibleArea(camera, copy, patch.bounds, WATER_LEVEL);
          if (!projection) continue;
          for (const rect of patch.water) {
            const visible = visibleArea(camera, copy, rect, WATER_LEVEL);
            if (!visible) continue;
            visibleWater = true;
            const area = (rect[2] - rect[0]) * (rect[3] - rect[1]);
            pixels += Math.min(visible, area * camera.scale ** 2 / Math.sqrt(3));
          }
        }
      }
    }
    for (const [id, {group}] of active) {
      if (shown.has(id)) continue;
      scene.remove(group);
      active.delete(id);
    }
    coverage = Math.min(1, pixels / (camera.viewport.width * camera.viewport.height));
    groupMask(active.size > 0);
  }

  function observe(now) {
    if (!Number.isFinite(now)) return;
    const interval = frameMs === null ? 0 : now - frameMs;
    frameMs = now;
    if (interval <= 0) return;
    if (interval > 500) {
      fast = slow = 0;
      return;
    }
    slow = interval >= 36 ? slow + 1 : 0;
    fast = interval <= 21 ? fast + 1 : 0;
    if (slow >= 5) {
      cap = Math.max(0, cap - 1);
      fast = slow = 0;
    } else if (fast >= 90) {
      cap = Math.min(2, cap + 1);
      fast = slow = 0;
    }
  }

  return {
    prepare(camera, {wallMs, frameTime, reducedMotion, hidden}) {
      const changed = revision !== occupancy.revision;
      if (changed) rebuild();
      const key = occupancy.count ? [camera.x, camera.y, camera.scale, camera.angle, camera.viewport.width, camera.viewport.height].join('/') : '';
      if (key !== viewKey) {
        position(camera);
        viewKey = key;
      } else if (changed && !occupancy.count) position(camera);

      if (visibleWater && !hidden) observe(frameTime);
      else frameMs = null;
      const oldTier = tier;
      const pixelCount = coverage * camera.viewport.width * camera.viewport.height;
      const chosenTier = reducedMotion || hidden || fallback || !visibleWater || pixelCount < 40 || camera.scale < 9 || coverage > .72
        ? 0 : camera.scale >= 32 && coverage < .48 ? 2 : 1;
      tier = Math.min(cap, chosenTier);
      materials.tier.value = tier;
      if (tier && lastTick !== null) clock += Math.max(0, Math.min(wallMs - lastTick, 125));
      lastTick = tier ? wallMs : null;
      const step = Math.floor(clock / REFRESH_MS);
      const tick = tier > 0 && step !== timeBucket;
      if (tick) {
        timeBucket = step;
        materials.clock.value = step * REFRESH_MS / 1000;
      }
      return changed || oldTier !== tier || tick;
    },
    // Three links during compile(), then checks the link when uniforms are
    // first used. Probe only this material and keep the arena's other error
    // handling intact. This also warms the same default-target program.
    preflight(camera) {
      if (shaderChecked || !active.size) return;
      shaderChecked = true;
      const {water} = active.values().next().value;
      const previous = renderer.debug.onShaderError;
      renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
        if (!gl.getShaderSource(fragment)?.includes('#define SHADER_NAME B2ZReservoirLiquid')) {
          previous?.(gl, program, vertex, fragment);
          return;
        }
        fallback = true;
      };
      try {
        renderer.compile(water, camera, scene);
        renderer.properties.get(materials.liquid).currentProgram.getUniforms();
      } finally {
        renderer.debug.onShaderError = previous;
      }
      if (fallback) {
        for (const item of active.values()) item.water.material = materials.fallback;
        materials.liquid.dispose();
        materials.tier.value = tier = 0;
        lastTick = null;
      }
    },
    drawn() { draws++; },
    inspect() {
      return {occupied: occupancy.count, visibleWater, coverage, tier: fallback ? 'fallback' : ['static', 'advection', 'hybrid'][tier],
        draws, waterQuads, wallQuads, activeBatches: active.size, geometryBytes, atlasBytes: occupancy.bytes.byteLength,
        atlasUploads, atlasBytesUploaded, chunksBuilt, regionsBuilt, time: materials.clock.value};
    },
    restore() {
      atlas.clearUpdateRanges();
      atlas.needsUpdate = true;
      pendingAtlasBytes = occupancy.bytes.byteLength;
      shaderChecked = fallback;
      frameMs = lastTick = null;
    },
    dispose() {
      groupMask(false);
      for (const {group} of active.values()) scene.remove(group);
      for (const region of regions.values()) {
        region.water?.dispose();
        region.walls?.dispose();
      }
      materials.dispose();
      atlas.dispose();
    }
  };
}
