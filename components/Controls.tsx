'use client';

import React, { useState } from 'react';
import { GeneratorAlgorithm } from '@/lib/generator';

const PX = 'var(--font-pixel)';
const CYAN = '#00e5ff';
const PINK = '#ff2d78';
const GOLD = '#ffd700';
const BG = '#050510';
const BG_CARD = '#0a0a20';

const DIFFICULTY_LEVELS: Array<{ label: string; value: number }> = [
  { label: '1', value: 1 },
  { label: '2', value: 25 },
  { label: '3', value: 50 },
  { label: '4', value: 75 },
  { label: '5', value: 100 },
];

const ALGO_INFO: Record<GeneratorAlgorithm, { label: string; description: string }> = {
  moves: {
    label: 'Move Depth',
    description:
      'Samples random puzzles and returns the first that clears a move floor. ' +
      'Level 1→2 moves min, 2→5, 3→7, 4→11, 5→15. ' +
      'Also scales car count (4 at level 1, up to 11 at level 5). ' +
      'Consistent: harder difficulty always means more required moves.',
  },
  complexity: {
    label: 'Search Complexity',
    description:
      'Scores puzzles by BFS states explored — large search space means many dead ends. ' +
      'Higher levels sample more boards and weight state-space size more heavily. ' +
      'No hard move guarantee: a 5-move puzzle can outscore a 15-move one if its search space is larger.',
  },
  chain: {
    label: 'Dependency Chain',
    description:
      'Builds an explicit blocking chain: target blocked by A, A blocked by B and C, etc. ' +
      'Level 1-2: 2 chain layers, 1 primary blocker. Level 3-5: 3 layers, 2 blockers. ' +
      'Uses same move floor as Move Depth, then adds targeted blockers to close shortcuts. ' +
      'Every car in the solution earns its place.',
  },
};

interface ControlsProps {
  difficulty: number;
  moves: number;
  minMoves: number | null;
  isGenerating: boolean;
  isHinting: boolean;
  algorithm: GeneratorAlgorithm;
  onDifficultyChange: (d: number) => void;
  onGenerate: () => void;
  onReset: () => void;
  onHint: () => void;
  onAlgorithmChange: (a: GeneratorAlgorithm) => void;
}

export default function Controls({
  difficulty, moves, minMoves, isGenerating, isHinting, algorithm,
  onDifficultyChange, onGenerate, onReset, onHint, onAlgorithmChange,
}: ControlsProps) {
  const [tooltip, setTooltip] = useState<GeneratorAlgorithm | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 6, padding: '0 8px', boxSizing: 'border-box' }}>

      {/* Level + Generate */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: PX, fontSize: 8, color: CYAN, textShadow: `0 0 6px ${CYAN}`, flexShrink: 0 }}>LEVEL</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {DIFFICULTY_LEVELS.map(({ label, value }) => {
            const sel = difficulty === value;
            return (
              <button
                key={label}
                onClick={() => onDifficultyChange(value)}
                disabled={isGenerating}
                style={{
                  fontFamily: PX, fontSize: 11,
                  width: 34, height: 34,
                  border: `2px solid ${sel ? PINK : CYAN}`,
                  background: sel ? PINK : 'transparent',
                  color: sel ? '#000' : CYAN,
                  boxShadow: sel ? `0 0 8px ${PINK}, 0 0 16px ${PINK}` : `0 0 4px ${CYAN}`,
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  opacity: isGenerating ? 0.5 : 1,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={handleShare}
            disabled={isGenerating}
            style={{
              fontFamily: PX, fontSize: 8,
              padding: '0 10px',
              height: 34,
              background: copied ? GOLD : BG_CARD,
              color: copied ? '#000' : GOLD,
              border: `2px solid ${PINK}`,
              boxShadow: `0 0 8px ${PINK}, 0 0 16px ${PINK}`,
              textShadow: copied ? 'none' : `0 0 6px ${GOLD}`,
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              opacity: isGenerating ? 0.5 : 1,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            {copied ? '✓' : '⇧'}
          </button>
        </div>
      </div>

      {/* Generator selector + New */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <button
            onClick={() => { setExpanded(e => !e); setTooltip(null); }}
            disabled={isGenerating}
            style={{
              fontFamily: PX, fontSize: 8,
              width: '100%', padding: '8px 10px',
              display: 'flex', alignItems: 'center', gap: 8,
              background: BG_CARD,
              border: `2px solid ${CYAN}`,
              boxShadow: `0 0 6px ${CYAN}`,
              color: '#fff',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              opacity: isGenerating ? 0.5 : 1,
              textAlign: 'left',
            }}
          >
            <span style={{ color: CYAN, textShadow: `0 0 5px ${CYAN}`, flexShrink: 0 }}>GENERATOR:</span>
            <span style={{ flex: 1 }}>{ALGO_INFO[algorithm].label.toUpperCase()}</span>
            <span style={{ color: CYAN, flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
          </button>

        {expanded && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 2,
            background: BG_CARD,
            border: `2px solid ${CYAN}`,
            boxShadow: `0 0 12px ${CYAN}`,
            padding: 8,
            display: 'flex', flexDirection: 'column', gap: 5,
          }}>
            {(Object.keys(ALGO_INFO) as GeneratorAlgorithm[]).map(algo => (
              <div key={algo} style={{ display: 'flex', gap: 5 }}>
                <button
                  onClick={() => { onAlgorithmChange(algo); setExpanded(false); setTooltip(null); }}
                  disabled={isGenerating}
                  style={{
                    fontFamily: PX, fontSize: 7,
                    flex: 1, padding: '6px 8px', textAlign: 'left',
                    background: algorithm === algo ? CYAN : 'transparent',
                    color: algorithm === algo ? '#000' : CYAN,
                    border: `1px solid ${CYAN}`,
                    boxShadow: algorithm === algo ? `0 0 8px ${CYAN}` : 'none',
                    cursor: 'pointer',
                  }}
                >
                  {ALGO_INFO[algo].label.toUpperCase()}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setTooltip(tooltip === algo ? null : algo); }}
                  style={{
                    fontFamily: PX, fontSize: 8,
                    width: 26, height: 26, flexShrink: 0,
                    borderRadius: '50%',
                    background: 'transparent',
                    color: PINK,
                    border: `1px solid ${PINK}`,
                    boxShadow: `0 0 5px ${PINK}`,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ?
                </button>
              </div>
            ))}

            {tooltip && (
              <div style={{
                marginTop: 4, padding: '8px 10px',
                background: BG,
                border: `1px solid ${PINK}`,
                boxShadow: `0 0 6px ${PINK}`,
                fontFamily: PX, fontSize: 7,
                color: '#bbb', lineHeight: 1.9,
              }}>
                <span style={{ color: PINK }}>{ALGO_INFO[tooltip].label.toUpperCase()}: </span>
                {ALGO_INFO[tooltip].description}
              </div>
            )}
          </div>
        )}
        </div>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          style={{
            fontFamily: PX, fontSize: 8,
            padding: '0 10px',
            width: 90,
            background: BG_CARD,
            color: GOLD,
            border: `2px solid ${PINK}`,
            boxShadow: `0 0 8px ${PINK}, 0 0 16px ${PINK}`,
            textShadow: `0 0 6px ${GOLD}`,
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            opacity: isGenerating ? 0.7 : 1,
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 34,
          }}
        >
          {isGenerating
            ? <div style={{ width: 10, height: 10, border: `2px solid ${GOLD}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            : 'GENERATE'}
        </button>
      </div>

      {/* Moves + Reset */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontFamily: PX, fontSize: 8, color: CYAN, textShadow: `0 0 5px ${CYAN}` }}>
          MOVES: <span style={{ color: '#fff' }}>{moves}</span>
        </span>
        <span style={{ color: PINK }}>|</span>
        <span style={{ fontFamily: PX, fontSize: 8, color: CYAN, textShadow: `0 0 5px ${CYAN}` }}>
          BEST: <span style={{ color: '#fff' }}>{minMoves ?? '—'}</span>
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button
            onClick={onHint}
            disabled={isGenerating || isHinting}
            style={{
              fontFamily: PX, fontSize: 8,
              padding: '6px 12px',
              background: 'transparent',
              color: GOLD,
              border: `2px solid ${GOLD}`,
              boxShadow: `0 0 5px ${GOLD}`,
              textShadow: `0 0 5px ${GOLD}`,
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              opacity: isGenerating ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 52,
            }}
          >
            {isHinting
              ? <div style={{ width: 10, height: 10, border: `2px solid ${GOLD}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              : 'HINT'}
          </button>
          <button
            onClick={onReset}
            disabled={isGenerating}
            style={{
              fontFamily: PX, fontSize: 8,
              padding: '6px 12px',
              background: 'transparent',
              color: CYAN,
              border: `2px solid ${CYAN}`,
              boxShadow: `0 0 5px ${CYAN}`,
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              opacity: isGenerating ? 0.5 : 1,
            }}
          >
            RESET
          </button>
        </div>
      </div>
    </div>
  );
}
