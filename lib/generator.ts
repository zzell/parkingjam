import { assignSprites, buildSimpleFallback, generateLevelRaw } from './generatorCore';
import type { BoardState, GenerationStats } from './types';

export type { GeneratorAlgorithm } from './generatorCore';
import type { GeneratorAlgorithm } from './generatorCore';

const NUM_WORKERS = 5;
const POOL_SIZE = 200;
const PERFECT_SCORE = 2_000_000;

type RoundResult = { board: BoardState; score: number; stats: Omit<GenerationStats, 'parallelWorkers' | 'algorithm'> | null };

function runWorkerRound(
  difficulty: number,
  algorithm: GeneratorAlgorithm,
  onProgress?: (msg: string) => void,
): Promise<RoundResult> {
  const workerSamples = new Array(NUM_WORKERS).fill(0);

  return new Promise((resolve) => {
    const workers: Worker[] = [];
    let settled = false;
    let bestBoard: BoardState | null = null;
    let bestScore = -Infinity;
    let bestStats: Omit<GenerationStats, 'parallelWorkers' | 'algorithm'> | null = null;
    let doneCount = 0;

    const finish = (board: BoardState, score: number, stats: typeof bestStats) => {
      if (settled) return;
      settled = true;
      workers.forEach(w => w.terminate());
      resolve({ board, score, stats });
    };

    for (let i = 0; i < NUM_WORKERS; i++) {
      const worker = new Worker(new URL('./generatorWorker.ts', import.meta.url));
      workers.push(worker);

      worker.onmessage = (e) => {
        const data = e.data as { type: string; msg?: string; count?: number; board?: BoardState; score?: number; stats?: Omit<GenerationStats, 'parallelWorkers' | 'algorithm'> };

        if (data.type === 'progress') {
          if (algorithm !== 'chain' && data.count != null) {
            workerSamples[i] = data.count;
            const total = workerSamples.reduce((a, b) => a + b, 0);
            onProgress?.(`Sampling ${total}/${NUM_WORKERS * POOL_SIZE}…`);
          } else if (i === 0) {
            onProgress?.(data.msg ?? '');
          }
          return;
        }

        if (data.type === 'done') {
          doneCount++;
          const board = data.board;
          const score = data.score ?? 0;
          const stats = data.stats ?? null;

          if (board && score > bestScore) {
            bestScore = score;
            bestBoard = board;
            bestStats = stats;
          }

          // Moves/chain race: first worker with a perfect result wins
          if (board && score >= PERFECT_SCORE && (algorithm === 'moves' || algorithm === 'chain') && !settled) {
            finish(board, score, stats);
            return;
          }

          if (doneCount === NUM_WORKERS && !settled) {
            finish(bestBoard ?? buildSimpleFallback(), bestScore, bestStats);
          }
        }
      };

      worker.onerror = () => {
        doneCount++;
        if (doneCount === NUM_WORKERS && !settled) {
          finish(bestBoard ?? buildSimpleFallback(), bestScore, bestStats);
        }
      };

      worker.postMessage({ difficulty, algorithm });
    }
  });
}

export async function generateLevel(
  difficulty: number,
  algorithm: GeneratorAlgorithm,
  onProgress?: (msg: string) => void
): Promise<{ board: BoardState; stats: GenerationStats | null }> {
  if (typeof Worker === 'undefined') {
    const startTime = performance.now();
    const { board, stats: rawStats } = await generateLevelRaw(difficulty, algorithm, msg => onProgress?.(msg));
    const stats: GenerationStats | null = rawStats ? { ...rawStats, algorithm, parallelWorkers: 1, totalTimeMs: Math.round(performance.now() - startTime) } : null;
    return { board: assignSprites(board), stats };
  }

  const maxRounds = 1;
  let bestBoard: BoardState | null = null;
  let bestScore = -Infinity;
  let bestStats: Omit<GenerationStats, 'parallelWorkers' | 'algorithm'> | null = null;

  for (let round = 0; round < maxRounds; round++) {
    if (round > 0) {
      onProgress?.(`Retry ${round}/${maxRounds - 1}…`);
      await new Promise(r => setTimeout(r, 20));
    }

    const { board, score, stats } = await runWorkerRound(difficulty, algorithm, onProgress);

    if (score > bestScore) {
      bestScore = score;
      bestBoard = board;
      bestStats = stats;
    }

    if (score >= PERFECT_SCORE) break;
  }

  const finalStats: GenerationStats | null = bestStats
    ? { ...bestStats, algorithm, parallelWorkers: NUM_WORKERS }
    : null;

  return { board: assignSprites(bestBoard ?? buildSimpleFallback()), stats: finalStats };
}
