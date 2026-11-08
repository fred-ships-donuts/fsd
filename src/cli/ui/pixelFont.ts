import { hex, type Cell, type Rgb } from './donutArt.js';
import { sextant } from './sextant.js';

export { sextant };

// The name at 4 rows tall (SPEC 6.7). The "ANSI Shadow" letters are 6 rows tall and are only sharp at that size; squeezed
// into 4 or 5 rows they turn to mush (strokes of half a cell, letters running into each other). So at 4 rows the letters
// are drawn from a pixel font of their own: each letter is 10 x 7 pixels, with a shadow 2 pixels to the right and 1 down.
// A cell holds 2 x 2 pixels (the quadrant blocks, each with its own colour), so a pixel is half a cell wide and half a
// cell tall: a stroke is 2 pixels wide going down and 1 pixel tall going across, which is the same thickness on screen,
// and the extra width is what lets the curves and the diagonals be curves and diagonals rather than steps of a whole cell.
// The same method at 2 rows tall (the header when it must stay small): a cell is 2 x 3 pixels (the sextant blocks), so
// the two rows are 6 pixels: letters 5 pixels tall and a row of gap that keeps one word from touching the next. There
// is no room for a shadow there (it would weigh as much as the letter).

const BODY: Rgb = [0xf5, 0xb0, 0x3e]; // the 🍩's dough, from its palette (donutMap.ts)
const SHADE: Rgb = [0x6a, 0x62, 0x4e]; // the shadow: dark enough that the letter's body is what the eye reads, not the shadow filling its counters

// The shadow's offset in pixels, right and down. At 2 rows it is 1 pixel (the letters are 5 pixels tall and the sixth row holds the shadow's bottom edge).
const SHADOWS: Record<number, readonly [number, number]> = { 2: [1, 1], 3: [1, 1], 4: [1, 1] };
const GAP_X = 2; // pixels between two letters, a shadow's width or not

type Glyphs = Record<string, readonly string[]>;

// 4 rows: letters 12 x 7 pixels, stems 3 pixels wide, curves and diagonals.
const BIG: Glyphs = {
  D: ['########....', '###....##...', '###.....##..', '###.....##..', '###.....##..', '###....##...', '########....'],
  E: ['############', '###.........', '###.........', '#########...', '###.........', '###.........', '############'],
  F: ['############', '###.........', '###.........', '#########...', '###.........', '###.........', '###.........'],
  H: ['###......###', '###......###', '###......###', '############', '###......###', '###......###', '###......###'],
  I: ['#########', '...###...', '...###...', '...###...', '...###...', '...###...', '#########'],
  N: ['####.....###', '#####....###', '###.##...###', '###..##..###', '###...##.###', '###....#####', '###.....####'],
  O: ['...######...', '..##....##..', '###......###', '###......###', '###......###', '..##....##..', '...######...'],
  P: ['########....', '###....##...', '###....##...', '########....', '###.........', '###.........', '###.........'],
  R: ['########....', '###....##...', '###....##...', '########....', '###..##.....', '###...##....', '###....##...'],
  S: ['..########..', '###......###', '###.........', '..#######...', '.........###', '###......###', '..########..'],
  T: ['#############', '.....###.....', '.....###.....', '.....###.....', '.....###.....', '.....###.....', '.....###.....'],
  U: ['###......###', '###......###', '###......###', '###......###', '###......###', '..##....##..', '...######...'],
};

// 2 rows: letters 13 x 5 pixels (a cell is 2 x 3 pixels here, the sextant blocks), stems 5 pixels wide.
const SMALL: Glyphs = {
  D: ['#########....', '#####...##...', '#####...#####', '#####...##...', '#########....'],
  E: ['#############', '#####........', '########.....', '#####........', '#############'],
  F: ['#############', '#####........', '########.....', '#####........', '#####........'],
  H: ['#####...#####', '#####...#####', '#############', '#####...#####', '#####...#####'],
  I: ['#########', '..#####..', '..#####..', '..#####..', '#########'],
  N: ['######..#####', '#######.#####', '#####.#.#####', '#####.#######', '#####..######'],
  O: ['...#######...', '#####...#####', '#####...#####', '#####...#####', '...#######...'],
  P: ['##########...', '#####...#####', '##########...', '#####........', '#####........'],
  R: ['##########...', '#####...#####', '##########...', '#####..###...', '#####...#####'],
  S: ['...##########', '#####........', '...#######...', '........#####', '##########...'],
  T: ['###########', '...#####...', '...#####...', '...#####...', '...#####...'],
  U: ['#####...#####', '#####...#####', '#####...#####', '#####...#####', '...#######...'],
};

// 3 rows: letters 8 pixels tall (a cell is 2 x 3 pixels here, so the three rows are 9 pixels: the 8 of the letter and the row of its
// shadow and of the gap to the next word). Stems 3 pixels wide and bars 2 tall: a pixel is half a cell wide and a third of a cell tall,
// so that is the same weight across and down.
const MID: Glyphs = {
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

/** Rows (of cells) the pixel fonts are drawn at. */
export const PIXEL_FONT_ROWS = [2, 3, 4] as const;
export const isPixelRows = (rows: number) => (PIXEL_FONT_ROWS as readonly number[]).includes(rows);
const glyphsFor = (rows: number): Glyphs => (rows === 2 ? SMALL : rows === 3 ? MID : BIG);
const pixelsPerRow = (rows: number) => (rows === 4 ? 2 : 3); // pixels tall in a cell: sextants at 2 and 3 rows, quadrants at 4

const advance = (glyphs: Glyphs, ch: string) => (glyphs[ch]?.[0]?.length ?? 0) + GAP_X; // pixels a letter takes: its own and the gap (where its shadow falls)

/** Columns of the word drawn `rows` (2 or 4) rows tall: each letter and its shadow, 2 pixels to a column. */
export function pixelWordCols(word: string, rows: number): number {
  const glyphs = glyphsFor(rows);
  return Math.ceil([...word.toUpperCase()].reduce((sum, ch) => sum + advance(glyphs, ch), 0) / 2);
}

type Pixel = 0 | 1 | 2; // empty, letter, shadow

// The word's pixels: rows * 2 pixel rows. A pixel is the letter's own, else the shadow of the one up and to the left,
// except inside the letter's own counters (the hollow of an O, a D, an R...): there the shadow would only be specks.
function pixelMap(word: string, rows: number): Pixel[][] {
  const glyphs = glyphsFor(rows);
  const width = pixelWordCols(word, rows) * 2;
  const height = rows * pixelsPerRow(rows);
  const body = Array.from({ length: height }, () => new Array<boolean>(width).fill(false));
  const span: [number, number][] = []; // where each letter's own pixels start and end
  let x0 = 0;
  for (const ch of word.toUpperCase()) {
    const glyph = glyphs[ch];
    if (!glyph) continue;
    glyph.forEach((line, y) => [...line].forEach((c, x) => (body[y]![x0 + x] = c === '#')));
    span.push([x0, x0 + glyph[0]!.length - 1]);
    x0 += advance(glyphs, ch);
  }
  // True when the pixel lies between two of its own letter's pixels in the row (so it is inside the letter, not beside it).
  const enclosed = (x: number, y: number) => {
    const [from, to] = span.find(([a, b]) => x >= a && x <= b) ?? [x, x];
    const row = body[y]!;
    return row.slice(from, x).some(Boolean) && row.slice(x + 1, to + 1).some(Boolean);
  };
  const [shadowX, shadowY] = SHADOWS[rows] ?? [0, 0];
  if (shadowX === 0 && shadowY === 0) return body.map((row) => row.map((on): Pixel => (on ? 1 : 0)));
  return body.map((row, y) => row.map((on, x): Pixel => (on ? 1 : body[y - shadowY]?.[x - shadowX] && !enclosed(x, y) ? 2 : 0)));
}

const COLOUR: Record<Pixel, string | undefined> = { 0: undefined, 1: hex(BODY), 2: hex(SHADE) };
// At 2 rows the shadow is a single pixel of a 5-pixel letter: it is drawn fainter, closer to the background, so the letter is what is read.
const SHADE_SMALL: Rgb = [0x87, 0x5b, 0x4f]; // the 🍩's chocolate
const COLOUR_SMALL: Record<Pixel, string | undefined> = { 0: undefined, 1: hex(BODY), 2: hex(SHADE_SMALL) };
// The quadrant block for a set of pixels: bit 1 top left, 2 top right, 4 bottom left, 8 bottom right.
const QUADRANTS = [' ', '▘', '▝', '▀', '▖', '▌', '▞', '▛', '▗', '▚', '▐', '▜', '▄', '▙', '▟', '█'];
// A cell from its pixels (4 for quadrants, 6 for sextants, in reading order): at most two colours can be drawn (the
// block's and its background), so with three (empty, letter and shadow) the one that stands alone takes the nearer of
// the other two (the shadow is between the letter and the empty).
function cell(pixels: Pixel[]): Cell {
  const colours = COLOUR_SMALL; // the shadow is drawn faint at every size: the letter is what is read
  const kinds = [...new Set(pixels)];
  let kept = kinds;
  let use = pixels;
  if (kinds.length === 3) {
    // Empty, letter and shadow in one cell: the letter and the shadow keep their colours and the empty pixels take the shadow's.
    kept = [1, 2];
    use = pixels.map((p): Pixel => (p === 0 ? 2 : p));
  }
  if (kept.length === 1) {
    const only = kept[0]!;
    return only === 0 ? { char: ' ' } : { char: '█', fg: colours[only]! };
  }
  // The block is drawn in the colour that is not empty (a block needs a colour); the other one is its background.
  const [fg, bg] = kept[0] === 0 ? [kept[1]!, kept[0]] : [kept[0]!, kept[1]!];
  const mask = use.reduce<number>((m, p, i) => (p === fg ? m | (1 << i) : m), 0);
  return { char: use.length === 6 ? sextant(mask) : QUADRANTS[mask]!, fg: colours[fg]!, ...(colours[bg] ? { bg: colours[bg]! } : {}) };
}


/** The word as `rows` (2 or 4) rows of cells. */
export function pixelWordArt(word: string, rows: number): Cell[][] {
  const map = pixelMap(word, rows);
  const tall = pixelsPerRow(rows);
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: pixelWordCols(word, rows) }, (_, x) => {
      const pixels: Pixel[] = [];
      for (let dy = 0; dy < tall; dy++) for (let dx = 0; dx < 2; dx++) pixels.push(map[row * tall + dy]![x * 2 + dx]!);
      return cell(pixels);
    }),
  );
}
