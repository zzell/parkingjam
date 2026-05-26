import { Car, BoardState, SolveResult } from './types';
import { GRID_SIZE, EXIT_ROW } from './constants';
import { getTargetStatesRange } from './constants';
import { isValidPlacement } from './engine';
import { bfsSolve, solveFirstMove } from './solver';

export type GeneratorAlgorithm = 'moves' | 'complexity' | 'chain';

const SHORT_SPRITE_COUNT = 11;
const LONG_SPRITE_COUNT = 3;

function assignSprites(board: BoardState): BoardState {
  return board.map(car => ({
    ...car,
    spriteIndex: car.isTarget
      ? 0
      : Math.floor(Math.random() * (car.length === 2 ? SHORT_SPRITE_COUNT : LONG_SPRITE_COUNT)),
  }));
}

function rnd(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let carIdCounter = 0;
function nextCarId(): string {
  return `car_${carIdCounter++}`;
}

function numCarsForDifficulty(difficulty: number): number {
  return Math.min(11, Math.max(4, Math.floor(4 + difficulty / 14)));
}

// "Moves" algorithm: hard floor on minMoves, never returns below it
function minMovesForDifficulty(difficulty: number): number {
  if (difficulty <= 10) return 2;
  if (difficulty <= 20) return 3;
  if (difficulty <= 35) return 5;
  if (difficulty <= 50) return 7;
  if (difficulty <= 65) return 9;
  if (difficulty <= 80) return 11;
  if (difficulty <= 90) return 13;
  return 15;
}

// "Complexity" algorithm: score balancing statesExplored + minMoves, pick best in sample
function complexityScore(result: SolveResult, difficulty: number): number {
  if (!result.solvable && !result.timedOut) return -Infinity;
  const [, maxStates] = getTargetStatesRange(difficulty);
  const moveWeight = difficulty > 50 ? 200 : 100;
  const stateWeight = Math.log10(Math.max(1, Math.min(result.statesExplored, maxStates)));
  const timeoutBonus = result.timedOut ? 5000 : 0;
  return result.minMoves * moveWeight + stateWeight * 50 + timeoutBonus;
}

function buildBlockingBoard(numExtra: number): BoardState {
  const target: Car = {
    id: 'target',
    row: EXIT_ROW,
    col: 0,
    length: 2,
    orientation: 'horizontal',
    isTarget: true,
  };
  let board: BoardState = [target];

  const shuffledCols = [2, 3, 4, 5].sort(() => Math.random() - 0.5);
  const numBlockers = 2 + (numExtra > 7 ? 1 : 0);

  for (let b = 0; b < numBlockers; b++) {
    const col = shuffledCols[b];
    for (let tries = 0; tries < 15; tries++) {
      const row = rnd(Math.max(0, EXIT_ROW - 1), EXIT_ROW);
      const length = (Math.random() < 0.5 ? 2 : 3) as 2 | 3;
      if (row + length <= EXIT_ROW) continue;
      const car: Car = { id: nextCarId(), row, col, length, orientation: 'vertical', isTarget: false };
      if (isValidPlacement(car, board, car.id)) { board = [...board, car]; break; }
    }
  }

  for (let attempt = 0; attempt < numExtra * 8 && board.length - 1 < numExtra; attempt++) {
    const orientation: 'horizontal' | 'vertical' = Math.random() < 0.5 ? 'horizontal' : 'vertical';
    const length = (Math.random() < 0.6 ? 2 : 3) as 2 | 3;
    const row = rnd(0, GRID_SIZE - (orientation === 'vertical' ? length : 1));
    const col = rnd(0, GRID_SIZE - (orientation === 'horizontal' ? length : 1));
    const car: Car = { id: nextCarId(), row, col, length, orientation, isTarget: false };
    if (isValidPlacement(car, board, car.id)) board = [...board, car];
  }

  return board;
}

// ─── Chain generator helpers ──────────────────────────────────────────────────

function shuffleArr<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Place a vertical car at col crossing targetRow; returns the Car or null.
function placeVCrossRow(board: BoardState, col: number, targetRow: number): Car | null {
  const opts: Array<{ r: number; len: 2 | 3 }> = [];
  for (const len of [2, 3] as const) {
    for (let r = Math.max(0, targetRow - len + 1); r <= Math.min(GRID_SIZE - len, targetRow); r++) {
      opts.push({ r, len });
    }
  }
  shuffleArr(opts);
  for (const { r, len } of opts) {
    const car: Car = { id: nextCarId(), row: r, col, length: len, orientation: 'vertical', isTarget: false };
    if (isValidPlacement(car, board, car.id)) return car;
  }
  return null;
}

// Place an H car at row that includes col; returns new board or null.
function placeHCoverCol(board: BoardState, row: number, col: number): BoardState | null {
  if (row < 0 || row >= GRID_SIZE) return null;
  const opts: Array<{ c: number; len: 2 | 3 }> = [];
  for (const len of [2, 3] as const) {
    for (let c = Math.max(0, col - len + 1); c <= Math.min(GRID_SIZE - len, col); c++) {
      opts.push({ c, len });
    }
  }
  shuffleArr(opts);
  for (const { c, len } of opts) {
    const car: Car = { id: nextCarId(), row, col: c, length: len, orientation: 'horizontal', isTarget: false };
    if (isValidPlacement(car, board, car.id)) return [...board, car];
  }
  return null;
}

// Place a V car at col that includes row; returns new board or null.
function placeVCoverRow(board: BoardState, row: number, col: number): BoardState | null {
  if (col < 0 || col >= GRID_SIZE) return null;
  const opts: Array<{ r: number; len: 2 | 3 }> = [];
  for (const len of [2, 3] as const) {
    for (let r = Math.max(0, row - len + 1); r <= Math.min(GRID_SIZE - len, row); r++) {
      opts.push({ r, len });
    }
  }
  shuffleArr(opts);
  for (const { r, len } of opts) {
    const car: Car = { id: nextCarId(), row: r, col, length: len, orientation: 'vertical', isTarget: false };
    if (isValidPlacement(car, board, car.id)) return [...board, car];
  }
  return null;
}

// Add one car that directly blocks carId from reaching newPos.
function addBlockerForMove(board: BoardState, carId: string, newPos: number): BoardState | null {
  const car = board.find(c => c.id === carId);
  if (!car) return null;
  if (car.orientation === 'vertical') {
    if (newPos < car.row) {
      for (let row = car.row - 1; row >= newPos; row--) {
        const b = placeHCoverCol(board, row, car.col);
        if (b) return b;
      }
    } else {
      for (let row = car.row + car.length; row <= newPos + car.length - 1; row++) {
        const b = placeHCoverCol(board, row, car.col);
        if (b) return b;
      }
    }
  } else {
    if (newPos < car.col) {
      for (let col = car.col - 1; col >= newPos; col--) {
        const b = placeVCoverRow(board, car.row, col);
        if (b) return b;
      }
    } else {
      for (let col = car.col + car.length; col <= newPos + car.length - 1; col++) {
        const b = placeVCoverRow(board, car.row, col);
        if (b) return b;
      }
    }
  }
  return null;
}

// Build the initial dependency-chain board.
function tryBuildChainBoard(difficulty: number): BoardState | null {
  const target: Car = { id: 'target', row: EXIT_ROW, col: 0, length: 2, orientation: 'horizontal', isTarget: true };
  let board: BoardState = [target];

  const numPrimary = difficulty >= 50 ? 2 : 1;
  const addLayer3 = difficulty >= 40;

  // Layer 1 — vertical cars directly blocking the target
  const cols = shuffleArr([2, 3, 4]);
  const layer1: Car[] = [];
  for (let i = 0; i < numPrimary; i++) {
    const car = placeVCrossRow(board, cols[i], EXIT_ROW);
    if (!car) return null;
    board = [...board, car];
    layer1.push(car);
  }

  // Layer 2 — H cars blocking each layer-1 car from moving up and down
  const layer2: Car[] = [];
  for (const vCar of layer1) {
    if (vCar.row > 0) {
      const nb = placeHCoverCol(board, vCar.row - 1, vCar.col);
      if (!nb) return null;
      board = nb;
      layer2.push(board[board.length - 1]);
    }
    const botRow = vCar.row + vCar.length - 1;
    if (botRow < GRID_SIZE - 1) {
      const nb = placeHCoverCol(board, botRow + 1, vCar.col);
      if (!nb) return null;
      board = nb;
      layer2.push(board[board.length - 1]);
    }
  }

  // Layer 3 — V cars blocking each layer-2 car from moving left and right
  if (addLayer3) {
    for (const hCar of layer2) {
      if (hCar.col > 0) {
        const nb = placeVCoverRow(board, hCar.row, hCar.col - 1);
        if (nb) board = nb;
      }
      const rightCol = hCar.col + hCar.length - 1;
      if (rightCol < GRID_SIZE - 1) {
        const nb = placeVCoverRow(board, hCar.row, rightCol + 1);
        if (nb) board = nb;
      }
    }
  }

  return board;
}

// Iteratively add blockers to close shortcut paths until minMoves target is met.
function closeShortcuts(board: BoardState, minMovesTarget: number): BoardState | null {
  let b = board;
  for (let iter = 0; iter < 10; iter++) {
    const result = bfsSolve(b, 800);
    if (result.timedOut) return b;
    if (!result.solvable) return null;
    if (result.minMoves >= minMovesTarget) return b;

    const first = solveFirstMove(b);
    if (!first || first.carId === 'target') return null;

    const withBlocker = addBlockerForMove(b, first.carId, first.newPos);
    if (!withBlocker) return null;

    const check = bfsSolve(withBlocker, 500);
    if (!check.solvable && !check.timedOut) return null;
    b = withBlocker;
  }
  return null;
}

async function generateChainLevel(
  difficulty: number,
  onProgress?: (msg: string) => void
): Promise<BoardState> {
  const minMoves = minMovesForDifficulty(difficulty);
  const deadline = performance.now() + 15_000;
  let attempt = 0;

  while (performance.now() < deadline) {
    attempt++;
    carIdCounter = attempt * 50;
    if (attempt % 5 === 0) {
      await new Promise(r => setTimeout(r, 0));
      onProgress?.(`Building chain… attempt ${attempt}`);
    }
    const initial = tryBuildChainBoard(difficulty);
    if (!initial) continue;
    const result = closeShortcuts(initial, minMoves);
    if (result) return result;
  }

  return buildSimpleFallback();
}

// ──────────────────────────────────────────────────────────────────────────────

async function generateLevelRaw(
  difficulty: number,
  algorithm: GeneratorAlgorithm,
  onProgress?: (msg: string) => void
): Promise<BoardState> {
  if (algorithm === 'chain') return generateChainLevel(difficulty, onProgress);

  const numCars = numCarsForDifficulty(difficulty);
  const deadline = performance.now() + 12_000;
  let attempt = 0;

  if (algorithm === 'moves') {
    // --- Moves algorithm: return first board that clears the move floor ---
    const minMoves = minMovesForDifficulty(difficulty);
    const bfsLimit = difficulty <= 30 ? 150 : difficulty <= 60 ? 300 : 600;
    let bestBoard: BoardState | null = null;
    let bestMoves = 0;

    while (performance.now() < deadline) {
      if (attempt % 10 === 0) {
        await new Promise(r => setTimeout(r, 0));
        onProgress?.(`Searching… (best so far: ${bestMoves} moves)`);
      }
      attempt++;
      carIdCounter = attempt * 20;

      const board = buildBlockingBoard(numCars);
      const result = bfsSolve(board, bfsLimit);
      if (!result.solvable) continue;

      if (result.minMoves > bestMoves) {
        bestMoves = result.minMoves;
        bestBoard = board;
      }
      if (result.minMoves >= minMoves) return board;
    }

    if (bestBoard && bestMoves >= 2) return bestBoard;

  } else {
    // --- Complexity algorithm: sample a pool, return best score ---
    const bfsLimit = difficulty <= 30 ? 150 : difficulty <= 60 ? 300 : 600;
    const poolSize = difficulty <= 30 ? 80 : difficulty <= 60 ? 150 : 200;

    let bestBoard: BoardState | null = null;
    let bestScore = -Infinity;

    while (attempt < poolSize && performance.now() < deadline) {
      if (attempt % 10 === 0) {
        await new Promise(r => setTimeout(r, 0));
        onProgress?.(`Sampling ${attempt}/${poolSize}…`);
      }
      attempt++;
      carIdCounter = attempt * 20;

      const board = buildBlockingBoard(numCars);
      const result = bfsSolve(board, bfsLimit);
      const score = complexityScore(result, difficulty);

      if (score > bestScore) {
        bestScore = score;
        bestBoard = board;
      }
    }

    if (bestBoard) {
      const final = bfsSolve(bestBoard, 2000);
      if (final.solvable && final.minMoves >= 2) return bestBoard;
      if (final.timedOut && final.statesExplored > 200) return bestBoard;
    }
  }

  return buildSimpleFallback();
}

function buildSimpleFallback(): BoardState {
  return [
    { id: 'target', row: 2, col: 0, length: 2, orientation: 'horizontal', isTarget: true },
    { id: 'car_1', row: 1, col: 2, length: 2, orientation: 'vertical', isTarget: false },
    { id: 'car_2', row: 0, col: 4, length: 2, orientation: 'vertical', isTarget: false },
    { id: 'car_3', row: 3, col: 5, length: 2, orientation: 'vertical', isTarget: false },
  ];
}

export async function generateLevel(
  difficulty: number,
  algorithm: GeneratorAlgorithm,
  onProgress?: (msg: string) => void
): Promise<BoardState> {
  return assignSprites(await generateLevelRaw(difficulty, algorithm, onProgress));
}
