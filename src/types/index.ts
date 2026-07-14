export type GameId = 'wordle' | 'sudoku' | 'connections' | 'crossword' | 'tiles';
export type GameStatus = 'unplayed' | 'playing' | 'won' | 'lost';

export interface DailyGameState {
  date: string;
  status: GameStatus;
  completedAt?: number;
  score?: number;
  attempts?: number;
}

export interface StreakData {
  current: number;
  longest: number;
  lastCompletedDate: string | null;
}

export interface AllGameStates {
  wordle: DailyGameState | null;
  sudoku: DailyGameState | null;
  connections: DailyGameState | null;
  crossword: DailyGameState | null;
  tiles: DailyGameState | null;
}

// Wordle
export type LetterState = 'correct' | 'present' | 'absent' | 'empty';
export interface WordleState extends DailyGameState {
  guesses: string[];
  currentGuess: string;
}

// Connections
export interface ConnectionsCategory {
  label: string;
  words: string[];
  color: 'yellow' | 'green' | 'blue' | 'purple';
  emoji: string;
}

// Crossword
export interface CrosswordClue {
  number: number;
  clue: string;
  answer: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
}

export interface CrosswordPuzzle {
  grid: string[][];
  clues: CrosswordClue[];
}

// Tiles
export interface TilesState extends DailyGameState {
  timeMs?: number;
  errors?: number;
}
