import { customElement } from 'aurelia';

// ---------------------------------------------------------------------------
// Piece definitions (each piece: color + array of square rotation matrices).
// Most pieces use 4×4 matrices; larger pieces (e.g. the L-pentomino) use a
// 5×5 matrix. All game logic iterates over the actual matrix dimensions, so
// pieces are not restricted to a fixed size.
// ---------------------------------------------------------------------------
const TETROMINOES = [
  { // I
    color: '#0e7490',
    shapes: [
      [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
      [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
      [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
    ]
  },
  { // O
    color: '#b45309',
    shapes: [
      [[0,0,0,0],[0,1,1,0],[0,1,1,0],[0,0,0,0]],
      [[0,0,0,0],[0,1,1,0],[0,1,1,0],[0,0,0,0]],
      [[0,0,0,0],[0,1,1,0],[0,1,1,0],[0,0,0,0]],
      [[0,0,0,0],[0,1,1,0],[0,1,1,0],[0,0,0,0]],
    ]
  },
  { // T
    color: '#7e22ce',
    shapes: [
      [[0,0,0,0],[0,1,1,1],[0,0,1,0],[0,0,0,0]],
      [[0,0,1,0],[0,1,1,0],[0,0,1,0],[0,0,0,0]],
      [[0,0,1,0],[0,1,1,1],[0,0,0,0],[0,0,0,0]],
      [[0,0,1,0],[0,0,1,1],[0,0,1,0],[0,0,0,0]],
    ]
  },
  { // S
    color: '#15803d',
    shapes: [
      [[0,0,0,0],[0,0,1,1],[0,1,1,0],[0,0,0,0]],
      [[0,0,1,0],[0,0,1,1],[0,0,0,1],[0,0,0,0]],
      [[0,0,0,0],[0,0,1,1],[0,1,1,0],[0,0,0,0]],
      [[0,0,1,0],[0,0,1,1],[0,0,0,1],[0,0,0,0]],
    ]
  },
  { // Z
    color: '#b91c1c',
    shapes: [
      [[0,0,0,0],[0,1,1,0],[0,0,1,1],[0,0,0,0]],
      [[0,0,0,1],[0,0,1,1],[0,0,1,0],[0,0,0,0]],
      [[0,0,0,0],[0,1,1,0],[0,0,1,1],[0,0,0,0]],
      [[0,0,0,1],[0,0,1,1],[0,0,1,0],[0,0,0,0]],
    ]
  },
  { // J
    color: '#1d4ed8',
    shapes: [
      [[0,0,0,0],[0,1,1,1],[0,0,0,1],[0,0,0,0]],
      [[0,0,1,1],[0,0,1,0],[0,0,1,0],[0,0,0,0]],
      [[0,1,0,0],[0,1,1,1],[0,0,0,0],[0,0,0,0]],
      [[0,0,1,0],[0,0,1,0],[0,1,1,0],[0,0,0,0]],
    ]
  },
  { // L
    color: '#c2410c',
    shapes: [
      [[0,0,0,0],[0,1,1,1],[0,1,0,0],[0,0,0,0]],
      [[0,0,1,0],[0,0,1,0],[0,0,1,1],[0,0,0,0]],
      [[0,0,0,1],[0,1,1,1],[0,0,0,0],[0,0,0,0]],
      [[0,1,1,0],[0,0,1,0],[0,0,1,0],[0,0,0,0]],
    ]
  },
  { // L5 - L-shaped pentomino: long side is 4 cells + 1 foot (5 cells total)
    color: '#0f766e',
    shapes: [
      [[0,0,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,1,0,0]],
      [[0,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
      [[0,0,1,1,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,0,0,0]],
      [[0,0,0,0,0],[0,0,0,0,1],[0,1,1,1,1],[0,0,0,0,0],[0,0,0,0,0]],
    ]
  },
  { // I5 - straight pentomino: a bar of 5 cells
    color: '#4338ca',
    shapes: [
      [[0,0,0,0,0],[0,0,0,0,0],[1,1,1,1,1],[0,0,0,0,0],[0,0,0,0,0]],
      [[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
      [[0,0,0,0,0],[0,0,0,0,0],[1,1,1,1,1],[0,0,0,0,0],[0,0,0,0,0]],
      [[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
    ]
  },
  { // S5 - S-shaped pentomino (5 cells)
    color: '#4d7c0f',
    shapes: [
      [[0,0,0,0,0],[0,1,1,1,0],[0,0,1,1,0],[0,0,0,0,0],[0,0,0,0,0]],
      [[0,1,0,0,0],[0,1,0,0,0],[0,1,1,0,0],[0,0,1,0,0],[0,0,0,0,0]],
      [[0,0,0,0,0],[0,1,1,1,0],[0,0,1,1,0],[0,0,0,0,0],[0,0,0,0,0]],
      [[0,0,0,1,0],[0,0,0,1,0],[0,0,1,1,0],[0,0,1,0,0],[0,0,0,0,0]],
    ]
  },
  { // Z5 - Z-shaped pentomino (5 cells)
    color: '#be185d',
    shapes: [
      [[0,0,0,0,0],[0,1,1,1,0],[0,1,1,0,0],[0,0,0,0,0],[0,0,0,0,0]],
      [[0,0,0,0,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,1,1,0],[0,0,1,0,0]],
      [[0,0,0,0,0],[0,1,1,0,0],[0,1,1,1,0],[0,0,0,0,0],[0,0,0,0,0]],
      [[0,0,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,1,0,0],[0,0,1,0,0]],
    ]
  },
  
];

const ROWS = 20;
const DEFAULT_COLS = 10;
const MIN_COLS = 6;
const NEXT_PREVIEW_CELLS = 4;
const FLASH_DURATION_MS = 350;   // how long full rows flash white before clearing
const FALL_ROWS_PER_SEC = 30;    // gravity animation speed for surviving blocks

function randomTetromino() {
  return TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
}

@customElement('dbs-quadrisgame')
export class Quadrisgame {
  // Aurelia refs bound via ref="..."
  containerEl = null;
  boardCanvas = null;
  nextCanvas = null;

  // observable state (bound in template)
  mode = 'intro'; // 'intro' | 'playing' | 'gameover'
  score = 0;
  level = 1;

  // internal game state (not bound)
  _board = null;
  _current = null;     // { tetromino, rotation, x, y }
  _next = null;        // tetromino
  _cols = DEFAULT_COLS; // dynamic board width in cells
  _cellSize = 0;
  _animId = null;
  _dropInterval = 800; // ms
  _lastDrop = 0;
  _keyHandler = null;
  _resizeObserver = null;
  _resizeTimeout = null;

  // line-clear animation state
  _phase = 'active';   // 'active' | 'flash' | 'falling'
  _fullRows = [];      // rows currently flashing before removal
  _flashStart = 0;
  _fallingCells = [];  // [{ col, color, y (float row), targetRow }]
  _lastFall = 0;

  // ---------- lifecycle ----------------------------------------------------

  attached() {
    this._setupResizeObserver();
  }

  detaching() {
    this._stopGame();
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._resizeTimeout) {
      clearTimeout(this._resizeTimeout);
      this._resizeTimeout = null;
    }
  }

  // ---------- resize handling ----------------------------------------------

  _setupResizeObserver() {
    this._resizeObserver = new ResizeObserver(() => {
      // Debounce resize to avoid thrashing
      if (this._resizeTimeout) clearTimeout(this._resizeTimeout);
      this._resizeTimeout = setTimeout(() => {
        this._onResize();
      }, 150);
    });
    this._resizeObserver.observe(this.containerEl);
  }

  _onResize() {
    // Resize only has an effect in intro (mode 1) and game over (mode 3),
    // which are pure CSS-driven layouts and adapt automatically.
    // During play (mode 2) resize is ignored so the game is not interrupted.
  }

  // ---------- public actions -----------------------------------------------

  startGame() {
    this.score = 0;
    this.level = 1;
    this._dropInterval = 800;
    this.mode = 'playing';

    // Wait for Aurelia to render the canvas elements
    setTimeout(() => {
      this._initCanvases();
      this._board = this._emptyBoard();
      this._phase = 'active';
      this._fullRows = [];
      this._fallingCells = [];
      this._next = randomTetromino();
      this._spawnPiece();
      this._bindKeys();
      this._lastDrop = performance.now();
      this._loop(performance.now());
    }, 0);
  }

  goToIntro() {
    this._stopGame();
    this.mode = 'intro';
    this.score = 0;
    this.level = 1;
  }

  // ---------- canvas setup -------------------------------------------------

  _initCanvases() {
    const containerW = this.containerEl.clientWidth;
    const containerH = this.containerEl.clientHeight;

    // Reserve space on the right for the side panel (score/level/next/help)
    // and for the container padding.
    const sidePanelW = 110;
    const gap = 16;
    const padding = 12;
    const availW = containerW - sidePanelW - gap - padding * 2;
    const availH = containerH - padding * 2;

    // Cell size is determined by the fixed number of rows (board height).
    this._cellSize = Math.max(8, Math.floor(availH / ROWS));

    // Board width (columns) is recomputed to fill the available width
    // after reserving space for the side panel.
    this._cols = Math.max(MIN_COLS, Math.floor(availW / this._cellSize));

    const bw = this._cellSize * this._cols;
    const bh = this._cellSize * ROWS;

    this.boardCanvas.width = bw;
    this.boardCanvas.height = bh;

    const nextCellSize = this._cellSize;
    this.nextCanvas.width = nextCellSize * NEXT_PREVIEW_CELLS;
    this.nextCanvas.height = nextCellSize * NEXT_PREVIEW_CELLS;
  }

  // ---------- board helpers ------------------------------------------------

  _emptyBoard() {
    return Array.from({ length: ROWS }, () => Array(this._cols).fill(null));
  }

  _spawnPiece() {
    const tetromino = this._next;
    this._next = randomTetromino();
    this._current = {
      tetromino,
      rotation: 0,
      x: Math.floor(this._cols / 2) - 2,
      y: 0,
    };
    // Game over check
    if (!this._canPlace(this._current)) {
      this._gameOver();
    }
  }

  _shape(piece) {
    return piece.tetromino.shapes[piece.rotation];
  }

  _canPlace(piece, dx = 0, dy = 0, rotation = piece.rotation) {
    const shape = piece.tetromino.shapes[rotation];
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (!shape[row][col]) continue;
        const nx = piece.x + col + dx;
        const ny = piece.y + row + dy;
        if (nx < 0 || nx >= this._cols || ny >= ROWS) return false;
        if (ny < 0) continue; // above board is ok during spawn
        if (this._board[ny][nx]) return false;
      }
    }
    return true;
  }

  _lockPiece() {
    const piece = this._current;
    const shape = this._shape(piece);
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (!shape[row][col]) continue;
        const nx = piece.x + col;
        const ny = piece.y + row;
        if (ny >= 0 && ny < ROWS) {
          this._board[ny][nx] = piece.tetromino.color;
        }
      }
    }
    this._current = null;

    const full = this._findFullRows();
    if (full.length > 0) {
      // Start the clear animation: rows flash white, then survivors fall.
      this._fullRows = full;
      this._phase = 'flash';
      this._flashStart = performance.now();
    } else {
      this._spawnPiece();
    }
  }

  _findFullRows() {
    const rows = [];
    for (let row = 0; row < ROWS; row++) {
      if (this._board[row].every(cell => cell !== null)) rows.push(row);
    }
    return rows;
  }

  // Build the falling-cell list: full rows are removed and every surviving
  // cell gets a target position after per-column gravity is applied.
  _startFalling() {
    const fullSet = new Set(this._fullRows);
    const falling = [];
    for (let col = 0; col < this._cols; col++) {
      const survivors = [];
      for (let row = 0; row < ROWS; row++) {
        if (fullSet.has(row)) continue;
        const color = this._board[row][col];
        if (color) survivors.push({ row, color });
      }
      // Assign target rows from the bottom up, preserving order.
      let target = ROWS - 1;
      for (let i = survivors.length - 1; i >= 0; i--) {
        falling.push({
          col,
          color: survivors[i].color,
          y: survivors[i].row,      // current (animated) row position
          targetRow: target,
        });
        target--;
      }
    }
    this._fallingCells = falling;
    this._board = this._emptyBoard(); // rebuilt on finalize; rendered from list
    this._phase = 'falling';
    this._lastFall = performance.now();

    // If nothing actually needs to move, finalize immediately.
    if (falling.every(c => c.y >= c.targetRow)) {
      this._finalizeClear();
    }
  }

  _finalizeClear() {
    for (const cell of this._fallingCells) {
      this._board[cell.targetRow][cell.col] = cell.color;
    }
    const cleared = this._fullRows.length;
    this.score += cleared;
    this.level = Math.floor(this.score / 10) + 1;
    this._dropInterval = Math.max(100, 800 - (this.level - 1) * 70);

    this._fallingCells = [];
    this._fullRows = [];
    this._phase = 'active';
    this._lastDrop = performance.now();
    this._spawnPiece();
  }

  // ---------- key input ----------------------------------------------------

  _bindKeys() {
    this._keyHandler = (e) => {
      if (this.mode !== 'playing' || this._phase !== 'active' || !this._current) return;
      const p = this._current;
      switch (e.key) {
        case 'ArrowLeft':
          if (this._canPlace(p, -1, 0)) p.x--;
          break;
        case 'ArrowRight':
          if (this._canPlace(p, 1, 0)) p.x++;
          break;
        case 'ArrowDown':
          if (this._canPlace(p, 0, 1)) p.y++;
          else this._lockPiece();
          break;
        case 'ArrowUp': {
          const nextRot = (p.rotation + 1) % 4;
          if (this._canPlace(p, 0, 0, nextRot)) p.rotation = nextRot;
          break;
        }
        case ' ':
        case 'Space': {
          // Hard drop
          while (this._canPlace(p, 0, 1)) p.y++;
          this._lockPiece();
          break;
        }
        default:
          return;
      }
      e.preventDefault();
      this._draw();
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  _unbindKeys() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
  }

  // ---------- game loop ----------------------------------------------------

  _loop(timestamp) {
    if (this.mode !== 'playing') return;

    if (this._phase === 'active') {
      if (timestamp - this._lastDrop >= this._dropInterval) {
        this._lastDrop = timestamp;
        if (this._canPlace(this._current, 0, 1)) {
          this._current.y++;
        } else {
          this._lockPiece();
        }
      }
    } else if (this._phase === 'flash') {
      if (timestamp - this._flashStart >= FLASH_DURATION_MS) {
        this._startFalling();
      }
    } else if (this._phase === 'falling') {
      this._updateFalling(timestamp);
    }

    this._draw();
    this._animId = requestAnimationFrame((ts) => this._loop(ts));
  }

  _updateFalling(timestamp) {
    const dt = (timestamp - this._lastFall) / 1000;
    this._lastFall = timestamp;
    const step = FALL_ROWS_PER_SEC * dt;
    let settled = true;
    for (const cell of this._fallingCells) {
      if (cell.y < cell.targetRow) {
        cell.y = Math.min(cell.targetRow, cell.y + step);
        if (cell.y < cell.targetRow) settled = false;
      }
    }
    if (settled) this._finalizeClear();
  }

  _stopGame() {
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
    this._unbindKeys();
  }

  _gameOver() {
    this._stopGame();
    this.mode = 'gameover';
  }

  // ---------- rendering ----------------------------------------------------

  _draw() {
    if (!this.boardCanvas || !this.nextCanvas) return;
    this._drawBoard();
    this._drawNext();
  }

  _drawBoard() {
    const ctx = this.boardCanvas.getContext('2d');
    const cs = this._cellSize;
    const w = this.boardCanvas.width;
    const h = this.boardCanvas.height;

    // Background
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 0.5;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < this._cols; c++) {
        ctx.strokeRect(c * cs, r * cs, cs, cs);
      }
    }

    // Falling animation: render survivors at their interpolated positions.
    if (this._phase === 'falling') {
      for (const cell of this._fallingCells) {
        this._drawCell(ctx, cell.col, cell.y, cell.color, cs);
      }
      return;
    }

    // Flash phase: full rows blink white before disappearing.
    const flashing = this._phase === 'flash';
    const flashSet = flashing ? new Set(this._fullRows) : null;
    const flashOn = flashing
      ? Math.floor((performance.now() - this._flashStart) / 90) % 2 === 0
      : false;

    // Locked cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < this._cols; c++) {
        const color = this._board[r][c];
        if (color) {
          if (flashSet && flashSet.has(r)) {
            this._drawCell(ctx, c, r, flashOn ? '#ffffff' : '#e0e0ff', cs);
          } else {
            this._drawCell(ctx, c, r, color, cs);
          }
        }
      }
    }

    // Ghost and current piece only exist during active play.
    if (this._phase !== 'active' || !this._current) return;

    // Ghost piece (drop preview)
    const ghost = { ...this._current };
    while (this._canPlace(ghost, 0, 1)) ghost.y++;
    const ghostShape = this._shape(ghost);
    for (let row = 0; row < ghostShape.length; row++) {
      for (let col = 0; col < ghostShape[row].length; col++) {
        if (!ghostShape[row][col]) continue;
        const gx = ghost.x + col;
        const gy = ghost.y + row;
        if (gy >= 0 && gy < ROWS) {
          ctx.globalAlpha = 0.25;
          this._drawCell(ctx, gx, gy, this._current.tetromino.color, cs);
          ctx.globalAlpha = 1;
        }
      }
    }

    // Current piece
    const shape = this._shape(this._current);
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (!shape[row][col]) continue;
        const px = this._current.x + col;
        const py = this._current.y + row;
        if (py >= 0 && py < ROWS) {
          this._drawCell(ctx, px, py, this._current.tetromino.color, cs);
        }
      }
    }
  }

  _drawNext() {
    const ctx = this.nextCanvas.getContext('2d');
    const cs = this._cellSize;
    const shape = this._next.shapes[0];
    const dim = Math.max(shape.length, NEXT_PREVIEW_CELLS);
    const sz = cs * dim;

    if (this.nextCanvas.width !== sz || this.nextCanvas.height !== sz) {
      this.nextCanvas.width = sz;
      this.nextCanvas.height = sz;
    }

    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, sz, sz);

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          this._drawCell(ctx, col, row, this._next.color, cs);
        }
      }
    }
  }

  _drawCell(ctx, cx, cy, color, cs) {
    const x = cx * cs;
    const y = cy * cs;
    const m = Math.max(1, Math.floor(cs * 0.07)); // margin
    ctx.fillStyle = color;
    ctx.fillRect(x + m, y + m, cs - m * 2, cs - m * 2);

    // Simple 3-D highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x + m, y + m, cs - m * 2, m);
    ctx.fillRect(x + m, y + m, m, cs - m * 2);

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + m, y + cs - m * 2, cs - m * 2, m);
    ctx.fillRect(x + cs - m * 2, y + m, m, cs - m * 2);
  }
}
