// Rotate the horizontal ground basis before applying the fixed inclination.
// World x/y are horizontal. Height is along the Three.js positive Y axis.
export function isometricBasis(azimuth = 0) {
  const cos = Math.cos(azimuth), sin = Math.sin(azimuth);
  const rightX = (cos - sin) / Math.SQRT2;
  const rightY = -(cos + sin) / Math.SQRT2;
  const depthX = (cos + sin) / Math.SQRT2;
  const depthY = (cos - sin) / Math.SQRT2;
  const slope = 1 / Math.sqrt(3);
  return {
    rightX, rightY, depthX, depthY,
    downX: depthX * slope,
    downY: depthY * slope,
    project(x, y, height = 0) {
      return {x: rightX*x + rightY*y, y: (depthX*x + depthY*y)*slope - height*Math.sqrt(2/3)};
    },
    unproject(x, y) {
      const depth = y / slope;
      return {x: rightX*x + depthX*depth, y: rightY*x + depthY*depth};
    },
  };
}

// The horizontal radius and vertical offset reproduce the original North-up view.
export function orientSceneCamera(ortho, camera) {
  const radius = 2500 * Math.SQRT2;
  ortho.up.set(0, 1, 0);
  ortho.position.set(camera.x + radius*camera.basis.depthX, 2500,
                     camera.y + radius*camera.basis.depthY);
  ortho.lookAt(camera.x, 0, camera.y);
  ortho.updateProjectionMatrix();
  ortho.updateMatrixWorld();
}
