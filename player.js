class Player {
  constructor(scene, startPos, color, keys) {
    this.scene = scene;
    this.keys  = keys;
    this.speed = 4;
    this.size  = 0.3;
    this.color = color;
    this.angle = 0;
    this.pitchAngle = 0;

    this.group = new THREE.Group();

    const bodyGeo = new THREE.CylinderGeometry(this.size, this.size, 0.8, 12);
    const bodyMat = new THREE.MeshLambertMaterial({ color });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.4;
    body.castShadow = true;

    const headGeo = new THREE.SphereGeometry(this.size * 0.9, 10, 10);
    const headMat = new THREE.MeshLambertMaterial({ color });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.95;
    head.castShadow = true;

    this.group.add(body, head);
    this.group.position.copy(startPos);
    scene.add(this.group);

    this.fpCamera = new THREE.PerspectiveCamera(75, 1, 0.05, 200);
    this.fpCamera.position.set(0, 0.9, 0);
    this.group.add(this.fpCamera);

    this.topCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);
  }

  get position() { return this.group.position; }

  updateTopCamera(mazeWorldSize) {
    this.topCamera.position.set(
      this.group.position.x,
      mazeWorldSize * 0.8,
      this.group.position.z + mazeWorldSize * 0.3
    );
    this.topCamera.lookAt(this.group.position);
  }

  rotateCameraByMouse(deltaX, deltaY) {
    this.angle -= deltaX * 0.005;
    this.pitchAngle = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitchAngle + deltaY * 0.005));
    
    this.group.rotation.y = this.angle;
    this.fpCamera.rotation.x = this.pitchAngle;
  }

  update(dt, pressedKeys, collides) {
    const moveForward  = pressedKeys.has(this.keys.forward);
    const moveBackward = pressedKeys.has(this.keys.backward);
    const strafeLeft   = pressedKeys.has(this.keys.left);
    const strafeRight  = pressedKeys.has(this.keys.right);

    const dirForward  = new THREE.Vector3(-Math.sin(this.angle), 0, -Math.cos(this.angle));
    const dirLateral = new THREE.Vector3(-Math.cos(this.angle), 0, Math.sin(this.angle));
    const move = new THREE.Vector3();
    if (moveForward)  move.addScaledVector(dirForward,  this.speed * dt);
    if (moveBackward) move.addScaledVector(dirForward, -this.speed * dt);
    if (strafeLeft)   move.addScaledVector(dirLateral, this.speed * dt);
    if (strafeRight)  move.addScaledVector(dirLateral,  -this.speed * dt);

    const tryX = this.group.position.clone(); tryX.x += move.x;
    if (!collides(tryX, this.size)) this.group.position.x = tryX.x;

    const tryZ = this.group.position.clone(); tryZ.z += move.z;
    if (!collides(tryZ, this.size)) this.group.position.z = tryZ.z;
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
