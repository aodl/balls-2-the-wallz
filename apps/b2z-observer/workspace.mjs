/** Measured screen-space placement, separate from world geometry. */
export function nearestPoint(camera,cell){let x=cell%camera.width+.5,y=Math.floor(cell/camera.width)+.5;if(camera.torus){x+=Math.round((camera.x-x)/camera.width)*camera.width;y+=Math.round((camera.y-y)/camera.height)*camera.height;}return camera.screen(x,y);}
export function intersects(a,b,gap=0){return a.left<b.right+gap&&a.right+gap>b.left&&a.top<b.bottom+gap&&a.bottom+gap>b.top;}
export function placeCard(safe,size,point,mobile){
 const width=Math.min(size.width,safe.right-safe.left),height=Math.min(size.height,safe.bottom-safe.top);
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 let left=safe.left,top=safe.bottom-height;
 if(!mobile&&point){const right=point.x+112,leftOf=point.x-112-width;left=right+width<=safe.right?right:leftOf>=safe.left?leftOf:safe.left;top=clamp(point.y-height/2,safe.top,safe.bottom-height);}
 return {left,top,width,height};
}
