import {zoomGain,viewportGain,clamp} from './audio-policy.mjs';
export const audioPose=c=>[c.x,c.y,c.scale,c.viewport.width,c.viewport.height].join('/');
export function audibleCue(cue,camera,membership,occluders){
 if(!membership||membership.pose!==audioPose(camera)||!Array.isArray(occluders))return null;
 const member=membership[cue.kind==='wall'?'balls':'cannons'].get(cue.entity);if(!member)return null;
 let x=cue.x,y=cue.y;if(cue.torus){x+=Math.round((member.x-x)/cue.width)*cue.width;y+=Math.round((member.y-y)/cue.height)*cue.height;}
 const p=camera.screen(x,y,cue.kind==='wall'?.14:.25),radius=camera.scale*(cue.kind==='wall'?.16:.62);
 const gain=zoomGain(camera.scale)*viewportGain({x:p.x,y:p.y,width:camera.viewport.width,height:camera.viewport.height,radius,occluders});
 return gain>0?{gain,pan:clamp((2*p.x/camera.viewport.width-1)*.65,-.65,.65),bin:Math.floor(p.x/camera.viewport.width*6)+6*Math.floor(p.y/camera.viewport.height*4),centrality:1-Math.abs(2*p.x/camera.viewport.width-1)}:null;
}
