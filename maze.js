class SeededRandom {
  constructor(seed) {
    this.seed = seed | 0 || 1;
  }

  next() {
    let t = (this.seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

class MazeGenerator {
  static generate(cols, rows, rng) {
    const grid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({
        N: true, S: true, E: true, W: true, visited: false
      }))
    );

    const stack = [];
    const start = { r: 0, c: 0 };
    grid[start.r][start.c].visited = true;
    stack.push(start);

    const dirs = [
      { dr: -1, dc:  0, from: 'S', to: 'N' },
      { dr:  1, dc:  0, from: 'N', to: 'S' },
      { dr:  0, dc:  1, from: 'W', to: 'E' },
      { dr:  0, dc: -1, from: 'E', to: 'W' },
    ];

    while (stack.length) {
      const { r, c } = stack[stack.length - 1];

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

      for (let i = neighbors.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
      }

      const next = neighbors[0];
      grid[r][c][next.to] = false;
      grid[next.r][next.c][next.from] = false;
      grid[next.r][next.c].visited = true;
      stack.push({ r: next.r, c: next.c });
    }

    return { grid, cols, rows };
  }
}
