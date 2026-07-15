import { useState } from 'react';
import { useGameStore } from '../hooks/useGameStore';
import { getTodayString } from '../utils/seed';
import type { GameId } from '../types';

import { WordleGame } from './games/WordleGame';
import { SudokuGame } from './games/SudokuGame';
import { ConnectionsGame } from './games/ConnectionsGame';
import { CrosswordGame } from './games/CrosswordGame';
import { TilesGame } from './games/TilesGame';
import { GameErrorBoundary } from './ui/ErrorBoundary';

// ─── Game config ─────────────────────────────────────────────────
const GAMES: {
  id: GameId;
  number: string;
  name: string;
  tagline: string;
  category: string;
}[] = [
  {
    id: 'wordle',
    number: '01',
    name: 'Wordle',
    tagline: 'Guess the five-letter word in six tries',
    category: 'Word Puzzle',
  },
  {
    id: 'connections',
    number: '02',
    name: 'Connections',
    tagline: 'Group sixteen words into four hidden categories',
    category: 'Word Puzzle',
  },
  {
    id: 'crossword',
    number: '03',
    name: 'Crossword',
    tagline: 'Solve the daily five-by-five mini grid',
    category: 'Word Puzzle',
  },
  {
    id: 'tiles',
    number: '04',
    name: 'Tiles',
    tagline: 'Match colour patterns before the clock runs out',
    category: 'Pattern Game',
  },
  {
    id: 'sudoku',
    number: '05',
    name: 'Sudoku',
    tagline: 'Fill the nine-by-nine grid — a new puzzle every day',
    category: 'Number Puzzle',
  },
];

// ─── IOL Logo SVG ─────────────────────────────────────────────────
function IOLLogo({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 323 245.2" xmlns="http://www.w3.org/2000/svg" height={size} aria-label="IOL">
      <polygon fill="currentColor" points="234.59 0 280.57 0 280.57 198.88 323 198.88 323 245 234.59 245 234.59 0" />
      <path fill="currentColor" d="M186.97,19.01C174.37,6.44,158.82,0,141.02,0s-33.35,6.44-45.95,19.01c-12.6,12.57-19.06,28.08-19.06,45.83v115.31c0,17.76,6.46,33.26,19.06,45.83,12.6,12.57,28.15,19.01,45.95,19.01s33.35-6.44,45.95-19.01c12.6-12.57,19.06-28.08,19.06-45.83v-115.31c0-17.76-6.46-33.26-19.06-45.83ZM158.93,180.16c0,5.22-1.72,9.4-5.54,13.2-3.78,3.77-8.01,5.52-13.39,5.52s-9.61-1.75-13.39-5.52c-3.82-3.8-5.54-7.98-5.54-13.2v-115.31c0-5.37,1.75-9.58,5.54-13.35,3.78-3.77,8.01-5.52,13.39-5.52s9.61,1.75,13.39,5.52c3.78,3.77,5.54,7.99,5.54,13.35v115.31Z"/>
      <path fill="currentColor" d="M47.44,245.2H0v-76.7L47.44,61v184.2Z"/>
      <path fill="#E8141C" d="M0,.13h46L0,103V.13Z"/>
    </svg>
  );
}

// ─── Ad banner placeholder ────────────────────────────────────────
function AdBanner({ size }: { size: 'leaderboard' | 'mobile-banner' | 'mrec' }) {
  const cfg = {
    leaderboard:     { w: 728, h: 90,  show: 'hidden lg:flex' },
    'mobile-banner': { w: 320, h: 50,  show: 'flex lg:hidden' },
    mrec:            { w: 300, h: 250, show: 'hidden xl:flex' },
  }[size];
  return (
    <div
      className={`${cfg.show} ad-slot shrink-0`}
      style={{ width: '100%', maxWidth: cfg.w, height: cfg.h }}
    >
      Advertisement
    </div>
  );
}

// ─── Progress dots ────────────────────────────────────────────────
function ProgressDots({ total, done, won }: { total: number; done: number; won: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const state = i < won ? 'won' : i < done ? 'done' : 'pending';
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              width: 8, height: 8,
              borderRadius: '50%',
              background: state === 'won'
                ? 'var(--green)'
                : state === 'done'
                ? 'var(--ink-muted)'
                : 'var(--rule)',
              transition: 'background 0.4s ease',
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Game card ───────────────────────────────────────────────────
function GameCard({
  game, won, lost, streak, delay, onClick,
}: {
  game: typeof GAMES[0];
  won: boolean; lost: boolean; streak: number;
  delay: number;
  onClick: () => void;
}) {
  const done = won || lost;

  return (
    <button
      onClick={onClick}
      className="group w-full text-left relative overflow-hidden"
      style={{
        animation: `fade-up 0.5s ${delay}ms cubic-bezier(0.16,1,0.3,1) both`,
        background: done
          ? won ? 'var(--green-pale)' : 'var(--paper-alt)'
          : 'var(--paper-bright)',
        border: `1px solid ${done ? won ? 'rgba(28,107,46,0.2)' : 'var(--rule-light)' : 'var(--rule)'}`,
        borderRadius: 4,
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
      }}
      onMouseEnter={e => {
        if (!done) (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px var(--shadow-warm-md)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* Big faint number watermark */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: -6,
          top: -20,
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: 120,
          fontStyle: 'italic',
          fontWeight: 900,
          lineHeight: 1,
          color: done
            ? won ? 'rgba(28,107,46,0.06)' : 'rgba(24,16,10,0.04)'
            : 'rgba(24,16,10,0.05)',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {game.number}
      </span>

      {/* Left accent bar */}
      <span
        style={{
          position: 'absolute',
          left: 0, top: 0, bottom: 0,
          width: 3,
          background: done
            ? won ? 'var(--green)' : 'var(--rule)'
            : 'var(--rule-light)',
          transition: 'background 0.2s ease',
        }}
        className="group-hover:[background:var(--red)!important]"
      />

      <div className="flex items-start gap-4 px-5 py-4 pl-6">
        {/* Left: number + category */}
        <div className="shrink-0 pt-0.5" style={{ minWidth: 36 }}>
          <span
            style={{
              fontFamily: '"Space Mono", monospace',
              fontSize: 11,
              fontWeight: 700,
              color: done ? won ? 'var(--green)' : 'var(--ink-muted)' : 'var(--red)',
              letterSpacing: '0.05em',
            }}
          >
            {game.number}
          </span>
        </div>

        {/* Centre: title + tagline */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3
              style={{
                fontFamily: '"Playfair Display", Georgia, serif',
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--ink)',
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
              }}
            >
              {game.name}
            </h3>
            {streak > 1 && (
              <span
                style={{
                  fontFamily: '"Space Mono", monospace',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--red)',
                  letterSpacing: '0.06em',
                }}
              >
                {streak}×
              </span>
            )}
          </div>
          <p
            style={{
              fontSize: 13,
              color: 'var(--ink-secondary)',
              lineHeight: 1.5,
              fontStyle: done ? 'normal' : 'italic',
            }}
          >
            {won ? 'Completed today' : lost ? 'Played today' : game.tagline}
          </p>
        </div>

        {/* Right: status */}
        <div className="shrink-0 flex flex-col items-end justify-between h-full pt-0.5 gap-3">
          {won ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="var(--green)" strokeWidth="1.5" fill="var(--green-pale)" />
              <path d="M6 10l3 3 5-5" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : lost ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="var(--rule)" strokeWidth="1.5" fill="none" />
              <path d="M7 7l6 6M13 7l-6 6" stroke="var(--ink-muted)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          ) : (
            <span
              style={{
                fontFamily: '"Space Mono", monospace',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--red)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                transition: 'gap 0.2s ease',
              }}
              className="group-hover:translate-x-0.5 transition-transform"
            >
              Play
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginTop: 1 }}>
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          )}
          <span
            style={{
              fontFamily: '"Space Mono", monospace',
              fontSize: 9,
              color: 'var(--ink-muted)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {game.category}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Streak bar for footer ─────────────────────────────────────────
function StreakItem({ game, streak }: { game: typeof GAMES[0]; streak: number }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <span
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: 22,
          fontWeight: 900,
          color: streak > 0 ? 'var(--ink)' : 'var(--rule)',
          lineHeight: 1,
        }}
      >
        {streak}
      </span>
      <span
        style={{
          fontFamily: '"Space Mono", monospace',
          fontSize: 8,
          color: 'var(--ink-muted)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {game.name}
      </span>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────
export function Dashboard() {
  const { getState, getOverallStreak, streaks } = useGameStore();
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const today = getTodayString();
  const overallStreak = getOverallStreak();

  const completedCount = GAMES.filter(g => {
    const s = getState(g.id).status;
    return s === 'won' || s === 'lost';
  }).length;
  const wonCount = GAMES.filter(g => getState(g.id).status === 'won').length;

  const dateObj = new Date(today + 'T12:00:00');
  const dayName = dateObj.toLocaleDateString('en-ZA', { weekday: 'long' });
  const dayNum  = dateObj.getDate();
  const monthName = dateObj.toLocaleDateString('en-ZA', { month: 'long' });
  const year    = dateObj.getFullYear();

  // ── Game view ──────────────────────────────────────────────────
  if (activeGame) {
    const back = () => setActiveGame(null);
    const GameMap: Record<GameId, React.ReactNode> = {
      wordle:      <WordleGame onBack={back} />,
      sudoku:      <SudokuGame onBack={back} />,
      connections: <ConnectionsGame onBack={back} />,
      crossword:   <CrosswordGame onBack={back} />,
      tiles:       <TilesGame onBack={back} />,
    };
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--paper)' }}>
        <div className="flex justify-center py-2 px-4" style={{ background: 'var(--paper-alt)', borderBottom: '1px solid var(--rule-light)' }}>
          <AdBanner size="mobile-banner" />
          <AdBanner size="leaderboard" />
        </div>
        <div className="flex-1">
          <GameErrorBoundary onBack={back}>
            {GameMap[activeGame]}
          </GameErrorBoundary>
        </div>
        <div className="flex justify-center py-2 px-4" style={{ background: 'var(--paper-alt)', borderTop: '1px solid var(--rule-light)' }}>
          <AdBanner size="mobile-banner" />
          <AdBanner size="leaderboard" />
        </div>
      </div>
    );
  }

  // ── Dashboard view ─────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--paper)' }}>

      {/* ── Top ad bar ─────────────────────────────────────────── */}
      <div
        className="flex justify-center px-4 py-2"
        style={{ background: 'var(--paper-alt)', borderBottom: '1px solid var(--rule-light)' }}
      >
        <AdBanner size="leaderboard" />
        <AdBanner size="mobile-banner" />
      </div>

      {/* ── Masthead ───────────────────────────────────────────── */}
      <header style={{ background: 'var(--paper)', borderBottom: '1px solid var(--ink)' }}>
        <div className="max-w-2xl mx-auto px-5">

          {/* Thin red rule top */}
          <div style={{ height: 3, background: 'var(--red)', marginBottom: 0 }} className="rule-animate" />

          {/* Logo + title row */}
          <div className="flex items-end justify-between py-4 gap-4">
            <div style={{ animation: 'fade-up 0.5s 0ms cubic-bezier(0.16,1,0.3,1) both' }}>
              <IOLLogo size={32} />
            </div>

            {/* Big masthead text */}
            <div
              className="flex-1"
              style={{ animation: 'fade-up 0.5s 60ms cubic-bezier(0.16,1,0.3,1) both' }}
            >
              <h1
                style={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontSize: 'clamp(22px, 5vw, 44px)',
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                  color: 'var(--ink)',
                  whiteSpace: 'nowrap',
                }}
              >
                Daily <em style={{ fontStyle: 'italic', color: 'var(--red)' }}>Games</em>
              </h1>
            </div>

            {/* Date column */}
            <div
              className="text-right shrink-0"
              style={{
                animation: 'fade-up 0.5s 120ms cubic-bezier(0.16,1,0.3,1) both',
                fontFamily: '"Space Mono", monospace',
              }}
            >
              <div style={{ fontSize: 10, color: 'var(--ink-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {dayName}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
                {dayNum}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-secondary)', letterSpacing: '0.04em' }}>
                {monthName} {year}
              </div>
            </div>
          </div>

          {/* Progress line */}
          <div
            className="flex items-center justify-between pb-3"
            style={{ animation: 'fade-up 0.5s 180ms cubic-bezier(0.16,1,0.3,1) both' }}
          >
            <div className="flex items-center gap-3">
              <ProgressDots total={GAMES.length} done={completedCount} won={wonCount} />
              <span style={{ fontFamily: '"Space Mono", monospace', fontSize: 10, color: 'var(--ink-muted)', letterSpacing: '0.06em' }}>
                {wonCount === GAMES.length
                  ? 'ALL DONE TODAY'
                  : `${completedCount} OF ${GAMES.length} PLAYED`
                }
              </span>
            </div>
            {overallStreak > 0 && (
              <span
                style={{
                  fontFamily: '"Space Mono", monospace',
                  fontSize: 10,
                  color: 'var(--red)',
                  letterSpacing: '0.06em',
                  fontWeight: 700,
                }}
              >
                {overallStreak}× STREAK
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Content + side ads ─────────────────────────────────── */}
      <div className="flex flex-1 justify-center gap-6 px-3">

        {/* Left MREC */}
        <div className="hidden xl:flex flex-col pt-6 shrink-0">
          <AdBanner size="mrec" />
        </div>

        <main className="w-full max-w-2xl py-6 flex flex-col gap-6">

          {/* Section label */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              animation: 'fade-up 0.5s 220ms cubic-bezier(0.16,1,0.3,1) both',
            }}
          >
            <span
              style={{
                fontFamily: '"Space Mono", monospace',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--ink-muted)',
              }}
            >
              Today's Puzzles
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
          </div>

          {/* Game cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {GAMES.map((game, i) => {
              const state = getState(game.id);
              const streak = streaks[game.id]?.current ?? 0;
              return (
                <GameCard
                  key={game.id}
                  game={game}
                  won={state.status === 'won'}
                  lost={state.status === 'lost'}
                  streak={streak}
                  delay={260 + i * 60}
                  onClick={() => setActiveGame(game.id)}
                />
              );
            })}
          </div>

          {/* Mid ad */}
          <div className="flex justify-center">
            <AdBanner size="mobile-banner" />
          </div>

          {/* Streak panel */}
          <div
            style={{
              animation: 'fade-up 0.5s 580ms cubic-bezier(0.16,1,0.3,1) both',
              border: '1px solid var(--rule)',
              borderRadius: 4,
              background: 'var(--paper-bright)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                background: 'var(--paper-alt)',
                borderBottom: '1px solid var(--rule)',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span
                style={{
                  fontFamily: '"Space Mono", monospace',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-muted)',
                }}
              >
                Your Streaks
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--rule)' }} />
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                padding: '16px',
                gap: 8,
              }}
            >
              {GAMES.map(game => (
                <StreakItem
                  key={game.id}
                  game={game}
                  streak={streaks[game.id]?.current ?? 0}
                />
              ))}
            </div>
          </div>

          {/* Daily reset notice */}
          <div
            style={{
              animation: 'fade-up 0.5s 640ms cubic-bezier(0.16,1,0.3,1) both',
              padding: '12px 16px',
              border: '1px solid var(--rule-light)',
              borderLeft: '3px solid var(--red)',
              borderRadius: '0 4px 4px 0',
              background: 'var(--paper-bright)',
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontWeight: 700,
                  fontSize: 14,
                  color: 'var(--ink)',
                  marginBottom: 4,
                }}
              >
                New puzzles every day at midnight SAST
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--ink-secondary)',
                  lineHeight: 1.6,
                  fontStyle: 'italic',
                }}
              >
                All five games reset together. Complete every puzzle to build your streak — the same set for every player in South Africa.
              </p>
            </div>
          </div>

        </main>

        {/* Right MREC */}
        <div className="hidden xl:flex flex-col pt-6 shrink-0">
          <AdBanner size="mrec" />
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer
        style={{
          marginTop: 8,
          borderTop: '2px solid var(--ink)',
          background: 'var(--paper-alt)',
        }}
      >
        {/* Red rule */}
        <div style={{ height: 2, background: 'var(--red)' }} />

        <div className="flex justify-center py-2 px-4">
          <AdBanner size="leaderboard" />
          <AdBanner size="mobile-banner" />
        </div>

        <div
          className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <IOLLogo size={20} />
            <span
              style={{
                fontFamily: '"Space Mono", monospace',
                fontSize: 10,
                color: 'var(--ink-muted)',
                letterSpacing: '0.06em',
              }}
            >
              IOL DAILY GAMES · {today}
            </span>
          </div>
          <span
            style={{
              fontFamily: '"Space Mono", monospace',
              fontSize: 9,
              color: 'var(--ink-muted)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Puzzles by IOL
          </span>
        </div>
      </footer>
    </div>
  );
}
