/** Preferences only, never authority. Standard ICP SHA-224 + CRC32 account derivation. */
import {Principal,getCrc32} from '@icp-sdk/core/principal';
import {sha224,sha256} from '@noble/hashes/sha2.js';
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
export function accountIdentifier(principal,subaccount=''){
 const p=Principal.fromText(principal);if(p.toText()!==principal)throw Error('Use the canonical principal spelling');
 if(subaccount&&!/^[0-9a-fA-F]{64}$/.test(subaccount))throw Error('Subaccount must have 64 hex digits');
 const sub=subaccount?Uint8Array.from(subaccount.match(/../g),s=>parseInt(s,16)):new Uint8Array(32);
 const domain=new TextEncoder().encode('\x0Aaccount-id'),b=new Uint8Array(domain.length+p.toUint8Array().length+32);b.set(domain);b.set(p.toUint8Array(),domain.length);b.set(sub,b.length-32);
 const h=sha224(b),out=new Uint8Array(32);new DataView(out.buffer).setUint32(0,getCrc32(h));out.set(h,4);return hex(out);
}
export function canonicalAccount(value){
 if(!/^[0-9a-fA-F]{64}$/.test(value))throw Error('AccountIdentifier must have 64 hex digits');
 const b=Uint8Array.from(value.match(/../g),s=>parseInt(s,16));if(new DataView(b.buffer).getUint32(0)!==getCrc32(b.slice(4)))throw Error('AccountIdentifier checksum');return value.toLowerCase();
}
export function accountColor(account){
 const b=/^[0-9a-f]{64}$/.test(account)?Uint8Array.from(account.match(/../g),s=>parseInt(s,16)):new TextEncoder().encode(account);
 const domain=new TextEncoder().encode('BTZ-player-colour-v1\0'),all=new Uint8Array(domain.length+b.length);all.set(domain);all.set(b,domain.length);const h=sha256(all);
 const hue=((h[0]<<8)|h[1])/65536*360,s=.62,l=.69,c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs(hue/60%2-1)),m=l-c/2;
 const rgb=hue<60?[c,x,0]:hue<120?[x,c,0]:hue<180?[0,c,x]:hue<240?[0,x,c]:hue<300?[x,0,c]:[c,0,x];return '#'+rgb.map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('');
}
export function identityStore(network,backend,storage){
 const key=`BTZ-identify-v1:${network}:${backend}`;
 return {read(){try{const d=JSON.parse(storage.getItem(key));return d?.version===1&&canonicalAccount(d.account)?d:null;}catch{return null;}},write(d){try{storage.setItem(key,JSON.stringify({version:1,...d}));return true;}catch{return false;}},forget(){try{storage.removeItem(key);}catch{}}};
}
