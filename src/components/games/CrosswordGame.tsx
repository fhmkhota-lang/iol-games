import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, HelpCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { getTodayString } from '../../utils/seed';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useGameStore } from '../../hooks/useGameStore';
import { ShareButton } from '../ui/ShareButton';

const TODAY = getTodayString();
const SIZE = 15;

// Map today's date to a puzzle in the doshea dataset (2008 has full year coverage)
function getPuzzleUrl(year = 2008): string {
  const [, m, d] = TODAY.split('-');
  const month = parseInt(m);
  const day = parseInt(d);
  // Cap Feb at 28 (2008 is a leap year so Feb 29 is actually fine)
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `https://raw.githubusercontent.com/doshea/nyt_crosswords/master/${year}/${mm}/${dd}.json`;
}

// Try multiple years in case a specific day is missing
async function fetchPuzzle(): Promise<ApiCrossword> {
  const years = [2008, 2010, 2012, 2014, 2016];
  for (const year of years) {
    try {
      const r = await fetch(getPuzzleUrl(year));
      if (!r.ok) continue;
      const data = await r.json();
      if (data?.grid && data.grid.length === SIZE * SIZE) return data;
    } catch {
      continue;
    }
  }
  throw new Error('no puzzle found');
}

interface ApiCrossword {
  grid: string[];
  gridnums: number[];
  clues: { across: string[]; down: string[] };
  answers: { across: string[]; down: string[] };
}

interface Entry {
  number: number;
  direction: 'across' | 'down';
  row: number;
  col: number;
  answer: string;
  clue: string;
}

function buildEntries(data: ApiCrossword): Entry[] {
  const numToPos = new Map<number, [number, number]>();
  data.gridnums.forEach((num, idx) => {
    if (num > 0) numToPos.set(num, [Math.floor(idx / SIZE), idx % SIZE]);
  });

  function parseNum(s: string) { return parseInt(s.match(/^(\d+)\./)?.[1] ?? '0'); }
  function parseText(s: string) { return s.replace(/^\d+\.\s*/, ''); }

  const entries: Entry[] = [];

  data.clues.across.forEach((clue, i) => {
    const num = parseNum(clue);
    const pos = numToPos.get(num);
    const answer = data.answers.across[i];
    if (!pos || !answer) return;
    entries.push({ number: num, direction: 'across', row: pos[0], col: pos[1], answer, clue: parseText(clue) });
  });

  data.clues.down.forEach((clue, i) => {
    const num = parseNum(clue);
    const pos = numToPos.get(num);
    const answer = data.answers.down[i];
    if (!pos || !answer) return;
    entries.push({ number: num, direction: 'down', row: pos[0], col: pos[1], answer, clue: parseText(clue) });
  });

  return entries;
}

interface SavedState {
  date: string;
  apiGrid: string[];     // solution / black-square map from API
  gridnums: number[];
  entries: Entry[];
  userGrid: string[];    // user's letters, '' = empty
  won: boolean;
}

function makeDefault(data: ApiCrossword): SavedState {
  return {
    date: TODAY,
    apiGrid: data.grid,
    gridnums: data.gridnums,
    entries: buildEntries(data),
    userGrid: data.grid.map(c => c === '.' ? '.' : ''),
    won: false,
  };
}

export function CrosswordGame({ onBack }: { onBack: () => void }) {
  const [saved, setSaved] = useLocalStorage<SavedState | null>('iol_crossword_nyt_state', null);
  const { completeGame } = useGameStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<number | null>(null); // flat index
  const [direction, setDirection] = useState<'across' | 'down'>('across');
  const [showClues, setShowClues] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const state = saved?.date === TODAY ? saved : null;

  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    if (state) return;
    setLoading(true);
    setError(false);
    fetchPuzzle()
      .then((data) => {
        setSaved(makeDefault(data));
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        setError(true);
      });
  }, [fetchKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    inputRef.current?.focus();
  }, [selected]);

  const apiGrid = state?.apiGrid ?? [];
  const gridnums = state?.gridnums ?? [];
  const entries = state?.entries ?? [];
  const userGrid = state?.userGrid ?? [];

  function idx(r: number, c: number) { return r * SIZE + c; }

  function isBlack(i: number) { return apiGrid[i] === '.'; }

  // Find active entry containing the given flat index
  const activeEntry = useMemo(() => {
    if (selected === null) return null;
    const r = Math.floor(selected / SIZE);
    const c = selected % SIZE;
    return entries.find(e => {
      if (e.direction !== direction) return false;
      if (direction === 'across') {
        return e.row === r && c >= e.col && c < e.col + e.answer.length;
      }
      return e.col === c && r >= e.row && r < e.row + e.answer.length;
    }) ?? null;
  }, [selected, direction, entries]);

  function selectCell(i: number) {
    if (isBlack(i)) return;
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;

    if (selected === i) {
      // Toggle direction if valid entry exists in other direction
      const newDir = direction === 'across' ? 'down' : 'across';
      const hasOther = entries.some(e => {
        if (e.direction !== newDir) return false;
        if (newDir === 'across') return e.row === r && c >= e.col && c < e.col + e.answer.length;
        return e.col === c && r >= e.row && r < e.row + e.answer.length;
      });
      if (hasOther) setDirection(newDir);
    } else {
      setSelected(i);
      const hasAcross = entries.some(e =>
        e.direction === 'across' && e.row === r && c >= e.col && c < e.col + e.answer.length
      );
      if (hasAcross) setDirection('across');
      else setDirection('down');
    }
    inputRef.current?.focus();
  }

  function advance(i: number) {
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;
    if (direction === 'across') {
      for (let nc = c + 1; nc < SIZE; nc++) {
        const ni = idx(r, nc);
        if (!isBlack(ni)) { setSelected(ni); return; }
      }
    } else {
      for (let nr = r + 1; nr < SIZE; nr++) {
        const ni = idx(nr, c);
        if (!isBlack(ni)) { setSelected(ni); return; }
      }
    }
  }

  function retreat(i: number) {
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;
    if (direction === 'across') {
      for (let nc = c - 1; nc >= 0; nc--) {
        const ni = idx(r, nc);
        if (!isBlack(ni)) { setSelected(ni); return; }
      }
    } else {
      for (let nr = r - 1; nr >= 0; nr--) {
        const ni = idx(nr, c);
        if (!isBlack(ni)) { setSelected(ni); return; }
      }
    }
  }

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (selected === null || !state) return;
    const key = e.key.toUpperCase();

    if (key === 'BACKSPACE') {
      e.preventDefault();
      const newGrid = [...userGrid];
      if (newGrid[selected] && newGrid[selected] !== '.') {
        newGrid[selected] = '';
        setSaved({ ...state, userGrid: newGrid });
      } else {
        retreat(selected);
      }
      return;
    }

    if (/^[A-Z]$/.test(key)) {
      e.preventDefault();
      const newGrid = [...userGrid];
      newGrid[selected] = key;
      const won = apiGrid.every((c, i) => c === '.' || newGrid[i] === c);
      setSaved({ ...state, userGrid: newGrid, won });
      if (won) completeGame('crossword', true);
      else advance(selected);
    }

    if (key === 'ARROWRIGHT' || key === 'ARROWLEFT') { e.preventDefault(); setDirection('across'); }
    if (key === 'ARROWUP' || key === 'ARROWDOWN') { e.preventDefault(); setDirection('down'); }
  }, [selected, state, userGrid, apiGrid, setSaved, completeGame]);

  function getCellStyle(i: number): string {
    if (isBlack(i)) return 'bg-black';
    const isSel = selected === i;
    const val = userGrid[i];
    const sol = apiGrid[i];
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;

    const inWord = activeEntry && (() => {
      const { row, col, answer, direction: d } = activeEntry;
      if (d === 'across') return r === row && c >= col && c < col + answer.length;
      return c === col && r >= row && r < row + answer.length;
    })();

    if (isSel) return 'bg-blue-500 text-black';
    if (inWord) return 'bg-blue-100 text-black';
    if (val && val === sol) return 'bg-green-100 text-black';
    if (val && val !== sol) return 'bg-red-100 text-black';
    return 'bg-white text-black';
  }

  const across = useMemo(() => entries.filter(e => e.direction === 'across').sort((a, b) => a.number - b.number), [entries]);
  const down = useMemo(() => entries.filter(e => e.direction === 'down').sort((a, b) => a.number - b.number), [entries]);

  const shareText = `IOL Crossword ${TODAY}\n${state?.won ? '✅ Solved!' : '🔲 In progress'}\n\nPlay at iol.co.za/games`;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111] text-white flex flex-col">
        <header className="border-b border-white/10 flex items-center justify-between px-4 py-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white p-1"><ArrowLeft size={20} /></button>
          <h1 className="font-bold text-base">IOL Crossword</h1>
          <div className="w-8" />
        </header>
        <div className="flex-1 flex items-center justify-center gap-3 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading today's puzzle…</span>
        </div>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="min-h-screen bg-[#111] text-white flex flex-col">
        <header className="border-b border-white/10 flex items-center justify-between px-4 py-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white p-1"><ArrowLeft size={20} /></button>
          <h1 className="font-bold text-base">IOL Crossword</h1>
          <div className="w-8" />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-gray-400 text-sm">Couldn't load today's puzzle. Check your connection and try again.</p>
          <button
            onClick={() => { setSaved(null); setFetchKey(k => k + 1); }}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Cell pixel size — fit 15 cells in viewport width minus padding
  const cellPx = Math.floor(Math.min(Math.max(window.innerWidth - 32, 300), 390) / SIZE);

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
          <p className="text-gray-500 text-xs">{TODAY} · NYT Classic</p>
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

        {/* 15×15 Grid */}
        <div
          className="border border-black"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${SIZE}, ${cellPx}px)`,
            gap: 0,
          }}
        >
          {Array.from({ length: SIZE * SIZE }).map((_, i) => {
            const num = gridnums[i];
            const val = userGrid[i];
            const black = isBlack(i);
            return (
              <button
                key={i}
                onClick={() => selectCell(i)}
                disabled={black}
                style={{ width: cellPx, height: cellPx }}
                className={`relative flex items-center justify-center border border-black/30 text-[10px] font-bold uppercase transition-colors ${getCellStyle(i)}`}
              >
                {!black && num > 0 && (
                  <span className="absolute top-0 left-0 text-[5px] leading-none font-normal text-black/50 px-px pt-px">
                    {num}
                  </span>
                )}
                {!black && val ? (
                  <span style={{ fontSize: Math.max(cellPx * 0.5, 8) }}>{val}</span>
                ) : null}
              </button>
            );
          })}
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
        {selected !== null && !showClues && (
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
                  onClick={() => {
                    setSelected(idx(entry.row, entry.col));
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
                    setSelected(idx(entry.row, entry.col));
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

        {!showClues && selected === null && (
          <p className="text-gray-600 text-xs">Tap a white cell to start — ? for all clues</p>
        )}
      </main>
    </div>
  );
}
