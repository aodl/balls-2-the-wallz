import {cmp, rat} from './math.mjs';
import {Q} from './world.mjs';
/** Ball trajectories are x(t)=x0+vx*t and y(t)=y0+vy*t with integer intercepts. */
export function nextCrossing(ball, width, now) {
  const x = ball.cell % width, y = Math.floor(ball.cell / width);
  const xwall = (x + (ball.vx > 0 ? 1 : 0)) * Q, ywall = (y + (ball.vy > 0 ? 1 : 0)) * Q;
  const tx = ball.vx ? rat(BigInt(xwall) - ball.x0, BigInt(ball.vx)) : null;
  const ty = ball.vy ? rat(BigInt(ywall) - ball.y0, BigInt(ball.vy)) : null;
  if ((tx && cmp(tx, now) < 0) || (ty && cmp(ty, now) < 0) || (!tx && !ty)) throw new Error('invalid sided trajectory');
  const time = !tx ? ty : !ty ? tx : cmp(tx, ty) <= 0 ? tx : ty;
  return {ball: ball.id, time, x: tx !== null && cmp(tx, time) === 0, y: ty !== null && cmp(ty, time) === 0, xwall, ywall};
}
export function reflected(ball, axis, wall) {
  if (axis === 'x') { ball.x0 = 2n * BigInt(wall) - ball.x0; ball.vx = -ball.vx; }
  else if (axis === 'y') { ball.y0 = 2n * BigInt(wall) - ball.y0; ball.vy = -ball.vy; }
  else throw new Error('reflection axis');
}
