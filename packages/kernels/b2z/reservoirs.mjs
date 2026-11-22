import {hasEnemyClearance} from '../../protocol/territory-clearance.mjs';
import {reservoirHas, RESERVOIR_PRICE_E8S} from '../../protocol/reservoir.mjs';
import {occupiedCells, playerByAccount} from './purchases-v6.mjs';
import {territoryBalls} from './territory-v6.mjs';
import {ownerAt, playerAt, validateWorld} from './world.mjs';

const reject = reason => ({kind: 'rejected', reason});

export function migrateReservoirs(previous) {
  if (previous.version !== 7) throw Error('RESERVOIR_PREDECESSOR');
  validateWorld(previous);
  return validateWorld({...structuredClone(previous), version: 8, reservoirs: ''});
}

export function prepareReservoir(world, account, amount, cell) {
  if (world.version !== 8) throw Error('RESERVOIR_SCHEMA');
  if (amount < RESERVOIR_PRICE_E8S) return reject('UNDERFUNDED');
  const player = playerByAccount(world, account);
  const territory = ownerAt(world, cell);
  if (player === undefined || territory === undefined || playerAt(world, cell) !== player) return reject('NOT_OWN_TERRITORY');
  if (!territoryBalls(world, territory)) return reject('NO_ACTIVE_ISLAND');
  if (reservoirHas(world.reservoirs, cell) || occupiedCells(world).has(cell)) return reject('SITE_OCCUPIED');
  if (!hasEnemyClearance(world.width, world.height, cell, player, c => playerAt(world, c))) return reject('ENEMY_TERRITORY_TOO_CLOSE');
  return {kind: 'reservoir', cell, price: RESERVOIR_PRICE_E8S};
}
