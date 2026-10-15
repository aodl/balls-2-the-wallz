// Trusted build-time deployment policy. null selects the existing offline/local harness.
// tools/build_observer_mainnet.mjs embeds the intended mainnet canister at build time.
export default null;
// The production implementation always applies the mainnet policy. The local
// deployment acceptance build replaces this MODULE explicitly, not URL policy.
export async function deploymentPolicy(value){return (await import('./mainnet.mjs')).mainnetPolicy(value);}
export async function deploymentConnection(value){return (await import('./mainnet.mjs')).mainnetConnection(value);}
export async function deploymentSource(value,ticket){return (await import('./mainnet.mjs')).certifiedSource(value,ticket);}
