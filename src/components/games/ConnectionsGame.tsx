import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, X, Lightbulb } from 'lucide-react';
import { Confetti } from '../ui/Confetti';
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

const COLOR_MAP: Record<ConnectionsCategory['color'], string> = {
  yellow: 'bg-yellow-500',
  green:  'bg-green-500',
  blue:   'bg-blue-500',
  purple: 'bg-purple-600',
};

const LIVES = 6;

export function ConnectionsGame({ onBack }: { onBack: () => void }) {
  const [saved, setSaved] = useLocalStorage<SavedState>('iol_connections_state', DEFAULT);
  const { completeGame } = useGameStore();
  const [selected, setSelected] = useState<string[]>([]);
  const [wrongAnim, setWrongAnim] = useState(false);
  const [hintsLeft, setHintsLeft] = useState(2);
  const [hintWord, setHintWord] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-[#111] text-white flex flex-col">
      {state.gameOver && state.won && <Confetti />}
      <header className="border-b border-white/10 flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="text-gray-400 hover:text-white p-1"><ArrowLeft size={20} /></button>
        <div className="text-center">
          <h1 className="font-bold text-base">IOL Connections</h1>
          <p className="text-gray-500 text-xs">Group the words into 4 categories</p>
        </div>
        <div className="w-8" />
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">Mistakes remaining:</p>
          <div className="flex gap-1.5">
            {Array.from({ length: LIVES }).map((_, i) => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-full transition-colors ${
                  i < livesRemaining ? 'bg-iol-red' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        {hintWord && (
          <div className="bounce-in text-center text-sm py-2 px-4 rounded-lg" style={{ background: 'rgba(202,138,4,0.15)', border: '1px solid rgba(202,138,4,0.4)', color: '#FCD34D' }}>
            💡 <strong>{hintWord}</strong> belongs in one of the unsolved categories
          </div>
        )}

        {state.solved.map((label) => {
          const cat = puzzle.find((c) => c.label === label)!;
          if (!cat) return null;
          return (
            <div key={label} className={`${COLOR_MAP[cat.color]} rounded-xl p-4 text-center bounce-in`}>
              <p className="font-bold text-white text-sm uppercase tracking-wide">{cat.label}</p>
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
                  className={`py-3 px-1 rounded-xl text-xs sm:text-sm font-bold uppercase text-center transition-all active:scale-95 ${
                    isSel ? 'bg-white text-black' : isHinted ? 'bg-yellow-500/30 text-yellow-200 ring-1 ring-yellow-400' : 'bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]'
                  }`}
                >
                  {word}
                </button>
              );
            })}
          </div>
        )}

        {!state.gameOver && (
          <div className="flex gap-2 justify-center flex-wrap">
            <button
              onClick={() => setSelected([])}
              className="px-4 py-2 border border-white/20 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors"
            >
              Deselect all
            </button>
            <button
              onClick={useHint}
              disabled={hintsLeft <= 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-30"
              style={{ background: 'rgba(202,138,4,0.2)', color: '#FCD34D', border: '1px solid rgba(202,138,4,0.3)' }}
            >
              <Lightbulb size={14} />
              Hint ({hintsLeft})
            </button>
            <button
              onClick={submit}
              disabled={selected.length !== 4}
              className="px-5 py-2 bg-white text-black rounded-lg text-sm font-semibold disabled:opacity-30 transition-opacity"
            >
              Submit
            </button>
          </div>
        )}

        {state.gameOver && (
          <div className={`rounded-xl p-4 text-center bounce-in ${state.won ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
            <div className="flex items-center justify-center gap-2 mb-2">
              {state.won
                ? <CheckCircle2 size={20} className="text-green-400" />
                : <X size={20} className="text-red-400" />}
              <span className="font-bold">{state.won ? '🎉 Connections found!' : 'Better luck tomorrow'}</span>
            </div>
            {!state.won && (
              <div className="mt-2 space-y-1">
                {puzzle.filter((c) => !state.solved.includes(c.label)).map((c) => (
                  <p key={c.label} className="text-xs text-gray-400">{c.emoji} {c.label}: {c.words.join(', ')}</p>
                ))}
              </div>
            )}
            <div className="mt-3 flex justify-center">
              <ShareButton text={shareText} gameName="Connections" resultLine={`${state.won ? '✅' : '❌'} ${TODAY}`} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
