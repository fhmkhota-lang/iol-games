export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }
}

export function buildWordleShare(
  date: string,
  guesses: string[],
  answer: string,
  won: boolean
): string {
  const lines = guesses.map((guess) =>
    guess
      .split('')
      .map((letter, i) => {
        if (letter === answer[i]) return '🟩';
        if (answer.includes(letter)) return '🟨';
        return '⬛';
      })
      .join('')
  );
  const tries = won ? `${guesses.length}/6` : 'X/6';
  return `IOL Wordle ${date} ${tries}\n\n${lines.join('\n')}\n\nPlay at iol.co.za/games`;
}

export function buildConnectionsShare(
  date: string,
  _attempts: number,
  won: boolean,
  order: string[]
): string {
  const emoji = won ? '🎉' : '❌';
  return `IOL Connections ${date} ${emoji}\n${order.join('\n')}\n\nPlay at iol.co.za/games`;
}

export function buildSudokuShare(date: string, timeSeconds: number, won: boolean): string {
  const mins = Math.floor(timeSeconds / 60);
  const secs = timeSeconds % 60;
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  return `IOL Sudoku ${date}\n${won ? `✅ Solved in ${timeStr}` : '❌ Not solved'}\n\nPlay at iol.co.za/games`;
}

export function buildTilesShare(date: string, score: number, timeMs: number): string {
  const stars = score >= 90 ? '⭐⭐⭐' : score >= 70 ? '⭐⭐' : '⭐';
  return `IOL Tiles ${date}\n${stars} Score: ${score}\nTime: ${(timeMs / 1000).toFixed(1)}s\n\nPlay at iol.co.za/games`;
}

/** Render a share card on an off-screen canvas and trigger download */
export function downloadShareCard(
  gameName: string,
  resultLine: string,
  emojiGrid: string
): void {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 600;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, 600, 600);

  // Red accent bar
  ctx.fillStyle = '#E8141C';
  ctx.fillRect(0, 0, 600, 8);

  // IOL logo text
  ctx.fillStyle = '#E8141C';
  ctx.font = 'bold 36px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('IOL', 300, 70);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Inter, sans-serif';
  ctx.fillText(gameName, 300, 112);

  ctx.font = '22px Inter, sans-serif';
  ctx.fillStyle = '#aaaaaa';
  ctx.fillText(resultLine, 300, 155);

  // Emoji grid
  const lines = emojiGrid.split('\n');
  ctx.font = '32px serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, 300, 220 + i * 44);
  });

  // Footer
  ctx.fillStyle = '#555555';
  ctx.font = '16px Inter, sans-serif';
  ctx.fillText('iol.co.za/games', 300, 560);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iol-${gameName.toLowerCase()}-share.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
}
