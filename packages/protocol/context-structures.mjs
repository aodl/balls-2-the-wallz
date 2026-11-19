/** Rules13 adapter8. Stored diagonal indices retain their Rules12 meaning. */
import {be,uint} from '../../node_modules/@dtr/timeline-runtime/packages/protocol/bytes.mjs';
import {decodeDeflectorMemo,encodeDeflectorMemo,encodeDeflectorPayment,readDeflectorPayment,ORIENTATIONS} from './deflector.mjs';
import {parseWarCryMemo} from './war-cry.mjs';
import {CONTEXT_POLICY} from './context-structures.generated.mjs';

export const SCREEN_ORIENTATIONS = CONTEXT_POLICY.deflector_screen_directions;
export const screenDirection = orientation => Object.keys(SCREEN_ORIENTATIONS).find(key => SCREEN_ORIENTATIONS[key] === orientation);
const isOperation = opcode => opcode === 0xb8 || opcode === 0xb9;
const isExistingBinary = opcode => [0xc6,0xd6,0xf6,0x42].includes(opcode);
const validId = id => Number.isInteger(id) && id > 0 && id <= 0xffffffff;
const validCell = cell => Number.isInteger(cell) && cell >= 0 && cell < 1000000;

export function encodeContextMemo(command) {
  const {kind,id,cell,orientation} = command;
  if (kind !== 'deflector_reorient' && kind !== 'deflector_move') return encodeDeflectorMemo(command);
  if (!validId(id)) throw Error('invalid Deflector ID');
  const bytes = new Uint8Array(8);
  const view = new DataView(bytes.buffer);
  view.setUint32(1,id);
  if (kind === 'deflector_reorient') {
    const code = ORIENTATIONS.indexOf(orientation);
    if (code < 0) throw Error('invalid Deflector direction');
    bytes[0] = 0xb8;
    bytes[5] = code;
  } else {
    if (!validCell(cell)) throw Error('invalid Deflector destination');
    bytes[0] = 0xb9;
    bytes[5] = cell >>> 16;
    view.setUint16(6,cell & 65535);
  }
  return bytes;
}

export function decodeContextMemo(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length !== 8) throw Error('memo length');
  if (!isOperation(bytes[0])) return decodeDeflectorMemo(bytes);
  const id = new DataView(bytes.buffer,bytes.byteOffset,8).getUint32(1);
  const cell = bytes[5]*65536 + bytes[6]*256 + bytes[7];
  if (!validId(id)) throw Error('invalid Deflector ID');
  if (bytes[0] === 0xb9 && validCell(cell)) return {kind:'deflector_move',id,cell};
  if (bytes[0] === 0xb8 && bytes[5] < 4 && bytes[6] === 0 && bytes[7] === 0) {
    return {kind:'deflector_reorient',id,orientation:ORIENTATIONS[bytes[5]]};
  }
  throw Error('Deflector command reserved bits or range');
}

export function parseContextText(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 1 || bytes.length > 32) throw Error('memo length');
  if (bytes[0] !== 68 && bytes[0] !== 100) return parseWarCryMemo(bytes);
  const text = String.fromCharCode(...bytes);
  const build = /^DEFLECT (0|[1-9][0-9]{0,5}) ([NESW])$/.exec(text);
  const rotate = /^DROT ([1-9][0-9]{0,9}) ([NESW])$/.exec(text);
  const move = /^DMOVE ([1-9][0-9]{0,9}) (0|[1-9][0-9]{0,5})$/.exec(text);
  const command = build ? {kind:'deflect',cell:Number(build[1]),orientation:SCREEN_ORIENTATIONS[build[2]]}
    : rotate ? {kind:'deflector_reorient',id:Number(rotate[1]),orientation:SCREEN_ORIENTATIONS[rotate[2]]}
    : move ? {kind:'deflector_move',id:Number(move[1]),cell:Number(move[2])} : null;
  // JavaScript regexp `$` may match before a final newline.
  if (!command || bytes.some(byte => byte < 32 || byte > 126)) throw Error('canonical Rules13 structure memo');
  encodeContextMemo(command);
  return {command,cry:''};
}

export function decodeContextLedgerMemo(legacy,blob=null) {
  if (blob === null) {
    const bytes = be(uint(legacy,64,'legacy memo'),8);
    if (bytes[0] === 0xb7 || isOperation(bytes[0])) throw Error('structure commands require text');
    return {command:decodeContextMemo(bytes),cry:''};
  }
  if (blob.length === 8 && isExistingBinary(blob[0])) return {command:decodeContextMemo(blob),cry:''};
  return parseContextText(blob);
}

export function encodeContextPayment(account,amount,command,cry='') {
  const memo = encodeContextMemo(command);
  const operation = isOperation(memo[0]);
  if (operation && cry) throw Error('Deflector operations cannot carry War Cry');
  const bytes = encodeDeflectorPayment(account,amount,operation ? {kind:'angle',value:0} : command,cry);
  bytes[7] = 53;
  bytes.set(memo,48);
  return bytes;
}

export function readContextPayment(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 57 || bytes.length > 88 ||
      String.fromCharCode(...bytes.subarray(0,8)) !== 'BTZPAY05') throw Error('Rules13 payment envelope');
  const predecessor = bytes.slice();
  predecessor[7] = 52;
  if (isOperation(bytes[48])) {
    if (bytes.length !== 57 || bytes[56] !== 0) throw Error('Deflector operation annotation');
    predecessor.set(encodeDeflectorMemo({kind:'angle',value:0}),48);
  }
  return {...readDeflectorPayment(predecessor),memo:bytes.slice(48,56)};
}

export function semanticContextPayment(bytes) {
  readContextPayment(bytes);
  const projected = bytes.slice(0,56);
  projected[7] = 50;
  return projected;
}
