// Verify signed queries and certified canister metadata. This program makes no update calls.
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {HttpAgent, Actor, CanisterStatus} from '@icp-sdk/core/agent';
import {IDL} from '@icp-sdk/core/candid';

const [root, inventoryPath, mode] = process.argv.slice(2);
assert.ok(root && inventoryPath);
assert.ok(mode === undefined || mode === '--rules12-recovery');
const backend = 's5ir5-gqaaa-aaaas-amyna-cai';
const frontend = 's2jxj-liaaa-aaaas-amynq-cai';
const agent = await HttpAgent.create({
  host: 'https://icp-api.io',
  shouldFetchRootKey: false,
  shouldSyncTime: false,
  verifyQuerySignatures: true,
  fetchOptions: {signal: AbortSignal.timeout(45000)},
});
const prior = JSON.parse(await readFile(
  'evidence/B2Z/human-playtest-corrections/production/metadata-after.json', 'utf8',
));
const records = [];
for (const canisterId of [backend, frontend]) {
  const status = await CanisterStatus.request({
    agent, canisterId, paths: ['subnet', 'module_hash', 'controllers'],
  });
  const subnet = status.get('subnet');
  const record = {
    canisterId,
    module_hash: status.get('module_hash'),
    controllers: status.get('controllers').map(p => p.toText()).sort(),
    subnet: subnet.subnetId,
    nodes: subnet.nodeKeys.size,
    certificate_verified: true,
  };
  const expected = prior.records.find(row => row.canisterId === canisterId);
  for (const key of ['canisterId', 'controllers', 'subnet']) {
    assert.deepEqual(record[key], expected[key], key);
  }
  const expectedModule = mode === '--rules12-recovery' && canisterId === backend
    ? '2cb2fe026941cbdd5373b490e1300f430db62b0b274e9f604ad3ad1a0f03ac13'
    : expected.module_hash;
  assert.equal(record.module_hash, expectedModule, canisterId);
  records.push(record);
}

const encoding = IDL.Record({
  content_encoding: IDL.Text, sha256: IDL.Opt(IDL.Vec(IDL.Nat8)), length: IDL.Nat,
});
const asset = IDL.Record({key: IDL.Text, content_type: IDL.Text, encodings: IDL.Vec(encoding)});
const actor = Actor.createActor(
  () => IDL.Service({list: IDL.Func([IDL.Record({})], [IDL.Vec(asset)], ['query'])}),
  {agent, canisterId: frontend},
);
const raw = await actor.list({});
const files = raw.map(f => ({
  key: f.key,
  content_type: f.content_type,
  encodings: f.encodings.map(e => ({
    encoding: e.content_encoding,
    sha256: e.sha256[0] ? Buffer.from(e.sha256[0]).toString('hex') : null,
    length: String(e.length),
  })),
})).sort((a, b) => a.key.localeCompare(b.key));
const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'));
const expected = new Map(inventory.filter(row => row.path !== '.ic-assets.json5')
  .map(row => ['/' + row.path, row]));
assert.deepEqual(files.map(f => f.key).sort(), [...expected.keys()].sort());
for (const file of files) {
  const names = file.encodings.map(e => e.encoding);
  assert.equal(new Set(names).size, names.length, file.key);
  if (file.key.endsWith('.flac') || file.key === '/audio/b2z-v1/manifest.json') {
    assert.deepEqual(names, ['identity'], file.key);
  }
  const identity = file.encodings.find(e => e.encoding === 'identity');
  const row = expected.get(file.key);
  assert.equal(identity.sha256, row.sha256, file.key);
  assert.equal(identity.length, String(row.bytes), file.key);
}
const at = new Date().toISOString();
const save = (name, result) => writeFile(root + '/' + name, JSON.stringify(result, null, 2) + '\n');
await save('metadata.json', {at, records});
await save('signed-inventory.json', {at, files, identity_encodings_match: true, query_signatures_verified: true});
console.log('PASS certified modules, controllers and subnet and signed ' + files.length + '-asset inventory');
