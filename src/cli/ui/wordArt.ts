import { GLYPHS, SHADOW_HEIGHT } from './shadowFont.js';
import { fit, hex, SUB, type Cell, type Rgb } from './donutArt.js';
import { isPixelRows, pixelWordArt, pixelWordCols } from './pixelFont.js';

// The lettering at any size (SPEC 6.7). It is always the same "ANSI Shadow" letters: each character is rasterised into
// a PX_W x PX_H bitmap (a block is solid, the box-drawing shadow is drawn as the double lines it stands for), and the
// bitmap is resampled onto the terminal grid with the same method as the 🍩 (8 x 8 samples per cell, drawn with the
// quadrant and eighth blocks), so the shape is kept from a few rows up to a full-screen header.
const PX_W = 8; // pixels per character, across
const PX_H = 16; // and down (a cell is about twice as tall as wide)

const BODY: Rgb = [0xf5, 0xe6, 0xc8]; // light beige
const SHADE: Rgb = [0x9c, 0x90, 0x76]; // the shadow, a darker beige

// The shadow characters are drawn as the dim band the double lines enclose (a thin double line would not survive
// resampling to a few rows): V is the band of the vertical strokes, H the band of the horizontal ones.
const V = [1, 6] as const;
const H = [5, 10] as const;
const inBand = (v: number, [a, b]: readonly [number, number]) => v >= a && v <= b;

// 0 empty, 1 solid, 2 shadow, for pixel (x, y) of a character.
function pixel(ch: string, x: number, y: number): 0 | 1 | 2 {
  if (ch === ' ') return 0;
  if (ch === '█') return 1;
  const h = inBand(y, H);
  const v = inBand(x, V);
  const shade =
    ch === '═' ? h
    : ch === '║' ? v
    : ch === '╔' ? (h && x >= V[0]) || (v && y >= H[0])
    : ch === '╗' ? (h && x <= V[1]) || (v && y >= H[0])
    : ch === '╚' ? (h && x >= V[0]) || (v && y <= H[1])
    : ch === '╝' ? (h && x <= V[1]) || (v && y <= H[1])
    : false;
  return shade ? 2 : 0;
}

// The word as a bitmap: PX_H * SHADOW_HEIGHT rows of PX_W * letters columns.
function bitmap(word: string): (0 | 1 | 2)[][] {
  const glyphs = [...word.toUpperCase()].map((ch) => GLYPHS[ch]).filter((g): g is readonly string[] => g !== undefined);
  const rows: (0 | 1 | 2)[][] = [];
  for (let row = 0; row < SHADOW_HEIGHT; row++) {
    const chars = glyphs.flatMap((g) => [...g[row]!]);
    for (let y = 0; y < PX_H; y++) rows.push(chars.flatMap((ch) => Array.from({ length: PX_W }, (_, x) => pixel(ch, x, y))));
  }
  return rows;
}

// Columns of the word `rows` terminal rows tall: a character is one column by one row at the full 6 rows, and scales with it.
export function wordCols(word: string, rows: number): number {
  if (isPixelRows(rows)) return pixelWordCols(word, rows);
  const letters = [...word.toUpperCase()].filter((ch) => GLYPHS[ch]);
  const chars = letters.reduce((sum, ch) => sum + GLYPHS[ch]![0]!.length, 0);
  return Math.max(1, Math.round((chars * rows) / SHADOW_HEIGHT));
}

export const wordsWidth = (words: readonly string[], rows: number): number => Math.max(...words.map((w) => wordCols(w, rows)));

const COVER = 0.5; // share of a sample that must be ink to count

const cache = new Map<string, Cell[][]>();

// The word at its own size (6 rows), drawn as the characters the "ANSI Shadow" font is made of, exactly as the GSD logo
// has them: the █ blocks in the body colour and the box-drawing shadow (╗ ║ ╝ ═ ╔ ╚) in the shadow colour. Nothing is resampled.
function literalWordArt(word: string): Cell[][] {
  const glyphs = [...word.toUpperCase()].map((ch) => GLYPHS[ch]).filter((g): g is readonly string[] => g !== undefined);
  return Array.from({ length: SHADOW_HEIGHT }, (_, row) =>
    glyphs.flatMap((g) => [...g[row]!]).map((char): Cell => (char === ' ' ? { char } : { char, fg: hex(char === '█' ? BODY : SHADE) })),
  );
}

// The word as `rows` lines of cells.
export function wordArt(word: string, rows: number): Cell[][] {
  if (rows === SHADOW_HEIGHT) return literalWordArt(word); // its own size: the font's characters as they are
  if (isPixelRows(rows)) return pixelWordArt(word, rows); // 2 and 4 rows: the 6-row letters squeezed are mush, so pixel fonts of their own
  const key = `${word}:${rows}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const map = bitmap(word);
  const srcH = map.length;
  const srcW = map[0]?.length ?? 0;
  const cols = wordCols(word, rows);
  const gridW = cols * SUB;
  const gridH = rows * SUB;
  const sample = (gx: number, gy: number): Rgb | null => {
    const x0 = (srcW * gx) / gridW;
    const x1 = (srcW * (gx + 1)) / gridW;
    const y0 = (srcH * gy) / gridH;
    const y1 = (srcH * (gy + 1)) / gridH;
    let total = 0;
    let body = 0;
    let shade = 0;
    for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
      const wy = Math.min(y + 1, y1) - Math.max(y, y0);
      for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
        const w = wy * (Math.min(x + 1, x1) - Math.max(x, x0));
        total += w;
        const p = map[y]?.[x];
        if (p === 1) body += w;
        else if (p === 2) shade += w;
      }
    }
    if (total === 0 || body + shade < COVER * total) return null;
    const mix = (i: number) => Math.round((BODY[i]! * body + SHADE[i]! * shade) / (body + shade));
    return [mix(0), mix(1), mix(2)];
  };
  const art = Array.from({ length: rows }, (_, cy) =>
    Array.from({ length: cols }, (_, cx): Cell =>
      fit(Array.from({ length: SUB * SUB }, (_, i) => sample(cx * SUB + (i % SUB), cy * SUB + Math.floor(i / SUB)))),
    ),
  );
  cache.set(key, art);
  if (cache.size > 96) cache.delete(cache.keys().next().value!);
  return art;
}

export { hex };
