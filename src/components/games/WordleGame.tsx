import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
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
const ANSWER = WORDLE_WORDS[SEED % WORDLE_WORDS.length].toUpperCase();

interface SavedWordleState {
  date: string;
  guesses: string[];
  currentGuess: string;
  gameOver: boolean;
  won: boolean;
}

const EMPTY: SavedWordleState = {
  date: TODAY,
  guesses: [],
  currentGuess: '',
  gameOver: false,
  won: false,
};

function getLetterState(guess: string, answer: string): LetterState[] {
  const states: LetterState[] = Array(5).fill('absent');
  const answerChars = answer.split('');
  const guessChars = guess.split('');

  // First pass: correct
  guessChars.forEach((ch, i) => {
    if (ch === answerChars[i]) {
      states[i] = 'correct';
      answerChars[i] = '#';
      guessChars[i] = '*';
    }
  });
  // Second pass: present
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

  const state = saved.date === TODAY ? saved : EMPTY;

  function showMsg(text: string, ms = 1500) {
    setMsg(text);
    setTimeout(() => setMsg(''), ms);
  }

  const submitGuess = useCallback(() => {
    const guess = state.currentGuess.toUpperCase();
    if (guess.length !== WORD_LENGTH) { setShake(true); setTimeout(() => setShake(false), 400); return; }

    const newGuesses = [...state.guesses, guess];
    const won = guess === ANSWER;
    const over = won || newGuesses.length >= MAX_GUESSES;

    setSaved({ date: TODAY, guesses: newGuesses, currentGuess: '', gameOver: over, won });
    if (over) {
      completeGame('wordle', won, { attempts: newGuesses.length });
      setTimeout(() => showMsg(won ? '🎉 Brilliant!' : `The word was ${ANSWER}`, 3000), 300);
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

  // Build keyboard letter states
  const usedLetters: Record<string, LetterState> = {};
  state.guesses.forEach((g) => {
    getLetterState(g, ANSWER).forEach((ls, i) => {
      const ch = g[i];
      const cur = usedLetters[ch];
      if (!cur || (cur !== 'correct' && ls !== 'absent')) usedLetters[ch] = ls;
    });
  });

  const tileColor = (ls: LetterState) =>
    ls === 'correct' ? 'bg-green-600 border-green-600 text-white'
    : ls === 'present' ? 'bg-yellow-500 border-yellow-500 text-white'
    : ls === 'absent' ? 'bg-[#3a3a3a] border-[#3a3a3a] text-white'
    : 'border-white/20 text-white';

  const keyColor = (ls?: LetterState) =>
    ls === 'correct' ? 'bg-green-600 text-white'
    : ls === 'present' ? 'bg-yellow-500 text-white'
    : ls === 'absent' ? 'bg-[#3a3a3a] text-gray-400'
    : 'bg-[#2a2a2a] text-white';

  const shareText = buildWordleShare(TODAY, state.guesses, ANSWER, state.won);
  const emojiGrid = state.guesses.map((g) =>
    getLetterState(g, ANSWER).map((ls) => ls === 'correct' ? '🟩' : ls === 'present' ? '🟨' : '⬛').join('')
  ).join('\n');

  return (
    <div className="min-h-screen bg-[#111] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors p-1">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-base">IOL Wordle</h1>
          <p className="text-gray-500 text-xs">{TODAY}</p>
        </div>
        <div className="w-8" />
      </header>

      {/* Message toast */}
      {msg && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-white text-black text-sm font-semibold px-4 py-2 rounded-full shadow-lg z-50 bounce-in">
          {msg}
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 flex flex-col items-center justify-center gap-1.5 py-6 px-4">
        {Array.from({ length: MAX_GUESSES }).map((_, row) => {
          const guess = state.guesses[row];
          const isCurrent = row === state.guesses.length && !state.gameOver;
          const display = isCurrent ? state.currentGuess.padEnd(WORD_LENGTH) : (guess ?? '').padEnd(WORD_LENGTH);
          const states = guess ? getLetterState(guess, ANSWER) : null;

          return (
            <div key={row} className={`flex gap-1.5 ${isCurrent && shake ? 'shake' : ''}`}>
              {Array.from({ length: WORD_LENGTH }).map((_, col) => {
                const letter = display[col]?.trim() ?? '';
                const ls: LetterState = states ? states[col] : letter ? 'empty' : 'empty';
                return (
                  <div
                    key={col}
                    className={`w-14 h-14 flex items-center justify-center border-2 text-xl font-bold uppercase rounded transition-all ${
                      guess ? tileColor(ls) : letter ? 'border-white/40 text-white' : 'border-white/10 text-white'
                    }`}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Share if done */}
      {state.gameOver && (
        <div className="flex flex-col items-center gap-3 pb-4">
          <ShareButton
            text={shareText}
            gameName="Wordle"
            resultLine={`${state.won ? state.guesses.length + '/6' : 'X/6'} — ${TODAY}`}
            emojiGrid={emojiGrid}
          />
        </div>
      )}

      {/* Keyboard */}
      <div className="pb-safe px-1 pb-4 space-y-1.5">
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-1">
            {row.map((key) => (
              <button
                key={key}
                onClick={() => pressKey(key)}
                className={`h-14 rounded font-semibold text-sm transition-colors ${
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
