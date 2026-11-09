/** UX-12: the arena ground projection, fitted to one canonical map cut. */
export function diamondMap(width,height,pixelsW,pixelsH){
 const scale=Math.min(pixelsW*Math.SQRT2/(width+height),pixelsH*Math.sqrt(6)/(width+height));
 const project=(x,y)=>({x:pixelsW/2+scale*((x-width/2)-(y-height/2))/Math.SQRT2,y:pixelsH/2+scale*((x-width/2)+(y-height/2))/Math.sqrt(6)});
 const inverse=(x,y)=>{const a=(x-pixelsW/2)*Math.SQRT2/scale,b=(y-pixelsH/2)*Math.sqrt(6)/scale;return{x:width/2+(a+b)/2,y:height/2+(b-a)/2};};
 return {scale,project,inverse,contains(x,y){const p=inverse(x,y),e=1e-8;return p.x>=-e&&p.y>=-e&&p.x<=width+e&&p.y<=height+e;}};
}
