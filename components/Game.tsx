'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Grid from './Grid';
import Controls from './Controls';
import WinOverlay from './WinOverlay';
import { BoardState, SolveResult } from '@/lib/types';
import { applyMove, isWon } from '@/lib/engine';
import { bfsSolve, solveFirstMove } from '@/lib/solver';
import { generateLevel, GeneratorAlgorithm } from '@/lib/generator';
import { encodeBoard, decodeBoard } from '@/lib/share';

const PX = 'var(--font-pixel)';
const CYAN = '#00e5ff';
const PINK = '#ff2d78';
const GOLD = '#ffd700';
const GREEN = '#39ff14';

export default function Game() {
  const [board, setBoard] = useState<BoardState>([]);
  const [initialBoard, setInitialBoard] = useState<BoardState>([]);
  const [moves, setMoves] = useState(0);
  const [solveResult, setSolveResult] = useState<SolveResult | null>(null);
  const [difficulty, setDifficulty] = useState(100);
  const [algorithm, setAlgorithm] = useState<GeneratorAlgorithm>('moves');
  const [isGenerating, setIsGenerating] = useState(false);
  const [won, setWon] = useState(false);
  const [generatingMsg, setGeneratingMsg] = useState('');
  const [hintCarId, setHintCarId] = useState<string | null>(null);
  const generatingRef = useRef(false);

  const handleGenerate = useCallback(async () => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setIsGenerating(true);
    setWon(false);
    setMoves(0);
    setGeneratingMsg('Starting…');
    try {
      await new Promise(r => setTimeout(r, 20));
      const newBoard = await generateLevel(difficulty, algorithm, setGeneratingMsg);
      const result = bfsSolve(newBoard);
      setBoard(newBoard);
      setInitialBoard(newBoard);
      setSolveResult(result);
      window.location.hash = encodeBoard(newBoard);
      setMoves(0);
      setWon(false);
    } finally {
      setIsGenerating(false);
      setGeneratingMsg('');
      generatingRef.current = false;
    }
  }, [difficulty, algorithm]);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const decoded = decodeBoard(hash);
      if (decoded) {
        const result = bfsSolve(decoded);
        setBoard(decoded);
        setInitialBoard(decoded);
        setSolveResult(result);
        return;
      }
    }
    handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMove = useCallback((carId: string, newPos: number) => {
    if (won) return;
    setBoard(prev => {
      const next = applyMove(prev, carId, newPos);
      if (isWon(next)) setWon(true);
      setMoves(m => m + 1);
      return next;
    });
  }, [won]);

  const handleHint = useCallback(() => {
    if (won) return;
    setBoard(prev => {
      const move = solveFirstMove(prev);
      if (!move) return prev;
      setHintCarId(move.carId);
      setTimeout(() => setHintCarId(null), 350);
      const next = applyMove(prev, move.carId, move.newPos);
      if (isWon(next)) setWon(true);
      setMoves(m => m + 1);
      return next;
    });
  }, [won]);

  const handleReset = useCallback(() => {
    setBoard(initialBoard);
    setMoves(0);
    setWon(false);
  }, [initialBoard]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 0 8px', height: '100dvh', overflow: 'hidden', background: '#050510', color: '#fff', boxSizing: 'border-box' }}>

      {/* Title */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: CYAN, textShadow: `0 0 8px ${CYAN}`, fontSize: 18, lineHeight: 1 }}>≫</span>
        <h1 style={{ fontFamily: PX, fontSize: 'clamp(14px, 5vw, 22px)', lineHeight: 1, margin: 0 }}>
          <span style={{ color: '#fff', textShadow: `0 0 10px ${CYAN}, 0 0 22px ${CYAN}` }}>PARKING </span>
          <span style={{ color: PINK, textShadow: `0 0 10px ${PINK}, 0 0 22px ${PINK}` }}>JAM</span>
        </h1>
        <span style={{ color: CYAN, textShadow: `0 0 8px ${CYAN}`, fontSize: 18, lineHeight: 1 }}>≪</span>
      </div>

      <Controls
        difficulty={difficulty}
        moves={moves}
        minMoves={solveResult?.minMoves ?? null}
        isGenerating={isGenerating}
        algorithm={algorithm}
        onDifficultyChange={setDifficulty}
        onGenerate={handleGenerate}
        onReset={handleReset}
        onHint={handleHint}
        onAlgorithmChange={setAlgorithm}
      />

      {/* Grid area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', width: '100%' }}>
        {isGenerating ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, border: `3px solid ${CYAN}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', boxShadow: `0 0 10px ${CYAN}` }} />
            <span style={{ fontFamily: PX, fontSize: 8, color: CYAN, textShadow: `0 0 6px ${CYAN}` }}>{generatingMsg || 'GENERATING…'}</span>
          </div>
        ) : board.length > 0 ? (
          <div style={{ position: 'relative' }}>
            <Grid board={board} onMove={handleMove} disabled={won} animatingCarId={hintCarId} />
            {won && <WinOverlay moves={moves} minMoves={solveResult?.minMoves ?? null} onNewPuzzle={handleGenerate} />}
          </div>
        ) : null}
      </div>

      {/* Stats bar */}
      {!isGenerating && solveResult && (
        <div style={{ flexShrink: 0, width: '100%', maxWidth: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '6px 10px', border: `2px solid ${GOLD}`, boxShadow: `0 0 8px ${GOLD}`, background: '#0a0a20', fontFamily: PX, fontSize: 8, boxSizing: 'border-box', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14 }}>🏆</span>
          <span style={{ color: CYAN }}>STATES: <span style={{ color: '#fff' }}>{solveResult.statesExplored.toLocaleString()}</span></span>
          <span style={{ color: PINK }}>|</span>
          <span style={{ color: CYAN }}>MIN: <span style={{ color: '#fff' }}>{solveResult.minMoves}</span></span>
          <span style={{ color: PINK }}>|</span>
          <span style={{ color: CYAN }}>SOLVABLE: <span style={{ color: solveResult.solvable ? GREEN : PINK }}>{solveResult.solvable ? 'YES' : 'NO'}</span></span>
        </div>
      )}
    </div>
  );
}
