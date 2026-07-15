import type { WordEntry } from '../data/crosswordWords';

export interface PlacedWord {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
  number: number;
}

export interface GeneratedCrossword {
  gridSize: number;
  /** solution grid — '' means black square */
  solution: string[][];
  placedWords: PlacedWord[];
}

// Seeded shuffle — Fisher-Yates
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateCrossword(
  words: WordEntry[],
  gridSize: number,
  rng: () => number
): GeneratedCrossword {
  // Deduplicate words by uppercase
  const seen = new Set<string>();
  const unique = words.filter(w => {
    const u = w.word.toUpperCase().replace(/[^A-Z]/g, '');
    if (!u || u.length < 3 || seen.has(u)) return false;
    seen.add(u);
    return true;
  }).map(w => ({ word: w.word.toUpperCase().replace(/[^A-Z]/g, ''), clue: w.clue }));

  const wordSet = new Set(unique.map(w => w.word));

  // Mutable state (algorithm mirrors the JS original, adapted to TS)
  let solution: string[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(''));
  let placed: PlacedWord[] = [];

  // ── helpers ──────────────────────────────────────────────────────────────

  function placeWordInGrid(word: string, row: number, col: number, dir: 'across' | 'down') {
    for (let i = 0; i < word.length; i++) {
      const r = dir === 'across' ? row : row + i;
      const c = dir === 'across' ? col + i : col;
      solution[r][c] = word[i];
    }
  }

  function restoreGrid(backup: string[][]) {
    for (let r = 0; r < gridSize; r++)
      for (let c = 0; c < gridSize; c++)
        solution[r][c] = backup[r][c];
  }

  function backupGrid(): string[][] {
    return solution.map(row => [...row]);
  }

  /** Check that every contiguous run in the grid is a known word */
  function allRunsValid(): boolean {
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (solution[r][c] !== '') {
          // horizontal run start
          if (c === 0 || solution[r][c - 1] === '') {
            let run = '';
            let k = c;
            while (k < gridSize && solution[r][k] !== '') run += solution[r][k++];
            if (run.length > 2 && !wordSet.has(run)) return false;
          }
          // vertical run start
          if (r === 0 || solution[r - 1][c] === '') {
            let run = '';
            let k = r;
            while (k < gridSize && solution[k][c] !== '') run += solution[k++][c];
            if (run.length > 2 && !wordSet.has(run)) return false;
          }
        }
      }
    }
    return true;
  }

  /** Check the perpendicular word that would be formed at (r, c) if we add `letter` for `mainDir` */
  function perpValid(r: number, c: number, mainDir: 'across' | 'down', letter: string): boolean {
    const perpDir = mainDir === 'across' ? 'down' : 'across';

    // Find start of perpendicular run
    let start = perpDir === 'across' ? c : r;
    while (start > 0) {
      const pr = perpDir === 'across' ? r : start - 1;
      const pc = perpDir === 'across' ? start - 1 : c;
      if (solution[pr][pc] === '') break;
      start--;
    }
    // Find end
    let end = perpDir === 'across' ? c : r;
    const max = perpDir === 'across' ? gridSize - 1 : gridSize - 1;
    while (end < max) {
      const pr = perpDir === 'across' ? r : end + 1;
      const pc = perpDir === 'across' ? end + 1 : c;
      if (solution[pr][pc] === '') break;
      end++;
    }
    // Build the word with our candidate letter inserted
    let run = '';
    for (let i = start; i <= end; i++) {
      const pr = perpDir === 'across' ? r : i;
      const pc = perpDir === 'across' ? i : c;
      const existing = solution[pr][pc];
      run += (pr === r && pc === c) ? letter : existing;
    }
    if (run.length <= 2) return true; // 1-2 letter adjacency — always allow
    return wordSet.has(run);
  }

  /** Can this word be placed at (row, col, dir)? Must have ≥1 crossing with existing letters. */
  function canPlace(word: string, row: number, col: number, dir: 'across' | 'down'): boolean {
    if (dir === 'across') {
      if (col < 0 || col + word.length > gridSize) return false;
      if (row < 0 || row >= gridSize) return false;
      // Cell immediately before/after must be empty (no extending an existing word)
      if (col > 0 && solution[row][col - 1] !== '') return false;
      if (col + word.length < gridSize && solution[row][col + word.length] !== '') return false;
    } else {
      if (row < 0 || row + word.length > gridSize) return false;
      if (col < 0 || col >= gridSize) return false;
      if (row > 0 && solution[row - 1][col] !== '') return false;
      if (row + word.length < gridSize && solution[row + word.length][col] !== '') return false;
    }

    let crossings = 0;
    for (let i = 0; i < word.length; i++) {
      const r = dir === 'across' ? row : row + i;
      const c = dir === 'across' ? col + i : col;
      const existing = solution[r][c];
      if (existing !== '' && existing !== word[i]) return false;
      if (existing === word[i]) crossings++;
      // Only check perpendicular validity for non-crossing cells
      // (crossing cells already have their letter locked in; only adjacency matters)
      if (existing === '' && !perpValid(r, c, dir, word[i])) return false;
    }
    return crossings > 0; // must cross at least one existing letter
  }

  /** Try to place `wordObj` by finding a shared letter with `anchor` */
  function tryPlace(wordObj: { word: string; clue: string }, anchor: PlacedWord): boolean {
    for (let i = 0; i < wordObj.word.length; i++) {
      for (let j = 0; j < anchor.word.length; j++) {
        if (wordObj.word[i] !== anchor.word[j]) continue;

        let row: number, col: number, dir: 'across' | 'down';
        if (anchor.direction === 'across') {
          dir = 'down';
          row = anchor.row - i;
          col = anchor.col + j;
        } else {
          dir = 'across';
          row = anchor.row + j;
          col = anchor.col - i;
        }

        if (!canPlace(wordObj.word, row, col, dir)) continue;

        const bak = backupGrid();
        placeWordInGrid(wordObj.word, row, col, dir);
        if (!allRunsValid()) { restoreGrid(bak); continue; }

        placed.push({ word: wordObj.word, clue: wordObj.clue, row, col, direction: dir, number: placed.length + 1 });
        return true;
      }
    }
    return false;
  }

  // ── Phase 1: shuffle words, place first horizontally, then try to cross ──

  const shuffled = shuffle(unique, rng);

  if (shuffled.length === 0) return { gridSize, solution, placedWords: [] };

  // Place first word centred horizontally
  const first = shuffled[0];
  const startRow = Math.floor(gridSize / 2);
  const startCol = Math.floor((gridSize - first.word.length) / 2);
  placeWordInGrid(first.word, startRow, startCol, 'across');
  placed.push({ word: first.word, clue: first.clue, row: startRow, col: startCol, direction: 'across', number: 1 });

  const remaining = shuffled.slice(1);
  const maxAttempts = 5000;
  let attempts = 0;

  while (remaining.length > 0 && attempts < maxAttempts) {
    const wordObj = remaining[0];
    let placed_ = false;
    for (let i = 0; i < placed.length && !placed_; i++) {
      if (tryPlace(wordObj, placed[i])) placed_ = true;
    }
    if (placed_) {
      remaining.splice(0, 1);
    } else {
      remaining.push(remaining.shift()!);
    }
    attempts++;
  }

  // ── Phase 2: try remaining words again against the richer grid ──
  const unused = shuffled.filter(w => !placed.some(p => p.word === w.word));
  for (const wordObj of unused) {
    for (const anchor of placed) {
      if (tryPlace(wordObj, anchor)) break;
    }
  }

  // ── Renumber in reading order (top-to-bottom, left-to-right) ──
  placed.sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);
  placed = placed.map((p, i) => ({ ...p, number: i + 1 }));

  // Fix numbers: cells that start both an across AND a down word share one number
  const startMap = new Map<string, number>();
  let counter = 1;
  const renumbered: PlacedWord[] = [];
  for (const p of placed) {
    const key = `${p.row},${p.col}`;
    if (!startMap.has(key)) startMap.set(key, counter++);
    renumbered.push({ ...p, number: startMap.get(key)! });
  }

  return { gridSize, solution, placedWords: renumbered };
}
