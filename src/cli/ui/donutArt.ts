import { DONUT_SOURCE, DONUT_SOURCE_HEIGHT, DONUT_SOURCE_WIDTH } from './emojiDonut.js';

// One character cell: a block character, its foreground and its background (undefined = terminal default).
export interface Cell {
  char: string;
  fg?: string;
  bg?: string;
}

type Rgb = readonly [number, number, number];

// Each cell is looked at as an 8 x 8 grid of samples, and drawn with the block character (and two colours) that fits
// those samples best. Beyond the 2 x 2 quadrants, the lower and left eighths put an edge at any of 8 positions, which
// is what gives the picture its definition at a size where a cell is only a few pixels.
const SUB = 8;

interface Glyph {
  char: string;
  mask: boolean[]; // SUB * SUB, true where the foreground shows
}

const QUADRANT = [' ', '▘', '▝', '▀', '▖', '▌', '▞', '▛', '▗', '▚', '▐', '▜', '▄', '▙', '▟', '█']; // bit 0 TL, 1 TR, 2 BL, 3 BR
const LOWER = ['▁', '▂', '▃', '▄', '▅', '▆', '▇']; // 1..7 eighths from the bottom
const LEFT = ['▏', '▎', '▍', '▌', '▋', '▊', '▉']; // 1..7 eighths from the left

const shape = (inside: (x: number, y: number) => boolean): boolean[] =>
  Array.from({ length: SUB * SUB }, (_, i) => inside(i % SUB, Math.floor(i / SUB)));

const GLYPHS: Glyph[] = [
  ...QUADRANT.slice(1).map((char, i): Glyph => {
    const mask = i + 1;
    return { char, mask: shape((x, y) => ((mask >> ((y >= SUB / 2 ? 2 : 0) + (x >= SUB / 2 ? 1 : 0))) & 1) === 1) };
  }),
  ...LOWER.flatMap((char, i): Glyph[] => (i === 3 ? [] : [{ char, mask: shape((_, y) => y >= SUB - (i + 1)) }])),
  ...LEFT.flatMap((char, i): Glyph[] => (i === 3 || i === 0 ? [] : [{ char, mask: shape((x) => x < i + 1) }])),
  { char: '▔', mask: shape((_, y) => y < 1) },
];

const decoded: (Rgb | null)[][] = DONUT_SOURCE.map((row) =>
  Array.from({ length: DONUT_SOURCE_WIDTH }, (_, x) => {
    const hex = row.slice(x * 6, x * 6 + 6);
    if (hex === '------') return null;
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)] as const;
  }),
);

// The opaque part of the source: its bounding box. The 🍩 is fitted to the grid by this box, so nothing is cropped and
// no outline is imposed; the silhouette is the emoji's own (a chocolate top, a golden side, a sprinkle at the rim).
const BOX = (() => {
  let left = DONUT_SOURCE_WIDTH;
  let right = 0;
  let top = DONUT_SOURCE_HEIGHT;
  let bottom = 0;
  decoded.forEach((line, y) =>
    line.forEach((p, x) => {
      if (!p) return;
      left = Math.min(left, x);
      right = Math.max(right, x + 1);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y + 1);
    }),
  );
  return { left, right, top, bottom };
})();

// Columns for a 🍩 `rows` terminal rows tall that keeps the emoji's own proportions (about 1.24 : 1 once a cell is twice
// as tall as wide).
export function emojiCols(rows: number): number {
  return Math.round((rows * (BOX.right - BOX.left)) / (BOX.bottom - BOX.top));
}

const hex = (rgb: Rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

// Area average of the source over [x0, x1) x [y0, y1) (fractional); null when under OPAQUE_SHARE of it is opaque.
const OPAQUE_SHARE = 0.7;
function sample(x0: number, x1: number, y0: number, y1: number): Rgb | null {
  let total = 0;
  let solid = 0;
  const sum = [0, 0, 0];
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
    const wy = Math.min(y + 1, y1) - Math.max(y, y0);
    for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
      const w = wy * (Math.min(x + 1, x1) - Math.max(x, x0));
      total += w;
      const p = decoded[y]?.[x];
      if (!p) continue;
      solid += w;
      for (let i = 0; i < 3; i++) sum[i]! += p[i]! * w;
    }
  }
  if (total === 0 || solid < OPAQUE_SHARE * total) return null;
  return [Math.round(sum[0]! / solid), Math.round(sum[1]! / solid), Math.round(sum[2]! / solid)];
}

// Cost of showing a colour where the picture is transparent, or of losing a colour the picture has. About the squared
// distance between the chocolate and a dark terminal.
const MISMATCH = 15000;

function mean(points: Rgb[]): Rgb {
  return [0, 1, 2].map((i) => Math.round(points.reduce((sum, p) => sum + p[i]!, 0) / points.length)) as unknown as Rgb;
}

function spread(points: Rgb[]): number {
  if (points.length === 0) return 0;
  const centre = mean(points);
  return points.reduce((sum, p) => sum + [0, 1, 2].reduce((s, i) => s + (p[i]! - centre[i]!) ** 2, 0), 0);
}

// The best block character and colours for one cell's 8 x 8 samples.
function fit(samples: (Rgb | null)[]): Cell {
  if (samples.every((p) => p === null)) return { char: ' ' };
  let best: { cost: number; cell: Cell } | undefined;
  for (const { char, mask } of GLYPHS) {
    const front: Rgb[] = [];
    const back: Rgb[] = [];
    let frontClear = 0;
    let backClear = 0;
    samples.forEach((p, i) => {
      if (mask[i]) p ? front.push(p) : frontClear++;
      else p ? back.push(p) : backClear++;
    });
    // The foreground cannot be left to the terminal, so it must hold something.
    if (front.length === 0) continue;
    const backColoured = back.length > 0 && back.length >= backClear;
    const cost =
      spread(front) + frontClear * MISMATCH + (backColoured ? spread(back) + backClear * MISMATCH : back.length * MISMATCH);
    if (!best || cost < best.cost) {
      const cell: Cell = { char, fg: hex(mean(front)) };
      if (backColoured) cell.bg = hex(mean(back));
      best = { cost, cell };
    }
  }
  // A cell whose samples are all solid is cheapest as the full block when nothing splits it.
  const solid = samples.every((p) => p !== null);
  if (solid) {
    const all = samples as Rgb[];
    if (!best || spread(all) <= best.cost) return { char: '█', fg: hex(mean(all)) };
  }
  return best?.cell ?? { char: ' ' };
}

// The 🍩 as `rows` lines of `cols` cells (use emojiCols for the emoji's proportions).
export function donutArt(cols: number, rows: number): Cell[][] {
  const width = BOX.right - BOX.left;
  const height = BOX.bottom - BOX.top;
  const gridW = cols * SUB;
  const gridH = rows * SUB;
  const art = Array.from({ length: rows }, (_, cy) =>
    Array.from({ length: cols }, (_, cx): Cell => {
      const samples = Array.from({ length: SUB * SUB }, (_, i) => {
        const gx = cx * SUB + (i % SUB);
        const gy = cy * SUB + Math.floor(i / SUB);
        return sample(
          BOX.left + (width * gx) / gridW,
          BOX.left + (width * (gx + 1)) / gridW,
          BOX.top + (height * gy) / gridH,
          BOX.top + (height * (gy + 1)) / gridH,
        );
      });
      return fit(samples);
    }),
  );
  // A one-eighth sliver with nothing above or below it is a stray speck, not part of the outline.
  art.forEach((line, y) =>
    line.forEach((cell, x) => {
      if ((cell.char === '▏' || cell.char === '▕') && art[y - 1]?.[x]?.char.trim() !== undefined && !art[y - 1]![x]!.char.trim() && !(art[y + 1]?.[x]?.char.trim())) {
        line[x] = { char: ' ' };
      }
    }),
  );
  return art;
}
