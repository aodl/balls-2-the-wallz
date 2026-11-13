/** Exact approved audio build extension. No upload, network, identity or backend. */
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {validateAudioManifest,AUDIO_MANIFEST_SHA256} from '../apps/b2z-observer/audio-loader.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
export async function extendAudioAssets(out,manifest){
 const base='apps/b2z-observer/audio/b2z-v1/',bytes=await readFile(base+'manifest.json');if(sha(bytes)!==AUDIO_MANIFEST_SHA256)throw Error('Approved audio manifest hash');const audio=validateAudioManifest(JSON.parse(bytes)),files=['manifest.json',...audio.segments.map(s=>s.file),...Object.values(audio.effects).map(s=>s.file)];
 for(const file of files){const source=await readFile(base+file),expected=file==='manifest.json'?{sha256:AUDIO_MANIFEST_SHA256,bytes:bytes.length}:[...audio.segments,...Object.values(audio.effects)].find(s=>s.file===file);if(sha(source)!==expected.sha256||source.length!==expected.bytes)throw Error('Approved audio payload '+file);const path='audio/b2z-v1/'+file;await mkdir(dirname(out+'/'+path),{recursive:true});await copyFile(base+file,out+'/'+path);manifest.files[path]={sha256:sha(source),bytes:source.length};}
 const policy=JSON.parse(await readFile(out+'/.ic-assets.json5'));if(policy.length!==1)throw Error('Unexpected base asset policy');const headers=policy[0].headers;
 policy.push({match:'audio/b2z-v1/**/*.flac',security_policy:'hardened',headers:{...headers,'Content-Type':'audio/flac','Cache-Control':'public, max-age=31536000, immutable'},encodings:['identity']},{match:'audio/b2z-v1/manifest.json',security_policy:'hardened',headers:{...headers,'Cache-Control':'no-cache'},encodings:['identity']});
 await writeFile(out+'/.ic-assets.json5',JSON.stringify(policy,null,2)+'\n');const finalPolicy=await readFile(out+'/.ic-assets.json5');manifest.files['.ic-assets.json5']={sha256:sha(finalPolicy),bytes:finalPolicy.length};manifest.audio_assets_builder_sha256=sha(await readFile(new URL(import.meta.url)));manifest.audio={manifest_sha256:AUDIO_MANIFEST_SHA256,files:files.length,bytes:files.reduce((n,f)=>n+manifest.files['audio/b2z-v1/'+f].bytes,0),core_pcm_sha256:audio.masterPcmInt32Sha256,identity_only:true};
}
