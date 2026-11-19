import {CONTEXT_POLICY} from '../../protocol/context-structures.generated.mjs';
import {decodeContextMemo} from '../../protocol/context-structures.mjs';
import {hasEnemyClearance} from '../../protocol/territory-clearance.mjs';
import {deflectorAt,prepareDeflectorPurchase} from './deflectors-v12.mjs';
import {playerForCannon} from './playability.mjs';
import {occupiedCells,playerByAccount} from './purchases-v6.mjs';
import {territoryBalls} from './territory-v6.mjs';
import {ownerAt,playerAt,wrapCell} from './world.mjs';

const reject = reason => ({kind:'rejected',reason});
const radius = CONTEXT_POLICY.friendly_structure_max_chebyshev;
const excluded = (structure, moving) => moving?.kind === structure?.kind && moving?.id === structure?.id;

export function contextStructures(world) {
  return new Map([
    ...world.cannons.map(c => [c.cell,{kind:'cannon',id:c.id,owner:playerForCannon(world,c.id)}]),
    ...world.deflectors.map(d => [d.cell,{kind:'deflector',id:d.id,owner:d.owner}]),
  ]);
}

export function friendlyStructureNearby(world,cell,owner,moving,structures=contextStructures(world)) {
  const x=cell%world.width,y=Math.floor(cell/world.width);
  for(let dy=-radius;dy<=radius;dy++) for(let dx=-radius;dx<=radius;dx++) {
    const neighbour=wrapCell(x+dx,y+dy,world.width,world.height);
    const structure=structures.get(neighbour);
    if(neighbour!==cell&&structure?.owner===owner&&!excluded(structure,moving))return true;
  }
  return false;
}

export function contextSiteReason(world,owner,cell,{moving,deflector=false,occupied,structures}={}) {
  const island=ownerAt(world,cell);
  if(owner===undefined||playerAt(world,cell)!==owner)return 'NOT_OWN_TERRITORY';
  if(!territoryBalls(world,island))return 'NO_ACTIVE_ISLAND';
  if((occupied??occupiedCells(world)).has(cell))return 'SITE_OCCUPIED';
  if(deflector){
    const x=cell%world.width,y=Math.floor(cell/world.width);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const d=deflectorAt(world,wrapCell(x+dx,y+dy,world.width,world.height));
      if(d&&!(moving?.kind==='deflector'&&moving.id===d.id))return 'DEFLECTOR_TOO_CLOSE';
    }
  }
  if(!hasEnemyClearance(world.width,world.height,cell,owner,c=>playerAt(world,c)))return 'ENEMY_TERRITORY_TOO_CLOSE';
  if(!friendlyStructureNearby(world,cell,owner,moving,structures))return 'NO_FRIENDLY_STRUCTURE_NEARBY';
  return null;
}

export function prepareContextDeflector(world,account,amount,memo){
  if(![0xb7,0xb8,0xb9].includes(memo[0]))return null;
  let command;
  try{command=decodeContextMemo(memo);}catch{return reject('MALFORMED_MEMO');}
  if(command.kind==='deflect'){
    const plan=prepareDeflectorPurchase(world,account,amount,memo);
    if(plan.kind==='rejected')return plan;
    return friendlyStructureNearby(world,plan.cell,plan.owner)?plan:reject('NO_FRIENDLY_STRUCTURE_NEARBY');
  }
  const structure=world.deflectors.find(d=>d.id===command.id);
  if(!structure)return reject('NO_DEFLECTOR');
  const owner=playerByAccount(world,account);
  if(structure.owner!==owner)return reject('NOT_OWNER');
  if(playerAt(world,structure.cell)!==owner||!territoryBalls(world,ownerAt(world,structure.cell)))return reject('NO_ACTIVE_ISLAND');
  if(command.kind==='deflector_reorient'){
    const price=BigInt(CONTEXT_POLICY.deflector_reorient_e8s);
    if(amount<price)return reject('UNDERFUNDED');
    if(command.orientation===structure.orientation)return reject('SAME_ORIENTATION');
    return {...command,price};
  }
  const price=BigInt(CONTEXT_POLICY.deflector_move_e8s);
  if(amount<price)return reject('UNDERFUNDED');
  if(command.cell===structure.cell)return reject('SAME_LOCATION');
  const reason=contextSiteReason(world,owner,command.cell,{moving:{kind:'deflector',id:command.id},deflector:true});
  return reason?reject(reason):{...command,price};
}
