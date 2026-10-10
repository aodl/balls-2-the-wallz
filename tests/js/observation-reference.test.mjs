// HISTORICAL v5 conformance. Active stable-identity coverage is observation-v6.test.mjs.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {decodeCanonical} from '../../packages/runtime/canonical.mjs';import {unhex,hex} from '../../packages/protocol/bytes.mjs';
import {publicationV5 as publication} from '../../packages/observation/publication.mjs';
const hosts=JSON.parse(fs.readFileSync(new URL('../fixtures/coordinator-v5.json',import.meta.url),'utf8')).rows;
const refs=JSON.parse(fs.readFileSync(new URL('../fixtures/observation-v5.json',import.meta.url),'utf8')).rows;
for(const r of refs)test(`${r.name}: publication equals independent Python canonical bytes`,()=>{
  const host=hosts.find(x=>x.name===r.name);const p=publication(decodeCanonical(unhex(host.actions.at(-1).image_hex)));
  assert.equal(hex(p.bytes),r.publication_hex);assert.equal(p.sha256,r.sha256);
});
