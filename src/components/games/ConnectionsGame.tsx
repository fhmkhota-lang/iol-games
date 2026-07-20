import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, X, Lightbulb, HelpCircle } from 'lucide-react';
import { Confetti } from '../ui/Confetti';
import { HowToPlay } from '../ui/HowToPlay';
import { getTodayString, dateToSeed, seededShuffle } from '../../utils/seed';
import { CONNECTIONS_PUZZLES } from '../../data/connectionsData';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useGameStore } from '../../hooks/useGameStore';
import { ShareButton } from '../ui/ShareButton';
import { buildConnectionsShare } from '../../utils/share';
import type { ConnectionsCategory } from '../../types';

const TODAY = getTodayString();
const SEED = dateToSeed(TODAY);

const LEVEL_COLOR: ConnectionsCategory['color'][] = ['yellow', 'green', 'blue', 'purple'];
const LEVEL_EMOJI = ['🟡', '🟢', '🔵', '🟣'];

const FALLBACK_PUZZLE = CONNECTIONS_PUZZLES[SEED % CONNECTIONS_PUZZLES.length];

function mapApiPuzzle(entries: { level: number; group: string; members: string[] }[]): ConnectionsCategory[] {
  return entries.map(e => ({
    label: e.group,
    words: e.members,
    color: LEVEL_COLOR[e.level] ?? 'yellow',
    emoji: LEVEL_EMOJI[e.level] ?? '🟡',
  }));
}

interface SavedState {
  date: string;
  puzzle: ConnectionsCategory[];
  solved: string[];
  solvedOrder: string[];
  attempts: number;
  gameOver: boolean;
  won: boolean;
}

const DEFAULT: SavedState = {
  date: TODAY,
  puzzle: FALLBACK_PUZZLE,
  solved: [],
  solvedOrder: [],
  attempts: 0,
  gameOver: false,
  won: false,
};

const COLOR_MAP: Record<ConnectionsCategory['color'], { bg: string; shadow: string }> = {
  yellow: { bg: 'linear-gradient(135deg,#d97706,#f59e0b)', shadow: 'rgba(245,158,11,0.35)' },
  green:  { bg: 'linear-gradient(135deg,#15803d,#22c55e)', shadow: 'rgba(34,197,94,0.35)' },
  blue:   { bg: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', shadow: 'rgba(59,130,246,0.35)' },
  purple: { bg: 'linear-gradient(135deg,#7e22ce,#a855f7)', shadow: 'rgba(168,85,247,0.35)' },
};

const LIVES = 6;

export function ConnectionsGame({ onBack }: { onBack: () => void }) {
  const [saved, setSaved] = useLocalStorage<SavedState>('iol_connections_state', DEFAULT);
  const { completeGame } = useGameStore();
  const [selected, setSelected] = useState<string[]>([]);
  const [wrongAnim, setWrongAnim] = useState(false);
  const [hintsLeft, setHintsLeft] = useState(2);
  const [hintWord, setHintWord] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const state = saved.date === TODAY ? saved : DEFAULT;
  const puzzle = state.puzzle;

  // Fetch from Eyefyre dataset if fresh game
  useEffect(() => {
    if (state.date === TODAY && state.attempts > 0) return;
    fetch('https://raw.githubusercontent.com/Eyefyre/NYT-Connections-Answers/main/connections.json')
      .then(r => r.json())
      .then((data: { answers: { level: number; group: string; members: string[] }[] }[]) => {
        if (!Array.isArray(data) || data.length === 0) return;
        const entry = data[SEED % data.length];
        if (!entry?.answers) return;
        const mapped = mapApiPuzzle(entry.answers);
        setSaved(prev => ({
          ...(prev.date === TODAY && prev.attempts > 0 ? prev : DEFAULT),
          puzzle: mapped,
        }));
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const remaining = useMemo(() => puzzle.filter((c) => !state.solved.includes(c.label)), [puzzle, state.solved]);
  const shuffledWords = useMemo(
    () => seededShuffle(remaining.flatMap((c) => c.words), SEED + state.solved.length),
    [remaining, state.solved.length]
  );

  function toggle(word: string) {
    if (state.gameOver) return;
    setSelected((prev) =>
      prev.includes(word) ? prev.filter((w) => w !== word) : prev.length < 4 ? [...prev, word] : prev
    );
  }

  function submit() {
    if (selected.length !== 4) return;
    const match = remaining.find((c) => selected.every((w) => c.words.includes(w)));

    if (match) {
      const newSolved = [...state.solved, match.label];
      const emojiLine = `${match.emoji} ${match.label.toUpperCase()}`;
      const newOrder = [...state.solvedOrder, emojiLine];
      const won = newSolved.length === puzzle.length;
      const update: SavedState = {
        ...state,
        solved: newSolved,
        solvedOrder: newOrder,
        gameOver: won,
        won,
        attempts: state.attempts + 1,
      };
      setSaved(update);
      setSelected([]);
      if (won) completeGame('connections', true, { attempts: state.attempts + 1 });
    } else {
      const newAttempts = state.attempts + 1;
      const lost = LIVES - (newAttempts - state.solved.length) <= 0;
      setWrongAnim(true);
      setTimeout(() => setWrongAnim(false), 600);
      const update: SavedState = { ...state, attempts: newAttempts, gameOver: lost, won: false };
      setSaved(update);
      if (lost) {
        setSelected([]);
        completeGame('connections', false, { attempts: newAttempts });
      }
    }
  }

  const mistakes = state.attempts - state.solved.length;
  const livesRemaining = LIVES - mistakes;
  const shareText = buildConnectionsShare(TODAY, state.attempts, state.won, state.solvedOrder);

  function useHint() {
    if (hintsLeft <= 0 || state.gameOver) return;
    const unsolvedCats = puzzle.filter(c => !state.solved.includes(c.label));
    if (unsolvedCats.length === 0) return;
    const cat = unsolvedCats[0];
    const unselected = cat.words.filter(w => !selected.includes(w));
    if (unselected.length === 0) return;
    const word = unselected[Math.floor(Math.random() * unselected.length)];
    setHintWord(word);
    setHintsLeft(n => n - 1);
    setTimeout(() => setHintWord(null), 3000);
  }

  const CONNECTIONS_STEPS = [
    { icon: '🔵', text: 'Find four groups of four words that share a common category.' },
    { icon: '👆', text: 'Tap four words you think belong together, then press Submit.' },
    { icon: '🟡', text: 'Categories range from easy (yellow) to tricky (purple).' },
    { icon: '❤️', text: 'You have 6 lives — wrong guesses cost a life.' },
    { icon: '💡', text: 'Stuck? Use a Hint to reveal one word from an unsolved category (2 hints per day).' },
    { icon: '📅', text: 'A new puzzle every day — categories reset at midnight.' },
  ];

  return (
    <div className="min-h-screen text-white flex flex-col" style={{ background: 'linear-gradient(160deg, #0c0a1e 0%, #1a0a2e 60%, #0f0520 100%)' }}>
      {state.gameOver && state.won && <Confetti />}
      {showHelp && <HowToPlay title="IOL Connections" accentColor="#a855f7" steps={CONNECTIONS_STEPS} onClose={() => setShowHelp(false)} />}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #7c3aed, #ec4899, #7c3aed)' }} />

      <header className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(168,85,247,0.2)' }}>
        <button onClick={onBack} className="text-slate-400 hover:text-white p-1"><ArrowLeft size={20} /></button>
        <div className="text-center">
          <h1 className="font-bold text-base tracking-wide" style={{ color: '#d8b4fe' }}>IOL Connections</h1>
          <p className="text-slate-500 text-xs">Group words into 4 categories</p>
        </div>
        <button onClick={() => setShowHelp(true)} className="text-slate-400 hover:text-white p-1"><HelpCircle size={20} /></button>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Lives remaining</p>
          <div className="flex gap-1.5">
            {Array.from({ length: LIVES }).map((_, i) => (
              <div key={i} className="w-3 h-3 rounded-full transition-all"
                style={{ background: i < livesRemaining ? '#ec4899' : 'rgba(255,255,255,0.1)', boxShadow: i < livesRemaining ? '0 0 8px rgba(236,72,153,0.5)' : 'none' }} />
            ))}
          </div>
        </div>

        {hintWord && (
          <div className="bounce-in text-center text-sm py-2 px-4 rounded-xl" style={{ background: 'rgba(202,138,4,0.15)', border: '1px solid rgba(202,138,4,0.4)', color: '#FCD34D' }}>
            💡 <strong>{hintWord}</strong> belongs in one of the unsolved categories
          </div>
        )}

        {state.solved.map((label) => {
          const cat = puzzle.find((c) => c.label === label)!;
          if (!cat) return null;
          const cm = COLOR_MAP[cat.color];
          return (
            <div key={label} className="rounded-2xl p-4 text-center bounce-in"
              style={{ background: cm.bg, boxShadow: `0 8px 24px ${cm.shadow}` }}>
              <p className="font-black text-white text-sm uppercase tracking-widest">{cat.label}</p>
              <p className="text-white/80 text-xs mt-1">{cat.words.join(' · ')}</p>
            </div>
          );
        })}

        {!state.gameOver && (
          <div className={`grid grid-cols-4 gap-2 ${wrongAnim ? 'shake' : ''}`}>
            {shuffledWords.map((word) => {
              const isSel = selected.includes(word);
              const isHinted = word === hintWord;
              return (
                <button
                  key={word}
                  onClick={() => toggle(word)}
                  className="py-3 px-1 rounded-xl text-xs sm:text-sm font-bold uppercase text-center transition-all active:scale-95"
                  style={isSel
                    ? { background: 'rgba(168,85,247,0.8)', color: '#fff', border: '2px solid #a855f7', boxShadow: '0 4px 20px rgba(168,85,247,0.4)' }
                    : isHinted
                    ? { background: 'rgba(245,158,11,0.2)', color: '#fde68a', border: '1px solid rgba(245,158,11,0.5)' }
                    : { background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {word}
                </button>
              );
            })}
          </div>
        )}

        {!state.gameOver && (
          <div className="flex gap-2 justify-center flex-wrap">
            <button onClick={() => setSelected([])}
              className="px-4 py-2 rounded-xl text-sm text-slate-300 transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
              Deselect all
            </button>
            <button onClick={useHint} disabled={hintsLeft <= 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-30"
              style={{ background: 'rgba(202,138,4,0.2)', color: '#FCD34D', border: '1px solid rgba(202,138,4,0.3)' }}>
              <Lightbulb size={14} /> Hint ({hintsLeft})
            </button>
            <button onClick={submit} disabled={selected.length !== 4}
              className="px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-30 active:scale-95"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', boxShadow: '0 4px 16px rgba(124,58,237,0.4)' }}>
              Submit
            </button>
          </div>
        )}

        {state.gameOver && (
          <div className="rounded-2xl p-5 text-center bounce-in"
            style={state.won
              ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }
              : { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div className="flex items-center justify-center gap-2 mb-3">
              {state.won ? <CheckCircle2 size={22} style={{ color: '#34d399' }} /> : <X size={22} style={{ color: '#f87171' }} />}
              <span className="font-bold text-base">{state.won ? '🎉 Connections found!' : 'Better luck tomorrow'}</span>
            </div>
            {!state.won && (
              <div className="mt-2 space-y-1.5 mb-3">
                {puzzle.filter((c) => !state.solved.includes(c.label)).map((c) => {
                  const cm = COLOR_MAP[c.color];
                  return (
                    <div key={c.label} className="rounded-xl py-2 px-3 text-xs text-left"
                      style={{ background: cm.bg, opacity: 0.7 }}>
                      <span className="font-bold text-white">{c.emoji} {c.label}:</span>
                      <span className="text-white/80 ml-1">{c.words.join(', ')}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex justify-center">
              <ShareButton text={shareText} gameName="Connections" resultLine={`${state.won ? '✅' : '❌'} ${TODAY}`} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
