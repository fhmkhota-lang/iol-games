import { createRng } from './seed';

type Grid = number[][];

function isValid(grid: Grid, row: number, col: number, num: number): boolean {
  for (let c = 0; c < 9; c++) if (grid[row][c] === num) return false;
  for (let r = 0; r < 9; r++) if (grid[r][col] === num) return false;
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++)
    for (let c = bc; c < bc + 3; c++)
      if (grid[r][c] === num) return false;
  return true;
}

function solve(grid: Grid, rng?: () => number): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        if (rng) nums.sort(() => rng() - 0.5);
        for (const num of nums) {
          if (isValid(grid, row, col, num)) {
            grid[row][col] = num;
            if (solve(grid, rng)) return true;
            grid[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

export function generateDailySudoku(seed: number): { puzzle: Grid; solution: Grid } {
  const rng = createRng(seed);
  const solution: Grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  solve(solution, rng);

  // Remove cells to create puzzle — keep ~35 clues (remove 46)
  const puzzle: Grid = solution.map((r) => [...r]);
  const positions = Array.from({ length: 81 }, (_, i) => i);
  // Seeded shuffle of positions
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  for (let i = 0; i < 46; i++) {
    const pos = positions[i];
    puzzle[Math.floor(pos / 9)][pos % 9] = 0;
  }

  return { puzzle, solution };
}

export function checkSudoku(current: Grid, solution: Grid): boolean {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (current[r][c] !== solution[r][c]) return false;
  return true;
}

export function isCellValid(grid: Grid, row: number, col: number): boolean {
  const val = grid[row][col];
  if (val === 0) return true;
  // Temporarily remove to check
  grid[row][col] = 0;
  const valid = isValid(grid, row, col, val);
  grid[row][col] = val;
  return valid;
}
