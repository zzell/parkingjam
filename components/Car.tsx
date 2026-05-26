'use client';

import React, { useCallback, useRef } from 'react';
import { Car as CarType } from '@/lib/types';
import { getValidMoves } from '@/lib/engine';
import { BoardState } from '@/lib/types';

const SHORT_SPRITES = [
  '/sprites/short_1.png', '/sprites/short_2.png', '/sprites/short_3.png',
  '/sprites/short_4.png', '/sprites/short_5.png', '/sprites/short_6.png',
  '/sprites/short_7.png', '/sprites/short_8.png', '/sprites/short_9.png',
  '/sprites/short_10.png', '/sprites/short_11.png',
];
const LONG_SPRITES = [
  '/sprites/long_1.png', '/sprites/long_2.png', '/sprites/long_3.png',
];

const CAR_COLORS = [
  '#4f86c6', // blue
  '#f7a440', // orange
  '#5cb85c', // green
  '#9b59b6', // purple
  '#1abc9c', // teal
  '#e67e22', // dark orange
  '#3498db', // light blue
  '#8e44ad', // dark purple
  '#27ae60', // dark green
  '#d35400', // burnt orange
  '#2980b9', // another blue
];

interface CarProps {
  car: CarType;
  cellSize: number;
  gap: number;
  board: BoardState;
  onMove: (carId: string, newPos: number) => void;
  colorIndex: number;
  disabled?: boolean;
  animating?: boolean;
}

export default function Car({ car, cellSize, gap, board, onMove, colorIndex, disabled, animating }: CarProps) {
  const isDragging = useRef(false);
  const dragStart = useRef({ pointer: 0, carPos: 0 });
  const previewRef = useRef<HTMLDivElement>(null);
  const validMovesRef = useRef<number[]>([]);
  const dragRangeRef = useRef({ min: 0, max: 0 });
  const lastSnappedRef = useRef(0);

  const width = car.orientation === 'horizontal'
    ? car.length * cellSize - gap
    : cellSize - gap;
  const height = car.orientation === 'vertical'
    ? car.length * cellSize - gap
    : cellSize - gap;

  const left = car.col * cellSize + gap / 2;
  const top = car.row * cellSize + gap / 2;

  const color = car.isTarget ? '#e74c3c' : CAR_COLORS[colorIndex % CAR_COLORS.length];
  const useSprite = true;
  const pool = car.isTarget ? ['/sprites/main.png'] : (car.length === 2 ? SHORT_SPRITES : LONG_SPRITES);
  const spriteSrc = pool[(car.spriteIndex ?? 0) % pool.length];
  const flipRef = useRef(Math.random() < 0.5);

  const updatePreviewPosition = useCallback((newPos: number) => {
    if (!previewRef.current) return;
    if (car.orientation === 'horizontal') {
      previewRef.current.style.left = `${newPos * cellSize + gap / 2}px`;
    } else {
      previewRef.current.style.top = `${newPos * cellSize + gap / 2}px`;
    }
  }, [car.orientation, cellSize, gap]);

  const animateSnap = useCallback((newPos: number, onComplete: () => void) => {
    if (!previewRef.current) { onComplete(); return; }
    previewRef.current.style.transition = 'left 0.15s ease, top 0.15s ease';
    updatePreviewPosition(newPos);
    setTimeout(() => {
      if (previewRef.current) previewRef.current.style.transition = '';
      onComplete();
    }, 160);
  }, [updatePreviewPosition]);

  const clampToValidMoves = useCallback((rawPos: number): number => {
    const moves = validMovesRef.current;
    const currentPos = car.orientation === 'horizontal' ? car.col : car.row;
    // Include currentPos so we can always stay in place
    const all = [currentPos, ...moves];
    let best = currentPos;
    let bestDist = Infinity;
    for (const m of all) {
      const d = Math.abs(m - rawPos);
      if (d < bestDist) { bestDist = d; best = m; }
    }
    return best;
  }, [car]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = true;
    const moves = getValidMoves(car, board);
    validMovesRef.current = moves;
    const currentPos = car.orientation === 'horizontal' ? car.col : car.row;
    const all = [currentPos, ...moves];
    dragRangeRef.current = { min: Math.min(...all), max: Math.max(...all) };
    dragStart.current = { pointer: car.orientation === 'horizontal' ? e.clientX : e.clientY, carPos: currentPos };
    lastSnappedRef.current = currentPos;
  }, [car, board, disabled]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !previewRef.current) return;
    const delta = (car.orientation === 'horizontal' ? e.clientX : e.clientY) - dragStart.current.pointer;
    const rawPos = dragStart.current.carPos + delta / cellSize;
    const clamped = Math.max(dragRangeRef.current.min, Math.min(dragRangeRef.current.max, rawPos));
    const px = clamped * cellSize + gap / 2;
    if (car.orientation === 'horizontal') {
      previewRef.current.style.left = `${px}px`;
    } else {
      previewRef.current.style.top = `${px}px`;
    }
    lastSnappedRef.current = clampToValidMoves(Math.round(rawPos));
  }, [car.orientation, cellSize, gap, clampToValidMoves]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const delta = (car.orientation === 'horizontal' ? e.clientX : e.clientY) - dragStart.current.pointer;
    const rawPos = dragStart.current.carPos + delta / cellSize;
    const newPos = clampToValidMoves(Math.round(rawPos));
    validMovesRef.current = [];
    const startPos = dragStart.current.carPos;
    animateSnap(newPos, () => {
      if (newPos !== startPos) onMove(car.id, newPos);
    });
  }, [car.orientation, cellSize, clampToValidMoves, onMove, car.id, animateSnap]);

  const commitOrReset = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    validMovesRef.current = [];
    const pos = lastSnappedRef.current;
    const startPos = dragStart.current.carPos;
    animateSnap(pos, () => {
      if (pos !== startPos) onMove(car.id, pos);
    });
  }, [onMove, car.id, animateSnap]);

  const onPointerCancel = commitOrReset;
  const onLostPointerCapture = commitOrReset;

  return (
    <div
      ref={previewRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onLostPointerCapture}
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        backgroundColor: useSprite ? 'transparent' : color,
        borderRadius: 6,
        cursor: disabled ? 'default' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
        boxSizing: 'border-box',
        border: useSprite ? 'none' : (car.isTarget ? '2px solid #c0392b' : '2px solid rgba(0,0,0,0.15)'),
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        transition: animating ? 'left 0.3s ease, top 0.3s ease, box-shadow 0.1s' : 'box-shadow 0.1s',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      }}
      title={car.isTarget ? 'Target car — get it to the exit!' : undefined}
    >
      {useSprite && (
        <img
          src={spriteSrc}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            ...(car.orientation === 'vertical'
              ? {
                  top: 0, left: 0, width: '100%', height: '100%', objectFit: 'fill',
                  transform: `scale(0.88)${flipRef.current ? ' rotate(180deg)' : ''}`,
                }
              : {
                  top: '50%', left: '50%',
                  width: height,
                  height: width,
                  transform: `translate(-50%, -50%) rotate(${car.isTarget ? 90 : -90}deg) scale(0.88)`,
                }),
          }}
        />
      )}
    </div>
  );
}
