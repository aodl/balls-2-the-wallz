import test from'node:test';import assert from'node:assert/strict';import{Ed25519KeyIdentity}from'@icp-sdk/core/identity';import{paymentSession,DERIVATION_ORIGIN}from'../../apps/b2z-observer/delegated-payments/auth.mjs';
import {registerHooks} from 'node:module';
function fixture(){const identity=Ed25519KeyIdentity.generate();let principal=null,listener,options,finish,disposed=false;const client={isAuthenticated:()=>principal!==null,getPrincipal:()=>principal,subscribe(fn){listener=fn;return()=>listener=null;},signIn(o){options=o;return new Promise(r=>{finish=()=>{principal=identity.getPrincipal();listener?.();r(identity);};});},async getIdentity(){return identity;},async signOut(){principal=null;listener?.();},dispose(){disposed=true;}};const changes=[],session=paymentSession({client,onChange:s=>changes.push(s)});return{identity,session,changes,client,get options(){return options;},finish:()=>finish(),disposed:()=>disposed};}
test('optional sign-in returns actual S and bounded supported SDK TTL/idle options',async()=>{const f=fixture(),pending=f.session.signIn();f.finish();const signed=await pending;assert.equal(signed.spender,f.identity.getPrincipal().toText());assert.equal(f.options.maxTimeToLive,3600000000000n);assert.equal(f.options.maxTimeToIdle,900000000000n);assert.equal(f.session.status().signedIn,true);assert.equal(DERIVATION_ORIGIN,'https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io');await f.session.signOut();assert.deepEqual(f.session.status(),{signedIn:false,spender:null});});
test('late popup success after sign-out never restores a signing session',async()=>{const f=fixture(),pending=f.session.signIn();await f.session.signOut();f.finish();await assert.rejects(()=>pending,/STALE_SIGN_IN/);assert.equal(f.session.status().signedIn,false);assert.equal(f.changes.at(-1).signedIn,false);});
test('stop fences late replies and disposes SDK without touching payment history',async()=>{const f=fixture(),pending=f.session.signIn(),count=f.changes.length;f.session.stop();f.finish();await assert.rejects(()=>pending,/STALE_SIGN_IN/);assert.equal(f.disposed(),true);assert.equal(f.changes.length,count);await assert.rejects(()=>f.session.identity(),/UNAVAILABLE/);});

test('AuthClient receives the permanent frontend origin even with a custom location and overrides', async () => {
 const module = new URL('../../apps/b2z-observer/delegated-payments/auth.mjs?origin-probe', import.meta.url);
 const sdk = 'data:text/javascript,' + encodeURIComponent(`
  export class AuthClient {
   constructor(options) { throw Object.assign(new Error('SDK constructor probe'), {options}); }
  }
  export class MemoryCredentialStorage {}
  export class MemoryStateStorage {}
 `);
 const hook = registerHooks({resolve(specifier, context, nextResolve) {
  if (specifier === '@icp-sdk/auth/client' && context.parentURL === module.href) {
   return {url:sdk, shortCircuit:true};
  }
  return nextResolve(specifier, context);
 }});
 const priorLocation = Object.getOwnPropertyDescriptor(globalThis, 'location');
 try {
  const production = await import(module.href);
  const customOrigin = 'https://b2z.example';
  Object.defineProperty(globalThis, 'location', {configurable:true, value:new URL(customOrigin)});
  assert.throws(() => production.paymentSession({
   derivationOrigin:customOrigin, config:{derivationOrigin:customOrigin},
  }), error => {
   assert.equal(error.message, 'SDK constructor probe');
   assert.equal(error.options.derivationOrigin, 'https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io');
   return true;
  });
 } finally {
  if (priorLocation) Object.defineProperty(globalThis, 'location', priorLocation);
  else delete globalThis.location;
  hook.deregister();
 }
});
