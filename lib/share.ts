import { BoardState, Orientation } from './types';

// Encoding: one entry per car, joined by '-'
// Target car: 't' + row + col + len + ori[0] + spriteHex  (6 chars)
// Other cars:       row + col + len + ori[0] + spriteHex  (5 chars)
// row/col: single digit 0-5; len: '2' or '3'; ori: 'h' or 'v'; spriteHex: 1 hex char 0-f

export function encodeBoard(board: BoardState): string {
  return board
    .map(car => {
      const s = (car.spriteIndex ?? 0).toString(16);
      return `${car.isTarget ? 't' : ''}${car.row}${car.col}${car.length}${car.orientation[0]}${s}`;
    })
    .join('-');
}

export function decodeBoard(encoded: string): BoardState | null {
  try {
    const parts = encoded.split('-');
    if (parts.length < 2) return null;
    const board: BoardState = parts.map((p, i) => {
      const isTarget = p[0] === 't';
      const s = isTarget ? p.slice(1) : p;
      if (s.length !== 5) throw new Error();
      const row = parseInt(s[0], 10);
      const col = parseInt(s[1], 10);
      const length = parseInt(s[2], 10) as 2 | 3;
      const orientation: Orientation = s[3] === 'h' ? 'horizontal' : 'vertical';
      const spriteIndex = parseInt(s[4], 16);
      if ([row, col, length, spriteIndex].some(Number.isNaN)) throw new Error();
      if (length !== 2 && length !== 3) throw new Error();
      return {
        id: isTarget ? 'target' : `car_s${i}`,
        row, col, length, orientation, isTarget, spriteIndex,
      };
    });
    if (board.filter(c => c.isTarget).length !== 1) return null;
    return board;
  } catch {
    return null;
  }
}
