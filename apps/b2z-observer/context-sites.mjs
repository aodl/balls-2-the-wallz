import {reservoirHas} from '../../packages/protocol/reservoir.mjs';
import {spacingSupported} from './context-policy.mjs';
import {structureMap,structureOccupancy,structureSiteReason,wrapSite} from '../../packages/protocol/structure-sites.mjs';
import {islandAt} from './action-quote-v6.mjs';
import {cellDistance} from '../../packages/protocol/territory-clearance.mjs';

const worlds = new WeakMap();
export function contextSites(world,config) {
  const spacing=spacingSupported(config);
  if(!worlds.has(world))worlds.set(world,new Map());
  const versions=worlds.get(world);
  if(versions.has(spacing))return versions.get(spacing);
  const territories=new Map(world.playability.territories.map(t=>[t.id,t.player]));
  const playerAt=cell=>territories.get(islandAt(world,cell))??0;
  const cannonOwners=new Map(world.playability.lifecycle.map(c=>[c.cannon,c.player]));
  const occupied=structureOccupancy(world),structures=structureMap(world,id=>cannonOwners.get(id));
  const activeIslands=new Set(world.balls.filter(b=>playerAt(b.cell)===b.owner).map(b=>islandAt(world,b.cell)));
  const active=cell=>activeIslands.has(islandAt(world,cell));
  const accounts=new Map(world.playability.players.map(p=>[p.account,p.id]));
  const state={
    owner:account=>accounts.get(account),
    owns:(account,cell)=>accounts.has(account)&&accounts.get(account)===playerAt(cell),
    hasStructure:cell=>structures.has(cell)||reservoirHas(world.reservoirs,cell),
    occupant(cell){
      if(reservoirHas(world.reservoirs,cell))return 'Reservoir';
      const structure=structures.get(cell);
      if(structure)return structure.kind==='cannon'?'Cannon':'Diverter';
      return occupied.has(cell)?'Live Ball':null;
    },
    active,
    reason:(account,cell, options={})=>structureSiteReason({width:world.width,height:world.height,owner:accounts.get(account),cell,
      ...options,spacing,reservoirs:world.reservoirs,occupied,structures,ownerAt:playerAt,active}),
    occupiedKey:[...occupied].sort((a,b)=>a-b).join(','),
    activeKey:[...activeIslands].sort((a,b)=>a-b).join(','),
    candidates(account,moving,source){
      const owner=accounts.get(account),found=new Set();
      for(const [at,structure] of structures){
        if(structure.owner!==owner||moving?.kind===structure.kind&&moving.id===structure.id)continue;
        const x=at%world.width,y=Math.floor(at/world.width);
        for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
          const cell=wrapSite(x+dx,y+dy,world.width,world.height);
          if(cell!==at&&cell!==source)found.add(cell);
        }
      }
      const distance=cell=>cellDistance(cell,source,world.width,world.height);
      return [...found].sort((a,b)=>distance(a)-distance(b)||a-b);
    }
  };
  versions.set(spacing,state);
  return state;
}

export function firstContextDestination(candidates,legal,schedule=fn=>setTimeout(fn,0)){
  let cancelled=false,index=0,resolve;
  const promise=new Promise(done=>resolve=done),stats={tested:0,chunks:0,maxChunkMs:0};
  function step(){
    if(cancelled){resolve(null);return;}
    const start=performance.now();
    stats.chunks++;
    const finish=value=>{stats.maxChunkMs=Math.max(stats.maxChunkMs,performance.now()-start);resolve(value);};
    while(index<candidates.length){
      const cell=candidates[index++];
      stats.tested++;
      if(legal(cell)){finish(cell);return;}
      if(performance.now()-start>=4){
        stats.maxChunkMs=Math.max(stats.maxChunkMs,performance.now()-start);schedule(step);return;
      }
    }
    finish(null);
  }
  schedule(step);
  return {promise,stats,cancel(){cancelled=true;}};
}

const REASONS={
  NO_FRIENDLY_STRUCTURE_NEARBY:'Choose a tile within three tiles of another friendly structure.',
  STRUCTURE_TOO_CLOSE:'Choose a tile at least four tiles from every other structure.',
  ENEMY_TERRITORY_TOO_CLOSE:'Too close to enemy territory.',
  NOT_OWN_TERRITORY:'Choose a tile in your territory.',
  NO_ACTIVE_ISLAND:'The tile must belong to an active island.',
  SITE_OCCUPIED:'A structure or live ball occupies this tile.',
  DEFLECTOR_TOO_CLOSE:'Leave one clear tile between Diverters.',
  NO_DEFLECTOR:'That Diverter is no longer available.',
  NOT_OWNER:'This structure belongs to another player.',
  SAME_ORIENTATION:'Choose a different direction.',
  SAME_LOCATION:'Choose a different tile.',
  EXPLICIT_OWNED_SITE_REQUIRED:'Choose the owned tile where you want to build.',
  WOULD_STRAND_ISLAND:'The last cannon cannot leave a ball-bearing island.',
  PLAYER_DEFLECTOR_CAPACITY:'Your Diverter capacity is reached.',
  DEFLECTOR_CAPACITY:'The arena’s Diverter capacity is reached.',
  DEFLECTOR_ID_EXHAUSTED:'No further Diverter IDs are available.',
  PLAYER_CANNON_CAPACITY:'Your cannon capacity is reached.',
  CANNON_CAPACITY:'The arena’s cannon capacity is reached.',
  CANNON_ID_EXHAUSTED:'No further cannon IDs are available.',
  BALL_CAPACITY:'Ball capacity reached.'
};
export const contextReason=code=>REASONS[code];

export function siteOccupant(sites,cell){
  const kind=sites.occupant(cell);
  return kind?kind+' occupies this tile.':null;
}
