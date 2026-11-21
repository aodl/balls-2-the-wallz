/** UX-12: same isometric ground projection, with one stable translated map cut. */
import{isometricBasis}from'./isometric-projection.mjs';
import{wrap}from'./camera.mjs';
export function diamondMap(width,height,pixelsW,pixelsH,origin=null,angle=0){
 const shifted=Boolean(origin)&&origin.torus!==false,left=shifted?origin.x-width/2:0,top=shifted?origin.y-height/2:0;
 const basis=isometricBasis(angle);
 const {rightX:xx,rightY:xy,downX:yx,downY:yy}=basis;
 // A square world fits the same frame at every cardinal stop. Keep that
 // scale through the orbit so the overview does not zoom during a turn.
 const horizontal=width===height?width*Math.SQRT2:width*Math.abs(xx)+height*Math.abs(xy);
 const vertical=width===height?width*Math.sqrt(2/3):width*Math.abs(yx)+height*Math.abs(yy);
 const scale=Math.min(pixelsW/horizontal,pixelsH/vertical);
 const projectCut=(x,y)=>({x:pixelsW/2+scale*(xx*(x-width/2)+xy*(y-height/2)),y:pixelsH/2+scale*(yx*(x-width/2)+yy*(y-height/2))});
 const cutInverse=(x,y)=>{const p=basis.unproject((x-pixelsW/2)/scale,(y-pixelsH/2)/scale);return{x:p.x+width/2,y:p.y+height/2};};
 const project=(x,y)=>projectCut(shifted?wrap(x-left,width):x,shifted?wrap(y-top,height):y);
 const inverse=(x,y)=>{const p=cutInverse(x,y);return shifted?{x:wrap(p.x+left,width),y:wrap(p.y+top,height)}:p;};
 function parts(){const spans=(start,size)=>{const a=wrap(start,size);return a<1e-10?[[0,size]]:[[a,size],[0,a]];},xs=shifted?spans(left,width):[[0,width]],ys=shifted?spans(top,height):[[0,height]];let dy=0;const out=[];for(const [y,bottom]of ys){let dx=0;for(const [x,right]of xs){out.push({sx:x,sy:y,width:right-x,height:bottom-y,dx,dy});dx+=right-x;}dy+=bottom-y;}return out;}
 return{scale,left,top,project,projectCut,inverse,parts,contains(x,y){const p=cutInverse(x,y),e=1e-8;return p.x>=-e&&p.y>=-e&&p.x<=width+e&&p.y<=height+e;}};
}
