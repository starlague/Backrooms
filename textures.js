class TextureBuilder {
  static createFloorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#d4c4a8';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#a89a7a';
    ctx.lineWidth = 4;
    const tile = 64;
    for (let x = 0; x <= 256; x += tile) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke();
    }
    for (let y = 0; y <= 256; y += tile) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
    }

    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 256, y = Math.random() * 256;
      const v = Math.random() > 0.5 ? 30 : -30;
      ctx.fillStyle = `rgba(${180 + v},${160 + v},${140 + v},0.2)`;
      ctx.fillRect(x, y, Math.random() * 3, Math.random() * 3);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
  }

  static createWallTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#e8dcc8';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#c9b898';
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

    for (let i = 0; i < 3500; i++) {
      const x = Math.random() * 256, y = Math.random() * 256;
      const v = Math.random() > 0.5 ? 40 : -40;
      ctx.fillStyle = `rgba(${200 + v},${180 + v},${160 + v},0.15)`;
      ctx.fillRect(x, y, Math.random() * 4, Math.random() * 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    return tex;
  }

  static createCeilingTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#9a8a7a';
    ctx.fillRect(0, 0, 64, 64);
    
    for (let i = 0; i < 1000; i++) {
      ctx.fillStyle = `rgba(${140 + Math.random() * 40},${130 + Math.random() * 40},${120 + Math.random() * 40},0.1)`;
      ctx.fillRect(Math.random() * 64, Math.random() * 64, 1, 1);
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    return tex;
  }

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
