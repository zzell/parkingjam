'use client';

import React, { useState } from 'react';
import { GeneratorAlgorithm } from '@/lib/generator';
import { GenerationStats } from '@/lib/types';

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
      'Samples random puzzles across 5 parallel workers and races to the first that meets ' +
      'the state range and move floor for the selected level. ' +
      'Levels 4 and 5 sample up to 400 boards per worker. ' +
      'Fast, random, effective for all difficulty levels.',
  },
  chain: {
    label: 'Dep. Chain',
    description:
      'Two-phase pipeline across 5 parallel workers. ' +
      'Phase 1: each worker samples up to 200 random boards and streams up to 10 good base maps as they are found. ' +
      'Phase 2: up to 5 concurrent workers run solution-path-guided blocking — ' +
      'compute the full optimal solution, place blockers in the path of every solution car, ' +
      'keep only moves that strictly increase puzzle complexity, repeat until both the state range and move floor are met. ' +
      'First worker to find a perfect board cancels all others. ' +
      'If none is perfect, the best result across all workers is returned.',
  },
};

interface ControlsProps {
  difficulty: number;
  moves: number;
  minMoves: number | null;
  isGenerating: boolean;
  isHinting: boolean;
  algorithm: GeneratorAlgorithm;
  generationStats: GenerationStats | null;
  onDifficultyChange: (d: number) => void;
  onGenerate: () => void;
  onReset: () => void;
  onHint: () => void;
  onAlgorithmChange: (a: GeneratorAlgorithm) => void;
}

export default function Controls({
  difficulty, moves, minMoves, isGenerating, isHinting, algorithm, generationStats,
  onDifficultyChange, onGenerate, onReset, onHint, onAlgorithmChange,
}: ControlsProps) {
  const [tooltip, setTooltip] = useState<GeneratorAlgorithm | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 6, padding: '0 8px', boxSizing: 'border-box' }}>

      {/* Level */}
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
        <a
          href="https://github.com/zzell/parkingjam"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginLeft: 'auto',
            fontFamily: PX, fontSize: 7,
            color: '#666',
            textDecoration: 'none',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          GitHub
        </a>
      </div>

      {/* Generator selector + Generate + ? */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
        <div style={{ position: 'relative', flex: 1, height: 34 }}>
          <button
            onClick={() => { setExpanded(e => !e); setTooltip(null); }}
            disabled={isGenerating}
            style={{
              fontFamily: PX, fontSize: 8,
              width: '100%', height: '100%', padding: '0 10px',
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
          onClick={() => onGenerate()}
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
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setStatsOpen(o => !o)}
            disabled={!generationStats}
            style={{
              fontFamily: PX, fontSize: 8,
              padding: '0 10px',
              height: 34,
              background: statsOpen ? PINK : 'transparent',
              color: statsOpen ? '#000' : PINK,
              border: `2px solid ${PINK}`,
              boxShadow: `0 0 5px ${PINK}`,
              cursor: generationStats ? 'pointer' : 'default',
              opacity: generationStats ? 1 : 0.3,
            }}
          >
            ?
          </button>
            {statsOpen && generationStats && (
              <div
                style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 100,
                  background: BG_CARD,
                  border: `2px solid ${PINK}`,
                  boxShadow: `0 0 16px ${PINK}`,
                  padding: '10px 12px',
                  minWidth: 280,
                  fontFamily: PX, fontSize: 7,
                  display: 'flex', flexDirection: 'column', gap: 5,
                }}
              >
                <div style={{ color: PINK, fontSize: 8, marginBottom: 2 }}>
                  GENERATOR STATS
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ color: CYAN }}>ALGORITHM</span>
                  <span style={{ color: '#fff' }}>{generationStats.algorithm.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ color: CYAN }}>WORKERS</span>
                  <span style={{ color: '#fff' }}>{generationStats.parallelWorkers} parallel</span>
                </div>
                <div style={{ borderTop: `1px solid #333`, margin: '2px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ color: CYAN }}>{generationStats.algorithm === 'chain' ? 'P1 SAMPLES' : 'SAMPLES'}</span>
                  <span style={{ color: '#fff' }}>{generationStats.moveDepthIterations}</span>
                </div>
                {generationStats.algorithm === 'chain' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ color: CYAN }}>P1 THRESHOLD</span>
                    <span style={{ color: '#fff' }}>15% of target states</span>
                  </div>
                )}
                {generationStats.algorithm === 'chain' && generationStats.p1BasesYielded != null && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ color: CYAN }}>P1 BASES YIELDED</span>
                    <span style={{ color: '#fff' }}>{generationStats.p1BasesYielded}</span>
                  </div>
                )}
                {generationStats.algorithm === 'chain' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ color: CYAN }}>BASE STATES</span>
                      <span style={{ color: '#fff' }}>{generationStats.baseStates.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ color: CYAN }}>BASE MOVES</span>
                      <span style={{ color: '#fff' }}>{generationStats.baseMoves}</span>
                    </div>
                    <div style={{ borderTop: `1px solid #333`, margin: '2px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ color: CYAN }}>P2 WORKERS RUN</span>
                      <span style={{ color: '#fff' }}>{generationStats.p2WorkersRun ?? '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ color: CYAN }}>P2 CANDIDATES</span>
                      <span style={{ color: '#fff' }}>{generationStats.candidatesTried}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ color: CYAN }}>BLOCKERS ADDED</span>
                      <span style={{ color: '#fff' }}>{generationStats.blockersAdded}</span>
                    </div>
                    {generationStats.p2CandidateResults?.length > 0 &&
                      (generationStats.finalStates < (generationStats.requiredStates ?? 0) ||
                       generationStats.finalMoves < (generationStats.requiredMoves ?? 0)) && (
                      <>
                        <div style={{ borderTop: `1px solid #333`, margin: '2px 0' }} />
                        <div style={{ color: CYAN, marginBottom: 1 }}>CANDIDATES</div>
                        {generationStats.p2CandidateResults.map((r, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ color: r.chosen ? '#39ff14' : '#555' }}>
                              {r.finalStates.toLocaleString()} states
                            </span>
                            <span style={{ color: r.chosen ? '#39ff14' : '#555' }}>
                              {r.finalMoves} moves{r.chosen ? ' ←' : ''}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                    <div style={{ borderTop: `1px solid #333`, margin: '2px 0' }} />
                  </>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ color: CYAN }}>FINAL STATES</span>
                  <span>
                    <span style={{ color: '#fff' }}>{generationStats.finalStates.toLocaleString()}</span>
                    {generationStats.requiredStates != null && <>
                      <span style={{ color: '#555' }}> / {generationStats.requiredStates.toLocaleString()}</span>
                      <span style={{ color: generationStats.finalStates >= generationStats.requiredStates ? '#39ff14' : PINK, marginLeft: 5 }}>
                        {generationStats.finalStates >= generationStats.requiredStates ? '✓' : '✗'}
                      </span>
                    </>}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ color: CYAN }}>FINAL MOVES</span>
                  <span>
                    <span style={{ color: '#fff' }}>{generationStats.finalMoves}</span>
                    {generationStats.requiredMoves != null && <>
                      <span style={{ color: '#555' }}> / {generationStats.requiredMoves}</span>
                      <span style={{ color: generationStats.finalMoves >= generationStats.requiredMoves ? '#39ff14' : PINK, marginLeft: 5 }}>
                        {generationStats.finalMoves >= generationStats.requiredMoves ? '✓' : '✗'}
                      </span>
                    </>}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ color: CYAN }}>TIME</span>
                  <span style={{ color: '#fff' }}>{generationStats.totalTimeMs}ms</span>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Moves + Hint / Reset / Share */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontFamily: PX, fontSize: 8, color: CYAN, textShadow: `0 0 5px ${CYAN}` }}>
          MOVES: <span style={{ color: '#fff' }}>{moves}</span>
          <span style={{ color: PINK }}> | </span>
          BEST: <span style={{ color: '#fff' }}>{minMoves ?? '—'}</span>
        </span>
        <div style={{ marginLeft: 'auto', marginRight: -10, display: 'flex', alignItems: 'center' }}>
          <button
            onClick={onHint}
            disabled={isGenerating || isHinting}
            style={{
              fontFamily: PX, fontSize: 8,
              padding: '6px 10px',
              background: 'transparent',
              color: GOLD,
              border: 'none',
              textShadow: `0 0 5px ${GOLD}`,
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              opacity: isGenerating ? 0.4 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 46,
            }}
          >
            {isHinting
              ? <div style={{ width: 10, height: 10, border: `2px solid ${GOLD}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              : 'HINT'}
          </button>
          <span style={{ color: '#444', fontFamily: PX, fontSize: 10, userSelect: 'none' }}>|</span>
          <button
            onClick={onReset}
            disabled={isGenerating}
            style={{
              fontFamily: PX, fontSize: 8,
              padding: '6px 10px',
              background: 'transparent',
              color: PINK,
              border: 'none',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              opacity: isGenerating ? 0.4 : 1,
            }}
          >
            RESET
          </button>
          <span style={{ color: '#444', fontFamily: PX, fontSize: 10, userSelect: 'none' }}>|</span>
          <div style={{ position: 'relative' }}>
            <button
              onClick={handleShare}
              disabled={isGenerating}
              style={{
                fontFamily: PX, fontSize: 8,
                padding: '6px 10px',
                background: 'transparent',
                color: copied ? '#39ff14' : CYAN,
                border: 'none',
                textShadow: copied ? '0 0 5px #39ff14' : `0 0 5px ${CYAN}`,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                opacity: isGenerating ? 0.4 : 1,
                transition: 'color 0.15s',
              }}
            >
              {copied ? '✓' : 'SHARE'}
            </button>
            {copied && (
              <div style={{
                position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
                background: CYAN, color: '#000',
                fontFamily: PX, fontSize: 7,
                padding: '4px 8px',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}>
                COPIED TO CLIPBOARD
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
