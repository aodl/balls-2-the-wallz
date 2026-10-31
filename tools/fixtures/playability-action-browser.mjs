/** Local widget fixture. Never included in production bundles. */
import {createArcade} from '../../apps/b2z-observer/arcade.mjs';
import {Camera} from '../../apps/b2z-observer/camera.mjs';
import {createShell} from '../../apps/b2z-observer/shell.mjs';
import {createArenaRenderer} from '../../apps/b2z-observer/render.mjs';
import {B2zView} from '../../apps/b2z-observer/model.mjs';
import {accountIdentifier} from '../../apps/b2z-observer/identity.mjs';
import {decodeCanonical} from '@dtr/timeline-runtime/runtime/canonical';
const data=await (await fetch('fixture.json')).json(),bytes=s=>Uint8Array.from(s.match(/../g),b=>parseInt(b,16));
const names=new Map([['01'.repeat(32),accountIdentifier('aaaaa-aa')],['02'.repeat(32),accountIdentifier('rrkah-fqaaa-aaaaa-aaaaq-cai')]]);
function accounts(v){if(Array.isArray(v))return v.map(accounts);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,v])=>[k,accounts(v)]));return names.get(v)??v;}
const config=decodeCanonical(bytes(data.config)),source={network:'pocketic-local-ui-fixture',owner:'aaaaa-aa',subaccount:0n,recipient:accountIdentifier('aaaaa-aa')};
const arcade=createArcade(document),camera=new Camera(),renderer=createArenaRenderer(),canvas=document.getElementById('board');let world,view,navigations=1;
const shell=createShell(document,camera,arcade,{selected:()=>view?.cannons.get(arcade.selectedCannon()),cell:cell=>arcade.chooseCell(cell)});
function draw(){const rect=canvas.getBoundingClientRect();canvas.width=rect.width;canvas.height=rect.height;camera.configure(1000,1000,rect.width,rect.height,true);const locate=arcade.locate(view);if(locate!==null)camera.frameCell(view.cannons.get(locate).cell);renderer.draw(canvas.getContext('2d'),view,camera,{time:Number(world.time[0])/Number(world.time[1]),selection:arcade.moveSelection(),selected:arcade.selectedCannon()});}
function render(name,phase='initial'){world=accounts(decodeCanonical(bytes(data.cases[name][phase])));view=new B2zView(world);arcade.render(world,config,source);arcade.status({phase:'PLAYING',live:true,verified:true,fresh:true,healthy:true,paused:false,idle:world.balls.length===0,pace:{mode:'Conserve',nominal_milli:200,supported_milli:200,admission_open:true}});shell.update(view,true);draw();return{cannons:world.cannons.length,balls:world.balls.length};}
globalThis.fixture={render,action:kind=>arcade.action(kind),select:id=>arcade.selectCannon(id),choose:cell=>arcade.chooseCell(cell),summary:()=>({account:arcade.account(),selected:arcade.selectedCannon(),cannons:world.cannons.length,balls:world.balls.length,camera:[camera.x,camera.y,camera.scale],navigations}),sites:()=>arcade.moveSelection()?.cells??[],open:()=>shell.open('play-dialog'),draw};
globalThis.fixture.capacity=()=>{const start=performance.now(),before=performance.memory?.usedJSHeapSize??null;render('capacity');const events=decodeCanonical(bytes(data.capacity_events));for(let i=0;i<30;i++)draw();const stats=view.stats();return{milliseconds:performance.now()-start,heap_before:before,heap_after:performance.memory?.usedJSHeapSize??null,events:events.events.length,cannons:world.cannons.length,balls:world.balls.length,players:stats.length,unique_claimed_cells:stats.reduce((n,r)=>n+r.area,0),claimed_cells:view.claimedCells()};};
const params=new URLSearchParams(location.search);render(params.get('case')??'first',params.get('phase')??'initial');
