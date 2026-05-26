'use client';

import React from 'react';
import { BoardState } from '@/lib/types';
import { EXIT_ROW, GRID_SIZE } from '@/lib/constants';
import CarComponent from './Car';

interface GridProps {
  board: BoardState;
  onMove: (carId: string, newPos: number) => void;
  disabled?: boolean;
  animatingCarId?: string | null;
}

const GAP = 4;

export default function Grid({ board, onMove, disabled, animatingCarId }: GridProps) {
  const [gridPx, setGridPx] = React.useState(480);
  React.useEffect(() => {
    const update = () => setGridPx(Math.min(480, window.innerWidth - 48, window.innerHeight - 220));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  const GRID_PX = gridPx;
  const cellSize = GRID_PX / GRID_SIZE;


  // Build a color index map so car colors stay stable
  const colorMap = React.useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;
    for (const car of board) {
      if (!car.isTarget) {
        map.set(car.id, idx++);
      }
    }
    return map;
  }, [board]);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Grid container */}
      <div
        style={{
          position: 'relative',
          width: GRID_PX,
          height: GRID_PX,
          backgroundColor: '#050510',
          borderRadius: 4,
          border: '3px solid #00e5ff',
          boxShadow: '0 0 12px #00e5ff, 0 0 24px rgba(0,229,255,0.3), inset 0 0 20px rgba(0,229,255,0.04)',
          overflow: 'visible',
        }}
      >
        {/* Grid lines */}
        {Array.from({ length: GRID_SIZE + 1 }, (_, i) => (
          <React.Fragment key={i}>
            <div style={{
              position: 'absolute',
              left: i * cellSize,
              top: 0,
              width: 1,
              height: GRID_PX,
              backgroundColor: 'rgba(0,229,255,0.1)',
            }} />
            <div style={{
              position: 'absolute',
              top: i * cellSize,
              left: 0,
              height: 1,
              width: GRID_PX,
              backgroundColor: 'rgba(0,229,255,0.1)',
            }} />
          </React.Fragment>
        ))}

        {/* Remove border and glow at exit */}
        <div style={{
          position: 'absolute',
          right: -32,
          top: EXIT_ROW * cellSize,
          width: 36,
          height: cellSize,
          backgroundColor: '#050510',
          zIndex: 20,
        }} />

        {/* Exit path markers — always visible, behind cars */}
        {Array.from({ length: GRID_SIZE }, (_, col) => (
          <div key={`ep-${col}`} style={{
            position: 'absolute',
            left: col * cellSize,
            top: EXIT_ROW * cellSize,
            width: cellSize,
            height: cellSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#39ff14',
            textShadow: '0 0 8px #39ff14, 0 0 16px #39ff14',
            fontSize: cellSize * 0.35,
            fontFamily: 'var(--font-pixel)',
            opacity: col === GRID_SIZE - 1 ? 1 : 0.35,
            zIndex: 5,
            pointerEvents: 'none',
          }}>
            »
          </div>
        ))}

        {/* Cars */}
        {board.map(car => (
          <CarComponent
            key={car.id}
            car={car}
            cellSize={cellSize}
            gap={GAP}
            board={board}
            onMove={onMove}
            colorIndex={colorMap.get(car.id) ?? 0}
            disabled={disabled}
            animating={animatingCarId === car.id}
          />
        ))}
      </div>
    </div>
  );
}
