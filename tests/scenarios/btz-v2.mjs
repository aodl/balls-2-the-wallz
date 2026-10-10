/** Artificial genesis fixtures, not a production spawn or economic configuration. */
import {fixtureWorld} from '../../packages/kernels/btz-v2/world.mjs';
import {heading} from '../../packages/kernels/btz-v2/math.mjs';
const account = id => id.toString(16).padStart(2, '0').repeat(32);
const ball = (id, owner, cell, width, vx, vy = 0) => ({id, owner, cell, x0: BigInt(cell % width * 1024 + 512),
  y0: BigInt(Math.floor(cell / width) * 1024 + 512), vx, vy});
function world(width, height, cells, anchors, balls) {
  return fixtureWorld({width,height,cells,cannons:anchors.map((cell,i)=>({id:i+1,cell,account:account(i+1)})),balls});
}
export function scenario(name) {
  if (name === 'duel') return {ticks:4n,world:world(6,3,Array.from({length:18},(_,i)=>i%6<3?1:2),[6,11],
    [ball(1,1,7,6,1024),ball(2,2,10,6,-1024)])};
  if (name === 'severance') {
    const cells=Array(15).fill(1);for(const i of [6,7,8,9])cells[i]=2;
    return {ticks:1n,world:world(5,3,cells,[0,6],[ball(1,1,2,5,0,1024),ball(2,2,9,5,-1)])};
  }
  if (name === 'corner') return {ticks:1n,world:world(3,3,[1,1,2,1,1,2,2,2,2],[0,2],
    [ball(1,1,4,3,1024,1024),ball(2,2,8,3,1)])};
  if (name === 'wall-bounce') return {ticks:8n,world:world(5,5,Array(25).fill(1),[12],[ball(1,1,6,5,1024)])};
  if (name === 'dense') {
    const balls=[];for(let owner=1;owner<=2;owner++)for(let j=0;j<16;j++){
      const cell=(j%8)*16+(j%7)+(owner===1?0:8),[vx,vy]=heading((j*2713+owner*7193)%65536);
      balls.push(ball(balls.length+1,owner,cell,16,vx,vy));
    }
    return {ticks:4n,world:world(16,8,Array.from({length:128},(_,i)=>i%16<8?1:2),[48,63],balls)};
  }
  throw new Error('unknown scenario: choose duel, severance, corner, wall-bounce, dense');
}
