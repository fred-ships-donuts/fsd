import type { Cell, Picture } from './cell.js';
import { sextant } from './sextant.js';

// The 🍩 of the header (SPEC 6.12): 22 columns by 9 rows, drawn pixel by pixel by hand. A pixel is one sextant block (2 x 3
// to a cell), so the map is 44 x 27; each letter is a colour of the palette, a dot is the terminal's own background. A cell
// holds at most two colours (the block and its background), so every 2 x 3 group of the map uses at most two of them.
export const DONUT_COLS = 22;
export const DONUT_ROWS = 9;

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

// One cell from its six pixels (2 across, 3 down, in reading order).
function cellOf(pixels: string[]): Cell {
  const kinds = [...new Set(pixels)];
  if (kinds.length === 1) return kinds[0] === '.' ? { char: ' ' } : { char: '█', fg: PALETTE[kinds[0]!]! };
  // The block is drawn in the colour that is not the background; with two colours the other one is the cell's background.
  const fg = kinds[0] === '.' ? kinds[1]! : kinds[0]!;
  const bg = kinds.find((k) => k !== fg)!;
  const mask = pixels.reduce((m, p, i) => (p === fg ? m | (1 << i) : m), 0);
  return { char: sextant(mask), fg: PALETTE[fg]!, ...(bg === '.' ? {} : { bg: PALETTE[bg]! }) };
}

function draw(): Picture {
  return Array.from({ length: DONUT_ROWS }, (_, cy) =>
    Array.from({ length: DONUT_COLS }, (_, cx) => cellOf([0, 1, 2].flatMap((dy) => [0, 1].map((dx) => DONUT_MAP_22X9[cy * 3 + dy]![cx * 2 + dx]!)))),
  );
}

let picture: Picture | undefined;

/** The 🍩 as DONUT_ROWS lines of DONUT_COLS cells (drawn once). */
export function donutArt(): Picture {
  return (picture ??= draw());
}
