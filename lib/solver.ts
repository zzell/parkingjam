import { BoardState, SolveResult } from './types';
import { getValidMoves, isWon, serialize, applyMove } from './engine';
import { MAX_BFS_STATES } from './constants';

export function bfsSolve(initial: BoardState, timeLimitMs = 1500): SolveResult {
  if (isWon(initial)) {
    return { solvable: true, timedOut: false, minMoves: 0, statesExplored: 1, solution: [initial] };
  }

  const visited = new Map<string, number>(); // key -> moveCount
  const startKey = serialize(initial);
  visited.set(startKey, 0);

  // Use a flat array with read pointer for O(1) dequeue
  const queue: Array<[BoardState, number]> = [[initial, 0]];
  let head = 0;

  const startTime = performance.now();

  while (head < queue.length) {
    if (visited.size >= MAX_BFS_STATES) {
      return { solvable: false, timedOut: true, minMoves: 0, statesExplored: visited.size, solution: [] };
    }
    if (performance.now() - startTime > timeLimitMs) {
      return { solvable: false, timedOut: true, minMoves: 0, statesExplored: visited.size, solution: [] };
    }

    const [state, moves] = queue[head++];

    for (const car of state) {
      const validPositions = getValidMoves(car, state);
      for (const newPos of validPositions) {
        const newState = applyMove(state, car.id, newPos);
        const key = serialize(newState);
        if (visited.has(key)) continue;
        visited.set(key, moves + 1);

        if (isWon(newState)) {
          return {
            solvable: true,
            timedOut: false,
            minMoves: moves + 1,
            statesExplored: visited.size,
            solution: [],
          };
        }
        queue.push([newState, moves + 1]);
      }
    }
  }

  return { solvable: false, timedOut: false, minMoves: 0, statesExplored: visited.size, solution: [] };
}

// Returns the first move of the optimal solution, used to identify shortcut enablers.
export function solveFirstMove(initial: BoardState): { carId: string; newPos: number } | null {
  if (isWon(initial)) return null;
  const initKey = serialize(initial);
  const parentOf = new Map<string, { pk: string; carId: string; newPos: number } | null>();
  parentOf.set(initKey, null);
  const queue: Array<[BoardState, string]> = [[initial, initKey]];
  let head = 0;
  while (head < queue.length && parentOf.size < 100_000) {
    const [state, key] = queue[head++];
    for (const car of state) {
      for (const newPos of getValidMoves(car, state)) {
        const next = applyMove(state, car.id, newPos);
        const nextKey = serialize(next);
        if (parentOf.has(nextKey)) continue;
        parentOf.set(nextKey, { pk: key, carId: car.id, newPos });
        if (isWon(next)) {
          let curKey = nextKey;
          while (true) {
            const entry = parentOf.get(curKey)!;
            if (parentOf.get(entry.pk) === null) return { carId: entry.carId, newPos: entry.newPos };
            curKey = entry.pk;
          }
        }
        queue.push([next, nextKey]);
      }
    }
  }
  return null;
}
