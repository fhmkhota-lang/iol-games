import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import { Confetti } from '../ui/Confetti';
import { HowToPlay } from '../ui/HowToPlay';
import { getTodayString, dateToSeed } from '../../utils/seed';
import { WORDLE_WORDS } from '../../data/wordleWords';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useGameStore } from '../../hooks/useGameStore';
import { ShareButton } from '../ui/ShareButton';
import { buildWordleShare } from '../../utils/share';
import type { LetterState } from '../../types';

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
const TODAY = getTodayString();
const SEED = dateToSeed(TODAY);
const FALLBACK_ANSWER = WORDLE_WORDS[SEED % WORDLE_WORDS.length].toUpperCase();

interface SavedWordleState {
  date: string;
  answer: string;
  guesses: string[];
  currentGuess: string;
  gameOver: boolean;
  won: boolean;
}

const EMPTY: SavedWordleState = {
  date: TODAY,
  answer: FALLBACK_ANSWER,
  guesses: [],
  currentGuess: '',
  gameOver: false,
  won: false,
};

function getLetterState(guess: string, answer: string): LetterState[] {
  const states: LetterState[] = Array(5).fill('absent');
  const answerChars = answer.split('');
  const guessChars = guess.split('');

  guessChars.forEach((ch, i) => {
    if (ch === answerChars[i]) {
      states[i] = 'correct';
      answerChars[i] = '#';
      guessChars[i] = '*';
    }
  });
  guessChars.forEach((ch, i) => {
    if (ch === '*') return;
    const idx = answerChars.indexOf(ch);
    if (idx !== -1) {
      states[i] = 'present';
      answerChars[idx] = '#';
    }
  });
  return states;
}

const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
];

export function WordleGame({ onBack }: { onBack: () => void }) {
  const [saved, setSaved] = useLocalStorage<SavedWordleState>('iol_wordle_state', EMPTY);
  const { completeGame } = useGameStore();
  const [shake, setShake] = useState(false);
  const [msg, setMsg] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const state = saved.date === TODAY ? saved : EMPTY;
  const answer = state.answer || FALLBACK_ANSWER;
  // Use ref so callbacks always see latest answer without stale closure
  const answerRef = useRef(answer);
  answerRef.current = answer;

  // Fetch today's real answer if game hasn't started yet
  useEffect(() => {
    if (state.date === TODAY && state.guesses.length > 0) return;
    fetch('https://wordlehints.co.uk/wp-json/wordlehint/v1/answers/latest')
      .then(r => r.json())
      .then(data => {
        if (data?.answer && /^[A-Za-z]{5}$/.test(data.answer)) {
          const fetched = data.answer.toUpperCase();
          setSaved(prev => ({
            ...(prev.date === TODAY && prev.guesses.length > 0 ? prev : EMPTY),
            answer: fetched,
          }));
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function showMsg(text: string, ms = 1500) {
    setMsg(text);
    setTimeout(() => setMsg(''), ms);
  }

  const submitGuess = useCallback(() => {
    const guess = state.currentGuess.toUpperCase();
    const ans = answerRef.current;
    if (guess.length !== WORD_LENGTH) { setShake(true); setTimeout(() => setShake(false), 400); return; }

    const newGuesses = [...state.guesses, guess];
    const won = guess === ans;
    const over = won || newGuesses.length >= MAX_GUESSES;

    setSaved({ ...state, guesses: newGuesses, currentGuess: '', gameOver: over, won });
    if (over) {
      completeGame('wordle', won, { attempts: newGuesses.length });
      setTimeout(() => showMsg(won ? '🎉 Brilliant!' : `The word was ${ans}`, 3000), 300);
    }
  }, [state, setSaved, completeGame]);

  const pressKey = useCallback(
    (key: string) => {
      if (state.gameOver) return;
      if (key === 'ENTER') { submitGuess(); return; }
      if (key === '⌫' || key === 'BACKSPACE') {
        setSaved((p) => ({ ...p, currentGuess: p.currentGuess.slice(0, -1) }));
        return;
      }
      if (/^[A-Z]$/.test(key) && state.currentGuess.length < WORD_LENGTH) {
        setSaved((p) => ({ ...p, currentGuess: p.currentGuess + key }));
      }
    },
    [state, submitGuess, setSaved]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => pressKey(e.key.toUpperCase());
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pressKey]);

  const usedLetters: Record<string, LetterState> = {};
  state.guesses.forEach((g) => {
    getLetterState(g, answer).forEach((ls, i) => {
      const ch = g[i];
      const cur = usedLetters[ch];
      if (!cur || (cur !== 'correct' && ls !== 'absent')) usedLetters[ch] = ls;
    });
  });

  const tileColor = (ls: LetterState) =>
    ls === 'correct' ? 'bg-emerald-500 border-emerald-400 text-white'
    : ls === 'present' ? 'bg-amber-400 border-amber-300 text-slate-900'
    : ls === 'absent' ? 'bg-slate-700 border-slate-600 text-slate-300'
    : 'border-white/20 text-white';

  const tileShadow = (ls: LetterState) =>
    ls === 'correct' ? '0 4px 20px rgba(16,185,129,0.4)'
    : ls === 'present' ? '0 4px 20px rgba(251,191,36,0.4)'
    : 'none';

  const keyColor = (ls?: LetterState) =>
    ls === 'correct' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
    : ls === 'present' ? 'bg-amber-400 text-slate-900 shadow-lg shadow-amber-400/30'
    : ls === 'absent' ? 'bg-slate-800 text-slate-500'
    : 'bg-slate-700 text-white shadow-sm';

  const shareText = buildWordleShare(TODAY, state.guesses, answer, state.won);
  const emojiGrid = state.guesses.map((g) =>
    getLetterState(g, answer).map((ls) => ls === 'correct' ? '🟩' : ls === 'present' ? '🟨' : '⬛').join('')
  ).join('\n');

  const WORDY_STEPS = [
    { icon: '🔤', text: 'Guess the 5-letter word in 6 tries.' },
    { icon: '🟩', text: 'Green: the letter is correct and in the right spot.' },
    { icon: '🟨', text: 'Yellow: the letter is in the word but in the wrong spot.' },
    { icon: '⬛', text: 'Grey: the letter is not in the word at all.' },
    { icon: '⌨️', text: 'Type on your keyboard or tap the on-screen keys. Press Enter to submit.' },
    { icon: '📅', text: 'One new word every day — come back tomorrow for the next!' },
  ];

  return (
    <div className="min-h-screen text-white flex flex-col" style={{ background: 'linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
      {state.won && <Confetti />}
      {showHelp && <HowToPlay title="IOL Wordy" accentColor="#a855f7" steps={WORDY_STEPS} onClose={() => setShowHelp(false)} />}

      {/* Accent bar */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #7c3aed, #a855f7, #7c3aed)' }} />

      <header className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(139,92,246,0.2)' }}>
        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors p-1">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-base tracking-wide" style={{ color: '#c4b5fd' }}>IOL Wordy</h1>
          <p className="text-slate-500 text-xs">{TODAY}</p>
        </div>
        <button onClick={() => setShowHelp(true)} className="text-slate-400 hover:text-white p-1"><HelpCircle size={20} /></button>
      </header>

      {msg && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bounce-in"
          style={{ background: 'rgba(255,255,255,0.95)', color: '#1e1b4b', fontSize: 14, fontWeight: 700, padding: '8px 20px', borderRadius: 999, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          {msg}
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center gap-2 py-4 px-4">
        {Array.from({ length: MAX_GUESSES }).map((_, row) => {
          const guess = state.guesses[row];
          const isCurrent = row === state.guesses.length && !state.gameOver;
          const display = isCurrent ? state.currentGuess.padEnd(WORD_LENGTH) : (guess ?? '').padEnd(WORD_LENGTH);
          const states = guess ? getLetterState(guess, answer) : null;

          return (
            <div key={row} className={`flex gap-2 ${isCurrent && shake ? 'shake' : ''}`}>
              {Array.from({ length: WORD_LENGTH }).map((_, col) => {
                const letter = display[col]?.trim() ?? '';
                const ls: LetterState = states ? states[col] : letter ? 'empty' : 'empty';
                const isCurrentLetter = isCurrent && col === state.currentGuess.length - 1 && letter;
                return (
                  <div
                    key={col}
                    className={`w-14 h-14 flex items-center justify-center border-2 text-xl font-black uppercase rounded-xl transition-all ${
                      guess ? tileColor(ls)
                      : isCurrent && letter ? 'border-violet-400 text-white bg-slate-800/80'
                      : isCurrent ? 'border-slate-500/60 text-white bg-slate-800/40'
                      : 'border-slate-700/40 text-white bg-slate-800/20'
                    } ${isCurrentLetter ? 'scale-110' : ''}`}
                    style={guess ? { boxShadow: tileShadow(ls) } : {}}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {state.gameOver && (
        <div className="bounce-in flex flex-col items-center gap-3 pb-3 pt-1">
          <div className="px-5 py-2 rounded-full text-sm font-bold"
            style={{ background: state.won ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: state.won ? '#34d399' : '#f87171', border: `1px solid ${state.won ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}` }}>
            {state.won ? '🎉 Brilliant!' : `The word was ${answer}`}
          </div>
          <ShareButton text={shareText} gameName="Wordy" resultLine={`${state.won ? state.guesses.length + '/6' : 'X/6'} — ${TODAY}`} emojiGrid={emojiGrid} />
        </div>
      )}

      <div className="px-1 pb-5 pt-1 space-y-1.5">
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-1">
            {row.map((key) => (
              <button
                key={key}
                onClick={() => pressKey(key)}
                className={`h-12 rounded-lg font-bold text-sm transition-all active:scale-95 ${
                  key.length > 1 ? 'px-3 text-xs' : 'w-9'
                } ${keyColor(usedLetters[key])}`}
              >
                {key}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
