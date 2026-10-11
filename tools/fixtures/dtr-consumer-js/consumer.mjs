import assert from 'node:assert/strict';
import {decodeCanonical,encodeCanonical,PlayoutClock,sha256} from '@dtr/timeline-runtime';
import {sha256Web} from '@dtr/timeline-runtime/client/verification';

const value={a:[true,null,12n],z:'consumer'};
const encoded=encodeCanonical(value);
assert.deepEqual(decodeCanonical(encoded),value);
assert.equal(sha256(encoded),await sha256Web(encoded));
const clock=new PlayoutClock({target:2,low:1});
clock.append(0,2);
assert.equal(clock.sample(0.1).phase,'PLAYING');
console.log('PASS isolated installed DTR JavaScript consumer');
