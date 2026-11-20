/** UX-12: same isometric ground projection, with one stable translated map cut. */
import{wrap}from'./camera.mjs';
export function diamondMap(width,height,pixelsW,pixelsH,origin=null,angle=0){
 const shifted=Boolean(origin)&&origin.torus!==false,left=shifted?origin.x-width/2:0,top=shifted?origin.y-height/2:0;
 const c=Math.cos(angle),s=Math.sin(angle);
 const xx=(c/Math.SQRT2-s/Math.sqrt(6)),xy=(-c/Math.SQRT2-s/Math.sqrt(6));
 const yx=(s/Math.SQRT2+c/Math.sqrt(6)),yy=(-s/Math.SQRT2+c/Math.sqrt(6));
 const scale=Math.min(pixelsW/(width*Math.abs(xx)+height*Math.abs(xy)),pixelsH/(width*Math.abs(yx)+height*Math.abs(yy)));
 const projectCut=(x,y)=>({x:pixelsW/2+scale*(xx*(x-width/2)+xy*(y-height/2)),y:pixelsH/2+scale*(yx*(x-width/2)+yy*(y-height/2))});
 const cutInverse=(x,y)=>{const sx=(x-pixelsW/2)/scale,sy=(y-pixelsH/2)/scale,a=(c*sx+s*sy)*Math.SQRT2,b=(c*sy-s*sx)*Math.sqrt(6);return{x:width/2+(a+b)/2,y:height/2+(b-a)/2};};
 const project=(x,y)=>projectCut(shifted?wrap(x-left,width):x,shifted?wrap(y-top,height):y);
 const inverse=(x,y)=>{const p=cutInverse(x,y);return shifted?{x:wrap(p.x+left,width),y:wrap(p.y+top,height)}:p;};
 function parts(){const spans=(start,size)=>{const a=wrap(start,size);return a<1e-10?[[0,size]]:[[a,size],[0,a]];},xs=shifted?spans(left,width):[[0,width]],ys=shifted?spans(top,height):[[0,height]];let dy=0;const out=[];for(const [y,bottom]of ys){let dx=0;for(const [x,right]of xs){out.push({sx:x,sy:y,width:right-x,height:bottom-y,dx,dy});dx+=right-x;}dy+=bottom-y;}return out;}
 return{scale,left,top,project,projectCut,inverse,parts,contains(x,y){const p=cutInverse(x,y),e=1e-8;return p.x>=-e&&p.y>=-e&&p.x<=width+e&&p.y<=height+e;}};
}
