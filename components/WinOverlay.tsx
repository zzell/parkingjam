'use client';

import React, { useState } from 'react';

const PX = 'var(--font-pixel)';
const CYAN = '#00e5ff';
const PINK = '#ff2d78';
const GOLD = '#ffd700';

interface WinOverlayProps {
  moves: number;
  minMoves: number | null;
  onNewPuzzle: () => void;
  onRetry: () => void;
}

export default function WinOverlay({ moves, minMoves, onNewPuzzle, onRetry }: WinOverlayProps) {
  const isOptimal = minMoves !== null && moves <= minMoves + 2;
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const btn = (onClick: () => void, label: string, style: React.CSSProperties) => (
    <button onClick={onClick} style={{ fontFamily: PX, fontSize: 8, padding: '8px 0', width: 100, cursor: 'pointer', whiteSpace: 'nowrap', ...style }}>
      {label}
    </button>
  );

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(5,5,16,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 4, zIndex: 100,
    }}>
      <div style={{
        fontFamily: PX,
        textAlign: 'center',
        padding: '24px 28px',
        background: '#0a0a20',
        border: `3px solid ${CYAN}`,
        boxShadow: `0 0 20px ${CYAN}, 0 0 40px rgba(0,229,255,0.3)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      }}>
        <div style={{ fontSize: 28, lineHeight: 1 }}>★</div>
        <h2 style={{ fontSize: 16, color: CYAN, textShadow: `0 0 10px ${CYAN}`, margin: 0 }}>SOLVED!</h2>
        <p style={{ fontSize: 8, color: PINK, margin: 0, lineHeight: 1.8 }}>
          {moves} MOVE{moves !== 1 ? 'S' : ''}
          {minMoves !== null && (
            <><br /><span style={{ color: '#777' }}>OPTIMAL: {minMoves}</span></>
          )}
        </p>
        {isOptimal && (
          <div style={{
            padding: '4px 14px',
            background: GOLD,
            color: '#000',
            fontSize: 8,
            boxShadow: `0 0 10px ${GOLD}, 0 0 20px ${GOLD}`,
          }}>
            OPTIMAL!
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {btn(handleShare, copied ? 'COPIED!' : 'SHARE', {
            background: copied ? CYAN : 'transparent',
            color: copied ? '#000' : CYAN,
            border: `2px solid ${CYAN}`,
            boxShadow: `0 0 8px ${CYAN}`,
            transition: 'background 0.15s, color 0.15s',
          })}
          {btn(onRetry, 'RETRY', {
            background: 'transparent',
            color: GOLD,
            border: `2px solid ${GOLD}`,
            boxShadow: `0 0 8px ${GOLD}`,
          })}
          {btn(onNewPuzzle, 'NEW PUZZLE', {
            background: PINK,
            color: '#fff',
            border: `2px solid ${PINK}`,
            boxShadow: `0 0 10px ${PINK}, 0 0 20px ${PINK}`,
          })}
        </div>
      </div>
    </div>
  );
}
