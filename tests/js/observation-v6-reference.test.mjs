import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {publication}from'../../packages/observation/publication.mjs';import{decodeCanonical}from'../../packages/runtime/canonical.mjs';import{unhex,hex}from'../../packages/protocol/bytes.mjs';
const hosts=JSON.parse(fs.readFileSync(new URL('../fixtures/coordinator-v5.json',import.meta.url))).rows;
const independent=JSON.parse(fs.readFileSync(new URL('../fixtures/observation-v6.json',import.meta.url))).rows;
for(const row of independent)test(`${row.name}: publication v6 matches independent Python encoder/hash`,()=>{
 const host=hosts.find(h=>h.name===row.name),p=publication(decodeCanonical(unhex(host.actions.at(-1).image_hex)));
 assert.equal(hex(p.bytes),row.publication_hex);assert.equal(p.sha256,row.sha256);
});
