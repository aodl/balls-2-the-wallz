import { be, concat, hex, readBE, uint, unhex } from '../../node_modules/@dtr/timeline-runtime/packages/protocol/bytes.mjs';
const MAGIC = Uint8Array.of(0x42, 0x54, 0x5a);
/** BTZ/1: 42 54 5a | version/opcode (11=angle,12=move) | u32 payload. */
export function encodeMemo(command) {
  if (!command || !['angle', 'move'].includes(command.kind)) throw new Error('unknown command');
  const value = uint(command.value, command.kind === 'angle' ? 16 : 32, 'payload');
  return concat(MAGIC, Uint8Array.of(command.kind === 'angle' ? 0x11 : 0x12), be(value, 4));
}
export function decodeMemo(blob) {
  if (!(blob instanceof Uint8Array) || blob.length !== 8) throw new Error('memo length');
  if (hex(blob.slice(0, 3)) !== '42545a') throw new Error('memo magic');
  if (blob[3] !== 0x11 && blob[3] !== 0x12) throw new Error('memo version/opcode');
  const value = readBE(blob.slice(4));
  if (blob[3] === 0x11 && value > 65535n) throw new Error('angle reserved bits');
  return { kind: blob[3] === 0x11 ? 'angle' : 'move', value: Number(value) };
}
export function numericMemo(command) { return readBE(encodeMemo(command)); }
/** Pinned ICP ICRC path writes legacy memo=0. Never fall back from a malformed blob. */
export function decodeLedgerMemo(legacy, icrcBlobHex = null) {
  const numeric = uint(legacy, 64, 'legacy memo');
  if (icrcBlobHex !== null) {
    if (numeric !== 0n) throw new Error('mixed memo fields');
    return decodeMemo(unhex(icrcBlobHex));
  }
  return decodeMemo(be(numeric, 8));
}
export function describeMemo(command) {
  const blob = encodeMemo(command); return { protocol: 'BTZ/1', ...decodeMemo(blob),
    blob_hex: hex(blob), legacy_nat64_decimal: readBE(blob).toString(),
    warning: 'Exact decimal string or BigInt only; never a JavaScript Number. No transaction is sent.' };
}
