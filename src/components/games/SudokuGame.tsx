import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Confetti } from '../ui/Confetti';
import { getTodayString } from '../../utils/seed';
import { generateDailySudoku, checkSudoku, isCellValid } from '../../utils/sudoku';
import { dateToSeed } from '../../utils/seed';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useGameStore } from '../../hooks/useGameStore';
import { ShareButton } from '../ui/ShareButton';
import { buildSudokuShare } from '../../utils/share';

const TODAY = getTodayString();
const SEED = dateToSeed(TODAY);
const LOCAL = generateDailySudoku(SEED);

interface SudokuSaved {
  date: string;
  puzzle: number[][];
  solution: number[][];
  grid: number[][];
  startMs: number;
  endMs: number | null;
  won: boolean;
  mistakes: number;
}

function makeDefault(puzzle: number[][], solution: number[][]): SudokuSaved {
  return {
    date: TODAY,
    puzzle,
    solution,
    grid: puzzle.map((r) => [...r]),
    startMs: Date.now(),
    endMs: null,
    won: false,
    mistakes: 0,
  };
}

const DEFAULT = makeDefault(LOCAL.puzzle, LOCAL.solution);

export function SudokuGame({ onBack }: { onBack: () => void }) {
  const [saved, setSaved] = useLocalStorage<SudokuSaved>('iol_sudoku_state', DEFAULT);
  const { completeGame } = useGameStore();
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const state = saved.date === TODAY ? saved : DEFAULT;
  const PUZZLE = state.puzzle;
  const SOLUTION = state.solution;

  // Fetch fresh puzzle from dosuku API if starting fresh today
  useEffect(() => {
    if (state.date === TODAY && state.mistakes > 0) return;
    if (state.date === TODAY && state.grid.some(row => row.some((v, ci) => v !== 0 && state.puzzle[state.grid.indexOf(row)][ci] === 0))) return;
    fetch('https://sudoku-api.vercel.app/api/dosuku?query={newboard(limit:1){grids{value,solution,difficulty},results,message}}')
      .then(r => r.json())
      .then(data => {
        const grid = data?.newboard?.grids?.[0];
        if (!grid?.value || !grid?.solution) return;
        const puzzle: number[][] = grid.value;
        const solution: number[][] = grid.solution;
        if (puzzle.length !== 9 || solution.length !== 9) return;
        const fresh = makeDefault(puzzle, solution);
        setSaved(prev => prev.date === TODAY && prev.mistakes > 0 ? prev : fresh);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.won || state.endMs) return;
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - state.startMs) / 1000)), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state.won, state.endMs, state.startMs]);

  const displayTime = state.endMs
    ? Math.floor((state.endMs - state.startMs) / 1000)
    : elapsed;
  const mins = String(Math.floor(displayTime / 60)).padStart(2, '0');
  const secs = String(displayTime % 60).padStart(2, '0');

  function fillCell(num: number) {
    if (!selected || state.won) return;
    const [r, c] = selected;
    if (PUZZLE[r][c] !== 0) return;
    const newGrid = state.grid.map((row) => [...row]);
    newGrid[r][c] = num;

    const done = checkSudoku(newGrid, SOLUTION);
    const newMistakes = isCellValid(newGrid, r, c) ? state.mistakes : state.mistakes + 1;
    const update: SudokuSaved = { ...state, grid: newGrid, mistakes: newMistakes };
    if (done) {
      update.won = true;
      update.endMs = Date.now();
      completeGame('sudoku', true, { score: Math.max(0, 100 - newMistakes * 5) });
    }
    setSaved(update);
  }

  function eraseCell() {
    if (!selected || state.won) return;
    const [r, c] = selected;
    if (PUZZLE[r][c] !== 0) return;
    const newGrid = state.grid.map((row) => [...row]);
    newGrid[r][c] = 0;
    setSaved({ ...state, grid: newGrid });
  }

  function reset() {
    setSaved(makeDefault(PUZZLE, SOLUTION));
    setSelected(null);
  }

  function getCellStyle(r: number, c: number): React.CSSProperties {
    const val = state.grid[r][c];
    const isLocked = PUZZLE[r][c] !== 0;
    const isSel = selected?.[0] === r && selected?.[1] === c;
    const isRelated = selected
      ? selected[0] === r || selected[1] === c ||
        (Math.floor(selected[0] / 3) === Math.floor(r / 3) && Math.floor(selected[1] / 3) === Math.floor(c / 3))
      : false;
    const isError = val !== 0 && !isLocked && !isCellValid(state.grid, r, c);
    const isCorrect = val !== 0 && !isLocked && SOLUTION[r]?.[c] === val;

    if (isSel) return { background: 'rgba(20,184,166,0.35)', color: '#fff', fontWeight: 700 };
    if (isError) return { background: 'rgba(239,68,68,0.18)', color: '#f87171' };
    if (isRelated) return { background: 'rgba(20,184,166,0.07)', color: '#e2e8f0' };
    if (isLocked) return { background: 'transparent', color: '#f1f5f9', fontWeight: 800 };
    if (isCorrect) return { background: 'transparent', color: '#2dd4bf' };
    return { background: 'transparent', color: '#94a3b8' };
  }

  const shareText = buildSudokuShare(TODAY, displayTime, state.won);

  return (
    <div className="min-h-screen text-white flex flex-col" style={{ background: 'linear-gradient(160deg, #061622 0%, #0d2137 60%, #0a1e2e 100%)' }}>
      {state.won && <Confetti />}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #0d9488, #14b8a6, #0d9488)' }} />

      <header className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(20,184,166,0.2)' }}>
        <button onClick={onBack} className="text-slate-400 hover:text-white p-1"><ArrowLeft size={20} /></button>
        <div className="text-center">
          <h1 className="font-bold text-base tracking-wide" style={{ color: '#2dd4bf' }}>IOL Sudoku</h1>
          <p className="text-slate-400 text-sm font-mono">{mins}:{secs}</p>
        </div>
        <button onClick={reset} className="text-slate-400 hover:text-white p-1"><RotateCcw size={18} /></button>
      </header>

      {state.won && (
        <div className="bounce-in mx-4 mt-4 rounded-xl p-3 flex items-center justify-between" style={{ background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.3)' }}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} style={{ color: '#2dd4bf' }} />
            <span className="font-semibold text-sm" style={{ color: '#5eead4' }}>🎉 Solved in {mins}:{secs}!</span>
          </div>
          <ShareButton text={shareText} gameName="Sudoku" resultLine={`Solved ${TODAY} in ${mins}:${secs}`} />
        </div>
      )}

      <div className="flex-1 flex items-center justify-center py-4 px-4">
        <div className="rounded-xl overflow-hidden" style={{ border: '2px solid rgba(20,184,166,0.4)', boxShadow: '0 0 40px rgba(20,184,166,0.15)' }}>
          {state.grid.map((row, r) => (
            <div key={r} className="flex" style={{ borderTop: r % 3 === 0 && r !== 0 ? '2px solid rgba(20,184,166,0.5)' : undefined }}>
              {row.map((val, c) => (
                <button
                  key={c}
                  onClick={() => setSelected([r, c])}
                  className="w-9 h-9 sm:w-10 sm:h-10 text-sm flex items-center justify-center transition-all active:scale-95"
                  style={{
                    borderRight: c % 3 === 2 && c !== 8 ? '2px solid rgba(20,184,166,0.5)' : '1px solid rgba(255,255,255,0.06)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    ...getCellStyle(r, c),
                  }}
                >
                  {val !== 0 ? val : ''}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="text-center pb-1">
        <p className="text-xs" style={{ color: state.mistakes > 0 ? '#f87171' : '#475569' }}>
          {state.mistakes > 0 ? `${state.mistakes} mistake${state.mistakes > 1 ? 's' : ''}` : 'No mistakes yet'}
        </p>
      </div>

      <div className="pb-6 px-4 pt-2">
        <div className="flex justify-center gap-2 flex-wrap max-w-xs mx-auto">
          {[1,2,3,4,5,6,7,8,9].map((n) => (
            <button
              key={n}
              onClick={() => fillCell(n)}
              className="w-12 h-12 font-bold rounded-xl text-lg transition-all active:scale-90 hover:scale-105"
              style={{ background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.25)', color: '#e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
            >
              {n}
            </button>
          ))}
          <button
            onClick={eraseCell}
            className="w-12 h-12 rounded-xl text-xs transition-all active:scale-90"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
          >
            Erase
          </button>
        </div>
      </div>
    </div>
  );
}
