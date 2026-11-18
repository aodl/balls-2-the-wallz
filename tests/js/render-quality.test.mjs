import test from 'node:test';
import assert from 'node:assert/strict';
import {backingQuality,PIXEL_BUDGETS} from '../../apps/b2z-observer/render-quality.mjs';

test('foreground rendering reduces fill cost under sustained load and restores quality conservatively',()=>{
 const quality=backingQuality();
 let now=1;
 quality.observe(now);
 assert.equal(quality.pixels,PIXEL_BUDGETS[1]);
 for(let i=0;i<6;i++)quality.observe(now+=45);
 assert.equal(quality.pixels,PIXEL_BUDGETS[0]);
 quality.observe(now+=2000); // visibility gap is not an overloaded frame
 for(let i=0;i<89;i++)quality.observe(now+=16);
 assert.equal(quality.pixels,PIXEL_BUDGETS[0]);
 quality.observe(now+=16);
 assert.equal(quality.pixels,PIXEL_BUDGETS[1]);
 for(let i=0;i<90;i++)quality.observe(now+=16);
 assert.equal(quality.pixels,PIXEL_BUDGETS[2]);
});
