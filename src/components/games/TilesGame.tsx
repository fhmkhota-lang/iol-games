import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, CheckCircle2, X, Eye } from 'lucide-react';
import { Confetti } from '../ui/Confetti';
import { getTodayString, dateToSeed, createRng } from '../../utils/seed';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useGameStore } from '../../hooks/useGameStore';
import { ShareButton } from '../ui/ShareButton';
import { buildTilesShare } from '../../utils/share';

const TODAY = getTodayString();
const SEED = dateToSeed(TODAY);
const GRID = 4;
const COLORS = ['#E8141C', '#2563EB', '#16A34A', '#CA8A04', '#9333EA', '#0891B2'];
const SHOW_MS = 1500;
const ROUNDS = 5;

function generatePattern(seed: number, round: number): number[] {
  const rng = createRng(seed + round * 1000);
  return Array.from({ length: GRID * GRID }, () => Math.floor(rng() * COLORS.length));
}

interface SavedState {
  date: string;
  won: boolean;
  score: number;
  timeMs: number;
  played: boolean;
}
const DEFAULT: SavedState = { date: TODAY, won: false, score: 0, timeMs: 0, played: false };

type Phase = 'idle' | 'showing' | 'answering' | 'feedback' | 'done';

export function TilesGame({ onBack }: { onBack: () => void }) {
  const [saved, setSaved] = useLocalStorage<SavedState>('iol_tiles_state', DEFAULT);
  const { completeGame } = useGameStore();

  const [phase, setPhase] = useState<Phase>(() => (saved.date === TODAY && saved.played ? 'done' : 'idle'));
  const [round, setRound] = useState(0);
  const [pattern, setPattern] = useState<number[]>([]);
  const [userPattern, setUserPattern] = useState<number[]>([]);
  const [selectedColor, setSelectedColor] = useState(0);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [startMs, setStartMs] = useState<number>(0);
  const [elapsed, setElapsed] = useState(0);
  const [peeksLeft, setPeeksLeft] = useState(2);
  const [peeking, setPeeking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Use a ref for timeouts so StrictMode double-invoke can't fire them twice
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const state = saved.date === TODAY ? saved : DEFAULT;

  useEffect(() => {
    if (phase === 'answering') {
      const start = Date.now();
      setStartMs(start);
      timerRef.current = setInterval(() => setElapsed(Date.now() - start), 100);
      return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [phase]);

  // Cleanup all pending timers when component unmounts
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const beginRound = useCallback((r: number) => {
    const p = generatePattern(SEED, r);
    setPattern(p);
    setUserPattern(Array(GRID * GRID).fill(-1));
    setPhase('showing');
    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    showTimeoutRef.current = setTimeout(() => setPhase('answering'), SHOW_MS);
  }, []);

  function startGame() {
    setRound(0);
    setScore(0);
    setErrors(0);
    setPeeksLeft(2);
    setPeeking(false);
    beginRound(0);
  }

  function usePeek() {
    if (peeksLeft <= 0 || peeking || phase !== 'answering') return;
    setPeeksLeft(n => n - 1);
    setPeeking(true);
    setTimeout(() => setPeeking(false), SHOW_MS);
  }

  function paintCell(idx: number) {
    if (phase !== 'answering') return;
    setUserPattern((prev) => {
      const next = [...prev];
      next[idx] = selectedColor;
      return next;
    });
  }

  function submitRound() {
    if (timerRef.current) clearInterval(timerRef.current);
    const correct = userPattern.filter((v, i) => v === pattern[i]).length;
    const roundScore = Math.round((correct / (GRID * GRID)) * 100);
    const roundErrors = GRID * GRID - correct;
    const newScore = score + roundScore;
    const newErrors = errors + roundErrors;
    setScore(newScore);
    setErrors(newErrors);
    setPhase('feedback');

    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      const nextRound = round + 1;
      if (nextRound >= ROUNDS) {
        finishGame(newScore, newErrors);
      } else {
        setRound(nextRound);
        beginRound(nextRound);
      }
    }, 1200);
  }

  function finishGame(finalScore: number, _finalErrors: number) {
    const totalMs = Date.now() - startMs + elapsed;
    const normalised = Math.round(finalScore / ROUNDS);
    const won = normalised >= 50;
    setSaved({ date: TODAY, won, score: normalised, timeMs: totalMs, played: true });
    completeGame('tiles', won, { score: normalised });
    setPhase('done');
  }

  const shareText = buildTilesShare(TODAY, state.score, state.timeMs);
  const allCorrect = userPattern.every((v, i) => v === pattern[i]);

  const displayPattern = phase === 'showing' || peeking ? pattern : phase === 'answering' || phase === 'feedback' ? userPattern : pattern;

  return (
    <div className="min-h-screen bg-[#111] text-white flex flex-col">
      <header className="border-b border-white/10 flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="text-gray-400 hover:text-white p-1"><ArrowLeft size={20} /></button>
        <div className="text-center">
          <h1 className="font-bold text-base">IOL Tiles</h1>
          {phase === 'answering' && (
            <p className="text-gray-400 text-xs">Round {round + 1}/{ROUNDS} · {(elapsed / 1000).toFixed(1)}s</p>
          )}
          {phase !== 'answering' && <p className="text-gray-500 text-xs">{TODAY}</p>}
        </div>
        <div className="w-8" />
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-5 flex flex-col items-center gap-5">
        {phase === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <p className="text-4xl">🎨</p>
            <h2 className="text-xl font-bold">IOL Tiles</h2>
            <p className="text-gray-400 text-sm max-w-xs">
              Memorise the colour pattern, then recreate it from memory.
              {ROUNDS} rounds, {SHOW_MS / 1000} second each to study.
            </p>
            <button onClick={startGame} className="bg-iol-red text-white font-semibold px-8 py-3 rounded-xl mt-2 hover:bg-red-700 transition-colors">
              Start
            </button>
          </div>
        )}

        {(phase === 'showing' || phase === 'answering' || phase === 'feedback') && (
          <>
            {/* Phase label */}
            <div className="text-center">
              {phase === 'showing' && <p className="text-yellow-400 font-semibold animate-pulse">Memorise this pattern!</p>}
              {phase === 'answering' && <p className="text-white font-semibold">Recreate the pattern</p>}
              {phase === 'feedback' && (
                <p className={allCorrect ? 'text-green-400 font-semibold' : 'text-orange-400 font-semibold'}>
                  {allCorrect ? '✅ Perfect!' : `${userPattern.filter((v, i) => v === pattern[i]).length}/${GRID * GRID} correct`}
                </p>
              )}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-4 gap-1.5">
              {displayPattern.map((colorIdx, i) => {
                const isWrong = phase === 'feedback' && userPattern[i] !== pattern[i];
                return (
                  <button
                    key={i}
                    onClick={() => paintCell(i)}
                    className={`w-16 h-16 sm:w-18 sm:h-18 rounded-lg transition-all game-cell ${isWrong ? 'ring-2 ring-red-500' : ''}`}
                    style={{ backgroundColor: colorIdx >= 0 ? COLORS[colorIdx] : '#2a2a2a' }}
                  />
                );
              })}
            </div>

            {/* Color palette */}
            {phase === 'answering' && (
              <>
                <div className="flex gap-2 flex-wrap justify-center">
                  {COLORS.map((color, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedColor(i)}
                      className={`w-10 h-10 rounded-lg transition-all ${selectedColor === i ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={usePeek}
                    disabled={peeksLeft <= 0 || peeking}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-30"
                    style={{ background: peeking ? '#CA8A04' : 'rgba(255,255,255,0.12)', color: peeking ? '#fff' : '#fff' }}
                  >
                    <Eye size={14} />
                    Peek ({peeksLeft} left)
                  </button>
                  <button
                    onClick={submitRound}
                    className="bg-white text-black font-semibold px-8 py-2.5 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    Submit
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {phase === 'done' && (
          <>
            {state.won && <Confetti />}
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 bounce-in">
              {state.won
                ? <CheckCircle2 size={56} className="text-green-400" style={{ filter: 'drop-shadow(0 0 16px rgba(74,222,128,0.6))' }} />
                : <X size={56} className="text-red-400" />}
              <h2 className="text-2xl font-bold">{state.won ? '🎉 Well done!' : 'Keep practising!'}</h2>
              <div className="px-6 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-gray-400 text-sm">Score</p>
                <p className="text-white font-bold text-4xl">{state.score}<span className="text-gray-500 text-xl">/100</span></p>
                <p className="text-gray-500 text-sm mt-1">Time: {(state.timeMs / 1000).toFixed(1)}s</p>
              </div>
              <ShareButton text={shareText} gameName="Tiles" resultLine={`Score: ${state.score}/100 — ${TODAY}`} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
