import {cmp, rat} from './math.mjs';
import {Q} from './world.mjs';
/** Exact cannon-style boundary crossing. Historical trajectories use den1;
 * schema7 supplies the shared rational denominator selected by world validation. */
export function nextCrossing(ball, width, now, den = 1n) {
  if(typeof den!=='bigint'||den<1n||den>65536n)throw new Error('trajectory denominator');
  const x = ball.cell % width, y = Math.floor(ball.cell / width);
  const xwall = (x + (ball.vx > 0 ? 1 : 0)) * Q, ywall = (y + (ball.vy > 0 ? 1 : 0)) * Q;
  const tx = ball.vx ? rat((den===1n?BigInt(xwall):BigInt(xwall)*den) - ball.x0, den===1n?BigInt(ball.vx):BigInt(ball.vx)*den) : null;
  const ty = ball.vy ? rat((den===1n?BigInt(ywall):BigInt(ywall)*den) - ball.y0, den===1n?BigInt(ball.vy):BigInt(ball.vy)*den) : null;
  if ((tx && cmp(tx, now) < 0) || (ty && cmp(ty, now) < 0) || (!tx && !ty)) throw new Error('invalid sided trajectory');
  const time = !tx ? ty : !ty ? tx : cmp(tx, ty) <= 0 ? tx : ty;
  return {ball: ball.id, time, x: tx !== null && cmp(tx, time) === 0, y: ty !== null && cmp(ty, time) === 0, xwall, ywall};
}
export function reflected(ball, axis, wall) {
  const den=ball.den??1n;
  if (axis === 'x') { ball.x0 = 2n * BigInt(wall)*den - ball.x0; ball.vx = -ball.vx; }
  else if (axis === 'y') { ball.y0 = 2n * BigInt(wall)*den - ball.y0; ball.vy = -ball.vy; }
  else throw new Error('reflection axis');
}
