import {CONTEXT_POLICY} from '../../protocol/context-structures.generated.mjs';
import {decodeContextMemo} from '../../protocol/context-structures.mjs';
import {hasFriendlyStructure,structureMap,structureSiteReason} from '../../protocol/structure-sites.mjs';
import {prepareDeflectorPurchase} from './deflectors-v12.mjs';
import {playerForCannon} from './playability.mjs';
import {occupiedCells,playerByAccount} from './purchases-v6.mjs';
import {territoryBalls} from './territory-v6.mjs';
import {ownerAt,playerAt} from './world.mjs';

const reject = reason => ({kind:'rejected',reason});
const contextStructures=world=>structureMap(world,id=>playerForCannon(world,id));

export function friendlyStructureNearby(world,cell,owner,moving,structures=contextStructures(world)) {
  return hasFriendlyStructure(world.width,world.height,cell,owner,moving,structures);
}

export function contextSiteReason(world,owner,cell,{moving,deflector=false}={}) {
  return structureSiteReason({width:world.width,height:world.height,owner,cell,moving,deflector,
    occupied:occupiedCells(world),structures:contextStructures(world),
    ownerAt:c=>playerAt(world,c),active:c=>Boolean(territoryBalls(world,ownerAt(world,c)))});
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
