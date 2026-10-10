/** Reduced, exact fractions. No floating point participates in BTZ simulation outcomes. */
export function gcd(a, b) {
  a = a < 0n ? -a : a; b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a;
}
export function rat(n, d = 1n) {
  n = BigInt(n); d = BigInt(d);
  if (!d) throw new Error('zero denominator');
  if (d < 0n) { n = -n; d = -d; }
  const g = gcd(n, d); return [n / g, d / g];
}
export const add = (a, b) => rat(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
export const sub = (a, b) => rat(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
export const mulInt = (a, n) => rat(a[0] * BigInt(n), a[1]);
export const cmp = (a, b) => { const d = a[0] * b[1] - b[0] * a[1]; return d < 0n ? -1 : d > 0n ? 1 : 0; };
export function validRat(a) {
  if (!Array.isArray(a) || a.length !== 2 || a.some(v => typeof v !== 'bigint') || a[1] <= 0n
      || gcd(a[0], a[1]) !== 1n || a.some(v => v.toString().length > 900)) throw new Error('noncanonical fraction');
  return a;
}

// atan(2^-i) in binary turns (2^32 units/revolution), with nearest integer rounding.
const ATAN = [536870912n,316933406n,167458907n,85004756n,42667331n,21354465n,10679838n,
  5340245n,2670163n,1335087n,667544n,333772n,166886n,83443n,41722n,20861n,
  10430n,5215n,2608n,1304n,652n,326n,163n,81n];
const GAIN_INVERSE_Q30 = 652032874n;
function nearest(n, d) { return n < 0n ? -((-n + d / 2n) / d) : (n + d / 2n) / d; }
/** Integer CORDIC: a fixed, versioned approximation, not a host trig function. */
export function heading(angle, speed = 1024) {
  if (!Number.isInteger(angle) || angle < 0 || angle > 65535 || !Number.isInteger(speed) || speed < 1 || speed > 4096)
    throw new Error('heading bounds');
  const q = Math.floor(angle / 16384), a = angle % 16384;
  let x, y;
  if (!a) { x = BigInt(speed); y = 0n; }
  else {
    let xx = GAIN_INVERSE_Q30, yy = 0n, z = BigInt(a) << 16n;
    for (let i = 0; i < ATAN.length; i++) {
      const shift = BigInt(i), sign = z >= 0n ? 1n : -1n;
      [xx, yy] = [xx - sign * (yy >> shift), yy + sign * (xx >> shift)];
      z -= sign * ATAN[i];
    }
    x = nearest(xx * BigInt(speed), 1n << 30n); y = nearest(yy * BigInt(speed), 1n << 30n);
  }
  return [[x,y],[-y,x],[-x,-y],[y,-x]][q].map(Number);
}
