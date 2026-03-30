// =====================================================================
// SEEDED RANDOM NUMBER GENERATOR (Mulberry32)
// =====================================================================

/**
 * Générateur pseudo-aléatoire déterministe basé sur l'algorithme Mulberry32.
 * Permet de reproduire exactement le même labyrinthe à partir d'une seed.
 */
class SeededRandom {
  /**
   * @param {number} seed - Valeur entière servant de graine
   */
  constructor(seed) {
    this.seed = seed | 0 || 1;
  }

  /**
   * Retourne un flottant dans [0, 1[
   * @returns {number}
   */
  next() {
    let t = (this.seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Retourne un entier dans [min, max] (bornes incluses)
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}


// =====================================================================
// MAZE GENERATOR — Recursive Backtracker
// =====================================================================

/**
 * Génère un labyrinthe parfait (sans îles) via l'algorithme
 * du backtracker récursif (DFS avec pile).
 */
class MazeGenerator {
  /**
   * @param {number} cols  - Nombre de colonnes de cellules
   * @param {number} rows  - Nombre de lignes de cellules
   * @param {SeededRandom} rng - Instance du RNG
   * @returns {{ grid: Array, cols: number, rows: number }}
   *   grid[r][c] contient { N, S, E, W: boolean } indiquant si le mur est présent
   */
  static generate(cols, rows, rng) {
    // Initialisation : tous les murs fermés
    const grid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({
        N: true, S: true, E: true, W: true, visited: false
      }))
    );

    const stack = [];
    const start = { r: 0, c: 0 };
    grid[start.r][start.c].visited = true;
    stack.push(start);

    // Directions possibles + correspondance des murs opposés
    const dirs = [
      { dr: -1, dc:  0, from: 'S', to: 'N' },
      { dr:  1, dc:  0, from: 'N', to: 'S' },
      { dr:  0, dc:  1, from: 'W', to: 'E' },
      { dr:  0, dc: -1, from: 'E', to: 'W' },
    ];

    while (stack.length) {
      const { r, c } = stack[stack.length - 1];

      // Voisins non visités
      const neighbors = dirs
        .map(d => ({ r: r + d.dr, c: c + d.dc, from: d.from, to: d.to }))
        .filter(n =>
          n.r >= 0 && n.r < rows &&
          n.c >= 0 && n.c < cols &&
          !grid[n.r][n.c].visited
        );

      if (neighbors.length === 0) {
        stack.pop();
        continue;
      }

      // Mélange aléatoire (Fisher-Yates)
      for (let i = neighbors.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
      }

      const next = neighbors[0];
      // Abattre le mur entre la cellule courante et la suivante
      grid[r][c][next.to] = false;
      grid[next.r][next.c][next.from] = false;
      grid[next.r][next.c].visited = true;
      stack.push({ r: next.r, c: next.c });
    }

    return { grid, cols, rows };
  }
}


// =====================================================================
// TEXTURE BUILDER — Textures procédurales via Canvas 2D
// =====================================================================

/**
 * Fabrique des textures Three.js en dessinant sur un canvas 2D.
 * Aucune image externe n'est nécessaire.
 */
class TextureBuilder {
  /** Carrelage avec joints pour le sol */
  static createFloorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#8a7a6a';
    ctx.fillRect(0, 0, 256, 256);

    // Joints de carrelage
    ctx.strokeStyle = '#5a4a3a';
    ctx.lineWidth = 4;
    const tile = 64;
    for (let x = 0; x <= 256; x += tile) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
    }
    for (let y = 0; y <= 256; y += tile) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
    }

    // Bruit de surface
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 256, y = Math.random() * 256;
      const v = Math.random() > 0.5 ? 20 : -20;
      ctx.fillStyle = `rgba(${128 + v},${118 + v},${108 + v},0.15)`;
      ctx.fillRect(x, y, 2, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
  }

  /** Briques décalées pour les murs */
  static createWallTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#7a8a9a';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#4a5a6a';
    ctx.lineWidth = 3;
    const bh = 32, bw = 64;

    for (let row = 0; row * bh < 256; row++) {
      const offset = (row % 2) * (bw / 2);
      ctx.beginPath(); ctx.moveTo(0, row * bh); ctx.lineTo(256, row * bh); ctx.stroke();
      for (let col = -1; col * bw < 256; col++) {
        const x = col * bw + offset;
        ctx.beginPath(); ctx.moveTo(x, row * bh); ctx.lineTo(x, (row + 1) * bh); ctx.stroke();
      }
    }

    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 256, y = Math.random() * 256;
      const v = Math.random() > 0.5 ? 15 : -15;
      ctx.fillStyle = `rgba(${120 + v},${130 + v},${140 + v},0.1)`;
      ctx.fillRect(x, y, 2, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    return tex;
  }

  /** Plafond sombre uni */
  static createCeilingTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#334';
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    return tex;
  }

  /** Marquage vert en damier pour la case de sortie */
  static createGoalTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a3';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#2f6';
    for (let i = 0; i < 64; i += 8) {
      ctx.fillRect(i, 0, 4, 64);
      ctx.fillRect(0, i, 64, 4);
    }
    return new THREE.CanvasTexture(canvas);
  }
}


// =====================================================================
// PLAYER
// =====================================================================

/**
 * Représente un joueur : modèle 3D, caméras et physique de déplacement.
 */
class Player {
  /**
   * @param {THREE.Scene}   scene    - Scène Three.js parente
   * @param {THREE.Vector3} startPos - Position initiale
   * @param {number}        color    - Couleur hexadécimale (ex. 0x44aaff)
   * @param {object}        keys     - Mapping clavier { forward, backward, left, right }
   */
  constructor(scene, startPos, color, keys) {
    this.scene = scene;
    this.keys  = keys;
    this.speed = 4;
    this.size  = 0.3;   // rayon de collision
    this.color = color;
    this.angle = 0;     // angle de rotation autour de l'axe Y (radians)

    // --- Modèle 3D : capsule stylisée (cylindre + sphère) ---
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

    // --- Caméra première personne (attachée au groupe) ---
    this.fpCamera = new THREE.PerspectiveCamera(75, 1, 0.05, 200);
    this.fpCamera.position.set(0, 0.9, 0);
    this.group.add(this.fpCamera);

    // --- Caméra vue du dessus (indépendante, mise à jour chaque frame) ---
    this.topCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);
  }

  /** Raccourci vers la position 3D du groupe */
  get position() { return this.group.position; }

  /**
   * Repositionne la caméra top-down pour qu'elle surplombe le joueur.
   * @param {number} mazeWorldSize - Dimension max du labyrinthe (pour l'altitude)
   */
  updateTopCamera(mazeWorldSize) {
    this.topCamera.position.set(
      this.group.position.x,
      mazeWorldSize * 1.1 + 10,
      this.group.position.z
    );
    this.topCamera.lookAt(this.group.position);
  }

  /**
   * Applique les entrées clavier et déplace le joueur en gérant les collisions.
   * @param {number}   dt          - Delta time (secondes)
   * @param {Set}      pressedKeys - Ensemble des codes de touches actives
   * @param {Function} collides    - (pos: THREE.Vector3, radius: number) => boolean
   */
  update(dt, pressedKeys, collides) {
    const moveForward  = pressedKeys.has(this.keys.forward);
    const moveBackward = pressedKeys.has(this.keys.backward);
    const turnLeft     = pressedKeys.has(this.keys.left);
    const turnRight    = pressedKeys.has(this.keys.right);

    // Rotation
    if (turnLeft)  this.angle += 1.8 * dt;
    if (turnRight) this.angle -= 1.8 * dt;
    this.group.rotation.y = this.angle;

    // Vecteur de direction (dans le plan XZ)
    const dir  = new THREE.Vector3(-Math.sin(this.angle), 0, -Math.cos(this.angle));
    const move = new THREE.Vector3();
    if (moveForward)  move.addScaledVector(dir,  this.speed * dt);
    if (moveBackward) move.addScaledVector(dir, -this.speed * dt);

    // Collision axe X séparément de l'axe Z (sliding sur les murs)
    const tryX = this.group.position.clone(); tryX.x += move.x;
    if (!collides(tryX, this.size)) this.group.position.x = tryX.x;

    const tryZ = this.group.position.clone(); tryZ.z += move.z;
    if (!collides(tryZ, this.size)) this.group.position.z = tryZ.z;
  }

  /** Retire le modèle de la scène */
  dispose() {
    this.scene.remove(this.group);
  }
}


// =====================================================================
// MAZE SCENE — Construit la scène 3D à partir de la grille
// =====================================================================

/**
 * Traduit les données brutes du labyrinthe en objets Three.js :
 * sol, plafond, murs, sortie et lumières.
 * Expose également les méthodes de collision et de détection de victoire.
 */
class MazeScene {
  /**
   * @param {THREE.Scene} scene
   * @param {{ grid, cols, rows }} mazeData
   * @param {number} cellSize   - Taille d'une cellule en unités world
   * @param {number} wallHeight - Hauteur des murs
   */
  constructor(scene, mazeData, cellSize, wallHeight) {
    this.scene     = scene;
    this.mazeData  = mazeData;
    this.cellSize  = cellSize;
    this.wallHeight = wallHeight;

    /** @type {Array<{minX,maxX,minZ,maxZ}>} Boîtes AABB des murs pour la collision */
    this.walls = [];
    /** @type {THREE.Object3D[]} Tous les objets ajoutés à la scène (pour cleanup) */
    this.objects = [];

    this.build();
  }

  get worldWidth() { return this.mazeData.cols * this.cellSize; }
  get worldDepth() { return this.mazeData.rows * this.cellSize; }

  /**
   * Construit l'intégralité de la scène 3D (sol, plafond, murs, lumières, sortie).
   */
  build() {
    const { grid, cols, rows } = this.mazeData;
    const cs = this.cellSize;
    const wh = this.wallHeight;
    const wt = 0.2; // épaisseur des murs

    // Textures procédurales
    const floorTex = TextureBuilder.createFloorTexture();
    const wallTex  = TextureBuilder.createWallTexture();
    const ceilTex  = TextureBuilder.createCeilingTexture();
    const goalTex  = TextureBuilder.createGoalTexture();

    // --- Sol ---
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(cols * cs, rows * cs),
      new THREE.MeshLambertMaterial({ map: floorTex })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cols * cs / 2, 0, rows * cs / 2);
    floor.receiveShadow = true;
    this._add(floor);

    // --- Plafond ---
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(cols * cs, rows * cs),
      new THREE.MeshLambertMaterial({ map: ceilTex })
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(cols * cs / 2, wh, rows * cs / 2);
    this._add(ceil);

    // --- Case de sortie (dernière cellule, coin bas-droit) ---
    const goal = new THREE.Mesh(
      new THREE.PlaneGeometry(cs * 0.8, cs * 0.8),
      new THREE.MeshLambertMaterial({ map: goalTex })
    );
    goal.rotation.x = -Math.PI / 2;
    goal.position.set((cols - 0.5) * cs, 0.01, (rows - 0.5) * cs);
    this._add(goal);

    // --- Murs ---
    const wallMat = new THREE.MeshLambertMaterial({ map: wallTex });

    /**
     * Ajoute un mur (boîte 3D) et son AABB pour la collision.
     * @param {number} x - Centre X
     * @param {number} z - Centre Z
     * @param {number} w - Largeur (axe X)
     * @param {number} d - Profondeur (axe Z)
     */
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

        if (cell.N) addWall(cx, cz - cs / 2, cs + wt, wt);           // Mur Nord
        if (cell.W) addWall(cx - cs / 2, cz, wt, cs + wt);           // Mur Ouest
        if (r === rows - 1 && cell.S) addWall(cx, cz + cs / 2, cs + wt, wt); // Mur Sud (bord)
        if (c === cols - 1 && cell.E) addWall(cx + cs / 2, cz, wt, cs + wt); // Mur Est (bord)
      }
    }

    // --- Lumières ---
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this._add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
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

    // Lumières ponctuelles distribuées aléatoirement dans les couloirs
    const numLights = Math.floor(cols * rows / 8);
    for (let i = 0; i < numLights; i++) {
      const light = new THREE.PointLight(0x8899ff, 0.5, cs * 3);
      light.position.set(
        Math.random() * cols * cs,
        wh * 0.7,
        Math.random() * rows * cs
      );
      this._add(light);
    }
  }

  /**
   * Ajoute un objet à la scène ET à la liste de cleanup interne.
   * @param {THREE.Object3D} obj
   */
  _add(obj) {
    this.scene.add(obj);
    this.objects.push(obj);
  }

  /**
   * Teste si une sphère (position + rayon) est en collision avec un mur.
   * @param {THREE.Vector3} pos
   * @param {number}        radius
   * @returns {boolean}
   */
  collides(pos, radius) {
    for (const w of this.walls) {
      if (
        pos.x + radius > w.minX && pos.x - radius < w.maxX &&
        pos.z + radius > w.minZ && pos.z - radius < w.maxZ
      ) return true;
    }
    return false;
  }

  /**
   * Retourne true si le joueur se trouve sur la case de sortie.
   * @param {THREE.Vector3} pos
   * @returns {boolean}
   */
  isAtGoal(pos) {
    const { cols, rows } = this.mazeData;
    const cs = this.cellSize;
    const gx = (cols - 0.5) * cs;
    const gz = (rows - 0.5) * cs;
    return Math.abs(pos.x - gx) < cs * 0.45 && Math.abs(pos.z - gz) < cs * 0.45;
  }

  /** Retire tous les objets de la scène et vide les tableaux internes */
  dispose() {
    for (const obj of this.objects) this.scene.remove(obj);
    this.objects = [];
    this.walls   = [];
  }
}


// =====================================================================
// GAME — Orchestrateur principal
// =====================================================================

/**
 * Classe principale du jeu.
 * Gère le renderer Three.js, la boucle d'animation, les joueurs,
 * le chronomètre, le mode multijoueur et les fonctions d'import/export.
 */
class Game {
  constructor() {
    // --- Renderer ---
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);

    // --- État du jeu ---
    this.pressedKeys  = new Set();
    this.cameraMode   = 'fp';   // 'fp' | 'top'
    this.multiplayer  = false;
    this.running      = false;
    this.startTime    = 0;
    this.elapsed      = 0;
    this.winnerIndex  = null;

    // --- Labyrinthe ---
    this.mazeData     = null;
    this.mazeSeed     = null;
    this.importedMaze = null;

    // --- Scène & joueurs ---
    this.scene     = null;
    this.mazeScene = null;
    this.players   = [];

    // --- Constantes de configuration ---
    this.CELL_SIZE   = 4;
    this.WALL_HEIGHT = 3;
    this.MAZE_COLS   = 10;
    this.MAZE_ROWS   = 10;

    // --- Écouteurs globaux ---
    window.addEventListener('keydown', e => {
      this.pressedKeys.add(e.code);
      if (e.code === 'KeyC') this.toggleCamera();
    });
    window.addEventListener('keyup',    e => this.pressedKeys.delete(e.code));
    window.addEventListener('resize',   () => this.onResize());

    this.onResize();
    this._animate();
  }

  // -------------------------------------------------------------------
  // Redimensionnement
  // -------------------------------------------------------------------

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

  // -------------------------------------------------------------------
  // Démarrage d'une partie
  // -------------------------------------------------------------------

  /**
   * Initialise ou réinitialise complètement une partie.
   * @param {string|null} seedOverride - Force une seed précise (rejouer)
   */
  start(seedOverride) {
    // Nettoyage de la partie précédente
    if (this.mazeScene) { this.mazeScene.dispose(); this.mazeScene = null; }
    for (const p of this.players) p.dispose();
    this.players = [];

    // Nouvelle scène Three.js
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111122);
    this.scene.fog         = new THREE.Fog(0x111122, 8, 35);

    // Génération du labyrinthe (depuis un import ou une seed)
    if (this.importedMaze) {
      this.mazeData     = this.importedMaze;
      this.mazeSeed     = 'imported';
      this.importedMaze = null;
    } else {
      const seedStr = seedOverride
        || document.getElementById('seedInput').value.trim()
        || String(Date.now());
      this.mazeSeed = seedStr;

      // Conversion de la chaîne seed en entier
      let seedNum = 0;
      for (let i = 0; i < seedStr.length; i++) {
        seedNum = (seedNum * 31 + seedStr.charCodeAt(i)) | 0;
      }
      const rng = new SeededRandom(Math.abs(seedNum));
      this.mazeData = MazeGenerator.generate(this.MAZE_COLS, this.MAZE_ROWS, rng);
    }

    // Construction de la scène 3D
    this.mazeScene = new MazeScene(this.scene, this.mazeData, this.CELL_SIZE, this.WALL_HEIGHT);

    // Création des joueurs
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

    // Réinitialisation de l'UI
    this.cameraMode = 'fp';
    document.getElementById('cameraBtn').textContent  = '📷 Vue dessus';
    document.getElementById('p1label').style.display  = this.multiplayer ? 'block' : 'none';
    document.getElementById('p2label').style.display  = this.multiplayer ? 'block' : 'none';
    document.getElementById('startOverlay').style.display = 'none';
    document.getElementById('winOverlay').style.display   = 'none';
    document.getElementById('exportBtn').style.display    = 'inline-block';

    // Chronomètre
    this.running     = true;
    this.startTime   = performance.now();
    this.elapsed     = 0;
    this.winnerIndex = null;
  }

  // -------------------------------------------------------------------
  // Boucle de jeu
  // -------------------------------------------------------------------

  /**
   * Mise à jour logique (déplacement, détection victoire, chrono).
   * @param {number} dt - Delta time en secondes
   */
  update(dt) {
    if (!this.running) return;

    // Chronomètre
    this.elapsed = (performance.now() - this.startTime) / 1000;
    const m = Math.floor(this.elapsed / 60).toString().padStart(2, '0');
    const s = Math.floor(this.elapsed % 60).toString().padStart(2, '0');
    document.getElementById('timer').textContent = `⏱ ${m}:${s}`;

    // Mise à jour de chaque joueur
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      p.update(dt, this.pressedKeys, (pos, r) => this.mazeScene.collides(pos, r));
      p.updateTopCamera(Math.max(this.mazeScene.worldWidth, this.mazeScene.worldDepth));

      // Détection de victoire (premier joueur à la sortie)
      if (this.mazeScene.isAtGoal(p.position) && this.winnerIndex === null) {
        this.winnerIndex = i;
        this._showWin(i);
      }
    }
  }

  /**
   * Affiche l'écran de victoire.
   * @param {number} playerIndex
   */
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

  /**
   * Rendu de la frame courante.
   * Gère le split-screen en mode multijoueur via setViewport / setScissor.
   */
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

  /** Boucle d'animation principale (requestAnimationFrame) */
  _animate() {
    requestAnimationFrame(() => this._animate());
    const now = performance.now();
    const dt  = Math.min((now - (this._lastTime || now)) / 1000, 0.05);
    this._lastTime = now;
    this.update(dt);
    this.render();
  }

  // -------------------------------------------------------------------
  // Actions utilisateur
  // -------------------------------------------------------------------

  /** Bascule entre vue première personne et vue aérienne */
  toggleCamera() {
    this.cameraMode = this.cameraMode === 'fp' ? 'top' : 'fp';
    document.getElementById('cameraBtn').textContent =
      this.cameraMode === 'fp' ? '📷 Vue dessus' : '🔙 Vue 1ère personne';
  }

  /** Exporte le labyrinthe actuel en fichier JSON téléchargeable */
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

  /**
   * Importe un labyrinthe depuis un fichier JSON.
   * @param {Event} event - Événement change de l'input file
   */
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

  /** Relance une partie sur le même labyrinthe */
  restartGame() {
    const seed = this.mazeSeed;
    this.importedMaze = null;
    this.start(seed);
  }

  /** Retourne à l'écran de démarrage pour choisir un nouveau labyrinthe */
  newGame() {
    document.getElementById('winOverlay').style.display   = 'none';
    document.getElementById('startOverlay').style.display = 'flex';
  }

  /**
   * Active ou désactive le mode multijoueur local (split-screen).
   * @param {boolean} enabled
   */
  setMultiplayer(enabled) {
    this.multiplayer = enabled;
    document.getElementById('controls-hint').textContent = enabled
      ? 'P1: WASD pour tourner/avancer | P2: IJKL pour tourner/avancer | C = caméra'
      : 'ZQSD / WASD = déplacer | C = changer caméra';
  }
}


// =====================================================================
// INITIALISATION — Point d'entrée
// =====================================================================

const game = new Game();

// Fonctions globales appelées depuis les attributs onclick du HTML
function startGame()    { game.start(null); }
function toggleCamera() { game.toggleCamera(); }
function restartGame()  { game.restartGame(); }
function newGame()      { game.newGame(); }
function exportMaze()   { game.exportMaze(); }
function importMaze(e)  { game.importMaze(e); }
function toggleMulti()  { game.setMultiplayer(document.getElementById('multiCheck').checked); }