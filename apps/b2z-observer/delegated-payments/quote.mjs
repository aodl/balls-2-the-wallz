/** Re-derive a delegated packet from the same certified pricing preimage as manual Copy. */
import {fitShout} from '../../../packages/protocol/shout.mjs';
import {decodeReservoirLedgerMemo} from '../../../packages/protocol/reservoir.mjs';
import {deflectorDegrees} from '../deflector-policy.mjs';
import {prepareQuoteV6} from '../action-quote-v6.mjs';

export function quoteForMemo(world,config,account,memo,pricedAt){
 const bytes=new TextEncoder().encode(memo);
 const {command,cry}=decodeReservoirLedgerMemo(0n,bytes);
 const tokens=memo.split('|',1)[0].split(' ');
 const input={...command,priced_at_ns:pricedAt};
 switch(command.kind){
  case 'fire':
  case 'new':input.angle=tokens[command.kind==='fire'?2:1];break;
  case 'move_cannon':input.kind='move';break;
  case 'deflect':
  case 'deflector_reorient':input.deflector=command.id;input.angle=deflectorDegrees(command.orientation);break;
  case 'deflector_move':input.deflector=command.id;break;
  case 'reservoir':break;
  default: throw Error('MODERN_GAMEPLAY_MEMO_REQUIRED');
 }
 const quote=prepareQuoteV6(world,config,account,input);
 const canonical=cry?fitShout(quote.memo,cry).memo:quote.memo;
 if(canonical!==memo)throw Error('PAYMENT_QUOTE_CHANGED');
 return {...quote,memo:canonical,memo_bytes:bytes};
}
