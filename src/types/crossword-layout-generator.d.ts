declare module 'crossword-layout-generator' {
  interface WordInput {
    answer: string;
    clue: string;
  }
  interface PlacedWord extends WordInput {
    startx: number;
    starty: number;
    position: number;
    orientation: 'across' | 'down' | 'none';
  }
  interface Layout {
    rows: number;
    cols: number;
    table: string[][];
    table_string: string;
    result: PlacedWord[];
  }
  export function generateLayout(wordList: WordInput[]): Layout;
}
