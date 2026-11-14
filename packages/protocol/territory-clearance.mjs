/** Deterministic bounded admission predicate; canonical player lookup is supplied by the caller. */
export function hasEnemyClearance(width,height,cell,player,playerAt){
 for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const x=((cell%width+dx)%width+width)%width,y=((Math.floor(cell/width)+dy)%height+height)%height,enemy=playerAt(y*width+x);if(enemy!==0&&enemy!==player)return false;}return true;
}
export const clearanceActive=config=>config?.rules_version===9&&config.enemy_territory_min_chebyshev===4&&config.enemy_clearance_actions==='move-additional-new';
export function cellDistance(a,b,width,height){const dx=Math.abs(a%width-b%width),dy=Math.abs(Math.floor(a/width)-Math.floor(b/width));return Math.max(Math.min(dx,width-dx),Math.min(dy,height-dy));}
