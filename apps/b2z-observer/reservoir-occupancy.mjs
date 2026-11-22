// Render-only occupancy. Pack four horizontal cells into one RGBA texel so
// Three's RGBA-only partial uploads can update a one-byte-per-cell mask.
export const RESERVOIR_CHUNK = 16;
export const EXCAVATION_DEPTH = 0.88;

export class ReservoirOccupancy {
  constructor(width, height, torus) {
    this.width = width;
    this.height = height;
    this.torus = torus;
    this.atlasWidth = Math.ceil(width / 4);
    this.stride = this.atlasWidth * 4;
    this.bytes = new Uint8Array(this.stride * height);
    this.count = 0;
    this.chunkCounts = new Map();
    this.revision = 0;
    this.dirtyRows = new Map();
    this.dirtyChunks = new Set();
    this.chunkColumns = Math.ceil(width / RESERVOIR_CHUNK);
  }

  index(x, z) {
    if (this.torus) {
      x = (x + this.width) % this.width;
      z = (z + this.height) % this.height;
    }
    return x >= 0 && z >= 0 && x < this.width && z < this.height ? z * this.stride + x : -1;
  }

  has(x, z) {
    return this.bytes[this.index(x, z)] === 255;
  }

  setCells(cells, occupied = true) {
    const value = occupied ? 255 : 0;
    if (!Array.isArray(cells)) cells = [...cells];
    if (cells.some(cell => !Number.isInteger(cell) || cell < 0 || cell >= this.width * this.height)) throw new RangeError('reservoir cell');
    let changed = false;
    for (const cell of cells) {
      const x = cell % this.width, z = Math.floor(cell / this.width);
      const index = z * this.stride + x;
      if (this.bytes[index] === value) continue;
      this.bytes[index] = value;
      this.count += occupied ? 1 : -1;
      changed = true;
      const key = this.chunkAt(index);
      const count = (this.chunkCounts.get(key) ?? 0) + (occupied ? 1 : -1);
      if (count) this.chunkCounts.set(key, count);
      else this.chunkCounts.delete(key);
      const texel = Math.floor(x / 4);
      const row = this.dirtyRows.get(z);
      if (row) {
        row.first = Math.min(row.first, texel);
        row.last = Math.max(row.last, texel);
      } else this.dirtyRows.set(z, {first: texel, last: texel});

      for (const [dx, dz] of AFFECTED) {
        const neighbour = this.index(x + dx, z + dz);
        if (neighbour < 0) continue;
        this.dirtyChunks.add(this.chunkAt(neighbour));
      }
    }
    if (changed) this.revision++;
  }

  chunkAt(index) {
    const x = Math.floor((index % this.stride) / RESERVOIR_CHUNK);
    const z = Math.floor(index / this.stride / RESERVOIR_CHUNK);
    return z * this.chunkColumns + x;
  }

  takeChanges() {
    const chunks = this.dirtyChunks, rows = this.dirtyRows;
    this.dirtyChunks = new Set();
    this.dirtyRows = new Map();
    return {chunks, rows};
  }
}

const AFFECTED = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];
const WALL_EDGES = [
  // Orient exposed faces inward. x/z is the horizontal world plane.
  {dx: -1, dz: 0, vertices: (x, z, end) => [x, z, x, end]},
  {dx: 1, dz: 0, vertices: (x, z, end) => [x + 1, end, x + 1, z]},
  {dx: 0, dz: -1, vertices: (x, z, end) => [end, z, x, z]},
  {dx: 0, dz: 1, vertices: (x, z, end) => [x, z + 1, end, z + 1]},
];

// Join equal horizontal runs on successive rows. A full 16×16 patch becomes
// one water quad. Splits at chunk boundaries are coplanar with identical UVs.
export function reservoirChunk(occupancy, key) {
  const x0 = (key % occupancy.chunkColumns) * RESERVOIR_CHUNK;
  const z0 = Math.floor(key / occupancy.chunkColumns) * RESERVOIR_CHUNK;
  const x1 = Math.min(occupancy.width, x0 + RESERVOIR_CHUNK);
  const z1 = Math.min(occupancy.height, z0 + RESERVOIR_CHUNK);
  const water = [], walls = [];
  let previous = new Map();
  let area = 0;
  for (let z = z0; z < z1; z++) {
    const row = new Map();
    for (let x = x0; x < x1;) {
      if (!occupancy.has(x, z)) {
        x++;
        continue;
      }
      let end = x + 1;
      while (end < x1 && occupancy.has(end, z)) end++;
      const span = (x - x0) * (RESERVOIR_CHUNK + 1) + end - x0;
      const rect = previous.get(span) ?? [x, z, end, z + 1];
      if (!previous.has(span)) water.push(rect);
      rect[3] = z + 1;
      row.set(span, rect);
      area += end - x;
      x = end;
    }
    previous = row;
  }
  if (!area) return null;
  for (const {dx, dz, vertices} of WALL_EDGES) {
    const axial = dx !== 0;
    const first = axial ? x0 : z0, last = axial ? x1 : z1;
    const start = axial ? z0 : x0, stop = axial ? z1 : x1;
    for (let fixed = first; fixed < last; fixed++) {
      const exposed = t => {
        const x = axial ? fixed : t, z = axial ? t : fixed;
        return occupancy.has(x, z) && !occupancy.has(x + dx, z + dz);
      };
      for (let t = start; t < stop;) {
        if (!exposed(t)) {
          t++;
          continue;
        }
        let end = t + 1;
        while (end < stop && exposed(end)) end++;
        walls.push(vertices(axial ? fixed : t, axial ? t : fixed, end));
        t = end;
      }
    }
  }
  return {water, walls, area, x0, z0, x1, z1};
}
