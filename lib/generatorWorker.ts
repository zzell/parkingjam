import { generateLevelRaw } from './generatorCore';
import type { GeneratorAlgorithm } from './generatorCore';

interface WorkerInput {
  difficulty: number;
  algorithm: GeneratorAlgorithm;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctx = self as any;

ctx.onmessage = async (e: MessageEvent<WorkerInput>) => {
  const { difficulty, algorithm } = e.data;
  const startTime = performance.now();

  const { board, score, stats } = await generateLevelRaw(difficulty, algorithm, (msg, count, total) => {
    ctx.postMessage({ type: 'progress', msg, count, total });
  });

  ctx.postMessage({ type: 'done', board, score, stats: { ...stats, totalTimeMs: Math.round(performance.now() - startTime) } });
};
