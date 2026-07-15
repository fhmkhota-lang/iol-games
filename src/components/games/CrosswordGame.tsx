import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, HelpCircle, CheckCircle2 } from 'lucide-react';
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
  const [showClues, setShowClues] = useState(false);
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
  const cellPx = Math.max(20, Math.min(32, Math.floor((Math.min(window.innerWidth, 500) - 32) / GRID_SIZE)));

  return (
    <div className="min-h-screen bg-[#111] text-white flex flex-col">
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
        <button onClick={() => setShowClues(v => !v)} className="text-gray-400 hover:text-white p-1">
          <HelpCircle size={20} />
        </button>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-3 flex flex-col items-center gap-3 overflow-y-auto">
        {state.won && (
          <div className="bounce-in w-full bg-green-500/10 border border-green-500/30 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-green-400" />
              <span className="text-green-300 font-semibold text-sm">Puzzle solved!</span>
            </div>
            <ShareButton text={shareText} gameName="Crossword" resultLine={`Solved ${TODAY}`} />
          </div>
        )}

        {/* Grid */}
        <div
          className="border border-white/20"
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
                    <span style={{ fontSize: Math.max(cellPx * 0.5, 8) }} className="font-bold uppercase leading-none">
                      {val}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Active clue bar */}
        {activeEntry && !showClues && (
          <div className="w-full bg-white/5 border border-white/10 rounded-xl p-3">
            <span className="text-xs text-gray-400 mr-2">
              {activeEntry.number} {activeEntry.direction}:
            </span>
            <span className="text-white text-sm">{activeEntry.clue}</span>
          </div>
        )}

        {/* On-screen keyboard */}
        {selected && !showClues && (
          <div className="w-full">
            {(['QWERTYUIOP'.split(''), 'ASDFGHJKL'.split(''), [...'ZXCVBNM'.split(''), '⌫']] as string[][]).map((row, ri) => (
              <div key={ri} className="flex justify-center gap-0.5 mb-1">
                {row.map(letter => (
                  <button
                    key={letter}
                    onClick={() => {
                      const e = { key: letter === '⌫' ? 'BACKSPACE' : letter, preventDefault: () => {} } as unknown as React.KeyboardEvent;
                      handleKey(e);
                    }}
                    className={`${letter === '⌫' ? 'w-10' : 'w-7'} h-9 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase transition-colors`}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Clue list */}
        {showClues && (
          <div className="w-full grid grid-cols-2 gap-4 text-sm pb-8">
            <div>
              <p className="font-bold text-gray-300 mb-2 text-xs uppercase tracking-wide">Across</p>
              {across.map(entry => (
                <button
                  key={`${entry.number}a`}
                  onClick={() => { setSelected([entry.row, entry.col]); setDirection('across'); setShowClues(false); }}
                  className={`text-left w-full mb-1.5 ${activeEntry?.number === entry.number && direction === 'across' ? 'text-blue-400' : 'text-gray-400'} hover:text-white transition-colors`}
                >
                  <span className="text-white font-semibold">{entry.number}. </span>{entry.clue}
                </button>
              ))}
            </div>
            <div>
              <p className="font-bold text-gray-300 mb-2 text-xs uppercase tracking-wide">Down</p>
              {down.map(entry => (
                <button
                  key={`${entry.number}d`}
                  onClick={() => { setSelected([entry.row, entry.col]); setDirection('down'); setShowClues(false); }}
                  className={`text-left w-full mb-1.5 ${activeEntry?.number === entry.number && direction === 'down' ? 'text-blue-400' : 'text-gray-400'} hover:text-white transition-colors`}
                >
                  <span className="text-white font-semibold">{entry.number}. </span>{entry.clue}
                </button>
              ))}
            </div>
          </div>
        )}

        {!showClues && !selected && (
          <p className="text-gray-600 text-xs">Tap a white cell to start — ? for all clues</p>
        )}
      </main>
    </div>
  );
}
