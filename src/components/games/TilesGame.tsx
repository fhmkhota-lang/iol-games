import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, CheckCircle2, X, Eye, HelpCircle } from 'lucide-react';
import { Confetti } from '../ui/Confetti';
import { HowToPlay } from '../ui/HowToPlay';
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
  const [showHelp, setShowHelp] = useState(false);

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

  const TILES_STEPS = [
    { icon: '👀', text: 'Study the colour pattern shown on the grid — you have 1.5 seconds!' },
    { icon: '🎨', text: 'After the pattern hides, select a colour from the palette and tap the cells to paint them.' },
    { icon: '✅', text: 'Hit Submit when you think you\'ve matched the pattern. You score points for each correct cell.' },
    { icon: '👁️', text: 'Use Peek (2 per game) to show the pattern again for 1.5 seconds — use them wisely!' },
    { icon: '🔄', text: 'There are 5 rounds — your total score out of 100 is saved at the end.' },
    { icon: '📅', text: 'Patterns are unique each day. Come back tomorrow for a new challenge!' },
  ];

  return (
    <div className="min-h-screen text-white flex flex-col" style={{ background: 'linear-gradient(160deg, #0a0a1a 0%, #1a0829 60%, #0d0a1e 100%)' }}>
      {showHelp && <HowToPlay title="IOL Tiles" accentColor="#f59e0b" steps={TILES_STEPS} onClose={() => setShowHelp(false)} />}
      <div style={{ height: 3, background: 'linear-gradient(90deg,#E8141C,#f59e0b,#16a34a,#2563eb,#9333ea,#0891b2)' }} />

      <header className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={onBack} className="text-slate-400 hover:text-white p-1"><ArrowLeft size={20} /></button>
        <div className="text-center">
          <h1 className="font-bold text-base tracking-wide" style={{ background: 'linear-gradient(90deg,#f59e0b,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>IOL Tiles</h1>
          {phase === 'answering' && <p className="text-slate-400 text-xs">Round {round + 1}/{ROUNDS} · {(elapsed / 1000).toFixed(1)}s</p>}
          {phase !== 'answering' && <p className="text-slate-500 text-xs">{TODAY}</p>}
        </div>
        <button onClick={() => setShowHelp(true)} className="text-slate-400 hover:text-white p-1"><HelpCircle size={20} /></button>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-5 flex flex-col items-center gap-5">
        {phase === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
            <div className="text-6xl">🎨</div>
            <h2 className="text-2xl font-black">IOL Tiles</h2>
            <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
              Memorise the colour pattern, then recreate it from memory. {ROUNDS} rounds, {SHOW_MS / 1000} second each to study.
            </p>
            <button onClick={startGame}
              className="font-bold px-10 py-3 rounded-2xl mt-2 transition-all active:scale-95 hover:scale-105 text-white"
              style={{ background: 'linear-gradient(135deg,#E8141C,#f59e0b)', boxShadow: '0 8px 24px rgba(232,20,28,0.4)' }}>
              Start Playing
            </button>
          </div>
        )}

        {(phase === 'showing' || phase === 'answering' || phase === 'feedback') && (
          <>
            <div className="text-center">
              {phase === 'showing' && (
                <p className="font-bold animate-pulse text-base" style={{ color: '#fbbf24' }}>👀 Memorise this pattern!</p>
              )}
              {phase === 'answering' && <p className="text-white font-semibold text-base">Recreate the pattern</p>}
              {phase === 'feedback' && (
                <p className="font-bold text-base" style={{ color: allCorrect ? '#34d399' : '#fb923c' }}>
                  {allCorrect ? '✅ Perfect!' : `${userPattern.filter((v, i) => v === pattern[i]).length}/${GRID * GRID} correct`}
                </p>
              )}
            </div>

            {/* Round progress dots */}
            <div className="flex gap-2">
              {Array.from({ length: ROUNDS }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full transition-all"
                  style={{ background: i < round ? '#34d399' : i === round ? '#fff' : 'rgba(255,255,255,0.15)', transform: i === round ? 'scale(1.4)' : 'scale(1)' }} />
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-4 gap-2 p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {displayPattern.map((colorIdx, i) => {
                const isWrong = phase === 'feedback' && userPattern[i] !== pattern[i];
                const isRight = phase === 'feedback' && userPattern[i] === pattern[i];
                return (
                  <button
                    key={i}
                    onClick={() => paintCell(i)}
                    className="w-16 h-16 rounded-xl transition-all active:scale-90 game-cell"
                    style={{
                      backgroundColor: colorIdx >= 0 ? COLORS[colorIdx] : 'rgba(255,255,255,0.06)',
                      boxShadow: colorIdx >= 0 ? `0 4px 16px ${COLORS[colorIdx]}55` : 'none',
                      outline: isWrong ? '3px solid #f87171' : isRight && phase === 'feedback' ? '2px solid #34d399' : 'none',
                      outlineOffset: 2,
                    }}
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
                      className="w-11 h-11 rounded-xl transition-all active:scale-90"
                      style={{
                        backgroundColor: color,
                        boxShadow: selectedColor === i ? `0 0 0 3px #fff, 0 0 0 5px ${color}` : `0 4px 12px ${color}55`,
                        transform: selectedColor === i ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={usePeek} disabled={peeksLeft <= 0 || peeking}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 active:scale-95"
                    style={{ background: peeking ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#fbbf24' }}>
                    <Eye size={14} />
                    Peek ({peeksLeft} left)
                  </button>
                  <button onClick={submitRound}
                    className="font-bold px-8 py-2.5 rounded-xl transition-all active:scale-95 text-white"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 4px 16px rgba(124,58,237,0.4)' }}>
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
