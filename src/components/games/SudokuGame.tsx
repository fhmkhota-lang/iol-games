import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RotateCcw, CheckCircle2 } from 'lucide-react';
import { getTodayString, dateToSeed } from '../../utils/seed';
import { generateDailySudoku, checkSudoku, isCellValid } from '../../utils/sudoku';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useGameStore } from '../../hooks/useGameStore';
import { ShareButton } from '../ui/ShareButton';
import { buildSudokuShare } from '../../utils/share';

const TODAY = getTodayString();
const SEED = dateToSeed(TODAY);
const { puzzle: PUZZLE, solution: SOLUTION } = generateDailySudoku(SEED);

interface SudokuSaved {
  date: string;
  grid: number[][];
  startMs: number;
  endMs: number | null;
  won: boolean;
  mistakes: number;
}

const DEFAULT: SudokuSaved = {
  date: TODAY,
  grid: PUZZLE.map((r) => [...r]),
  startMs: Date.now(),
  endMs: null,
  won: false,
  mistakes: 0,
};

export function SudokuGame({ onBack }: { onBack: () => void }) {
  const [saved, setSaved] = useLocalStorage<SudokuSaved>('iol_sudoku_state', DEFAULT);
  const { completeGame } = useGameStore();
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const state = saved.date === TODAY ? saved : DEFAULT;

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
    if (PUZZLE[r][c] !== 0) return; // locked cell
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
    setSaved({ ...DEFAULT, startMs: Date.now() });
    setSelected(null);
  }

  function getCellStyle(r: number, c: number) {
    const val = state.grid[r][c];
    const isLocked = PUZZLE[r][c] !== 0;
    const isSel = selected?.[0] === r && selected?.[1] === c;
    const isRelated = selected
      ? selected[0] === r || selected[1] === c ||
        (Math.floor(selected[0] / 3) === Math.floor(r / 3) && Math.floor(selected[1] / 3) === Math.floor(c / 3))
      : false;
    const isError = val !== 0 && !isLocked && !isCellValid(state.grid, r, c);
    const isCorrect = val !== 0 && !isLocked && SOLUTION[r][c] === val;

    if (isSel) return 'bg-blue-600 text-white';
    if (isError) return 'bg-red-500/20 text-red-400';
    if (isRelated) return 'bg-white/5 text-white';
    if (isLocked) return 'bg-transparent text-white font-bold';
    if (isCorrect) return 'bg-transparent text-blue-400';
    return 'bg-transparent text-gray-300';
  }

  const shareText = buildSudokuShare(TODAY, displayTime, state.won);

  return (
    <div className="min-h-screen bg-[#111] text-white flex flex-col">
      <header className="border-b border-white/10 flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="text-gray-400 hover:text-white p-1"><ArrowLeft size={20} /></button>
        <div className="text-center">
          <h1 className="font-bold text-base">IOL Sudoku</h1>
          <p className="text-white/60 text-sm font-mono">{mins}:{secs}</p>
        </div>
        <button onClick={reset} className="text-gray-400 hover:text-white p-1"><RotateCcw size={18} /></button>
      </header>

      {state.won && (
        <div className="bounce-in mx-4 mt-4 bg-green-500/10 border border-green-500/30 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-green-400" />
            <span className="text-green-300 font-semibold text-sm">Solved in {mins}:{secs}!</span>
          </div>
          <ShareButton text={shareText} gameName="Sudoku" resultLine={`Solved ${TODAY} in ${mins}:${secs}`} />
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 flex items-center justify-center py-4 px-4">
        <div className="inline-block border-2 border-white/40 rounded">
          {state.grid.map((row, r) => (
            <div key={r} className={`flex ${r % 3 === 0 && r !== 0 ? 'border-t-2 border-white/40' : ''}`}>
              {row.map((val, c) => (
                <button
                  key={c}
                  onClick={() => setSelected([r, c])}
                  className={`w-9 h-9 sm:w-10 sm:h-10 text-sm flex items-center justify-center border border-white/10 transition-colors
                    ${c % 3 === 0 && c !== 0 ? 'border-l-2 border-l-white/40' : ''}
                    ${getCellStyle(r, c)}`}
                >
                  {val !== 0 ? val : ''}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Mistakes */}
      <div className="text-center pb-2">
        <p className="text-xs text-gray-500">Mistakes: {state.mistakes}</p>
      </div>

      {/* Number pad */}
      <div className="pb-6 px-4">
        <div className="flex justify-center gap-2 flex-wrap max-w-xs mx-auto">
          {[1,2,3,4,5,6,7,8,9].map((n) => (
            <button
              key={n}
              onClick={() => fillCell(n)}
              className="w-12 h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white font-bold rounded-lg text-lg transition-colors"
            >
              {n}
            </button>
          ))}
          <button
            onClick={eraseCell}
            className="w-12 h-12 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-400 rounded-lg text-xs transition-colors"
          >
            Erase
          </button>
        </div>
      </div>
    </div>
  );
}
