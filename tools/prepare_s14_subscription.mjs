#!/usr/bin/env node
/** Offline Event Horizon account declaration; never funds or registers a route. */
import {parseArgs} from 'node:util';
import {Principal} from '@icp-sdk/core/principal';
const {values}=parseArgs({options:{subscriber:{type:'string'},alias:{type:'string'},subaccount:{type:'string',default:'0'}}});
const subscriber=Principal.fromText(values.subscriber).toText(),n=BigInt(values.subaccount);
if(n<0n||n>=(1n<<64n)||!values.alias||!/^[A-Za-z0-9]+$/.test(values.alias))throw new Error('reviewed alias and numeric u64 subaccount required');
const declaration=`${subscriber}.${n}`,memo=`${values.alias}.${declaration}`;
if(Buffer.byteLength(memo)>32)throw new Error('account declaration exceeds Jupiter 32-byte memo bound; obtain a reviewed shorter alias, never use a global route');
console.log(JSON.stringify({subscriber,target:{subaccount:n.toString()},subaccount_hex:n.toString(16).padStart(64,'0'),declaration,routed_memo:memo,memo_bytes:Buffer.byteLength(memo),funding:'NOT_EXECUTED',threshold:'No declared minimum; B2Z wakes only for positive amounts on the exact target.'},null,2));
