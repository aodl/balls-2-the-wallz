import { hex, unhex } from '../../node_modules/@dtr/timeline-runtime/packages/protocol/bytes.mjs';
/** CRC is error detection, NOT identity authentication. Inputs must still come from the ledger. */
export function crc32(data) {
  let crc = 0xffffffff;
  for (const b of data) { crc ^= b; for (let i=0; i<8; ++i) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
export function canonicalAccount(text) {
  if (typeof text !== 'string' || !/^[0-9a-fA-F]{64}$/.test(text)) throw new Error('account must be 32-byte hex');
  const value = unhex(text.toLowerCase(), 32); const checksum = crc32(value.slice(4));
  const actual = (((value[0] << 24) >>> 0) + (value[1] << 16) + (value[2] << 8) + value[3]) >>> 0;
  if (actual !== checksum) throw new Error('account checksum'); return hex(value);
}
