#!/usr/bin/env node
/** Independent JS replay of the installed Rust host's captured seals/inputs. */
import {readFile,writeFile} from 'node:fs/promises';
import {replayHistory} from './lib/replay_s14_history.mjs';
const [input,output]=process.argv.slice(2);if(!input)throw new Error('usage: replay_s14.mjs trace.json [result.json]');
const trace=JSON.parse(await readFile(input,'utf8'),(_k,v)=>v&&typeof v==='object'&&Object.keys(v).join(',')==='$integer'?BigInt(v.$integer):v);
const result=replayHistory(trace);
if(output)await writeFile(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
