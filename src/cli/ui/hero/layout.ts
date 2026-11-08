import { DONUT_COLS, DONUT_ROWS } from '../art/donut.js';
import { WORD_ROWS, wordCols } from '../art/words.js';

// The menu's big header (SPEC 6.12): the 🍩 and the name, FRED / SHIPS / DONUTS one under the other, with no frame round it. It is
// always the 80 x 24 header, whatever the window: nothing is scaled. When the window is too narrow for both, the words are drawn
// alone; when even they do not fit, the 🍩 alone; and when even that does not fit, the one-line header is shown (null).

export const HERO_WORDS = ['FRED', 'SHIPS', 'DONUTS'] as const;
export const HERO_SIDE_PADDING = 1; // the content starts one column in, like the rest of the wizard
export const HERO_GAP = 3; // columns between the 🍩 and the words
// Rows the header leaves to the rest of the menu: the padding above it (1), the margin below it (1) and the menu (title 2,
// three options, footer 3).
const RESERVED_ROWS = 10;

export interface HeroLayout {
  width: number; // the whole width of the window: the sprinkles fall edge to edge
  rows: number; // the taller of the 🍩 and the three words
  donut: boolean;
  words: boolean;
}

const WORDS_WIDTH = Math.max(...HERO_WORDS.map((word) => wordCols(word)));
const WORDS_HEIGHT = HERO_WORDS.length * WORD_ROWS;

export function heroLayout(columns: number, rows: number): HeroLayout | null {
  const room = columns - 2 * HERO_SIDE_PADDING;
  const free = rows - RESERVED_ROWS;
  const wordsFit = WORDS_HEIGHT <= free;
  if (wordsFit && DONUT_COLS + HERO_GAP + WORDS_WIDTH <= room) return { width: columns, rows: Math.max(DONUT_ROWS, WORDS_HEIGHT), donut: true, words: true };
  if (wordsFit && WORDS_WIDTH <= room) return { width: columns, rows: WORDS_HEIGHT, donut: false, words: true };
  if (DONUT_ROWS <= free && DONUT_COLS <= room) return { width: columns, rows: DONUT_ROWS, donut: true, words: false };
  return null;
}
