class Game {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);

    this.pressedKeys  = new Set();
    this.cameraMode   = 'fp';
    this.multiplayer  = false;
    this.running      = false;
    this.startTime    = 0;
    this.elapsed      = 0;
    this.winnerIndex  = null;

    this.mazeData     = null;
    this.mazeSeed     = null;
    this.importedMaze = null;

    this.scene     = null;
    this.mazeScene = null;
    this.players   = [];

    this.CELL_SIZE   = 4;
    this.WALL_HEIGHT = 3;
    this.MAZE_COLS   = 10;
    this.MAZE_ROWS   = 10;

    this.mouseDown = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    window.addEventListener('keydown', e => {
      this.pressedKeys.add(e.code);
      if (e.code === 'KeyC') this.toggleCamera();
    });
    window.addEventListener('keyup',    e => this.pressedKeys.delete(e.code));
    window.addEventListener('resize',   () => this.onResize());
    
    document.addEventListener('mousedown', e => {
      if (this.running && this.cameraMode === 'fp') {
        this.mouseDown = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });
    document.addEventListener('mousemove', e => {
      if (this.mouseDown && this.running) {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        if (this.multiplayer) {
          this.players[0].rotateCameraByMouse(deltaX, deltaY);
        } else {
          this.players[0].rotateCameraByMouse(deltaX, deltaY);
        }
      }
    });
    document.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });

    this.onResize();
    this._animate();
  }

  onResize() {
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.renderer.setSize(this.W, this.H);
    if (this.players.length) this._updateCameraAspects();
  }

  _updateCameraAspects() {
    if (this.multiplayer) {
      const aspect = (this.W / 2) / this.H;
      for (const p of this.players) {
        p.fpCamera.aspect  = aspect; p.fpCamera.updateProjectionMatrix();
        p.topCamera.aspect = aspect; p.topCamera.updateProjectionMatrix();
      }
    } else {
      const aspect = this.W / this.H;
      if (this.players[0]) {
        this.players[0].fpCamera.aspect  = aspect; this.players[0].fpCamera.updateProjectionMatrix();
        this.players[0].topCamera.aspect = aspect; this.players[0].topCamera.updateProjectionMatrix();
      }
    }
  }

  start(seedOverride) {
    if (this.mazeScene) { this.mazeScene.dispose(); this.mazeScene = null; }
    for (const p of this.players) p.dispose();
    this.players = [];

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x3d3d2d);
    this.scene.fog         = new THREE.Fog(0x3d3d2d, 12, 40);

    if (this.importedMaze) {
      this.mazeData     = this.importedMaze;
      this.mazeSeed     = 'imported';
      this.importedMaze = null;
    } else {
      const seedStr = seedOverride
        || document.getElementById('seedInput').value.trim()
        || String(Date.now());
      this.mazeSeed = seedStr;

      let seedNum = 0;
      for (let i = 0; i < seedStr.length; i++) {
        seedNum = (seedNum * 31 + seedStr.charCodeAt(i)) | 0;
      }
      const rng = new SeededRandom(Math.abs(seedNum));
      this.mazeData = MazeGenerator.generate(this.MAZE_COLS, this.MAZE_ROWS, rng);
    }

    this.mazeScene = new MazeScene(this.scene, this.mazeData, this.CELL_SIZE, this.WALL_HEIGHT);

    const sp1 = new THREE.Vector3(this.CELL_SIZE / 2,       0, this.CELL_SIZE / 2);
    const sp2 = new THREE.Vector3(this.CELL_SIZE / 2 + 0.6, 0, this.CELL_SIZE / 2 + 0.6);

    if (this.multiplayer) {
      this.players.push(new Player(this.scene, sp1, 0x44aaff, {
        forward: 'KeyW', backward: 'KeyS', left: 'KeyA', right: 'KeyD'
      }));
      this.players.push(new Player(this.scene, sp2, 0xff8844, {
        forward: 'KeyI', backward: 'KeyK', left: 'KeyJ', right: 'KeyL'
      }));
    } else {
      this.players.push(new Player(this.scene, sp1, 0x44aaff, {
        forward: 'KeyW', backward: 'KeyS', left: 'KeyA', right: 'KeyD'
      }));
    }

    this._updateCameraAspects();

    this.cameraMode = 'fp';
    document.getElementById('cameraBtn').textContent  = '📷 Vue dessus';
    document.getElementById('p1label').style.display  = this.multiplayer ? 'block' : 'none';
    document.getElementById('p2label').style.display  = this.multiplayer ? 'block' : 'none';
    document.getElementById('startOverlay').style.display = 'none';
    document.getElementById('winOverlay').style.display   = 'none';
    document.getElementById('exportBtn').style.display    = 'inline-block';

    this.running     = true;
    this.startTime   = performance.now();
    this.elapsed     = 0;
    this.winnerIndex = null;
  }

  update(dt) {
    if (!this.running) return;

    this.elapsed = (performance.now() - this.startTime) / 1000;
    const m = Math.floor(this.elapsed / 60).toString().padStart(2, '0');
    const s = Math.floor(this.elapsed % 60).toString().padStart(2, '0');
    document.getElementById('timer').textContent = `⏱ ${m}:${s}`;

    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      p.update(dt, this.pressedKeys, (pos, r) => this.mazeScene.collides(pos, r));
      p.updateTopCamera(Math.max(this.mazeScene.worldWidth, this.mazeScene.worldDepth));

      if (this.mazeScene.isAtGoal(p.position) && this.winnerIndex === null) {
        this.winnerIndex = i;
        this._showWin(i);
      }
    }
  }

  _showWin(playerIndex) {
    this.running = false;
    const m       = Math.floor(this.elapsed / 60);
    const s       = this.elapsed % 60;
    const timeStr = m > 0 ? `${m}m ${s.toFixed(2)}s` : `${s.toFixed(2)}s`;

    document.getElementById('winTitle').textContent = this.multiplayer
      ? `🏆 Joueur ${playerIndex + 1} gagne !`
      : '🏆 Bravo !';
    document.getElementById('winMsg').textContent = this.multiplayer
      ? `Joueur ${playerIndex + 1} a trouvé la sortie en premier !`
      : 'Vous avez trouvé la sortie !';
    document.getElementById('winTime').textContent = `Temps : ${timeStr}`;
    document.getElementById('winOverlay').style.display = 'flex';
  }

  render() {
    if (!this.scene || !this.players.length) return;

    if (this.multiplayer) {
      const hw = Math.floor(this.W / 2);
      this.renderer.setScissorTest(true);
      for (let i = 0; i < this.players.length; i++) {
        const cam = this.cameraMode === 'fp'
          ? this.players[i].fpCamera
          : this.players[i].topCamera;
        this.renderer.setViewport(i * hw, 0, hw, this.H);
        this.renderer.setScissor(i * hw, 0, hw, this.H);
        this.renderer.render(this.scene, cam);
      }
      this.renderer.setScissorTest(false);
    } else {
      const cam = this.cameraMode === 'fp'
        ? this.players[0].fpCamera
        : this.players[0].topCamera;
      this.renderer.setViewport(0, 0, this.W, this.H);
      this.renderer.render(this.scene, cam);
    }
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    const now = performance.now();
    const dt  = Math.min((now - (this._lastTime || now)) / 1000, 0.05);
    this._lastTime = now;
    this.update(dt);
    this.render();
  }

  toggleCamera() {
    this.cameraMode = this.cameraMode === 'fp' ? 'top' : 'fp';
    document.getElementById('cameraBtn').textContent =
      this.cameraMode === 'fp' ? '📷 Vue dessus' : '🔙 Vue 1ère personne';
  }

  exportMaze() {
    if (!this.mazeData) return;
    const data = JSON.stringify({ seed: this.mazeSeed, mazeData: this.mazeData });
    const blob  = new Blob([data], { type: 'application/json' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href = url;
    a.download = `maze_${this.mazeSeed}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importMaze(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const json = JSON.parse(e.target.result);
        this.importedMaze = json.mazeData;
        document.getElementById('seedInput').value = json.seed || 'imported';
        alert('Labyrinthe importé ! Cliquez sur Jouer.');
      } catch {
        alert('Fichier invalide.');
      }
    };
    reader.readAsText(file);
  }

  restartGame() {
    const seed = this.mazeSeed;
    this.importedMaze = null;
    this.start(seed);
  }

  newGame() {
    document.getElementById('winOverlay').style.display   = 'none';
    document.getElementById('startOverlay').style.display = 'flex';
  }

  setMultiplayer(enabled) {
    this.multiplayer = enabled;
    document.getElementById('controls-hint').textContent = enabled
      ? 'P1: WASD pour tourner/avancer | P2: IJKL pour tourner/avancer | C = caméra'
      : 'ZQSD / WASD = déplacer | C = changer caméra';
  }
}
