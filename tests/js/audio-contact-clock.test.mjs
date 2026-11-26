import {test} from 'node:test';
import assert from 'node:assert/strict';
import {contactFixtureTime} from '../../tools/fixtures/audio-contact-clock.mjs';

test('queued animation frame cannot move a controlled contact fixture before its segment',()=>{
 const start=100,priorFrame=99.7;
 assert.ok((priorFrame-start)/100000<0);
 assert.equal(contactFixtureTime(priorFrame,start,0,1),0);
 assert.equal(contactFixtureTime(50100,start,0,1),.5);
 assert.equal(contactFixtureTime(200100,start,0,1),1);
});
