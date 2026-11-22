// Adapter10 text/normalised memo. Earlier adapters do not know this opcode.
import {decodeShoutLedgerMemo, encodeShoutPayment, readShoutPayment} from './shout.mjs';

export const RESERVOIR_ADAPTER = 10;
export const RESERVOIR_PRICE_E8S = 1_000_000n;
export const RESERVOIR_OPCODE = 0xba;
const PREFIX = 'BTZPAY07';
const decoder = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true});

export function reservoirDirective(cell) {
  if (!Number.isInteger(cell) || cell < 0 || cell >= 1_000_000) throw Error('RESERVOIR_CELL');
  return 'RESERVOIR ' + cell;
}

export function decodeReservoirLedgerMemo(legacy, blob = null) {
  if (blob instanceof Uint8Array && blob[0] === 82) {
    const text = decoder.decode(blob);
    const match = /^RESERVOIR (0|[1-9][0-9]{0,5})$/.exec(text);
    if (match && match[0].length === text.length) return {command: {kind: 'reservoir', cell: Number(match[1])}, cry: ''};
  }
  return decodeShoutLedgerMemo(legacy, blob);
}

export function encodeReservoirMemo(cell) {
  reservoirDirective(cell);
  const memo=new Uint8Array(8);
  memo[0]=RESERVOIR_OPCODE;
  new DataView(memo.buffer).setUint32(1, cell);
  return memo;
}

export function encodeReservoirPayment(account, amount, command, cry = '') {
  const reservoir = command.kind === 'reservoir';
  if (reservoir && cry) throw Error('RESERVOIR_MEMO');
  const bytes = encodeShoutPayment(account, amount, reservoir ? {kind: 'angle', value: 0} : command, cry);
  bytes[7] = 55;
  if (reservoir) bytes.set(encodeReservoirMemo(command.cell),48);
  return bytes;
}

export function reservoirCell(memo) {
  if (memo[0] !== RESERVOIR_OPCODE) return null;
  if (memo.length !== 8 || memo[5] || memo[6] || memo[7]) throw Error('RESERVOIR_MEMO');
  const cell = new DataView(memo.buffer, memo.byteOffset, 8).getUint32(1);
  reservoirDirective(cell);
  return cell;
}

export function readReservoirPayment(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 57 || bytes.length > 88 ||
      String.fromCharCode(...bytes.subarray(0,8)) !== PREFIX) throw Error('adapter10 payment envelope');
  const previous = bytes.slice();
  previous[7] = 54;
  const payment = readShoutPayment(previous);
  if (payment.memo[0] === RESERVOIR_OPCODE) {
    if (payment.cry) throw Error('RESERVOIR_MEMO');
    reservoirCell(payment.memo);
  }
  return payment;
}

export function semanticReservoirPayment(bytes) {
  readReservoirPayment(bytes);
  const result = bytes.slice(0,56);
  result[7] = 50;
  return result;
}

// One digit per four cells, low bit first. Trailing empty digits are omitted.
export function reservoirHas(occupancy, cell) {
  return occupancy !== undefined && Boolean(parseInt(occupancy[Math.floor(cell / 4)], 16) & (1 << (cell % 4)));
}

export function reservoirPut(occupancy, cell) {
  const at = Math.floor(cell / 4);
  const value = (parseInt(occupancy[at], 16) | (1 << (cell % 4))).toString(16);
  return occupancy.slice(0, at).padEnd(at, '0') + value + occupancy.slice(at + 1);
}

export function* reservoirSites(occupancy) {
  for (let at = 0; at < occupancy.length; at++) {
    const bits = parseInt(occupancy[at], 16);
    for (let bit = 0; bit < 4; bit++) if (bits & (1 << bit)) yield at * 4 + bit;
  }
}

export function validateReservoirs(world) {
  if (world.version < 8) {
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
