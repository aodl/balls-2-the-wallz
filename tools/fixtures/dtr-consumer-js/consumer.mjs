import assert from 'node:assert/strict';
import {decodeCanonical,encodeCanonical,PlayoutClock,sha256,TimelineCoordinator} from '@dtr/timeline-runtime';
import {sha256Web} from '@dtr/timeline-runtime/client/verification';

import {certificateRoot,certificateVerifier,liveClient} from '@dtr/timeline-runtime/client/ic-certificate';

assert.equal(typeof TimelineCoordinator.prototype.ingestOrdered,'function');
assert.equal(typeof certificateVerifier,'function');
assert.equal(typeof liveClient,'function');
assert.ok(certificateRoot({network:'ic'}).length>32);
assert.throws(()=>certificateRoot({network:'ic',rootKey:new Uint8Array(32)}),/override/);

const value={a:[true,null,12n],z:'consumer'};
const encoded=encodeCanonical(value);
assert.deepEqual(decodeCanonical(encoded),value);
assert.equal(sha256(encoded),await sha256Web(encoded));
const clock=new PlayoutClock({target:2,low:1});
clock.append(0,2);
assert.equal(clock.sample(0.1).phase,'PLAYING');
console.log('PASS isolated installed DTR JavaScript consumer');
