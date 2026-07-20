import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Confetti } from '../ui/Confetti';
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
    if (isBlack(r, c)) return 'bg-black border-black';
    const isSel = selected?.[0] === r && selected?.[1] === c;
    const val = state.userGrid[r]?.[c];
    const sol = solution[r]?.[c];

    const inWord = activeEntry && (() => {
      const { row, col, word, direction: d } = activeEntry;
      if (d === 'across') return r === row && c >= col && c < col + word.length;
      return c === col && r >= row && r < row + word.length;
    })();

    if (isSel) return 'bg-blue-500 text-black';
    if (inWord) return 'bg-blue-100 text-black';
    if (val && val === sol) return 'bg-green-100 text-black';
    if (val && val !== sol) return 'bg-red-100 text-black';
    return 'bg-white text-black';
  }

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

  return (
    <div className="min-h-screen bg-[#111] text-white flex flex-col">
      {state.won && <Confetti />}
      <input
        ref={inputRef}
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        onKeyDown={handleKey}
        readOnly
        inputMode="text"
      />

      <header className="border-b border-white/10 flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="text-gray-400 hover:text-white p-1"><ArrowLeft size={20} /></button>
        <div className="text-center">
          <h1 className="font-bold text-base">IOL Crossword</h1>
          <p className="text-gray-500 text-xs">{TODAY}</p>
        </div>
        <div className="w-8" />
      </header>

      {/* Win banner */}
      {state.won && (
        <div className="bounce-in mx-4 mt-3 bg-green-500/10 border border-green-500/30 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-green-400" />
            <span className="text-green-300 font-semibold text-sm">🎉 Puzzle solved!</span>
          </div>
          <ShareButton text={shareText} gameName="Crossword" resultLine={`Solved ${TODAY}`} />
        </div>
      )}

      {/* Main layout: grid left, clues right */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: grid + active clue + keyboard */}
        <div className="flex flex-col items-center gap-2 px-2 py-3 overflow-y-auto flex-1">
          {/* Grid */}
          <div
            className="border border-white/20 flex-shrink-0"
            style={{ display: 'grid', gridTemplateColumns: `repeat(${GRID_SIZE}, ${cellPx}px)` }}
          >
            {Array.from({ length: GRID_SIZE }).map((_, r) =>
              Array.from({ length: GRID_SIZE }).map((_, c) => {
                const num = numberMap.get(`${r},${c}`);
                const val = state.userGrid[r]?.[c] ?? '';
                const black = isBlack(r, c);
                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => selectCell(r, c)}
                    disabled={black}
                    style={{ width: cellPx, height: cellPx }}
                    className={`relative flex items-center justify-center border border-black/20 transition-colors ${getCellClass(r, c)}`}
                  >
                    {!black && num != null && (
                      <span className="absolute top-0 left-0 text-[5px] leading-none text-black/50 px-px pt-px font-normal">
                        {num}
                      </span>
                    )}
                    {!black && val && (
                      <span style={{ fontSize: Math.max(cellPx * 0.5, 7) }} className="font-bold uppercase leading-none">
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
            <div className="w-full max-w-xs bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
              <span className="text-[10px] text-blue-300 mr-1.5 font-semibold uppercase">
                {activeEntry.number} {activeEntry.direction}
              </span>
              <span className="text-white text-xs">{activeEntry.clue}</span>
            </div>
          )}

          {/* On-screen keyboard */}
          {selected && (
            <div className="w-full max-w-xs">
              {(['QWERTYUIOP'.split(''), 'ASDFGHJKL'.split(''), [...'ZXCVBNM'.split(''), '⌫']] as string[][]).map((row, ri) => (
                <div key={ri} className="flex justify-center gap-0.5 mb-0.5">
                  {row.map(letter => (
                    <button
                      key={letter}
                      onClick={() => {
                        const e = { key: letter === '⌫' ? 'BACKSPACE' : letter, preventDefault: () => {} } as unknown as React.KeyboardEvent;
                        handleKey(e);
                      }}
                      className={`${letter === '⌫' ? 'w-8' : 'w-6'} h-8 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase transition-colors`}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {!selected && <p className="text-gray-600 text-xs">Tap a white cell to start</p>}
        </div>

        {/* Right: clue panel (always visible) */}
        <div
          className="w-44 flex-shrink-0 border-l border-white/10 overflow-y-auto py-3 px-2 flex flex-col gap-3 slide-in-right"
          style={{ fontSize: 11 }}
        >
          <ClueList dir="across" />
          <div className="border-t border-white/10 pt-2">
            <ClueList dir="down" />
          </div>
        </div>
      </div>
    </div>
  );
}
