/** Actual optional component/composer, simulated auth/transport. No certificate,
 * Internet Identity ceremony, real Ledger or wallet compatibility claim. */
import'./playability-action-browser.mjs';
import{mountPayments}from'../../apps/b2z-observer/delegated-payments/ui.mjs';
import{decodeCanonical}from'@dtr/timeline-runtime/runtime/canonical';
import{Principal}from'@icp-sdk/core/principal';
import{DELEGATION_IDENTITY}from'../../apps/b2z-observer/torus-identity.generated.mjs';
const DELEGATION_CONFIG=decodeCanonical(new Uint8Array(await(await fetch('configuration-delegation.bin')).arrayBuffer()));
import{authorizePayment}from'../../packages/kernels/b2z/delegation-v8.mjs';
import{encodeAuthorization,icpAccount}from'../../packages/protocol/delegation.mjs';
const data=await(await fetch('authorization-fixture.json')).json(),bytes=s=>Uint8Array.from(s.match(/../g),h=>parseInt(h,16));
const world=decodeCanonical(bytes(data.initial_hex)),funding=Principal.selfAuthenticating(Uint8Array.of(1)).toText(),spender=Principal.selfAuthenticating(Uint8Array.of(2)).toText(),backend='s5ir5-gqaaa-aaaas-amyna-cai';
const source={network:'pocketic-local',owner:backend,subaccount:0n,recipient:icpAccount(backend),ledger:'ryjl3-tyaaa-aaaaa-aaaba-cai'};
authorizePayment(world.playability.authorization,{position:1n,ledger_time_ns:BigInt(Date.now())*1000000n,from:icpAccount(funding),to:source.recipient,spender:null,memo:encodeAuthorization({kind:'grant',spender})},1n);
const session={ready:true,error:null,root:'ab'.repeat(32),sequence:{last:{publication:{identity:DELEGATION_IDENTITY}}},referenceWorld:world,source,config:DELEGATION_CONFIG,receipts:new Map()};
const arcade=fixture.paymentTestArcade;let status={signedIn:false,spender:null},sends=0,reads=0,fee=12345n,mode='ok',resolveSend,component;
function authFactory({onChange}){return{status:()=>status,async signIn(){status={signedIn:true,spender};onChange(status);return{identity:{},spender};},async identity(){return{identity:{},spender};},async signOut(){status={signedIn:false,spender:null};onChange(status);},stop(){}};}
function ledgerFactory(){return{async read(){reads++;return{fee,allowance:1000000000n,expires_at:BigInt(Date.now()+3600000)*1000000n};},async send(intent){sends++;if(mode==='unknown')throw Error('simulated lost response');if(mode==='pending')return new Promise(r=>resolveSend=r);return{Ok:42n};},cancel(){}};}
function refresh(){session.certifiedAt=performance.now();session.certificateTimeNs=String(BigInt(Date.now())*1000000n);arcade.render(world,DELEGATION_CONFIG,source,session.root);arcade.status({phase:'PLAYING',live:true,verified:true,fresh:true,healthy:true,operationalFresh:true,world,operational:{run:{running:true,idle:false,pace:{mode:'Normal',nominal_milli:1000,supported_milli:1000,admission_open:true}},source:{binding_checked:true}}});component?.update();}
function mount(){component=mountPayments(document,{enabled:true,localTest:true,session:()=>session,arcade,policy:()=>({network:'pocketic-local',host:location.origin,canister_id:backend,ledger:source.ledger}),authFactory,ledgerFactory});}
refresh();mount();setInterval(refresh,1000);
globalThis.paymentFixture={funding,spender,world,session,refresh,stats:()=>({sends,reads,status}),fee:n=>fee=BigInt(n),mode:m=>mode=m,resolve:()=>resolveSend?.({Ok:42n}),remount(){component.stop();mount();refresh();},packet:()=>arcade.paymentInstructions(),select(){arcade.selectCannon(1);arcade.action('ball');refresh();},block(){session.error=Error('verification unavailable');component.update();},unblock(){session.error=null;refresh();},receipt(){const packet=arcade.paymentInstructions(),r={position:42n,account:packet.account,spender:icpAccount(spender),amount:BigInt(packet.amount),reason:'ACCEPTED',status:'applied',transfer:{to:source.recipient,fee,memo:packet.hex,created_at_ns:0n}};const rows=JSON.parse(localStorage.getItem('B2Z-ICRC2-intents-v1'));r.transfer.created_at_ns=BigInt(rows[0].created_at_time);session.receipts.set('42',r);session.root='cd'.repeat(32);refresh();},stop(){component.stop();}};
