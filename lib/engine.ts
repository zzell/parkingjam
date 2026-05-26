import { Car, BoardState } from './types';
import { GRID_SIZE, EXIT_ROW } from './constants';

export function buildOccupancy(state: BoardState, excludeId?: string): boolean[][] {
  const grid: boolean[][] = Array.from({ length: GRID_SIZE }, () =>
    Array(GRID_SIZE).fill(false)
  );
  for (const car of state) {
    if (car.id === excludeId) continue;
    for (let i = 0; i < car.length; i++) {
      const r = car.orientation === 'vertical' ? car.row + i : car.row;
      const c = car.orientation === 'horizontal' ? car.col + i : car.col;
      if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
        grid[r][c] = true;
      }
    }
  }
  return grid;
}

export function getValidMoves(car: Car, state: BoardState): number[] {
  const occupancy = buildOccupancy(state, car.id);
  const positions: number[] = [];

  if (car.orientation === 'horizontal') {
    // slide left
    for (let c = car.col - 1; c >= 0; c--) {
      if (occupancy[car.row][c]) break;
      positions.push(c);
    }
    // slide right; max col puts the car's last cell at GRID_SIZE-1
    const maxCol = GRID_SIZE - car.length;
    for (let c = car.col + 1; c <= maxCol; c++) {
      let blocked = false;
      for (let i = 0; i < car.length; i++) {
        if (occupancy[car.row][c + i]) { blocked = true; break; }
      }
      if (blocked) break;
      positions.push(c);
    }
  } else {
    // slide up
    for (let r = car.row - 1; r >= 0; r--) {
      if (occupancy[r][car.col]) break;
      positions.push(r);
    }
    // slide down
    for (let r = car.row + 1; r <= GRID_SIZE - car.length; r++) {
      let blocked = false;
      for (let i = 0; i < car.length; i++) {
        if (occupancy[r + i][car.col]) { blocked = true; break; }
      }
      if (blocked) break;
      positions.push(r);
    }
  }

  return positions;
}

export function isWon(state: BoardState): boolean {
  const target = state.find(c => c.isTarget);
  return target !== undefined && target.col === 4;
}

export function serialize(state: BoardState): string {
  // Board array order is fixed throughout a BFS (applyMove preserves order).
  // Encode each car's (row, col) as one char — no sort needed.
  let s = '';
  for (const c of state) s += String.fromCharCode((c.row << 3) | c.col);
  return s;
}

export function applyMove(state: BoardState, carId: string, newPos: number): BoardState {
  return state.map(car => {
    if (car.id !== carId) return car;
    if (car.orientation === 'horizontal') return { ...car, col: newPos };
    return { ...car, row: newPos };
  });
}

export function isValidPlacement(car: Car, state: BoardState, excludeId?: string): boolean {
  if (car.orientation === 'horizontal') {
    if (car.col < 0 || car.col + car.length > GRID_SIZE) return false;
    if (car.row < 0 || car.row >= GRID_SIZE) return false;
  } else {
    if (car.row < 0 || car.row + car.length > GRID_SIZE) return false;
    if (car.col < 0 || car.col >= GRID_SIZE) return false;
  }
  const occupancy = buildOccupancy(state, excludeId ?? car.id);
  for (let i = 0; i < car.length; i++) {
    const r = car.orientation === 'vertical' ? car.row + i : car.row;
    const c = car.orientation === 'horizontal' ? car.col + i : car.col;
    if (occupancy[r][c]) return false;
  }
  return true;
}
