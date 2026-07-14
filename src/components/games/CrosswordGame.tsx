import { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowLeft, HelpCircle, CheckCircle2 } from 'lucide-react';
import { getTodayString, dateToSeed } from '../../utils/seed';
import { CROSSWORD_PUZZLES } from '../../data/crosswordData';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useGameStore } from '../../hooks/useGameStore';
import { ShareButton } from '../ui/ShareButton';

const TODAY = getTodayString();
const SEED = dateToSeed(TODAY);
const PUZZLE = CROSSWORD_PUZZLES[SEED % CROSSWORD_PUZZLES.length];
const SOLUTION = PUZZLE.grid;   // 5×5 string[][]
const ROWS = SOLUTION.length;
const COLS = SOLUTION[0].length;

// Map "r,c" → clue number for cells that start an entry
const NUMBER_MAP = new Map<string, number>();
for (const clue of PUZZLE.clues) {
  const key = `${clue.row},${clue.col}`;
  if (!NUMBER_MAP.has(key)) NUMBER_MAP.set(key, clue.number);
}

interface SavedState {
  date: string;
  userGrid: string[][];
  won: boolean;
}

const DEFAULT: SavedState = {
  date: TODAY,
  userGrid: SOLUTION.map(r => r.map(() => '')),
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

  useEffect(() => {
    inputRef.current?.focus();
  }, [selected]);

  // Find the active word entry based on current selection + direction
  const activeEntry = useMemo(() => {
    if (!selected) return null;
    const [r, c] = selected;
    return PUZZLE.clues.find(entry => {
      if (entry.direction !== direction) return false;
      if (direction === 'across') {
        return entry.row === r && c >= entry.col && c < entry.col + entry.answer.length;
      }
      return entry.col === c && r >= entry.row && r < entry.row + entry.answer.length;
    }) ?? null;
  }, [selected, direction]);

  function selectCell(r: number, c: number) {
    if (selected?.[0] === r && selected?.[1] === c) {
      // Toggle direction, but only if valid entry exists in new direction
      const newDir = direction === 'across' ? 'down' : 'across';
      const hasEntry = PUZZLE.clues.some(e => {
        if (e.direction !== newDir) return false;
        if (newDir === 'across') return e.row === r && c >= e.col && c < e.col + e.answer.length;
        return e.col === c && r >= e.row && r < e.row + e.answer.length;
      });
      if (hasEntry) setDirection(newDir);
    } else {
      setSelected([r, c]);
      const hasAcross = PUZZLE.clues.some(e =>
        e.direction === 'across' && e.row === r && c >= e.col && c < e.col + e.answer.length
      );
      const hasDown = PUZZLE.clues.some(e =>
        e.direction === 'down' && e.col === c && r >= e.row && r < e.row + e.answer.length
      );
      // Prefer 'across' when the cell has one; only use 'down' if no across entry exists.
      // Tap the same cell again to toggle between directions.
      if (hasAcross) setDirection('across');
      else if (hasDown) setDirection('down');
    }
    inputRef.current?.focus();
  }

  function advance(r: number, c: number) {
    if (direction === 'across') {
      if (c + 1 < COLS) setSelected([r, c + 1]);
    } else {
      if (r + 1 < ROWS) setSelected([r + 1, c]);
    }
  }

  function retreat(r: number, c: number) {
    if (direction === 'across') {
      if (c - 1 >= 0) setSelected([r, c - 1]);
    } else {
      if (r - 1 >= 0) setSelected([r - 1, c]);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (!selected) return;
    const [r, c] = selected;
    const key = e.key.toUpperCase();

    if (key === 'BACKSPACE') {
      e.preventDefault();
      const newGrid = state.userGrid.map(row => [...row]);
      if (newGrid[r][c]) {
        newGrid[r][c] = '';
        setSaved({ ...state, userGrid: newGrid });
      } else {
        retreat(r, c);
      }
      return;
    }

    if (/^[A-Z]$/.test(key)) {
      e.preventDefault();
      const newGrid = state.userGrid.map(row => [...row]);
      newGrid[r][c] = key;
      const won = SOLUTION.every((row, ri) =>
        row.every((cell, ci) => newGrid[ri][ci] === cell)
      );
      setSaved({ ...state, userGrid: newGrid, won });
      if (won) completeGame('crossword', true);
      else advance(r, c);
    }

    if (key === 'ARROWRIGHT' || key === 'ARROWLEFT') { e.preventDefault(); setDirection('across'); }
    if (key === 'ARROWUP' || key === 'ARROWDOWN') { e.preventDefault(); setDirection('down'); }
  }

  function getCellStyle(r: number, c: number): string {
    const isSel = selected?.[0] === r && selected?.[1] === c;
    const val = state.userGrid[r]?.[c];
    const sol = SOLUTION[r]?.[c];

    const inWord = activeEntry && (() => {
      const { row, col, answer, direction: d } = activeEntry;
      if (d === 'across') return r === row && c >= col && c < col + answer.length;
      return c === col && r >= row && r < row + answer.length;
    })();

    if (isSel) return 'bg-blue-500 text-white';
    if (inWord) return 'bg-blue-500/20 text-white';
    if (val && val === sol) return 'bg-green-600/20 text-green-300';
    if (val && val !== sol) return 'bg-red-500/20 text-red-300';
    return 'bg-[#2a2a2a] text-white';
  }

  const across = PUZZLE.clues
    .filter(c => c.direction === 'across')
    .sort((a, b) => a.number - b.number);
  const down = PUZZLE.clues
    .filter(c => c.direction === 'down')
    .sort((a, b) => a.number - b.number);

  const shareText = `IOL Mini Crossword ${TODAY}\n${state.won ? '✅ Solved!' : '🔲 In progress'}\n\nPlay at iol.co.za/games`;
  const cellPx = 56; // fixed 56px cells → 280px total for 5 cols

  return (
    <div className="min-h-screen bg-[#111] text-white flex flex-col">
      {/* Hidden input captures physical keyboard on mobile */}
      <input
        ref={inputRef}
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        onKeyDown={handleKey}
        readOnly
        inputMode="text"
      />

      <header className="border-b border-white/10 flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="text-gray-400 hover:text-white p-1">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-base">IOL Mini Crossword</h1>
          <p className="text-gray-500 text-xs">{TODAY}</p>
        </div>
        <button onClick={() => setShowClues(v => !v)} className="text-gray-400 hover:text-white p-1">
          <HelpCircle size={20} />
        </button>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 flex flex-col items-center gap-4">
        {state.won && (
          <div className="bounce-in w-full bg-green-500/10 border border-green-500/30 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-green-400" />
              <span className="text-green-300 font-semibold text-sm">Puzzle solved!</span>
            </div>
            <ShareButton text={shareText} gameName="Crossword" resultLine={`Solved ${TODAY}`} />
          </div>
        )}

        {/* 5×5 Grid */}
        <div
          className="border-2 border-white/30 rounded overflow-hidden"
          style={{ display: 'inline-grid', gridTemplateColumns: `repeat(${COLS}, ${cellPx}px)` }}
        >
          {Array.from({ length: ROWS }).map((_, r) =>
            Array.from({ length: COLS }).map((_, c) => {
              const num = NUMBER_MAP.get(`${r},${c}`);
              const val = state.userGrid[r]?.[c] ?? '';
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => selectCell(r, c)}
                  style={{ width: cellPx, height: cellPx }}
                  className={`relative flex items-center justify-center border border-white/15 text-lg font-bold uppercase transition-colors ${getCellStyle(r, c)}`}
                >
                  {num != null && (
                    <span className="absolute top-0.5 left-0.5 text-[8px] text-white/50 leading-none font-normal">
                      {num}
                    </span>
                  )}
                  {val}
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

        {/* On-screen letter pad */}
        {selected && !showClues && (
          <div className="w-full">
            {'QWERTYUIOPASDFGHJKLZXCVBNM'.split('').reduce((rows: string[][], letter, i) => {
              const rowIdx = i < 10 ? 0 : i < 19 ? 1 : 2;
              if (!rows[rowIdx]) rows[rowIdx] = [];
              rows[rowIdx].push(letter);
              return rows;
            }, []).map((row, ri) => (
              <div key={ri} className="flex justify-center gap-1 mb-1">
                {row.map(letter => (
                  <button
                    key={letter}
                    onClick={() => {
                      const e = { key: letter, preventDefault: () => {} } as unknown as React.KeyboardEvent;
                      handleKey(e);
                    }}
                    className="w-8 h-10 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase transition-colors"
                  >
                    {letter}
                  </button>
                ))}
                {ri === 2 && (
                  <button
                    onClick={() => {
                      const e = { key: 'BACKSPACE', preventDefault: () => {} } as unknown as React.KeyboardEvent;
                      handleKey(e);
                    }}
                    className="w-12 h-10 rounded bg-white/10 hover:bg-white/20 text-white text-xs transition-colors"
                  >
                    ⌫
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Clue list (shown when ? tapped) */}
        {showClues && (
          <div className="w-full grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-bold text-gray-300 mb-2 text-xs uppercase tracking-wide">Across</p>
              {across.map(entry => (
                <button
                  key={`${entry.number}a`}
                  onClick={() => {
                    setSelected([entry.row, entry.col]);
                    setDirection('across');
                    setShowClues(false);
                  }}
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
                  onClick={() => {
                    setSelected([entry.row, entry.col]);
                    setDirection('down');
                    setShowClues(false);
                  }}
                  className={`text-left w-full mb-1.5 ${activeEntry?.number === entry.number && direction === 'down' ? 'text-blue-400' : 'text-gray-400'} hover:text-white transition-colors`}
                >
                  <span className="text-white font-semibold">{entry.number}. </span>{entry.clue}
                </button>
              ))}
            </div>
          </div>
        )}

        {!showClues && !selected && (
          <p className="text-gray-600 text-xs">Tap a cell to start — tap ? for all clues</p>
        )}
      </main>
    </div>
  );
}
