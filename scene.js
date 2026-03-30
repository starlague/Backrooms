class MazeScene {
  constructor(scene, mazeData, cellSize, wallHeight) {
    this.scene     = scene;
    this.mazeData  = mazeData;
    this.cellSize  = cellSize;
    this.wallHeight = wallHeight;

    this.walls = [];
    this.objects = [];

    this.build();
  }

  get worldWidth() { return this.mazeData.cols * this.cellSize; }
  get worldDepth() { return this.mazeData.rows * this.cellSize; }

  build() {
    const { grid, cols, rows } = this.mazeData;
    const cs = this.cellSize;
    const wh = this.wallHeight;
    const wt = 0.2;

    const floorTex = TextureBuilder.createFloorTexture();
    const wallTex  = TextureBuilder.createWallTexture();
    const ceilTex  = TextureBuilder.createCeilingTexture();
    const goalTex  = TextureBuilder.createGoalTexture();

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(cols * cs, rows * cs),
      new THREE.MeshLambertMaterial({ map: floorTex })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cols * cs / 2, 0, rows * cs / 2);
    floor.receiveShadow = true;
    this._add(floor);

    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(cols * cs, rows * cs),
      new THREE.MeshLambertMaterial({ map: ceilTex })
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(cols * cs / 2, wh, rows * cs / 2);
    this._add(ceil);

    const goal = new THREE.Mesh(
      new THREE.PlaneGeometry(cs * 0.8, cs * 0.8),
      new THREE.MeshLambertMaterial({ map: goalTex })
    );
    goal.rotation.x = -Math.PI / 2;
    goal.position.set((cols - 0.5) * cs, 0.01, (rows - 0.5) * cs);
    this._add(goal);

    const wallMat = new THREE.MeshLambertMaterial({ map: wallTex });

    const addWall = (x, z, w, d) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, wh, d), wallMat);
      mesh.position.set(x, wh / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this._add(mesh);
      this.walls.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    };

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx   = c * cs + cs / 2;
        const cz   = r * cs + cs / 2;
        const cell = grid[r][c];

        if (cell.N) addWall(cx, cz - cs / 2, cs + wt, wt);
        if (cell.W) addWall(cx - cs / 2, cz, wt, cs + wt);
        if (r === rows - 1 && cell.S) addWall(cx, cz + cs / 2, cs + wt, wt);
        if (c === cols - 1 && cell.E) addWall(cx + cs / 2, cz, wt, cs + wt);
      }
    }

    const ambient = new THREE.AmbientLight(0xb5a89f, 0.8);
    this._add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 0.7);
    dirLight.position.set(cols * cs / 2, 20, rows * cs / 2);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width  = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near   = 0.5;
    dirLight.shadow.camera.far    = 200;
    dirLight.shadow.camera.left   = -cols * cs;
    dirLight.shadow.camera.right  =  cols * cs;
    dirLight.shadow.camera.top    =  rows * cs;
    dirLight.shadow.camera.bottom = -rows * cs;
    this._add(dirLight);

    const numLights = Math.floor(cols * rows / 8);
    for (let i = 0; i < numLights; i++) {
      const light = new THREE.PointLight(0xffd580, 0.6, cs * 3.5);
      light.position.set(
        Math.random() * cols * cs,
        wh * 0.7,
        Math.random() * rows * cs
      );
      this._add(light);
    }
  }

  _add(obj) {
    this.scene.add(obj);
    this.objects.push(obj);
  }

  collides(pos, radius) {
    for (const w of this.walls) {
      if (
        pos.x + radius > w.minX && pos.x - radius < w.maxX &&
        pos.z + radius > w.minZ && pos.z - radius < w.maxZ
      ) return true;
    }
    return false;
  }

  isAtGoal(pos) {
    const { cols, rows } = this.mazeData;
    const cs = this.cellSize;
    const gx = (cols - 0.5) * cs;
    const gz = (rows - 0.5) * cs;
    return Math.abs(pos.x - gx) < cs * 0.45 && Math.abs(pos.z - gz) < cs * 0.45;
  }

  dispose() {
    for (const obj of this.objects) this.scene.remove(obj);
    this.objects = [];
    this.walls   = [];
  }
}
