export const GRID_SIZE = 6;
export const EXIT_ROW = 2;
export const MAX_BFS_STATES = 500_000;
export const BFS_TIMEOUT_MS = 2000;

export const DIFFICULTY_RANGES: Array<{
  minDiff: number;
  maxDiff: number;
  minStates: number;
  maxStates: number;
  minMoves: number;
  maxMoves: number;
}> = [
  { minDiff: 1,  maxDiff: 20,  minStates: 50,    maxStates: 500,    minMoves: 3,  maxMoves: 6  },
  { minDiff: 21, maxDiff: 50,  minStates: 300,   maxStates: 5_000,  minMoves: 6,  maxMoves: 12 },
  { minDiff: 51, maxDiff: 80,  minStates: 1_500, maxStates: 25_000, minMoves: 10, maxMoves: 18 },
  { minDiff: 81, maxDiff: 100, minStates: 8_000, maxStates: 150_000, minMoves: 14, maxMoves: 99 },
];

export function getTargetStatesRange(difficulty: number): [number, number] {
  const range = DIFFICULTY_RANGES.find(r => difficulty >= r.minDiff && difficulty <= r.maxDiff)
    ?? DIFFICULTY_RANGES[DIFFICULTY_RANGES.length - 1];
  return [range.minStates, range.maxStates];
}

export function getTargetMovesRange(difficulty: number): [number, number] {
  const range = DIFFICULTY_RANGES.find(r => difficulty >= r.minDiff && difficulty <= r.maxDiff)
    ?? DIFFICULTY_RANGES[DIFFICULTY_RANGES.length - 1];
  return [range.minMoves, range.maxMoves];
}
