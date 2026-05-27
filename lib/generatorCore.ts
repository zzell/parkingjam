import { Car, BoardState, GenerationStats } from './types';
import { GRID_SIZE, EXIT_ROW } from './constants';
import { isValidPlacement, getValidMoves, isWon, serialize, applyMove } from './engine';
import { bfsSolve, solveFirstMove } from './solver';

export type GeneratorAlgorithm = 'moves' | 'chain';
export type ProgressFn = (msg: string, count?: number, total?: number) => void;

const SHORT_SPRITE_COUNT = 11;
const LONG_SPRITE_COUNT = 3;

export function assignSprites(board: BoardState): BoardState {
  return board.map(car => ({
    ...car,
    spriteIndex: car.isTarget
      ? 0
      : Math.floor(Math.random() * (car.length === 2 ? SHORT_SPRITE_COUNT : LONG_SPRITE_COUNT)),
  }));
}

export function buildSimpleFallback(): BoardState {
  return [
    { id: 'target', row: 2, col: 0, length: 2, orientation: 'horizontal', isTarget: true },
    { id: 'car_1', row: 1, col: 2, length: 2, orientation: 'vertical', isTarget: false },
    { id: 'car_2', row: 0, col: 4, length: 2, orientation: 'vertical', isTarget: false },
    { id: 'car_3', row: 3, col: 5, length: 2, orientation: 'vertical', isTarget: false },
  ];
}

export function minMovesForDifficulty(difficulty: number): number {
  if (difficulty <= 10) return 4;
  if (difficulty <= 30) return 8;
  if (difficulty <= 60) return 10;
  if (difficulty <= 80) return 20;
  return 30;
}

// Primary difficulty metric: BFS states explored range
export function stateRangeForDifficulty(difficulty: number): [number, number] {
  if (difficulty <= 10) return [500, 1_000];
  if (difficulty <= 30) return [1_000, 5_000];
  if (difficulty <= 60) return [5_000, 15_000];
  if (difficulty <= 80) return [15_000, 30_000];
  return [30_000, 100_000];
}

function bfsLimitForDifficulty(difficulty: number): number {
  if (difficulty <= 10) return 2_000;
  if (difficulty <= 30) return 8_000;
  if (difficulty <= 60) return 25_000;
  if (difficulty <= 80) return 50_000;
  return 150_000;
}

// Score a board by how well it fits the target range + move floor.
// 2M+ : both state range and move floor met (perfect — race exits immediately)
// 1M+ : state range met, moves short — weighted by move progress so a board
//        with more moves beats one with more states but fewer moves
// <0  : out of range — closest state distance wins, moves used as tiebreak
function boardScore(states: number, moves: number, stateMin: number, stateMax: number, minMoves: number): number {
  const inRange = states >= stateMin && (stateMax === Infinity || states <= stateMax);
  const goodMoves = moves >= minMoves;
  if (inRange && goodMoves) return 2_000_000 + states;
  const moveRatio = Math.min(1, moves / minMoves);
  if (inRange) return 1_000_000 + moveRatio * 500_000 + states;
  const dist = states < stateMin ? stateMin - states : states - stateMax;
  return -dist + moveRatio * 100_000;
}

function rnd(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let carIdCounter = 0;
function nextCarId(): string {
  return `car_${carIdCounter++}`;
}

function buildBlockingBoard(numExtra = rnd(5, 11)): BoardState {
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

function shuffleArr<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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

// Returns the ordered list of moves in the optimal solution, or null if unsolvable/timed out.
function getSolutionMoves(board: BoardState, bfsLimit = 50_000): Array<{ carId: string; newPos: number }> | null {
  if (isWon(board)) return [];
  const initKey = serialize(board);
  type Entry = { pk: string; carId: string; newPos: number } | null;
  const parentOf = new Map<string, Entry>();
  parentOf.set(initKey, null);
  const queue: Array<[BoardState, string]> = [[board, initKey]];
  let head = 0;
  while (head < queue.length && parentOf.size < bfsLimit) {
    const [state, key] = queue[head++];
    for (const car of state) {
      for (const newPos of getValidMoves(car, state)) {
        const next = applyMove(state, car.id, newPos);
        const nextKey = serialize(next);
        if (parentOf.has(nextKey)) continue;
        parentOf.set(nextKey, { pk: key, carId: car.id, newPos });
        if (isWon(next)) {
          const path: Array<{ carId: string; newPos: number }> = [];
          let curKey = nextKey;
          while (true) {
            const entry = parentOf.get(curKey)!;
            if (entry === null) break;
            path.unshift({ carId: entry.carId, newPos: entry.newPos });
            curKey = entry.pk;
          }
          return path;
        }
        queue.push([next, nextKey]);
      }
    }
  }
  return null;
}

// All valid horizontal cars covering col at row (every length × start combination).
function placeHCoverColAll(board: BoardState, row: number, col: number): BoardState[] {
  if (row < 0 || row >= GRID_SIZE) return [];
  const results: BoardState[] = [];
  for (const len of [2, 3] as const) {
    for (let c = Math.max(0, col - len + 1); c <= Math.min(GRID_SIZE - len, col); c++) {
      const car: Car = { id: nextCarId(), row, col: c, length: len, orientation: 'horizontal', isTarget: false };
      if (isValidPlacement(car, board, car.id)) results.push([...board, car]);
    }
  }
  return results;
}

// All valid vertical cars covering row at col.
function placeVCoverRowAll(board: BoardState, row: number, col: number): BoardState[] {
  if (col < 0 || col >= GRID_SIZE) return [];
  const results: BoardState[] = [];
  for (const len of [2, 3] as const) {
    for (let r = Math.max(0, row - len + 1); r <= Math.min(GRID_SIZE - len, row); r++) {
      const car: Car = { id: nextCarId(), row: r, col, length: len, orientation: 'vertical', isTarget: false };
      if (isValidPlacement(car, board, car.id)) results.push([...board, car]);
    }
  }
  return results;
}

// Returns all boards where any valid car has been placed to block the given move.
function getBlockerCandidatesForMove(board: BoardState, carId: string, newPos: number): BoardState[] {
  const car = board.find(c => c.id === carId);
  if (!car) return [];
  const candidates: BoardState[] = [];
  if (car.orientation === 'vertical') {
    if (newPos < car.row) {
      for (let row = car.row - 1; row >= newPos; row--)
        candidates.push(...placeHCoverColAll(board, row, car.col));
    } else {
      for (let row = car.row + car.length; row <= newPos + car.length - 1; row++)
        candidates.push(...placeHCoverColAll(board, row, car.col));
    }
  } else {
    if (newPos < car.col) {
      for (let col = car.col - 1; col >= newPos; col--)
        candidates.push(...placeVCoverRowAll(board, car.row, col));
    } else {
      for (let col = car.col + car.length; col <= newPos + car.length - 1; col++)
        candidates.push(...placeVCoverRowAll(board, car.row, col));
    }
  }
  return candidates;
}

function addFillerCars(board: BoardState, count: number): BoardState {
  let b = board;
  for (let attempt = 0; attempt < count * 15 && b.length < board.length + count; attempt++) {
    const orientation: 'horizontal' | 'vertical' = Math.random() < 0.5 ? 'horizontal' : 'vertical';
    const length = (Math.random() < 0.6 ? 2 : 3) as 2 | 3;
    const row = rnd(0, GRID_SIZE - (orientation === 'vertical' ? length : 1));
    const col = rnd(0, GRID_SIZE - (orientation === 'horizontal' ? length : 1));
    const car: Car = { id: nextCarId(), row, col, length, orientation, isTarget: false };
    if (isValidPlacement(car, b, car.id)) b = [...b, car];
  }
  return b;
}

function tryBuildChainBoard(difficulty: number): BoardState | null {
  const target: Car = { id: 'target', row: EXIT_ROW, col: 0, length: 2, orientation: 'horizontal', isTarget: true };
  let board: BoardState = [target];

  // 1. Randomize primary blocker count
  const numPrimary = difficulty >= 50 ? rnd(2, 3) : rnd(1, 2);

  // 2. Randomize layer depth (more layers = more branching = more states)
  const maxLayers =
    difficulty >= 80 ? rnd(3, 5) :
    difficulty >= 50 ? rnd(3, 4) :
    difficulty >= 30 ? rnd(2, 3) : 2;

  const cols = shuffleArr([1, 2, 3, 4, 5]);
  const layer1: Car[] = [];
  for (let i = 0; i < Math.min(numPrimary, cols.length); i++) {
    const car = placeVCrossRow(board, cols[i], EXIT_ROW);
    if (!car) continue;
    board = [...board, car];
    layer1.push(car);
  }
  if (layer1.length === 0) return null;

  // 3. Build layers with randomized topology
  let currentLayer: Car[] = layer1;

  for (let layerIdx = 2; layerIdx <= maxLayers; layerIdx++) {
    const nextLayer: Car[] = [];

    for (const car of currentLayer) {
      if (car.orientation === 'vertical') {
        // Block above and/or below — randomize which sides, but ensure at least one
        const canAbove = car.row > 0;
        const canBelow = car.row + car.length < GRID_SIZE;
        const doAbove = canAbove && (canBelow ? Math.random() < 0.75 : true);
        const doBelow = canBelow && (canAbove ? Math.random() < 0.75 : true);

        if (doAbove) {
          const nb = placeHCoverCol(board, car.row - 1, car.col);
          if (nb) { board = nb; nextLayer.push(board[board.length - 1]); }
        }
        if (doBelow) {
          const nb = placeHCoverCol(board, car.row + car.length, car.col);
          if (nb) { board = nb; nextLayer.push(board[board.length - 1]); }
        }
        // Sometimes add a side V blocker for extra branching
        if (Math.random() < 0.4) {
          const sideCol = Math.random() < 0.5 ? car.col - 1 : car.col + 1;
          if (sideCol >= 0 && sideCol < GRID_SIZE) {
            const nb = placeVCoverRow(board, car.row, sideCol);
            if (nb) { board = nb; nextLayer.push(board[board.length - 1]); }
          }
        }
      } else {
        // Horizontal car: block left and/or right
        const canLeft  = car.col > 0;
        const canRight = car.col + car.length < GRID_SIZE;
        const doLeft  = canLeft  && (canRight ? Math.random() < 0.75 : true);
        const doRight = canRight && (canLeft  ? Math.random() < 0.75 : true);

        if (doLeft) {
          const nb = placeVCoverRow(board, car.row, car.col - 1);
          if (nb) { board = nb; nextLayer.push(board[board.length - 1]); }
        }
        if (doRight) {
          const nb = placeVCoverRow(board, car.row, car.col + car.length);
          if (nb) { board = nb; nextLayer.push(board[board.length - 1]); }
        }
        // Sometimes add an H blocker above/below for extra branching
        if (Math.random() < 0.4) {
          const sideRow = Math.random() < 0.5 ? car.row - 1 : car.row + 1;
          if (sideRow >= 0 && sideRow < GRID_SIZE) {
            const nb = placeHCoverCol(board, sideRow, car.col);
            if (nb) { board = nb; nextLayer.push(board[board.length - 1]); }
          }
        }
      }
    }

    if (nextLayer.length === 0) break;
    currentLayer = nextLayer;
  }

  // Add random filler cars to inflate state space
  const fillerCount =
    difficulty >= 80 ? rnd(3, 6) :
    difficulty >= 50 ? rnd(2, 4) : rnd(1, 3);
  board = addFillerCars(board, fillerCount);

  return board;
}

function closeShortcuts(board: BoardState, minMovesTarget: number): BoardState | null {
  let b = board;
  for (let iter = 0; iter < 20; iter++) {
    const result = bfsSolve(b, 5_000);
    if (result.timedOut) return b;
    if (!result.solvable) return null;
    if (result.minMoves >= minMovesTarget) return b;

    const first = solveFirstMove(b);
    if (!first || first.carId === 'target') return null;

    const withBlocker = addBlockerForMove(b, first.carId, first.newPos);
    if (!withBlocker) return null;

    const check = bfsSolve(withBlocker, 3_000);
    if (!check.solvable && !check.timedOut) return null;
    b = withBlocker;
  }
  return null;
}

// Fill remaining empty cells with random cars to increase state space density
function densifyBoard(board: BoardState): BoardState {
  let b = board;
  const maxCars = 11;
  for (let attempt = 0; attempt < 120 && b.length < maxCars; attempt++) {
    const orientation: 'horizontal' | 'vertical' = Math.random() < 0.5 ? 'horizontal' : 'vertical';
    const length = (Math.random() < 0.6 ? 2 : 3) as 2 | 3;
    const row = rnd(0, GRID_SIZE - (orientation === 'vertical' ? length : 1));
    const col = rnd(0, GRID_SIZE - (orientation === 'horizontal' ? length : 1));
    const car: Car = { id: nextCarId(), row, col, length, orientation, isTarget: false };
    if (isValidPlacement(car, b, car.id)) b = [...b, car];
  }
  return b;
}

async function generateChainLevel(
  difficulty: number,
  onProgress?: ProgressFn,
): Promise<{ board: BoardState; score: number; stats: Omit<GenerationStats, 'totalTimeMs' | 'parallelWorkers' | 'algorithm'> }> {
  const startTime = performance.now();
  const minMoves = minMovesForDifficulty(difficulty);
  const [stateMin, stateMax] = stateRangeForDifficulty(difficulty);
  const bfsLimit = Math.min(bfsLimitForDifficulty(difficulty), 50_000);

  const BASE_MAPS_TARGET = 10;
  const MAX_P1_SAMPLES = 200;
  const MAX_P2_CONCURRENT = 5;
  const baseStateTarget = Math.max(50, Math.floor(stateMin * 0.15));

  // Shared best (safe: single-threaded JS, interleaved only at await points)
  let cancelled = false;
  let bestBoard: BoardState | null = null;
  let bestScore = -Infinity;
  let bestBaseStates = 0;
  let bestBaseMoves = 0;
  let bestFinalStates = 0;
  let bestFinalMoves = 0;
  let bestBlockersAdded = 0;
  let totalCandidatesTried = 0;
  let totalP2sStarted = 0;
  let p1SampleCount = 0;
  let baseMapsYielded = 0;

  // P2 pool
  let activeP2Count = 0;
  const p2Queue: Array<{ baseBoard: BoardState; baseStates: number; baseMoves: number }> = [];
  const p2Results: Array<{ finalStates: number; finalMoves: number; chosen: boolean }> = [];
  let p2Pending = 0;
  let phase1Done = false;
  let resolveAllDone!: () => void;
  const allDone = new Promise<void>(r => { resolveAllDone = r; });

  function trySettle() {
    if (phase1Done && p2Pending === 0) resolveAllDone();
  }

  async function runP2(baseBoard: BoardState, baseStates: number, baseMoves: number): Promise<void> {
    if (cancelled) return;
    let currentBoard = baseBoard;
    let currentStates = baseStates;
    let currentMoves = baseMoves;
    let blockersAdded = 0;

    while (performance.now() < startTime + 12_000 && !cancelled) {
      const solutionMoves = getSolutionMoves(currentBoard, bfsLimit * 2);
      if (!solutionMoves || solutionMoves.length === 0) break;

      let bestBlocker: BoardState | null = null;
      let bestBlockerStates = currentStates;
      let bestBlockerMoves = currentMoves;

      for (const move of solutionMoves) {
        if (cancelled) break;
        if (move.carId === 'target') continue;
        for (const candidate of getBlockerCandidatesForMove(currentBoard, move.carId, move.newPos)) {
          totalCandidatesTried++;
          const check = bfsSolve(candidate, bfsLimit);
          if (!check.solvable && !check.timedOut) continue;
          if (check.statesExplored <= bestBlockerStates) continue;
          bestBlockerStates = check.statesExplored;
          bestBlockerMoves = check.minMoves;
          bestBlocker = candidate;
        }
      }

      if (!bestBlocker) break;
      blockersAdded++;
      currentBoard = bestBlocker;
      currentStates = bestBlockerStates;
      currentMoves = bestBlockerMoves;

      await new Promise(r => setTimeout(r, 0));
      if (cancelled) break;

      onProgress?.(`Chain P2: ${totalP2sStarted} workers, ${currentStates} states, ${currentMoves} moves`);

      const score = boardScore(currentStates, currentMoves, stateMin, stateMax, minMoves);
      if (score > bestScore) {
        bestScore = score;
        bestBoard = currentBoard;
        bestBaseStates = baseStates;
        bestBaseMoves = baseMoves;
        bestFinalStates = currentStates;
        bestFinalMoves = currentMoves;
        bestBlockersAdded = blockersAdded;
      }
      if (score >= 2_000_000) { cancelled = true; return; }
    }

    const finalScore = boardScore(currentStates, currentMoves, stateMin, stateMax, minMoves);
    if (finalScore > bestScore) {
      bestScore = finalScore;
      bestBoard = currentBoard;
      bestBaseStates = baseStates;
      bestBaseMoves = baseMoves;
      bestFinalStates = currentStates;
      bestFinalMoves = currentMoves;
      bestBlockersAdded = blockersAdded;
    }
    p2Results.push({ finalStates: currentStates, finalMoves: currentMoves, chosen: false });
  }

  function startNextFromQueue(): void {
    while (p2Queue.length > 0 && activeP2Count < MAX_P2_CONCURRENT) {
      const item = p2Queue.shift()!;
      activeP2Count++;
      totalP2sStarted++;
      runP2(item.baseBoard, item.baseStates, item.baseMoves).finally(() => {
        activeP2Count--;
        p2Pending--;
        trySettle();
        startNextFromQueue();
      });
    }
  }

  function enqueueP2(baseBoard: BoardState, baseStates: number, baseMoves: number): void {
    if (cancelled) return;
    p2Pending++;
    p2Queue.push({ baseBoard, baseStates, baseMoves });
    startNextFromQueue();
  }

  // Phase 1: sample up to 200 boards, yield up to 10 good bases to P2 as found
  while (p1SampleCount < MAX_P1_SAMPLES && baseMapsYielded < BASE_MAPS_TARGET && !cancelled) {
    p1SampleCount++;
    if (p1SampleCount % 10 === 0) {
      await new Promise(r => setTimeout(r, 0));
      onProgress?.(`Chain P1: ${p1SampleCount} samples, ${baseMapsYielded}/${BASE_MAPS_TARGET} bases`, p1SampleCount);
    }
    const board = buildBlockingBoard();
    const result = bfsSolve(board, Math.min(bfsLimit, 15_000));
    if (!result.solvable && !result.timedOut) continue;
    if (result.statesExplored >= baseStateTarget) {
      baseMapsYielded++;
      enqueueP2(board, result.statesExplored, result.minMoves);
    }
  }

  phase1Done = true;
  trySettle();
  await allDone;

  // Mark the chosen candidate
  const chosen = p2Results.find(r => r.finalStates === bestFinalStates && r.finalMoves === bestFinalMoves);
  if (chosen) chosen.chosen = true;

  return {
    board: bestBoard ?? buildSimpleFallback(),
    score: bestScore,
    stats: {
      moveDepthIterations: p1SampleCount,
      baseStates: bestBaseStates,
      baseMoves: bestBaseMoves,
      candidatesTried: totalCandidatesTried,
      blockersAdded: bestBlockersAdded,
      finalStates: bestFinalStates,
      finalMoves: bestFinalMoves,
      requiredStates: stateMin,
      requiredMoves: minMoves,
      p1BasesYielded: baseMapsYielded,
      p2WorkersRun: totalP2sStarted,
      p2CandidateResults: p2Results,
    },
  };
}

export async function generateLevelRaw(
  difficulty: number,
  algorithm: GeneratorAlgorithm,
  onProgress?: ProgressFn
): Promise<{ board: BoardState; score: number; stats: Omit<GenerationStats, 'totalTimeMs' | 'parallelWorkers' | 'algorithm'> }> {
  if (algorithm === 'chain') {
    return generateChainLevel(difficulty, onProgress);
  }

  // moves algorithm
  const startTime = performance.now();
  const [stateMin, stateMax] = stateRangeForDifficulty(difficulty);
  const minMoves = minMovesForDifficulty(difficulty);
  const bfsLimit = bfsLimitForDifficulty(difficulty);
  const poolSize = difficulty >= 75 ? 400 : 200;
  const deadline = startTime + 12_000;
  let attempt = 0;
  let bestBoard: BoardState | null = null;
  let bestScore = -Infinity;
  let bestStates = 0;
  let bestMoves = 0;

  while (attempt < poolSize && performance.now() < deadline) {
    if (attempt % 10 === 0) {
      await new Promise(r => setTimeout(r, 0));
      onProgress?.(`Sampling ${attempt}/${poolSize}…`, attempt, poolSize);
    }
    attempt++;
    carIdCounter = attempt * 20;

    const board = buildBlockingBoard();
    const result = bfsSolve(board, bfsLimit);
    if (!result.solvable && !result.timedOut) continue;

    const score = boardScore(result.statesExplored, result.minMoves, stateMin, stateMax, minMoves);
    if (score > bestScore) {
      bestScore = score;
      bestBoard = board;
      bestStates = result.statesExplored;
      bestMoves = result.minMoves;
    }

    if (score >= 2_000_000) {
      const stats = { moveDepthIterations: attempt, baseStates: result.statesExplored, baseMoves: result.minMoves, candidatesTried: 0, blockersAdded: 0, finalStates: result.statesExplored, finalMoves: result.minMoves, requiredStates: stateMin, requiredMoves: minMoves, p1BasesYielded: 0, p2WorkersRun: 0, p2CandidateResults: [] };
      return { board, score, stats };
    }
  }

  onProgress?.(`Sampling ${attempt}/${poolSize}…`, attempt, poolSize);
  const stats = { moveDepthIterations: attempt, baseStates: bestStates, baseMoves: bestMoves, candidatesTried: 0, blockersAdded: 0, finalStates: bestStates, finalMoves: bestMoves, requiredStates: stateMin, requiredMoves: minMoves, p1BasesYielded: 0, p2WorkersRun: 0, p2CandidateResults: [] };
  return { board: bestBoard ?? buildSimpleFallback(), score: bestScore, stats };
}
