import { useLocalStorage } from './useLocalStorage';
import { getTodayString } from '../utils/seed';
import type { DailyGameState, GameId, StreakData, AllGameStates } from '../types';

const TODAY = getTodayString();

const DEFAULT_STATES: AllGameStates = {
  wordle: null,
  sudoku: null,
  connections: null,
  crossword: null,
  tiles: null,
};

const DEFAULT_STREAK: StreakData = {
  current: 0,
  longest: 0,
  lastCompletedDate: null,
};

export function useGameStore() {
  const [gameStates, setGameStates] = useLocalStorage<AllGameStates>('iol_game_states', DEFAULT_STATES);
  const [streaks, setStreaks] = useLocalStorage<Record<GameId, StreakData>>(
    'iol_streaks',
    { wordle: DEFAULT_STREAK, sudoku: DEFAULT_STREAK, connections: DEFAULT_STREAK, crossword: DEFAULT_STREAK, tiles: DEFAULT_STREAK }
  );

  function getState(gameId: GameId): DailyGameState {
    const stored = gameStates[gameId];
    if (stored && stored.date === TODAY) return stored;
    return { date: TODAY, status: 'unplayed' };
  }

  function setState(gameId: GameId, update: Partial<DailyGameState>) {
    setGameStates((prev) => ({
      ...prev,
      [gameId]: { ...(prev[gameId] ?? { date: TODAY, status: 'unplayed' }), ...update, date: TODAY },
    }));
  }

  function completeGame(gameId: GameId, won: boolean, extra?: Partial<DailyGameState>) {
    setState(gameId, {
      status: won ? 'won' : 'lost',
      completedAt: Date.now(),
      ...extra,
    });

    // Update streak
    setStreaks((prev) => {
      const streak = prev[gameId];
      const last = streak.lastCompletedDate;
      const yesterday = (() => {
        const d = new Date(TODAY);
        d.setDate(d.getDate() - 1);
        return d.toISOString().slice(0, 10);
      })();

      let newCurrent = streak.current;
      if (won) {
        newCurrent = last === yesterday || last === TODAY ? streak.current + 1 : 1;
      } else {
        newCurrent = 0;
      }

      return {
        ...prev,
        [gameId]: {
          current: newCurrent,
          longest: Math.max(streak.longest, newCurrent),
          lastCompletedDate: TODAY,
        },
      };
    });
  }

  function getOverallStreak(): number {
    const ids: GameId[] = ['wordle', 'sudoku', 'connections', 'crossword', 'tiles'];
    const allWon = ids.every((id) => getState(id).status === 'won');
    if (!allWon) return 0;
    return Math.min(...ids.map((id) => streaks[id].current));
  }

  return { getState, setState, completeGame, streaks, getOverallStreak };
}
