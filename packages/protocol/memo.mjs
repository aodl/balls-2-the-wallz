import { be, concat, hex, readBE, uint, unhex } from '../../node_modules/@dtr/timeline-runtime/packages/protocol/bytes.mjs';
const LEGACY_BINARY_MAGIC = Uint8Array.of(0x42, 0x54, 0x5a);
/** BTZ/1: 42 54 5a | version/opcode (11=angle,12=move) | u32 payload. */
export function encodeMemo(command) {
  if (!command || !['angle', 'move'].includes(command.kind)) throw new Error('unknown command');
  const value = uint(command.value, command.kind === 'angle' ? 16 : 32, 'payload');
  return concat(LEGACY_BINARY_MAGIC, Uint8Array.of(command.kind === 'angle' ? 0x11 : 0x12), be(value, 4));
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
/** Blob-first adapter v3. A present malformed/empty blob never falls back. */
export function decodeLedgerMemo(legacy, icrcBlobHex = null) {
  if (icrcBlobHex !== null) return decodeMemoBlob(unhex(icrcBlobHex));
  return decodeMemo(be(uint(legacy, 64, 'legacy memo'), 8));
}
export function describeMemo(command) {
  const blob = encodeMemo(command); return { protocol: 'BTZ/1', ...decodeMemo(blob),
    blob_hex: hex(blob), legacy_nat64_decimal: readBE(blob).toString(),
    warning: 'Exact decimal string or BigInt only; never a JavaScript Number. No transaction is sent.' };
}

/** B2Z text adapter v3. Only ASCII SPACE may surround a command; interior separators are one SPACE. */
export const MEMO_ADAPTER_VERSION = 3;
export function parseTextMemo(bytes) { return parseText(bytes, true); }
function parseText(bytes, prefixFree) {
  if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > 32) throw new Error('memo length');
  if (bytes.some(b => b < 32 || b > 126)) throw new Error('memo ASCII');
  const text = String.fromCharCode(...bytes).replace(/^ +| +$/g, '');
  // BTZ is accepted only as the published S15 compatibility prefix.
  const body = /^BTZ /i.test(text) ? text.slice(4) : prefixFree ? text : '';
  const match = /^(ANGLE|MOVE) ([0-9]+(?:\.[0-9]{1,2})?)$/i.exec(body);
  if (!match) throw new Error('memo grammar');
  const [, op, number] = match, [whole, fraction = ''] = number.split('.');
  if (op.toUpperCase() === 'MOVE') {
    if (fraction || number.includes('.') || BigInt(whole) > 4294967295n) throw new Error('move bounds');
    return {kind:'move',value:Number(BigInt(whole))};
  }
  const centidegrees = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (centidegrees > 35999n) throw new Error('angle bounds');
  return {kind:'angle',value:Number((centidegrees * 65536n + 18000n) / 36000n % 65536n)};
}
export function decodeMemoBlob(bytes) {
  if (bytes instanceof Uint8Array && bytes.length === 8 && LEGACY_BINARY_MAGIC.every((b, i) => bytes[i] === b)) return decodeMemo(bytes);
  return parseTextMemo(bytes);
}
/** Canonical player text; ANGLE value is decimal degrees, never a wire heading. */
export function describeTextMemo(kind, value) {
  kind = String(kind).toLowerCase();
  if (!['angle', 'move'].includes(kind)) throw new Error('unknown command');
  const bytes = new TextEncoder().encode(`${String(kind).toUpperCase()} ${value}`), command = parseTextMemo(bytes);
  const text = kind === 'move' ? `MOVE ${command.value}` : (() => {
    const [whole, fraction = ''] = String(value).split('.');
    const tail = fraction.replace(/0+$/, '');
    return `ANGLE ${BigInt(whole)}${tail ? '.' + tail : ''}`;
  })();
  return {protocol:'B2Z text/3',text,blob_hex:hex(new TextEncoder().encode(text)),command,normalized_hex:hex(encodeMemo(command))};
}
/** Historical adapter v1 for raw-history replay only. Canonical input replay needs no normalizer. */
export function decodeLedgerMemoV1(legacy, icrcBlobHex = null) {
  const numeric = uint(legacy, 64, 'legacy memo');
  if (icrcBlobHex !== null && numeric !== 0n) throw new Error('mixed memo fields');
  return decodeMemo(icrcBlobHex === null ? be(numeric, 8) : unhex(icrcBlobHex));
}

/** S15 adapter v2 for raw replay, including its original binary classifier. */
export function decodeLedgerMemoV2(legacy, icrcBlobHex = null) {
  if (icrcBlobHex === null) return decodeMemo(be(uint(legacy, 64, 'legacy memo'), 8));
  const bytes = unhex(icrcBlobHex);
  return bytes.length === 8 && bytes[3] !== 32 ? decodeMemo(bytes) : parseText(bytes, false);
}
