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
// Compatibility hash domain and preference key below retain stable colours/saved declarations.
export function accountColor(account){
 const b=/^[0-9a-f]{64}$/.test(account)?Uint8Array.from(account.match(/../g),s=>parseInt(s,16)):new TextEncoder().encode(account);
 const domain=new TextEncoder().encode('BTZ-player-colour-v1\0'),all=new Uint8Array(domain.length+b.length);all.set(domain);all.set(b,domain.length);const h=sha256(all);
 const hue=((h[0]<<8)|h[1])/65536*360,s=.62,l=.69,c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs(hue/60%2-1)),m=l-c/2;
 const rgb=hue<60?[c,x,0]:hue<120?[x,c,0]:hue<180?[0,c,x]:hue<240?[0,x,c]:hue<300?[x,0,c]:[c,0,x];return '#'+rgb.map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('');
}
export function identityStore(network,backend,storage){
 const key=`BTZ-identify-v1:${network}:${backend}`;
 return {read(){try{const raw=storage.getItem(key);if(!raw||raw.length>4096)return null;const d=JSON.parse(raw);if(d?.version!==1||!canonicalAccount(d.account))return null;if(d.principal&&accountIdentifier(d.principal,d.subaccount)!==d.account)return null;return {...d,display:d.principal?textualAccount(d.principal,(d.subaccount??'').toLowerCase()):d.account};}catch{return null;}},write(d){try{storage.setItem(key,JSON.stringify({version:1,...d}));return true;}catch{return false;}},forget(){try{storage.removeItem(key);}catch{}}};
}
const base32=bytes=>{let bits=0,value=0,out='';for(const byte of bytes){value=(value<<8)|byte;bits+=8;while(bits>=5){bits-=5;out+='abcdefghijklmnopqrstuvwxyz234567'[(value>>>bits)&31];}value&=(1<<bits)-1;}if(bits)out+='abcdefghijklmnopqrstuvwxyz234567'[(value<<(5-bits))&31];return out;};
export function textualAccount(principal,subaccount=''){
 const p=Principal.fromText(principal);if(p.toText()!==principal)throw Error('Use the canonical principal spelling');
 const sub=subaccount||'0'.repeat(64);if(!/^[0-9a-f]{64}$/.test(sub))throw Error('Subaccount must have 64 hex digits');
 if(/^0+$/.test(sub))return principal;
 const bytes=Uint8Array.from(sub.match(/../g),n=>parseInt(n,16)),all=new Uint8Array(p.toUint8Array().length+32);all.set(p.toUint8Array());all.set(bytes,all.length-32);
 const crc=new Uint8Array(4);new DataView(crc.buffer).setUint32(0,getCrc32(all));
 return `${principal}-${base32(crc)}.${sub.replace(/^0+/,'')}`;
}
export function parseSendingAccount(value,advanced=''){
 const input=value.trim();if(!input||input.length>220)throw Error('Enter your sending account');
 const sub=advanced.trim().toLowerCase();if(sub&&!/^[a-f0-9]{64}$/.test(sub))throw Error('Subaccount must have 64 hex digits');
 if(/^[a-fA-F0-9]{64}$/.test(input)){if(sub)throw Error('A legacy address already includes its subaccount');return {principal:null,subaccount:'',account:canonicalAccount(input),display:canonicalAccount(input)};}
 let principal=input,embedded='';
 if(input.includes('.')){const m=/^(.*)-([a-z2-7]{7})\.([1-9a-f][0-9a-f]{0,63})$/.exec(input);if(!m)throw Error('Use the canonical ICRC account');principal=m[1];embedded=m[3].padStart(64,'0');if(textualAccount(principal,embedded)!==input)throw Error('ICRC account checksum');if(sub&&sub!==embedded)throw Error('Subaccount conflicts with the ICRC account');}
 const selected=embedded||sub;return {principal,subaccount:selected,account:accountIdentifier(principal,selected),display:textualAccount(principal,selected)};
}
export function paymentDestination(source){
 if(!source||typeof source.owner!=='string')throw Error('Verified destination unavailable');
 const numeric=BigInt(source.subaccount);if(numeric<0n||numeric>18446744073709551615n)throw Error('Receiving subaccount bounds');
 const sub=numeric.toString(16).padStart(64,'0'),derived=accountIdentifier(source.owner,sub);
 if(derived!==canonicalAccount(source.recipient))throw Error('Receiving account does not match its owner/subaccount');
 return {primary:textualAccount(source.owner,sub),legacy:derived,owner:source.owner,subaccount:sub};
}
