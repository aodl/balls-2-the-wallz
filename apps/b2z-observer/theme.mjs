/** Presentation only. Canonical account palette is never modified. */
export const GRAPHITE=Object.freeze({paper:'#20282b',control:'#293237',edge:'#85969b',ink:'#f1f5f4',neutral:'#c3d1d5',information:'#a6d8ef'});
const luminance=hex=>{const v=hex.slice(1).match(/../g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722;};
export const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
const accents=new Map();
function adjustedAccent(hex){
 if(!/^#[0-9a-f]{6}$/i.test(hex??''))return GRAPHITE.neutral;
 const channels=hex.slice(1).match(/../g).map(n=>parseInt(n,16));
 for(let i=0;i<=20;i++){const ink='#'+channels.map(n=>Math.round(n+(255-n)*i/20).toString(16).padStart(2,'0')).join('');if(contrast(ink,GRAPHITE.paper)>=4.5)return ink;}
 return '#ffffff';
}
/** Bounded palette cache; no per-frame contrast search or unbounded account map. */
export function luminousAccent(hex){
 if(!/^#[0-9a-f]{6}$/i.test(hex??''))return GRAPHITE.neutral;
 if(accents.has(hex))return accents.get(hex);
 const ink=adjustedAccent(hex);if(accents.size>=1024)accents.delete(accents.keys().next().value);accents.set(hex,ink);return ink;
}
export const themeCacheSize=()=>accents.size;
export function paneAccent(doc,account,canonicalColor){const ink=luminousAccent(account?canonicalColor:GRAPHITE.neutral);if(doc.documentElement.style.getPropertyValue('--player-accent')!==ink){doc.documentElement.style.setProperty('--player-accent',ink);doc.dispatchEvent(new CustomEvent('b2z-theme',{detail:{accent:ink}}));}return ink;}
