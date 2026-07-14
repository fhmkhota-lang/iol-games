/**
 * Pre-built 5×5 mini crossword puzzles.
 * Each puzzle has one "spine" across word at row 2 and five down words,
 * one per column. Every cell in the 5×5 grid is a letter (no black squares).
 *
 * All intersections are manually verified:
 *   downWord[2] === acrossWord[colIndex]
 */

export interface CrosswordClue {
  number: number;
  direction: 'across' | 'down';
  row: number;  // 0-indexed top-left cell
  col: number;
  answer: string;
  clue: string;
}

export interface CrosswordPuzzle {
  /** 5×5 grid, each cell is a single uppercase letter */
  grid: string[][];
  clues: CrosswordClue[];
}

// ---------------------------------------------------------------------------
// Helper: build a 5×5 grid from one across spine + five down words.
// Verifies intersections at compile time via the assertion comments.
// ---------------------------------------------------------------------------
function makeGrid(downs: string[], spine: string, spineRow: number): string[][] {
  const grid: string[][] = Array.from({ length: 5 }, () => Array(5).fill(''));
  // Fill downs
  for (let c = 0; c < 5; c++) {
    for (let r = 0; r < 5; r++) {
      grid[r][c] = downs[c][r];
    }
  }
  // Fill spine (overrides downs at spineRow — should match)
  for (let c = 0; c < 5; c++) {
    grid[spineRow][c] = spine[c];
  }
  return grid;
}

// ---------------------------------------------------------------------------
// Puzzle definitions
// Format: [col0-down, col1-down, col2-down, col3-down, col4-down]
// Each down word must have spine[colIndex] at position spineRow (=2)
// ---------------------------------------------------------------------------

export const CROSSWORD_PUZZLES: CrosswordPuzzle[] = [
  // Puzzle 0 — spine CRANE at row 2
  // BACON[2]=C, EARNS[2]=R, AVAIL[2]=A, CANAL[2]=N, HEELS[2]=E ✓
  // Row 0 also spells BEACH ✓ (bonus across)
  (() => {
    const downs = ['BACON', 'EARNS', 'AVAIL', 'CANAL', 'HEELS'];
    const spine = 'CRANE';
    const grid = makeGrid(downs, spine, 2);
    return {
      grid,
      clues: [
        { number: 1, direction: 'across', row: 0, col: 0, answer: 'BEACH', clue: 'Sandy shore by the sea' },
        { number: 6, direction: 'across', row: 2, col: 0, answer: 'CRANE', clue: 'Long-necked wading bird or lifting machine' },
        { number: 1, direction: 'down', row: 0, col: 0, answer: 'BACON', clue: 'Cured pork strips' },
        { number: 2, direction: 'down', row: 0, col: 1, answer: 'EARNS', clue: 'Receives money for work' },
        { number: 3, direction: 'down', row: 0, col: 2, answer: 'AVAIL', clue: 'Be of use or benefit' },
        { number: 4, direction: 'down', row: 0, col: 3, answer: 'CANAL', clue: 'Man-made waterway' },
        { number: 5, direction: 'down', row: 0, col: 4, answer: 'HEELS', clue: 'Backs of feet; stiletto type' },
      ],
    };
  })(),

  // Puzzle 1 — spine STONE at row 2
  // NASAL[2]=S, RETRO[2]=T, EPOCH[2]=O, INNER[2]=N, BREED[2]=E ✓
  (() => {
    const downs = ['NASAL', 'RETRO', 'EPOCH', 'INNER', 'BREED'];
    const spine = 'STONE';
    const grid = makeGrid(downs, spine, 2);
    return {
      grid,
      clues: [
        { number: 6, direction: 'across', row: 2, col: 0, answer: 'STONE', clue: 'Hard mineral rock' },
        { number: 1, direction: 'down', row: 0, col: 0, answer: 'NASAL', clue: 'Relating to the nose' },
        { number: 2, direction: 'down', row: 0, col: 1, answer: 'RETRO', clue: 'Imitative of a past style' },
        { number: 3, direction: 'down', row: 0, col: 2, answer: 'EPOCH', clue: 'A distinct period of history' },
        { number: 4, direction: 'down', row: 0, col: 3, answer: 'INNER', clue: 'Situated inside; internal' },
        { number: 5, direction: 'down', row: 0, col: 4, answer: 'BREED', clue: 'Type of animal; to reproduce' },
      ],
    };
  })(),

  // Puzzle 2 — spine BRAVE at row 2
  // ALBUM[2]=B, FERRY[2]=R, AVAIL[2]=A, NAVAL[2]=V, SHEER[2]=E ✓
  (() => {
    const downs = ['ALBUM', 'FERRY', 'AVAIL', 'NAVAL', 'SHEER'];
    const spine = 'BRAVE';
    const grid = makeGrid(downs, spine, 2);
    return {
      grid,
      clues: [
        { number: 6, direction: 'across', row: 2, col: 0, answer: 'BRAVE', clue: 'Showing courage' },
        { number: 1, direction: 'down', row: 0, col: 0, answer: 'ALBUM', clue: 'Collection of music or photos' },
        { number: 2, direction: 'down', row: 0, col: 1, answer: 'FERRY', clue: 'Boat that carries passengers across water' },
        { number: 3, direction: 'down', row: 0, col: 2, answer: 'AVAIL', clue: 'Be of use; benefit' },
        { number: 4, direction: 'down', row: 0, col: 3, answer: 'NAVAL', clue: 'Relating to the navy or sea forces' },
        { number: 5, direction: 'down', row: 0, col: 4, answer: 'SHEER', clue: 'Pure; absolute; very steep' },
      ],
    };
  })(),

  // Puzzle 3 — spine LIGHT at row 2
  // VALOR[2]=L, NAIVE[2]=I, ANGEL[2]=G, ETHER[2]=H, OUTER[2]=T ✓
  (() => {
    const downs = ['VALOR', 'NAIVE', 'ANGEL', 'ETHER', 'OUTER'];
    const spine = 'LIGHT';
    const grid = makeGrid(downs, spine, 2);
    return {
      grid,
      clues: [
        { number: 6, direction: 'across', row: 2, col: 0, answer: 'LIGHT', clue: 'Visible energy; not heavy' },
        { number: 1, direction: 'down', row: 0, col: 0, answer: 'VALOR', clue: 'Great courage in battle' },
        { number: 2, direction: 'down', row: 0, col: 1, answer: 'NAIVE', clue: 'Lacking experience or wisdom' },
        { number: 3, direction: 'down', row: 0, col: 2, answer: 'ANGEL', clue: 'Heavenly messenger' },
        { number: 4, direction: 'down', row: 0, col: 3, answer: 'ETHER', clue: 'Light, upper air; anaesthetic liquid' },
        { number: 5, direction: 'down', row: 0, col: 4, answer: 'OUTER', clue: 'Further from the centre' },
      ],
    };
  })(),

  // Puzzle 4 — spine CROWN at row 2
  // VOCAL[2]=C, FERRY[2]=R, PROOF[2]=O, TOWER[2]=W, FUNNY[2]=N ✓
  (() => {
    const downs = ['VOCAL', 'FERRY', 'PROOF', 'TOWER', 'FUNNY'];
    const spine = 'CROWN';
    const grid = makeGrid(downs, spine, 2);
    return {
      grid,
      clues: [
        { number: 6, direction: 'across', row: 2, col: 0, answer: 'CROWN', clue: 'Royal headpiece; top of the head' },
        { number: 1, direction: 'down', row: 0, col: 0, answer: 'VOCAL', clue: 'Relating to the voice; outspoken' },
        { number: 2, direction: 'down', row: 0, col: 1, answer: 'FERRY', clue: 'Boat that carries passengers across water' },
        { number: 3, direction: 'down', row: 0, col: 2, answer: 'PROOF', clue: 'Evidence that establishes a fact' },
        { number: 4, direction: 'down', row: 0, col: 3, answer: 'TOWER', clue: 'Tall narrow structure' },
        { number: 5, direction: 'down', row: 0, col: 4, answer: 'FUNNY', clue: 'Causing laughter; strange' },
      ],
    };
  })(),

  // Puzzle 5 — spine ZEBRA at row 2 (SA themed)
  // FUZZY[2]=Z, STEEL[2]=E, ROBOT[2]=B, FERRY[2]=R, SHAWL[2]=A ✓
  (() => {
    const downs = ['FUZZY', 'STEEL', 'ROBOT', 'FERRY', 'SHAWL'];
    const spine = 'ZEBRA';
    const grid = makeGrid(downs, spine, 2);
    return {
      grid,
      clues: [
        { number: 6, direction: 'across', row: 2, col: 0, answer: 'ZEBRA', clue: 'Striped African animal related to the horse' },
        { number: 1, direction: 'down', row: 0, col: 0, answer: 'FUZZY', clue: 'Covered in fine hair; unclear' },
        { number: 2, direction: 'down', row: 0, col: 1, answer: 'STEEL', clue: 'Strong alloy of iron and carbon' },
        { number: 3, direction: 'down', row: 0, col: 2, answer: 'ROBOT', clue: 'South African word for a traffic light' },
        { number: 4, direction: 'down', row: 0, col: 3, answer: 'FERRY', clue: 'Boat that carries passengers across water' },
        { number: 5, direction: 'down', row: 0, col: 4, answer: 'SHAWL', clue: 'Piece of fabric worn over shoulders' },
      ],
    };
  })(),

  // Puzzle 6 — spine GRACE at row 2
  // ANGEL[2]=G, CARRY[2]=R, SHAWL[2]=A, OSCAR[2]=C, CHEER[2]=E ✓
  (() => {
    const downs = ['ANGEL', 'CARRY', 'SHAWL', 'OSCAR', 'CHEER'];
    const spine = 'GRACE';
    const grid = makeGrid(downs, spine, 2);
    return {
      grid,
      clues: [
        { number: 6, direction: 'across', row: 2, col: 0, answer: 'GRACE', clue: 'Elegance and poise; divine favour' },
        { number: 1, direction: 'down', row: 0, col: 0, answer: 'ANGEL', clue: 'Heavenly messenger; kind person' },
        { number: 2, direction: 'down', row: 0, col: 1, answer: 'CARRY', clue: 'Transport from one place to another' },
        { number: 3, direction: 'down', row: 0, col: 2, answer: 'SHAWL', clue: 'Large square of fabric worn over shoulders' },
        { number: 4, direction: 'down', row: 0, col: 3, answer: 'OSCAR', clue: 'Academy Award statuette' },
        { number: 5, direction: 'down', row: 0, col: 4, answer: 'CHEER', clue: 'Shout of encouragement or joy' },
      ],
    };
  })(),

  // Puzzle 7 — spine SOUTH at row 2
  // EASEL[2]=S, PROOF[2]=O, FLUTE[2]=U, OFTEN[2]=T, ETHER[2]=H ✓
  (() => {
    const downs = ['EASEL', 'PROOF', 'FLUTE', 'OFTEN', 'ETHER'];
    const spine = 'SOUTH';
    const grid = makeGrid(downs, spine, 2);
    return {
      grid,
      clues: [
        { number: 6, direction: 'across', row: 2, col: 0, answer: 'SOUTH', clue: 'Direction towards the South Pole' },
        { number: 1, direction: 'down', row: 0, col: 0, answer: 'EASEL', clue: 'Frame for holding a canvas or chalkboard' },
        { number: 2, direction: 'down', row: 0, col: 1, answer: 'PROOF', clue: 'Evidence that establishes a fact' },
        { number: 3, direction: 'down', row: 0, col: 2, answer: 'FLUTE', clue: 'Slender woodwind instrument' },
        { number: 4, direction: 'down', row: 0, col: 3, answer: 'OFTEN', clue: 'Frequently; many times' },
        { number: 5, direction: 'down', row: 0, col: 4, answer: 'ETHER', clue: 'Light upper air; anaesthetic liquid' },
      ],
    };
  })(),
];
