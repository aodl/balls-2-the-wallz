/** Verify observer construction lifecycle against the certificate-checked installed artifacts. */
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
import {prepareDerivedSegment, SegmentPlayer} from '../apps/b2z-observer/model.mjs';
import {verifyGameReceipt} from '../apps/b2z-observer/delegated-payments/context.mjs';
import {constructionPresentation, signedConstruction} from '../apps/b2z-observer/manufacturing.mjs';

const directory=process.argv[2];
const read=name=>readFileSync(join(directory,name));
const json=name=>JSON.parse(read(name));
const {cannon,diverter,backend,ledger,account,manual_memo}=json('placement.json');
const signed=json('signed-result.json');
const journal=signed.journal.find(item=>String(item.index)===signed.transfer_position);
assert.equal(journal.state,'Ledger confirmed');
const eventBytes=read('1-events.bin');
const artifacts=decodeCanonical(eventBytes);
const publication=decodeCanonical(read('1-publication.bin'));
const segment=await prepareDerivedSegment(read('0-state.bin'),read('1-state.bin'),eventBytes,publication);
const player=new SegmentPlayer(segment);
const presentation=constructionPresentation();
const when=Number(BigInt(journal.created_at_time)/1000000n)+1;
const manual={id:'explicit-local-plan',action:'deflect',state:'copied',prepared_at:when,
 memo:manual_memo,account,backend};
presentation.manual([manual]);
presentation.signed([signedConstruction(journal,account)]);
const sites=()=>presentation.sites(player.view,account,backend,when);
const planned=sites();
assert.equal(planned.length,2);
assert.ok(planned.every(p=>p.targetId===null));
assert.equal(planned[0].cell,cannon);
assert.equal(planned[1].cell,diverter);

const receipts=new Map(artifacts.receipts.map(receipt=>[String(receipt.position),receipt]));
const authority={ready:true,source:{owner:backend,ledger,network:'pocketic-local'},receipts};
const actual=receipts.get(signed.transfer_position);
assert.equal(actual.status,'applied');
assert.equal(actual.new_cannon,true);
assert.equal(actual.account,account);
assert.equal(verifyGameReceipt(authority,journal,actual),true);
assert.throws(()=>verifyGameReceipt(authority,{...journal,memo:'00'},actual),/MISMATCH/);
const manualReceipt=receipts.get(signed.manual_position);
assert.equal(manualReceipt.status,'applied');
assert.equal(manualReceipt.kind,'deflector_built');
assert.equal(manualReceipt.structure.cell,diverter);
assert.equal(manualReceipt.spender,null);
const armed=signedConstruction({...journal,state:'Game outcome verified'},account,actual);
assert.ok(armed);
presentation.signed([armed]);
const waiting=sites();
assert.equal(waiting[0].targetId,actual.cannon);
assert.equal(waiting[1].targetId,null);
assert.ok(!player.view.cannons.has(actual.cannon));
assert.ok(!player.view.deflectors.has(manualReceipt.structure.id));
const shown=player.advance(segment.end);
assert.equal(shown.cannons.get(actual.cannon).cell,cannon);
assert.equal(shown.deflectors.get(manualReceipt.structure.id).cell,diverter);
assert.deepEqual(sites(),[]);
writeFileSync(join(directory,'construction-presentation.json'),JSON.stringify({
 status:'PASS',scope:'Genuine installed Ledger/Index and verified displayed birth. Observer model and trusted receipt APIs run in Node.',
 signed:{position:signed.transfer_position,cell:cannon,birth:actual.cannon},manual:{position:signed.manual_position,cell:diverter,birth:manualReceipt.structure.id},
 start:segment.start,end:segment.end,segment:String(publication.head.segment_id)
},null,2)+'\n');
