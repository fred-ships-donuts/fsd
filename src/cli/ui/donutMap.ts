import { sextant } from './sextant.js';
import type { Cell, Rgb } from './donutArt.js';

// The 🍩 hand-tuned for one size: 22 columns by 9 rows (the 80x24 header), drawn pixel by pixel instead of resampled from the
// emoji. A pixel is one sextant block (2 x 3 to a cell), so the map is 44 x 27; each letter is a colour of the palette, a dot is
// the terminal's own background. A cell holds at most two colours (the block and its background), so every 2 x 3 group of the
// map uses at most two of them.
export const MAP_COLS = 22;
export const MAP_ROWS = 9;

const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as unknown as Rgb;

const PALETTE: Record<string, string> = {
  C: '#875b4f', // chocolate
  D: '#f5b03e', // dough
  H: '#de8013', // the rim of the hole
  T: '#b79279', // the pale streaks
  P: '#f57ba8', // pink sprinkle
  L: '#fca8a6', // light pink sprinkle
  R: '#fc5e5b', // red sprinkle
  B: '#92c7ed', // blue sprinkle
  Y: '#fcb702', // yellow sprinkle
};

export const DONUT_MAP_22X9: readonly string[] = [
  '....................LL......................',
  '..............CCCCCCLLCCCCCCCC..............',
  '..........CCCCCCCCCCCCCCCCCCCCCCCC..........',
  '........CCCCCCCPPCCCCCCCCBBBCCYYYYCCC.......',
  '......CCCCCCCCCPPPCCCCCCBBBBCYYYYCCCCC......',
  '.....CCCCCCCCCCCPPCCCCCCBBCCCCCCCCCCCCCC....',
  '....CCBCCCCCCCCCCCCCCCCCCCCCCCCCCCLLLCCCC...',
  '...CCCBBCCCCCCCCCCCCCCCCCCCCCCCCCCLLLCCCCC..',
  '..CCCCCBCCPPPCCCCCCHHHHHHHCCCCCRRRCCCCCCCCC.',
  '.CCLLLCCCPPPCCCCHHHHHHHHHHHHCCCCRRRRCCCCCCC.',
  '.CLLLCCCPPPCCCCCHHH.......HHHCCCCCRRCCCCCCC.',
  'CCLLCCCCPPCCCCCCHH.........HHCCCCCCCCPPPCCCC',
  'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCPPPCCCCC',
  'CCCCCCCCCCCCCCCCCCCCCCCCCCRRRCCCCCCCPPCCYYYC',
  'CCTTTCCCLLLLCCCCCCCCCCCCRRRRCCCCCCCCPCCCYYCC',
  '.DCCTTCCCCCCCCCBCCCCCCCCRRRCCCCCCCCCCCTTCCD.',
  '.DDCTTTCCCCCCCBBCCCCCCCCCCCCCLLCLCCCCTTTCDD.',
  '.DDCCTTTTCCCCCBBBCCCCCCCCCCCCLLLLCCTTTTCCDD.',
  '..DDCCTTTTTCCCCBBCCCCYYYYYCCCCCCCCTTTTCCDD..',
  '..DDDCTTTTTTTCCCCCCCCCCYYYCCCCCCCTTTTTCDDD..',
  '...DDDDDCCCTTCCCCCCCCCCCCCCCCCCCCTCCDDDDD...',
  '....DDDDDDDDCCCCTTTTTTTTCCCCCCCCCDDDDDDD....',
  '....DDDDDDDDDDCCTTTTTTTTCCCCDDDDDDDDDDDD....',
  '......DDDDDDDDDDDDDTCCCTDDDDDDDDDDDDDD......',
  '.......DDDDDDDDDDDDDDDDDDDDDDDDDDDDDD.......',
  '...........DDDDDDDDDDDDDDDDDDDDDD...........',
  '...............DDDDDDDDDDDDDD...............',
];

// The map for any other size: the 44 x 27 pixels are resampled (the nearest pixel) to the size's grid of 2 x 3 pixels a cell, and
// every cell is then brought to two colours (the two most frequent in it; a third takes the nearer one of the two). At 22 x 9 it
// is the map itself, untouched.
const MAP_W = MAP_COLS * 2;
const MAP_H = MAP_ROWS * 3;
const BACKGROUND: Rgb = [30, 30, 40];
const colourOf = (k: string): Rgb => (k === '.' ? BACKGROUND : rgb(PALETTE[k]!));
const distance = (a: string, b: string) => {
  const [p, q] = [colourOf(a), colourOf(b)];
  return (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
};

function scaledPixels(cols: number, rows: number): string[][] {
  const grid = Array.from({ length: rows * 3 }, (_, y) =>
    Array.from({ length: cols * 2 }, (_, x) => DONUT_MAP_22X9[Math.min(MAP_H - 1, Math.floor(((y + 0.5) * MAP_H) / (rows * 3)))]![Math.min(MAP_W - 1, Math.floor(((x + 0.5) * MAP_W) / (cols * 2)))]!),
  );
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const spots = [0, 1, 2].flatMap((dy) => [0, 1].map((dx) => [cy * 3 + dy, cx * 2 + dx] as const));
      const count = new Map<string, number>();
      for (const [y, x] of spots) count.set(grid[y]![x]!, (count.get(grid[y]![x]!) ?? 0) + 1);
      if (count.size <= 2) continue;
      const keep = [...count].sort((a, b) => b[1] - a[1] || (a[0] === '.' ? 1 : -1)).slice(0, 2).map(([k]) => k);
      for (const [y, x] of spots) {
        const k = grid[y]![x]!;
        if (!keep.includes(k)) grid[y]![x] = keep.reduce((a, b) => (distance(k, b) < distance(k, a) ? b : a));
      }
    }
  }
  return grid;
}

/** The map as cells at `cols` x `rows` (the map itself at 22 x 9, resampled to any other size). */
export function mapDonut(cols: number, rows: number): Cell[][] {
  const grid = cols === MAP_COLS && rows === MAP_ROWS ? DONUT_MAP_22X9.map((line) => [...line]) : scaledPixels(cols, rows);
  return Array.from({ length: rows }, (_, cy) =>
    Array.from({ length: cols }, (_, cx): Cell => {
      const pixels = [0, 1, 2].flatMap((dy) => [0, 1].map((dx) => grid[cy * 3 + dy]![cx * 2 + dx]!));
      const kinds = [...new Set(pixels)];
      if (kinds.length === 1) return kinds[0] === '.' ? { char: ' ' } : { char: '█', fg: PALETTE[kinds[0]!]! };
      // The block is drawn in the colour that is not the background; with two colours the other one is the cell's background.
      const fg = kinds[0] === '.' ? kinds[1]! : kinds[0]!;
      const bg = kinds.find((k) => k !== fg)!;
      const mask = pixels.reduce((m, p, i) => (p === fg ? m | (1 << i) : m), 0);
      return { char: sextant(mask), fg: PALETTE[fg]!, ...(bg === '.' ? {} : { bg: PALETTE[bg]! }) };
    }),
  );
}
