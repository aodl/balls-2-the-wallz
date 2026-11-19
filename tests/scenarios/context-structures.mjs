import {ACCOUNT,enemyWorld,successorWorld} from './boundary-deflector.mjs';
import {setOwner,validateWorld} from '../../packages/kernels/b2z/world.mjs';

export {ACCOUNT};
export function contextualWorld(){
 const world=enemyWorld(4013);
 setOwner(world,5004,0);
 return validateWorld(world);
}
export function orderedWorld(orientation='NW'){
 const world=successorWorld(0,4006);
 world.deflectors=[{id:1,owner:1,cell:4007,orientation}];world.next_deflector_id=2;
 return validateWorld(world);
}
export const commercialCases=[
 ['MOVE 1 4005',10000,'NO_FRIENDLY_STRUCTURE_NEARBY'],
 ['NEW 0 1',400000000,'EXPLICIT_OWNED_SITE_REQUIRED'],
 ['NEW 0 1 5004',400000000,'NOT_OWN_TERRITORY'],
 ['NEW 0 1 300300',400000000,'NO_FRIENDLY_STRUCTURE_NEARBY'],
 ['DEFLECT 4007 N',10000000,'ACCEPTED'],
 ['DMOVE 1 4008',10000,'NO_FRIENDLY_STRUCTURE_NEARBY'],
 ['DROT 1 N',10000,'SAME_ORIENTATION'],
 ['DROT 1 E',10000,'ACCEPTED'],
 ['DMOVE 1 4006',10000,'ACCEPTED'],
 ['MOVE 1 4009',10000,'ACCEPTED'],
 ['MOVE 1 4008',10000,'MOVE_LIMIT'],
 ['NEW 0 1 5007|Ready',400000000,'ACCEPTED'],
 ['DEFLECT 4010 W',10000000,'ENEMY_TERRITORY_TOO_CLOSE'],
 ['DROT 9001 N',10000,'NO_DEFLECTOR']
];
