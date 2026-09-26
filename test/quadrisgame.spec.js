import { Quadrisgame } from '../src/quadrisgame/quadrisgame.js';

// O piece: 4x4 shape with block at rows 1-2, cols 1-2
const O_PIECE = {
  color: '#b45309',
  shapes: [
    [[0, 0, 0, 0], [0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
    [[0, 0, 0, 0], [0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
    [[0, 0, 0, 0], [0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
    [[0, 0, 0, 0], [0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
  ],
};

function makeGame() {
  const g = new Quadrisgame();
  g._cols = 10;
  g._board = g._emptyBoard();
  g._draw = jest.fn();
  return g;
}

beforeEach(() => {
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(), disconnect: jest.fn(),
  }));
  global.requestAnimationFrame = jest.fn(() => 1);
  global.cancelAnimationFrame = jest.fn();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  console.log.mockRestore();
  jest.useRealTimers();
  delete global.ResizeObserver;
  delete global.requestAnimationFrame;
  delete global.cancelAnimationFrame;
});

describe('Quadrisgame board helpers', () => {
  it('_emptyBoard builds 20 rows of cols', () => {
    const g = makeGame();
    expect(g._board).toHaveLength(20);
    expect(g._board[0]).toHaveLength(10);
    expect(g._board.flat().every((c) => c === null)).toBe(true);
  });

  it('_canPlace rejects walls, floor and collisions', () => {
    const g = makeGame();
    const at = (x, y) => ({ tetromino: O_PIECE, rotation: 0, x, y });
    expect(g._canPlace(at(0, 0))).toBe(true);
    expect(g._canPlace(at(-2, 0))).toBe(false);
    expect(g._canPlace(at(8, 0))).toBe(false); // 8+2 >= 10
    expect(g._canPlace(at(0, 19))).toBe(false); // bottom overflow
    g._board[2][2] = '#fff';
    expect(g._canPlace(at(0, 0))).toBe(false);
  });

  it('_findFullRows detects filled rows', () => {
    const g = makeGame();
    g._board[19] = Array(10).fill('#fff');
    expect(g._findFullRows()).toEqual([19]);
    expect(new Quadrisgame()._cols).toBe(10);
  });
});

describe('Quadrisgame locking and clearing', () => {
  it('_lockPiece writes cells and spawns next when no full rows', () => {
    const g = makeGame();
    g._next = O_PIECE;
    g._current = { tetromino: O_PIECE, rotation: 0, x: 0, y: 0 };
    const spawn = jest.spyOn(g, '_spawnPiece');
    g._lockPiece();
    expect(g._board[1][1]).toBe(O_PIECE.color);
    expect(g._phase).toBe('active');
    expect(spawn).toHaveBeenCalled();
  });

  it('_lockPiece starts flash phase on full row', () => {
    const g = makeGame();
    // fill bottom row except where the O piece will land
    g._board[19] = Array(10).fill('#fff');
    g._board[19][1] = null;
    g._board[19][2] = null;
    g._current = { tetromino: O_PIECE, rotation: 0, x: 0, y: 17 };
    g._lockPiece();
    expect(g._phase).toBe('flash');
    expect(g._fullRows).toEqual([19]);
  });

  it('_finalizeClear scores, levels and speeds up', () => {
    const g = makeGame();
    g._fullRows = [19];
    g._fallingCells = [];
    g._spawnPiece = jest.fn();
    g.score = 9;
    g._finalizeClear();
    expect(g.score).toBe(10);
    expect(g.level).toBe(2);
    expect(g._dropInterval).toBe(800 - 70);
    expect(g._phase).toBe('active');
    g.score = 99;
    g._fullRows = [19];
    g._finalizeClear();
    expect(g.level).toBe(11);
    expect(g._dropInterval).toBe(Math.max(100, 800 - 10 * 70));
  });

  it('_updateFalling interpolates then finalizes', () => {
    const g = makeGame();
    g._fallingCells = [{ col: 0, color: '#fff', y: 0, targetRow: 5 }];
    g._fullRows = [19];
    g._phase = 'falling';
    g._lastFall = 0;
    const fin = jest.spyOn(g, '_finalizeClear').mockImplementation(() => {});
    g._updateFalling(1000); // dt=1s -> step=30 rows, settles
    expect(g._fallingCells[0].y).toBe(5);
    expect(fin).toHaveBeenCalled();
  });
});

describe('Quadrisgame spawn / game over / keys', () => {
  it('_spawnPiece with blocked spawn triggers gameover', () => {
    const g = makeGame();
    g._next = O_PIECE;
    // block spawn area rows 1-2 across all cols
    g._board[1] = Array(10).fill('#fff');
    g._board[2] = Array(10).fill('#fff');
    g._spawnPiece();
    expect(g.mode).toBe('gameover');
  });

  it('_keyHandler moves/rotates/hard-drops only when playing+active', () => {
    const g = makeGame();
    g.mode = 'playing';
    g._phase = 'active';
    g._bindKeys();
    g._current = { tetromino: O_PIECE, rotation: 0, x: 3, y: 0 };
    const prevent = jest.fn();
    g._keyHandler({ key: 'ArrowLeft', preventDefault: prevent });
    expect(g._current.x).toBe(2);
    g._keyHandler({ key: 'ArrowRight', preventDefault: prevent });
    expect(g._current.x).toBe(3);
    g._keyHandler({ key: 'ArrowUp', preventDefault: prevent });
    expect(g._current.rotation).toBe(1);
    const y0 = g._current.y;
    g._keyHandler({ key: 'ArrowDown', preventDefault: prevent });
    expect(g._current.y).toBe(y0 + 1);
    // hard drop locks (spawns next or flashes)
    g._next = O_PIECE;
    const before = g._current;
    g._keyHandler({ key: ' ', preventDefault: prevent });
    expect(g._current).not.toBe(before);

    // gated when not playing
    g.mode = 'intro';
    g._current = { tetromino: O_PIECE, rotation: 0, x: 3, y: 0 };
    g._keyHandler({ key: 'ArrowLeft', preventDefault: prevent });
    expect(g._current.x).toBe(3);
    g._unbindKeys();
    expect(g._keyHandler).toBeNull();
  });
});

describe('Quadrisgame lifecycle', () => {
  it('startGame resets score/level/mode and boots loop', () => {
    jest.useFakeTimers();
    const g = makeGame();
    g.score = 50;
    g._initCanvases = jest.fn();
    g._bindKeys = jest.fn();
    g._loop = jest.fn();
    g.startGame();
    expect(g.score).toBe(0);
    expect(g.level).toBe(1);
    expect(g.mode).toBe('playing');
    jest.runAllTimers();
    expect(g._initCanvases).toHaveBeenCalled();
    expect(g._board).toHaveLength(20);
    expect(g._current).not.toBeNull();
    expect(g._bindKeys).toHaveBeenCalled();
    expect(g._loop).toHaveBeenCalled();
  });

  it('detaching stops loop, keys and observer', () => {
    const g = makeGame();
    g._animId = 7;
    g._keyHandler = jest.fn();
    const removeSpy = jest.spyOn(document, 'removeEventListener');
    g._resizeObserver = { disconnect: jest.fn() };
    const observer = g._resizeObserver;
    g.detaching();
    expect(global.cancelAnimationFrame).toHaveBeenCalledWith(7);
    expect(observer.disconnect).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    removeSpy.mockRestore();
  });
});
