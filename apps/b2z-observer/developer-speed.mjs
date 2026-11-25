/** TEMPORARY DEVELOPMENT ONLY — REMOVE BEFORE PUBLIC LAUNCH */
import {Actor, HttpAgent, strategy} from '@icp-sdk/core/agent';
import {AuthClient, MemoryCredentialStorage, MemoryStateStorage} from '@icp-sdk/auth/client';
import {DERIVATION_ORIGIN} from './delegated-payments/auth.mjs';

const backend = 's5ir5-gqaaa-aaaas-amyna-cai';
const agentOptions = {
  host: 'https://icp-api.io', shouldFetchRootKey: false, shouldSyncTime: false, verifyQuerySignatures: true,
};

const speedInterface = ({IDL}) => {
  const status = IDL.Record({
    mode: IDL.Text, adaptive_tier: IDL.Text, remaining_seconds: IDL.Nat16, default_seconds: IDL.Nat16,
    running: IDL.Bool, can_start: IDL.Bool, idle: IDL.Bool, admission_open: IDL.Bool, liquid_cycles: IDL.Nat, recovery_reserve: IDL.Nat,
    effective_milli: IDL.Opt(IDL.Nat32),
  });
  const result = IDL.Variant({Ok: status, Err: IDL.Text});
  return IDL.Service({
    dev_simulation_speed: IDL.Func([], [result], ['query']),
    set_dev_simulation_speed: IDL.Func([IDL.Bool, IDL.Opt(IDL.Nat16)], [result], []),
  });
};

function createConnection() {
  const auth = new AuthClient({
    derivationOrigin: DERIVATION_ORIGIN, namespace: 'b2z-dev-speed',
    credentialStorage: new MemoryCredentialStorage(), stateStorage: new MemoryStateStorage(),
    // Internet Identity mints the app delegation before the backend actor exists.
    agentOptions,
  });
  let actor, signer;
  async function service() {
    const identity = await auth.getIdentity();
    if (!auth.isAuthenticated() || identity.getPrincipal().isAnonymous() ||
        identity.getPrincipal().toText() !== auth.getPrincipal()?.toText()) throw Error('Owner sign-in required.');
    if (signer !== identity) {
      signer = identity;
      const agent = HttpAgent.createSync({
        ...agentOptions, identity, retryTimes: 0,
        fetch: (url, init) => fetch(url, {...init, signal: AbortSignal.any([
          ...(init?.signal ? [init.signal] : []), AbortSignal.timeout(12_000),
        ])}),
      });
      actor = Actor.createActor(speedInterface, {
        agent, canisterId: backend, pollingOptions: {strategy: strategy.chain(strategy.timeout(18_000), strategy.backoff(200, 1.4))},
      });
    }
    return actor;
  }
  function checked(result) {
    if ('Err' in result) throw Error(result.Err);
    return result.Ok;
  }
  return {
    signIn: () => auth.signIn({maxTimeToLive: 900_000_000_000n, maxTimeToIdle: 300_000_000_000n}),
    async signOut() { await auth.signOut(); actor = undefined; signer = undefined; },
    async read() { return checked(await (await service()).dev_simulation_speed()); },
    async set(fullSpeed) { return checked(await (await service()).set_dev_simulation_speed(fullSpeed, [])); },
  };
}

export function mountDevSpeed(doc, {connect = createConnection, now = () => performance.now()} = {}) {
  if (doc.location.origin !== DERIVATION_ORIGIN) return;
  const statusView = doc.getElementById('status-view');
  const panel = doc.createElement('details');
  panel.id = 'dev-speed';
  panel.innerHTML = `<summary>DEV ONLY · Simulation speed</summary>
    <p class="hint">TEMPORARY DEVELOPMENT ONLY — REMOVE BEFORE PUBLIC LAUNCH</p>
    <p data-mode>Owner sign-in required.</p>
    <p data-feedback class="hint" role="status"></p>
    <div class="button-row">
      <button type="button" data-sign-in>Sign in as owner</button>
      <button type="button" data-switch disabled>Full Speed</button>
      <button type="button" data-sign-out hidden>Sign out</button>
    </div>`;
  statusView.append(panel);
  const find = key => panel.querySelector(`[data-${key}]`);
  const mode = find('mode'), feedback = find('feedback'), signIn = find('sign-in');
  const toggle = find('switch'), signOut = find('sign-out');
  let connection, status, sampledAt = 0, attemptedAt = -Infinity;
  let signed = false, busy = false;

  function render() {
    const active = status?.mode === 'Full Speed';
    const remaining = active ? Math.max(0, status.remaining_seconds - Math.floor((now() - sampledAt) / 1000)) : 0;
    const effective = status?.effective_milli?.[0];
    mode.textContent = active ? (remaining ? `Full Speed · ${remaining}s remaining` : 'Checking speed…') :
      status ? (effective === undefined ? `Adaptive · ${status.adaptive_tier}` :
        `${status.running ? `${effective / 1000} ticks/s` : 'Paused'} · Funding tier ${status.adaptive_tier}`) :
        signed ? 'Speed unavailable.' : 'Owner sign-in required.';
    signIn.hidden = signed;
    signIn.disabled = busy;
    signOut.hidden = !signed;
    signOut.disabled = busy;
    toggle.textContent = active ? 'Return to Adaptive' : 'Full Speed';
    toggle.disabled = busy || !status || (!active && !status.can_start);
  }

  async function run(operation, {quiet = false} = {}) {
    if (busy) return;
    busy = true;
    if (!quiet) feedback.textContent = '';
    render();
    try {
      const result = await operation();
      status = result;
      sampledAt = now();
      if (result) feedback.textContent = result.mode === 'Adaptive' && !result.can_start ?
        'The backend is not ready to start a Full Speed window.' : result.idle ? 'The simulation will publish when there is game work.' : '';
    } catch (error) {
      status = undefined;
      feedback.textContent = error.message === 'developer speed operator only' ?
        'This Internet Identity has no developer-speed access.' : 'Speed could not be verified. Check again before making another change.';
    } finally {
      attemptedAt = now();
      busy = false;
      render();
    }
  }

  signIn.addEventListener('click', () => void run(async () => {
    connection ??= connect();
    await connection.signIn();
    signed = true;
    return connection.read();
  }));
  signOut.addEventListener('click', () => void run(async () => {
    await connection.signOut();
    signed = false;
  }));
  toggle.addEventListener('click', () => {
    if (!toggle.disabled) void run(() => connection.set(status.mode !== 'Full Speed'));
  });

  const refresh = () => {
    if (!panel.open || statusView.hidden || doc.hidden) return;
    render();
    if (signed && now() - attemptedAt >= 5_000) void run(() => connection.read(), {quiet: true});
  };
  const timer = setInterval(refresh, 1000);
  panel.addEventListener('toggle', refresh);
  render();
  return () => { clearInterval(timer); panel.remove(); };
}
