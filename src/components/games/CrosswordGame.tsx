import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, CheckCircle2, HelpCircle } from 'lucide-react';
import { Confetti } from '../ui/Confetti';
import { HowToPlay } from '../ui/HowToPlay';
import { getTodayString, dateToSeed, createRng } from '../../utils/seed';
import { CROSSWORD_WORDS } from '../../data/crosswordWords';
import { generateCrossword } from '../../utils/crosswordGenerator';
import type { PlacedWord } from '../../utils/crosswordGenerator';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useGameStore } from '../../hooks/useGameStore';
import { ShareButton } from '../ui/ShareButton';

const TODAY = getTodayString();
const SEED = dateToSeed(TODAY);
const GRID_SIZE = 13;

// Generate once at module level (deterministic for the day)
const PUZZLE = generateCrossword(CROSSWORD_WORDS, GRID_SIZE, createRng(SEED));

interface SavedState {
  date: string;
  userGrid: string[][];
  won: boolean;
}

const DEFAULT: SavedState = {
  date: TODAY,
  userGrid: Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill('')),
  won: false,
};

export function CrosswordGame({ onBack }: { onBack: () => void }) {
  const [saved, setSaved] = useLocalStorage<SavedState>('iol_crossword_state', DEFAULT);
  const { completeGame } = useGameStore();
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [direction, setDirection] = useState<'across' | 'down'>('across');
  const [showHelp, setShowHelp] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const state = saved.date === TODAY ? saved : DEFAULT;

  useEffect(() => { inputRef.current?.focus(); }, [selected]);

  const solution = PUZZLE.solution;
  const entries = PUZZLE.placedWords;

  function isBlack(r: number, c: number) { return solution[r][c] === ''; }

  // Build a cell-number map from entries
  const numberMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) {
      const k = `${e.row},${e.col}`;
      if (!m.has(k)) m.set(k, e.number);
    }
    return m;
  }, [entries]);

  const activeEntry = useMemo((): PlacedWord | null => {
    if (!selected) return null;
    const [r, c] = selected;
    return entries.find(e => {
      if (e.direction !== direction) return false;
      if (direction === 'across') return e.row === r && c >= e.col && c < e.col + e.word.length;
      return e.col === c && r >= e.row && r < e.row + e.word.length;
    }) ?? null;
  }, [selected, direction, entries]);

  function selectCell(r: number, c: number) {
    if (isBlack(r, c)) return;
    if (selected?.[0] === r && selected?.[1] === c) {
      const newDir = direction === 'across' ? 'down' : 'across';
      const hasOther = entries.some(e => {
        if (e.direction !== newDir) return false;
        if (newDir === 'across') return e.row === r && c >= e.col && c < e.col + e.word.length;
        return e.col === c && r >= e.row && r < e.row + e.word.length;
      });
      if (hasOther) setDirection(newDir);
    } else {
      setSelected([r, c]);
      const hasAcross = entries.some(e =>
        e.direction === 'across' && e.row === r && c >= e.col && c < e.col + e.word.length
      );
      setDirection(hasAcross ? 'across' : 'down');
    }
    inputRef.current?.focus();
  }

  function advance(r: number, c: number) {
    if (direction === 'across') {
      for (let nc = c + 1; nc < GRID_SIZE; nc++) {
        if (!isBlack(r, nc)) { setSelected([r, nc]); return; }
      }
    } else {
      for (let nr = r + 1; nr < GRID_SIZE; nr++) {
        if (!isBlack(nr, c)) { setSelected([nr, c]); return; }
      }
    }
  }

  function retreat(r: number, c: number) {
    if (direction === 'across') {
      for (let nc = c - 1; nc >= 0; nc--) {
        if (!isBlack(r, nc)) { setSelected([r, nc]); return; }
      }
    } else {
      for (let nr = r - 1; nr >= 0; nr--) {
        if (!isBlack(nr, c)) { setSelected([nr, c]); return; }
      }
    }
  }

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (!selected) return;
    const [r, c] = selected;
    const key = e.key.toUpperCase();

    if (key === 'BACKSPACE') {
      e.preventDefault();
      const newGrid = state.userGrid.map(row => [...row]);
      if (newGrid[r][c]) { newGrid[r][c] = ''; setSaved({ ...state, userGrid: newGrid }); }
      else retreat(r, c);
      return;
    }

    if (/^[A-Z]$/.test(key)) {
      e.preventDefault();
      const newGrid = state.userGrid.map(row => [...row]);
      newGrid[r][c] = key;
      const won = solution.every((row, ri) =>
        row.every((cell, ci) => cell === '' || newGrid[ri][ci] === cell)
      );
      setSaved({ ...state, userGrid: newGrid, won });
      if (won) completeGame('crossword', true);
      else advance(r, c);
    }

    if (key === 'ARROWRIGHT' || key === 'ARROWLEFT') { e.preventDefault(); setDirection('across'); }
    if (key === 'ARROWUP' || key === 'ARROWDOWN') { e.preventDefault(); setDirection('down'); }
  }, [selected, state, solution, setSaved, completeGame]);

  function getCellClass(r: number, c: number): string {
    if (isBlack(r, c)) return '';
    const isSel = selected?.[0] === r && selected?.[1] === c;
    const val = state.userGrid[r]?.[c];
    const sol = solution[r]?.[c];

    const inWord = activeEntry && (() => {
      const { row, col, word, direction: d } = activeEntry;
      if (d === 'across') return r === row && c >= col && c < col + word.length;
      return c === col && r >= row && r < row + word.length;
    })();

    if (isSel) return 'sel-cell';
    if (inWord) return 'word-cell';
    if (val && val === sol) return 'correct-cell';
    if (val && val !== sol) return 'wrong-cell';
    return 'empty-cell';
  }

  const cellBg: Record<string, string> = {
    'sel-cell':     '#f59e0b',
    'word-cell':    'rgba(245,158,11,0.18)',
    'correct-cell': 'rgba(52,211,153,0.25)',
    'wrong-cell':   'rgba(248,113,113,0.25)',
    'empty-cell':   'rgba(255,255,255,0.92)',
  };
  const cellColor: Record<string, string> = {
    'sel-cell':     '#1a0a00',
    'word-cell':    '#fff',
    'correct-cell': '#fff',
    'wrong-cell':   '#fff',
    'empty-cell':   '#1a0a00',
  };

  const across = useMemo(() => entries.filter(e => e.direction === 'across').sort((a, b) => a.number - b.number), [entries]);
  const down   = useMemo(() => entries.filter(e => e.direction === 'down').sort((a, b) => a.number - b.number), [entries]);

  const shareText = `IOL Crossword ${TODAY}\n${state.won ? '✅ Solved!' : '🔲 In progress'}\n\nPlay at iol.co.za/games`;
  const cellPx = Math.max(18, Math.min(28, Math.floor((Math.min(window.innerWidth * 0.55, 360) - 16) / GRID_SIZE)));

  const ClueList = ({ dir }: { dir: 'across' | 'down' }) => {
    const list = dir === 'across' ? across : down;
    return (
      <div>
        <p className="font-bold text-gray-300 mb-1.5 text-[10px] uppercase tracking-widest">{dir}</p>
        {list.map(entry => (
          <button
            key={`${entry.number}${dir[0]}`}
            onClick={() => { setSelected([entry.row, entry.col]); setDirection(dir); }}
            className={`text-left w-full mb-1 text-[11px] leading-tight transition-colors rounded px-1 py-0.5 ${
              activeEntry?.number === entry.number && direction === dir
                ? 'text-blue-300 bg-blue-500/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="text-white font-semibold">{entry.number}. </span>{entry.clue}
          </button>
        ))}
      </div>
    );
  };

  const CROSSWORD_STEPS = [
    { icon: '🔤', text: 'Tap any white cell to select it, then type or tap a letter to fill it in.' },
    { icon: '↔️', text: 'Tap the same cell twice to switch between Across and Down direction.' },
    { icon: '📋', text: 'The active clue is shown below the grid. All clues are listed in the right panel.' },
    { icon: '🟡', text: 'Gold cell = your selected cell. Amber highlight = the active word.' },
    { icon: '🟩', text: 'Green = correctly placed letter. Red = wrong letter.' },
    { icon: '⌫', text: 'Tap ⌫ on the keyboard to erase the current cell and step back.' },
  ];

  return (
    <div className="min-h-screen text-white flex flex-col" style={{ background: 'linear-gradient(160deg, #14100a 0%, #1e1408 60%, #0d0a05 100%)' }}>
      {state.won && <Confetti />}
      {showHelp && <HowToPlay title="IOL Crossword" accentColor="#f59e0b" steps={CROSSWORD_STEPS} onClose={() => setShowHelp(false)} />}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #d97706, #f59e0b, #d97706)' }} />
      <input ref={inputRef} className="absolute opacity-0 w-0 h-0 pointer-events-none" onKeyDown={handleKey} readOnly inputMode="text" />

      <header className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
        <button onClick={onBack} className="text-slate-400 hover:text-white p-1"><ArrowLeft size={20} /></button>
        <div className="text-center">
          <h1 className="font-bold text-base tracking-wide" style={{ color: '#fbbf24' }}>IOL Crossword</h1>
          <p className="text-slate-500 text-xs">{TODAY}</p>
        </div>
        <button onClick={() => setShowHelp(true)} className="text-slate-400 hover:text-white p-1"><HelpCircle size={20} /></button>
      </header>

      {state.won && (
        <div className="bounce-in mx-4 mt-3 rounded-xl p-3 flex items-center justify-between"
          style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)' }}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} style={{ color: '#34d399' }} />
            <span className="font-semibold text-sm" style={{ color: '#6ee7b7' }}>🎉 Puzzle solved!</span>
          </div>
          <ShareButton text={shareText} gameName="Crossword" resultLine={`Solved ${TODAY}`} />
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left: grid + active clue + keyboard */}
        <div className="flex flex-col items-center gap-2 px-2 py-3 overflow-y-auto flex-1">
          {/* Grid */}
          <div className="flex-shrink-0 rounded-lg overflow-hidden"
            style={{ display: 'grid', gridTemplateColumns: `repeat(${GRID_SIZE}, ${cellPx}px)`, border: '2px solid rgba(245,158,11,0.3)', boxShadow: '0 0 30px rgba(245,158,11,0.1)' }}>
            {Array.from({ length: GRID_SIZE }).map((_, r) =>
              Array.from({ length: GRID_SIZE }).map((_, c) => {
                const num = numberMap.get(`${r},${c}`);
                const val = state.userGrid[r]?.[c] ?? '';
                const black = isBlack(r, c);
                const cls = getCellClass(r, c);
                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => selectCell(r, c)}
                    disabled={black}
                    style={{
                      width: cellPx, height: cellPx,
                      background: black ? '#1a1208' : cellBg[cls] ?? '#fff',
                      color: black ? 'transparent' : cellColor[cls] ?? '#000',
                      border: '1px solid rgba(245,158,11,0.15)',
                      transition: 'background 0.1s ease',
                    }}
                    className="relative flex items-center justify-center"
                  >
                    {!black && num != null && (
                      <span className="absolute top-0 left-0 leading-none px-px pt-px font-normal"
                        style={{ fontSize: 5, color: cls === 'sel-cell' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.4)' }}>
                        {num}
                      </span>
                    )}
                    {!black && val && (
                      <span style={{ fontSize: Math.max(cellPx * 0.5, 7) }} className="font-black uppercase leading-none">
                        {val}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Active clue bar */}
          {activeEntry && (
            <div className="w-full max-w-xs rounded-xl px-3 py-2"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <span className="text-[10px] mr-1.5 font-bold uppercase" style={{ color: '#fbbf24' }}>
                {activeEntry.number} {activeEntry.direction}
              </span>
              <span className="text-slate-200 text-xs">{activeEntry.clue}</span>
            </div>
          )}

          {/* Keyboard */}
          {selected && (
            <div className="w-full max-w-xs">
              {(['QWERTYUIOP'.split(''), 'ASDFGHJKL'.split(''), [...'ZXCVBNM'.split(''), '⌫']] as string[][]).map((row, ri) => (
                <div key={ri} className="flex justify-center gap-0.5 mb-0.5">
                  {row.map(letter => (
                    <button key={letter}
                      onClick={() => { const e = { key: letter === '⌫' ? 'BACKSPACE' : letter, preventDefault: () => {} } as unknown as React.KeyboardEvent; handleKey(e); }}
                      className={`${letter === '⌫' ? 'w-8' : 'w-6'} h-8 rounded-lg text-[10px] font-bold uppercase transition-all active:scale-95`}
                      style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)', color: '#e2e8f0' }}>
                      {letter}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
          {!selected && <p className="text-xs" style={{ color: 'rgba(245,158,11,0.4)' }}>Tap a white cell to start</p>}
        </div>

        {/* Right: clue panel */}
        <div className="w-44 flex-shrink-0 overflow-y-auto py-3 px-2 flex flex-col gap-3 slide-in-right"
          style={{ borderLeft: '1px solid rgba(245,158,11,0.15)', fontSize: 11 }}>
          <ClueList dir="across" />
          <div className="pt-2" style={{ borderTop: '1px solid rgba(245,158,11,0.15)' }}>
            <ClueList dir="down" />
          </div>
        </div>
      </div>
    </div>
  );
}
