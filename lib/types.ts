export type Orientation = 'horizontal' | 'vertical';

export interface Car {
  id: string;
  row: number;
  col: number;
  length: 2 | 3;
  orientation: Orientation;
  isTarget: boolean;
  spriteIndex?: number;
}

export type BoardState = Car[];

export interface SolveResult {
  solvable: boolean;
  timedOut: boolean;   // true if BFS hit time/state cap (might still be solvable)
  minMoves: number;
  statesExplored: number;
  solution: BoardState[];
}

export interface DragState {
  carId: string;
  startPointerX: number;
  startPointerY: number;
  startCarRow: number;
  startCarCol: number;
  currentPos: number; // row for vertical, col for horizontal
}

export interface GenerationStats {
  algorithm: 'moves' | 'chain';
  moveDepthIterations: number;
  baseStates: number;
  baseMoves: number;
  candidatesTried: number;
  blockersAdded: number;
  finalStates: number;
  finalMoves: number;
  requiredStates: number;
  requiredMoves: number;
  p1BasesYielded: number;
  p2WorkersRun: number;
  p2CandidateResults: Array<{ finalStates: number; finalMoves: number; chosen: boolean }>;
  totalTimeMs: number;
  parallelWorkers: number;
}

export interface GameState {
  board: BoardState;
  moves: number;
  solveResult: SolveResult | null;
  difficulty: number;
  isGenerating: boolean;
  won: boolean;
}
