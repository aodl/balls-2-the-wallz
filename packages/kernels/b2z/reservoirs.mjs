import {hasEnemyClearance} from '../../protocol/territory-clearance.mjs';
import {reservoirHas, RESERVOIR_PRICE_E8S} from '../../protocol/reservoir.mjs';
import {occupiedCells, playerByAccount} from './purchases-v6.mjs';
import {territoryBalls} from './territory-v6.mjs';
import {ownerAt, playerAt, validateWorld} from './world.mjs';

const reject = reason => ({kind: 'rejected', reason});

export function validateReservoirs(world) {
  if (world.version !== 8) {
    if (world.reservoirs !== undefined) throw Error('RESERVOIR_SCHEMA');
    return;
  }
  const bits = world.reservoirs, count = world.width * world.height;
  if (typeof bits !== 'string' || bits.length > Math.ceil(count / 4) || !/^[0-9a-f]*$/.test(bits) || bits.endsWith('0'))
    throw Error('RESERVOIR_SCHEMA');
  const used = count % 4;
  if ((used && bits.length === Math.ceil(count / 4) && parseInt(bits.at(-1), 16) >= 1 << used) ||
      world.cannons.some(s => reservoirHas(bits, s.cell)) || world.deflectors.some(s => reservoirHas(bits, s.cell)))
    throw Error('RESERVOIR_OCCUPANCY');
}

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
