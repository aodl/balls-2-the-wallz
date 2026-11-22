// An original, authored colour ramp and periodic fold field, baked into a
// mipmapped texture once on demand. Nothing is sampled from the concept art.
const INKS = [
  [0, 43, 23, 105],
  [.13, 69, 41, 184],
  [.24, 23, 96, 249],
  [.34, 19, 211, 252],
  [.41, 137, 245, 255],
  [.48, 52, 82, 238],
  [.57, 112, 39, 205],
  [.66, 213, 59, 225],
  [.72, 250, 116, 186],
  [.79, 236, 64, 99],
  [.87, 255, 137, 38],
  [.94, 255, 224, 111],
  [1, 255, 247, 187]
];
const TAU = 2 * Math.PI;
let marbling;

export function reservoirMarbling() {
  if (marbling) return marbling;
  const size = 256;
  const pixels = new Uint8Array(size * size * 4);
  for (let z = 0; z < size; z++) {
    const v = TAU * (z + .5) / size;
    for (let x = 0; x < size; x++) {
      const u = TAU * (x + .5) / size;
      const fold = u + .74 * Math.sin(v + .53 * Math.sin(u - v)) + .33 * Math.cos(2 * v - u);
      const swirl = v + .65 * Math.sin(u + .42 * Math.cos(2 * v)) + .39 * Math.cos(u + 2 * v);
      const strata = .51 * Math.sin(2 * fold + 1.63 * Math.sin(swirl)) + .29 * Math.cos(2 * swirl - fold) + .20 * Math.sin(fold + swirl);
      const tone = Math.max(0, Math.min(1, .52 + .68 * strata));
      const t = Math.min(INKS.length - 2, INKS.findIndex((row, i) => i + 1 < INKS.length && tone <= INKS[i + 1][0]));
      const low = INKS[t], high = INKS[t + 1];
      const blend = (tone - low[0]) / (high[0] - low[0]);
      const vein = Math.pow(.5 + .5 * Math.cos(TAU * (tone * 3.8 + .09 * Math.sin(swirl))), 28);
      const gloss = vein * (.14 + .15 * (.5 + .5 * Math.sin(fold - swirl)));
      const offset = (z * size + x) * 4;
      for (let c = 0; c < 3; c++) {
        const pigment = low[c + 1] + blend * (high[c + 1] - low[c + 1]);
        pixels[offset + c] = Math.round(pigment + (255 - pigment) * gloss);
      }
      pixels[offset + 3] = 255;
    }
  }
  marbling = {pixels, size};
  return marbling;
}
