import { hex, type Cell, type Picture, type Rgb } from './cell.js';
import { sextant } from './sextant.js';

// The name of the header (SPEC 6.12), FRED / SHIPS / DONUTS, in a pixel font of its own, 3 rows tall. A cell is 2 x 3 pixels (the
// sextant blocks), so the three rows are 9 pixels: the 8 of the letter and the row of its shadow and of the gap to the next word.
// Stems are 3 pixels wide and bars 2 tall: a pixel is half a cell wide and a third of a cell tall, so that is the same weight
// across and down. Each letter has a shadow 1 pixel to the right and 1 down.
export const WORD_ROWS = 3;

const PIXELS_DOWN = 3; // pixels in a cell, down
const PIXELS_ACROSS = 2; // and across
const SHADOW: readonly [number, number] = [1, 1]; // the shadow's offset in pixels, right and down
const GAP_X = 2; // pixels between two letters (where the shadow falls)

const BODY: Rgb = [0xf5, 0xb0, 0x3e]; // the 🍩's dough (art/donut.ts)
const SHADE: Rgb = [0x87, 0x5b, 0x4f]; // the 🍩's chocolate: the shadow is drawn faint, so the letter is what is read

const GLYPHS: Record<string, readonly string[]> = {
  D: ['########..', '#########.', '###...####', '###....###', '###....###', '###...####', '#########.', '########..'],
  E: ['##########', '##########', '###.......', '#######...', '#######...', '###.......', '##########', '##########'],
  F: ['##########', '##########', '###.......', '#######...', '#######...', '###.......', '###.......', '###.......'],
  H: ['###....###', '###....###', '###....###', '##########', '##########', '###....###', '###....###', '###....###'],
  I: ['#######', '#######', '..###..', '..###..', '..###..', '..###..', '#######', '#######'],
  N: ['#####..###', '#####..###', '###.##.###', '###.##.###', '###.##.###', '###..#####', '###..#####', '###..#####'],
  O: ['..######..', '.########.', '###....###', '###....###', '###....###', '###....###', '.########.', '..######..'],
  P: ['########..', '#########.', '###...####', '###...####', '#########.', '########..', '###.......', '###.......'],
  R: ['########..', '#########.', '###...####', '###...####', '#########.', '########..', '###..####.', '###...####'],
  S: ['.#########', '##########', '###.......', '.#######..', '..#######.', '.......###', '##########', '#########.'],
  T: ['###########', '###########', '....###....', '....###....', '....###....', '....###....', '....###....', '....###....'],
  U: ['###....###', '###....###', '###....###', '###....###', '###....###', '###....###', '.########.', '..######..'],
};

type Pixel = 0 | 1 | 2; // empty, letter, shadow

const COLOUR: Record<Pixel, string | undefined> = { 0: undefined, 1: hex(BODY), 2: hex(SHADE) };

const advance = (ch: string) => (GLYPHS[ch]?.[0]?.length ?? 0) + GAP_X; // pixels a letter takes: its own and the gap

/** Columns of the word: each letter and its shadow, 2 pixels to a column. */
export function wordCols(word: string): number {
  return Math.ceil([...word.toUpperCase()].reduce((sum, ch) => sum + advance(ch), 0) / PIXELS_ACROSS);
}

// The word's pixels. A pixel is the letter's own, else the shadow of the one up and to the left, except inside the letter's own
// counters (the hollow of an O, a D, an R...): there the shadow would only be specks.
function pixelMap(word: string): Pixel[][] {
  const width = wordCols(word) * PIXELS_ACROSS;
  const height = WORD_ROWS * PIXELS_DOWN;
  const body = Array.from({ length: height }, () => new Array<boolean>(width).fill(false));
  const span: [number, number][] = []; // where each letter's own pixels start and end
  let x0 = 0;
  for (const ch of word.toUpperCase()) {
    const glyph = GLYPHS[ch];
    if (!glyph) continue;
    glyph.forEach((line, y) => [...line].forEach((c, x) => (body[y]![x0 + x] = c === '#')));
    span.push([x0, x0 + glyph[0]!.length - 1]);
    x0 += advance(ch);
  }
  // True when the pixel lies between two of its own letter's pixels in the row (so it is inside the letter, not beside it).
  const enclosed = (x: number, y: number) => {
    const [from, to] = span.find(([a, b]) => x >= a && x <= b) ?? [x, x];
    const row = body[y]!;
    return row.slice(from, x).some(Boolean) && row.slice(x + 1, to + 1).some(Boolean);
  };
  const [shadowX, shadowY] = SHADOW;
  return body.map((row, y) => row.map((on, x): Pixel => (on ? 1 : body[y - shadowY]?.[x - shadowX] && !enclosed(x, y) ? 2 : 0)));
}

// A cell from its six pixels (in reading order). At most two colours can be drawn (the block's and its background), so with three
// (empty, letter and shadow) the empty pixels take the shadow's colour.
function cellOf(pixels: Pixel[]): Cell {
  const kinds = [...new Set(pixels)];
  let kept = kinds;
  let use = pixels;
  if (kinds.length === 3) {
    kept = [1, 2];
    use = pixels.map((p): Pixel => (p === 0 ? 2 : p));
  }
  if (kept.length === 1) {
    const only = kept[0]!;
    return only === 0 ? { char: ' ' } : { char: '█', fg: COLOUR[only]! };
  }
  // The block is drawn in the colour that is not empty (a block needs a colour); the other one is its background.
  const [fg, bg] = kept[0] === 0 ? [kept[1]!, kept[0]] : [kept[0]!, kept[1]!];
  const mask = use.reduce<number>((m, p, i) => (p === fg ? m | (1 << i) : m), 0);
  return { char: sextant(mask), fg: COLOUR[fg]!, ...(COLOUR[bg] ? { bg: COLOUR[bg]! } : {}) };
}

/** The word as WORD_ROWS rows of cells. */
export function wordArt(word: string): Picture {
  const map = pixelMap(word);
  return Array.from({ length: WORD_ROWS }, (_, row) =>
    Array.from({ length: wordCols(word) }, (_, x) => {
      const pixels: Pixel[] = [];
      for (let dy = 0; dy < PIXELS_DOWN; dy++) for (let dx = 0; dx < PIXELS_ACROSS; dx++) pixels.push(map[row * PIXELS_DOWN + dy]![x * PIXELS_ACROSS + dx]!);
      return cellOf(pixels);
    }),
  );
}
