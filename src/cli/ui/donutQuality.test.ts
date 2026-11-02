import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import { donutArt, emojiCols, type Cell } from './donutArt.js';
import { DONUT_SOURCE, DONUT_SOURCE_HEIGHT, DONUT_SOURCE_WIDTH } from './emojiDonut.js';

// Guards the 🍩 against losing definition, proportion or shape, at any size. The picture is compared with the emoji
// itself: both are rendered to the same grid of 8 x 8 samples per cell and compared sample by sample.
// The final version was approved by the author on 2026-11-02 (backup: ~/Backups/fred-ships-donuts-header-FINAL-2026-11-02).

const SUB = 8;
const BACKGROUND = [30, 30, 30];
const LIMIT_SIZES = [6, 8, 10, 12, 14, 18, 22, 28]; // rows with their own, tighter limit
const ALL = Array.from({ length: 36 }, (_, i) => i + 5); // every height from 5 to 40 rows

const QUADRANT = [' ', '▘', '▝', '▀', '▖', '▌', '▞', '▛', '▗', '▚', '▐', '▜', '▄', '▙', '▟', '█'];
const LOWER = '▁▂▃▄▅▆▇';
const LEFT = '▏▎▍▌▋▊▉';

// True where the foreground of `char` shows, at sample (x, y) of the cell's 8 x 8 grid.
function shows(char: string, x: number, y: number): boolean {
  const quadrant = QUADRANT.indexOf(char);
  if (quadrant >= 0) return ((quadrant >> ((y >= SUB / 2 ? 2 : 0) + (x >= SUB / 2 ? 1 : 0))) & 1) === 1;
  const lower = LOWER.indexOf(char);
  if (lower >= 0) return y >= SUB - (lower + 1);
  const left = LEFT.indexOf(char);
  if (left >= 0) return x < left + 1;
  if (char === '▔') return y < 1;
  if (char === '▕') return x >= SUB - 1;
  throw new Error(`unexpected character "${char}"`);
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

interface Picture {
  width: number;
  height: number;
  pixels: number[][]; // width * height, [r, g, b]
  solid: boolean[]; // true where the picture, not the terminal background, shows
}

// What the terminal would show: each cell's glyph filled with its colours, the terminal default being the background.
function render(art: Cell[][]): Picture {
  const width = art[0]!.length * SUB;
  const height = art.length * SUB;
  const pixels: number[][] = new Array(width * height);
  const solid: boolean[] = new Array(width * height);
  art.forEach((line, cy) =>
    line.forEach((cell, cx) => {
      for (let y = 0; y < SUB; y++) {
        for (let x = 0; x < SUB; x++) {
          const colour = cell.char === ' ' ? undefined : shows(cell.char, x, y) ? cell.fg : cell.bg;
          const at = (cy * SUB + y) * width + cx * SUB + x;
          pixels[at] = colour ? rgb(colour) : BACKGROUND;
          solid[at] = colour !== undefined;
        }
      }
    }),
  );
  return { width, height, pixels, solid };
}

const opaque = (x: number, y: number) => DONUT_SOURCE[y]![x * 6] !== '-';
const BOX = (() => {
  let left = DONUT_SOURCE_WIDTH;
  let right = 0;
  let top = DONUT_SOURCE_HEIGHT;
  let bottom = 0;
  for (let y = 0; y < DONUT_SOURCE_HEIGHT; y++) {
    for (let x = 0; x < DONUT_SOURCE_WIDTH; x++) {
      if (!opaque(x, y)) continue;
      left = Math.min(left, x);
      right = Math.max(right, x + 1);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y + 1);
    }
  }
  return { left, right, top, bottom };
})();

// The emoji itself, area-averaged to the same grid (transparent counts as the background; `solid` is half or more opaque).
function reference(width: number, height: number): Picture {
  const pixels: number[][] = new Array(width * height);
  const solid: boolean[] = new Array(width * height);
  for (let ty = 0; ty < height; ty++) {
    for (let tx = 0; tx < width; tx++) {
      const x0 = BOX.left + ((BOX.right - BOX.left) * tx) / width;
      const x1 = BOX.left + ((BOX.right - BOX.left) * (tx + 1)) / width;
      const y0 = BOX.top + ((BOX.bottom - BOX.top) * ty) / height;
      const y1 = BOX.top + ((BOX.bottom - BOX.top) * (ty + 1)) / height;
      let total = 0;
      let covered = 0;
      const sum = [0, 0, 0];
      for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
        const wy = Math.min(y + 1, y1) - Math.max(y, y0);
        for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
          const w = wy * (Math.min(x + 1, x1) - Math.max(x, x0));
          total += w;
          const hex = DONUT_SOURCE[y]!.slice(x * 6, x * 6 + 6);
          const colour = hex === '------' ? BACKGROUND : [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
          if (hex !== '------') covered += w;
          for (let i = 0; i < 3; i++) sum[i]! += colour[i]! * w;
        }
      }
      pixels[ty * width + tx] = sum.map((v) => v / total);
      solid[ty * width + tx] = covered * 2 >= total;
    }
  }
  return { width, height, pixels, solid };
}

// Mean squared colour error against the emoji, and the overlap (intersection over union) of the two silhouettes.
const measured = new Map<string, { error: number; overlap: number }>();
function measure(rows: number, cols = emojiCols(rows)): { error: number; overlap: number } {
  const key = `${rows}x${cols}`;
  const known = measured.get(key);
  if (known) return known;
  const result = measureOnce(rows, cols);
  measured.set(key, result);
  return result;
}

function measureOnce(rows: number, cols: number): { error: number; overlap: number } {
  const art = donutArt(cols, rows);
  const drawn = render(art);
  const truth = reference(drawn.width, drawn.height);
  let error = 0;
  let both = 0;
  let either = 0;
  drawn.pixels.forEach((p, i) => {
    for (let k = 0; k < 3; k++) error += (p[k]! - truth.pixels[i]![k]!) ** 2;
    if (drawn.solid[i] && truth.solid[i]) both++;
    if (drawn.solid[i] || truth.solid[i]) either++;
  });
  return { error: error / (drawn.pixels.length * 3), overlap: both / either };
}

// Worst accepted error and silhouette overlap per size, set from the approved version with about 8% of slack. A fall
// in definition at any size fails here; raise a limit only on purpose, and keep a backup of the approved version.
const LIMITS: Record<number, { error: number; overlap: number }> = {
  6: { error: 870, overlap: 0.93 },
  8: { error: 640, overlap: 0.94 },
  10: { error: 475, overlap: 0.96 },
  12: { error: 375, overlap: 0.965 },
  14: { error: 340, overlap: 0.96 },
  18: { error: 255, overlap: 0.97 },
  22: { error: 190, overlap: 0.975 },
  28: { error: 148, overlap: 0.98 },
};

const artCache = new Map<number, Cell[][]>();
const pictureCache = new Map<number, Picture>();
const artOf = (rows: number): Cell[][] => artCache.get(rows) ?? (artCache.set(rows, donutArt(emojiCols(rows), rows)), artCache.get(rows)!);
const pictureOf = (rows: number): Picture =>
  pictureCache.get(rows) ?? (pictureCache.set(rows, render(artOf(rows))), pictureCache.get(rows)!);

const extent = (picture: Picture) => {
  let left = picture.width;
  let right = -1;
  let top = picture.height;
  let bottom = -1;
  picture.solid.forEach((on, i) => {
    if (!on) return;
    const x = i % picture.width;
    const y = Math.floor(i / picture.width);
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  });
  return { left, right, top, bottom };
};

describe('donut definition, at every size', () => {
  for (const rows of LIMIT_SIZES) {
    it(`${rows} rows: stays close to the emoji (colour error and silhouette overlap)`, () => {
      const { error, overlap } = measure(rows);
      assert.ok(error <= LIMITS[rows]!.error, `colour error ${error.toFixed(1)} is above ${LIMITS[rows]!.error}`);
      assert.ok(overlap >= LIMITS[rows]!.overlap, `silhouette overlap ${overlap.toFixed(3)} is below ${LIMITS[rows]!.overlap}`);
    });
  }

  it('is clearly sharper than 2 x 2 quadrants would be (14 rows: error under 340, quadrants gave 560)', () => {
    assert.ok(measure(14).error < 340);
  });

  it('draws edges with eighth blocks from 8 rows up', () => {
    for (const rows of ALL.filter((r) => r >= 8)) {
      const chars = artOf(rows).flat().map((cell) => cell.char);
      assert.ok(chars.some((char) => /[▁▂▃▅▆▇▏▎▍▋▊▉▔]/.test(char)), `${rows} rows has no eighth blocks`);
    }
  });

  it('keeps the average colour of the emoji (within 6 per channel)', () => {
    for (const rows of ALL) {
      const drawn = pictureOf(rows);
      const truth = reference(drawn.width, drawn.height);
      const mean = (picture: Picture) =>
        [0, 1, 2].map((k) => {
          let sum = 0;
          let count = 0;
          picture.solid.forEach((on, i) => {
            if (!on) return;
            sum += picture.pixels[i]![k]!;
            count++;
          });
          return sum / count;
        });
      const a = mean(drawn);
      const b = mean(truth);
      for (let k = 0; k < 3; k++) assert.ok(Math.abs(a[k]! - b[k]!) <= 6, `${rows} rows: channel ${k} is ${a[k]!.toFixed(1)}, the emoji's is ${b[k]!.toFixed(1)}`);
    }
  });

  it('keeps the chocolate on top and the golden side below', () => {
    for (const rows of ALL.filter((r) => r >= 10)) {
      const drawn = pictureOf(rows);
      const bottom = drawn.pixels.slice((drawn.height - SUB) * drawn.width).filter((_, i) => drawn.solid[(drawn.height - SUB) * drawn.width + i]);
      const top = drawn.pixels.slice(drawn.width * SUB, drawn.width * SUB * 2).filter((_, i) => drawn.solid[drawn.width * SUB + i]);
      const mean = (list: number[][], k: number) => list.reduce((sum, p) => sum + p[k]!, 0) / list.length;
      assert.ok(bottom.length > 0 && mean(bottom, 0) > 170 && mean(bottom, 2) < 110, `${rows} rows: the bottom is not golden`);
      assert.ok(top.length > 0 && mean(top, 0) > 100 && mean(top, 0) < 170 && mean(top, 2) < 120, `${rows} rows: the top is not chocolate`);
    }
  });

  it('keeps the hole in the middle (transparent, surrounded by the donut) from 10 rows up', () => {
    for (const rows of ALL.filter((r) => r >= 10)) {
      const picture = pictureOf(rows);
      const { width, height } = picture;
      const at = (x: number, y: number) => picture.solid[y * width + x]!;
      let found = false;
      for (let y = Math.floor(height * 0.25); y < Math.floor(height * 0.75) && !found; y++) {
        for (let x = Math.floor(width * 0.25); x < Math.floor(width * 0.75) && !found; x++) {
          if (at(x, y)) continue;
          let left = false;
          let right = false;
          let up = false;
          let down = false;
          for (let d = 1; d < width; d++) {
            left ||= x - d >= 0 && at(x - d, y);
            right ||= x + d < width && at(x + d, y);
          }
          for (let d = 1; d < height; d++) {
            up ||= y - d >= 0 && at(x, y - d);
            down ||= y + d < height && at(x, y + d);
          }
          found = left && right && up && down;
        }
      }
      assert.ok(found, `${rows} rows: no hole`);
    }
  });
});

describe('donut proportion and shape, at every size', () => {
  it('keeps the emoji proportions: columns follow the rows by the emoji box', () => {
    const ratio = (BOX.right - BOX.left) / (BOX.bottom - BOX.top);
    for (const rows of ALL) {
      assert.equal(emojiCols(rows), Math.round(rows * ratio), `${rows} rows`);
      assert.ok(Math.abs(emojiCols(rows) / rows / ratio - 1) <= 0.06, `${rows} rows: proportion drifted`);
    }
  });

  it('grows in step with its height and is 35 columns by 14 rows in the header', () => {
    for (let i = 1; i < ALL.length; i++) assert.ok(emojiCols(ALL[i]!) > emojiCols(ALL[i - 1]!));
    assert.equal(emojiCols(14), 35);
  });

  it('returns exactly rows x columns cells', () => {
    for (const rows of ALL) {
      const art = artOf(rows);
      assert.equal(art.length, rows);
      for (const line of art) assert.equal(line.length, emojiCols(rows));
    }
  });

  it('is not cropped: the picture reaches all four edges of its grid', () => {
    for (const rows of ALL) {
      const picture = pictureOf(rows);
      const { left, right, top, bottom } = extent(picture);
      assert.ok(left <= picture.width * 0.02, `${rows} rows: the left side is trimmed (starts at ${left})`);
      assert.ok(right >= picture.width * 0.98 - 1, `${rows} rows: the right side is trimmed (ends at ${right})`);
      assert.ok(top <= picture.height * 0.02, `${rows} rows: the top is trimmed (starts at ${top})`);
      assert.ok(bottom >= picture.height * 0.98 - 1, `${rows} rows: the bottom is trimmed (ends at ${bottom})`);
    }
  });

  it('has the emoji silhouette, not an ellipse: a sprinkle sticks out at the top, the sides are near-vertical walls', () => {
    for (const rows of ALL.filter((r) => r >= 10)) {
      const picture = pictureOf(rows);
      const widthAt = (y: number) => {
        let n = 0;
        for (let x = 0; x < picture.width; x++) if (picture.solid[y * picture.width + x]) n++;
        return n;
      };
      assert.ok(widthAt(0) < picture.width * 0.35, `${rows} rows: the very top should be the narrow sprinkle`);
      assert.ok(widthAt(Math.floor(picture.height * 0.55)) > picture.width * 0.93, `${rows} rows: the body should be nearly full width`);
    }
  });

  it('has no stray cells: every drawn cell touches another one', () => {
    for (const rows of ALL) {
      const art = artOf(rows);
      art.forEach((line, y) =>
        line.forEach((cell, x) => {
          if (cell.char === ' ') return;
          const near = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => art[y + dy]?.[x + dx])).filter((c) => c && c !== cell && c.char !== ' ');
          assert.ok(near.length > 0, `${rows} rows: cell ${x},${y} is alone`);
        }),
      );
    }
  });

  it('draws every cell with a foreground colour and only known block characters', () => {
    const allowed = new Set([...QUADRANT, ...LOWER, ...LEFT, '▔', '▕']);
    for (const rows of ALL) {
      for (const cell of artOf(rows).flat()) {
        assert.ok(allowed.has(cell.char), `unexpected character "${cell.char}"`);
        if (cell.char !== ' ') assert.match(cell.fg ?? '', /^#[0-9a-f]{6}$/);
        if (cell.bg !== undefined) assert.match(cell.bg, /^#[0-9a-f]{6}$/);
      }
    }
  });

  it('is deterministic and does not depend on earlier calls', () => {
    const first = JSON.stringify(donutArt(35, 14));
    donutArt(70, 28);
    donutArt(15, 6);
    assert.equal(JSON.stringify(donutArt(35, 14)), first);
  });
});

describe('donut approved version', () => {
  // A fingerprint of the approved 35 x 14 picture. If this fails, the picture changed: compare it with the backup in
  // ~/Backups/fred-ships-donuts-header-FINAL-2026-11-02 and, only if the change is wanted, update the fingerprint.
  it('has not changed (35 x 14)', () => {
    const fingerprint = createHash('sha256').update(JSON.stringify(donutArt(35, 14))).digest('hex');
    assert.equal(fingerprint, '21958c2748c1c56680e79ac494fa6deeb06af8b853b00e5904ebdecd36fe28c5');
  });
});

// How the quality is allowed to fall with size: smoothly, along one curve, with no dip at any single height.
const errorBound = (rows: number) => 7200 / rows ** 1.15;
const overlapFloor = (rows: number) => Math.min(0.98, 0.912 + 0.003 * rows);

describe('donut definition, granular: every height from 5 to 40 rows', () => {
  it('stays under one smooth error curve at every height', () => {
    for (const rows of ALL) {
      const { error } = measure(rows);
      assert.ok(error <= errorBound(rows), `${rows} rows: error ${error.toFixed(1)} is above the curve ${errorBound(rows).toFixed(1)}`);
    }
  });

  it('keeps the silhouette overlap above its floor at every height', () => {
    for (const rows of ALL) {
      const { overlap } = measure(rows);
      assert.ok(overlap >= overlapFloor(rows), `${rows} rows: overlap ${overlap.toFixed(4)} is below ${overlapFloor(rows).toFixed(4)}`);
    }
  });

  it('has no dip: one more row never makes the error more than 10% worse (up to 36 rows)', () => {
    let before = measure(5).error;
    for (let rows = 6; rows <= 36; rows++) {
      const { error } = measure(rows);
      assert.ok(error <= before * 1.1, `${rows} rows: error ${error.toFixed(1)} jumped from ${before.toFixed(1)}`);
      before = error;
    }
  });
});

describe('donut definition, granular: widths other than the emoji proportion', () => {
  // The picture may be stretched or squeezed by a caller; it must keep its shape and its definition anyway.
  const FACTORS = [0.5, 0.6, 0.7, 0.85, 1, 1.15, 1.3, 1.5, 1.75, 2];
  for (const rows of [8, 10, 14, 18, 24]) {
    it(`${rows} rows, widths from half to double: sharp, whole, nothing cropped or stray`, () => {
      for (const factor of FACTORS) {
        const cols = Math.max(4, Math.round(emojiCols(rows) * factor));
        const { error, overlap } = measure(rows, cols);
        assert.ok(error <= errorBound(rows) * 1.6, `${rows}x${cols}: error ${error.toFixed(1)} is too high`);
        assert.ok(overlap >= overlapFloor(rows) - 0.02, `${rows}x${cols}: overlap ${overlap.toFixed(4)} is too low`);
        const art = donutArt(cols, rows);
        assert.equal(art.length, rows);
        for (const line of art) assert.equal(line.length, cols);
        const picture = render(art);
        const { left, right, top, bottom } = extent(picture);
        assert.ok(left <= picture.width * 0.03 && right >= picture.width * 0.97 - 1, `${rows}x${cols}: trimmed at the sides`);
        assert.ok(top <= picture.height * 0.03 && bottom >= picture.height * 0.97 - 1, `${rows}x${cols}: trimmed at the top or bottom`);
        art.forEach((line, y) =>
          line.forEach((cell, x) => {
            if (cell.char === ' ') return;
            const near = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => art[y + dy]?.[x + dx])).filter((c) => c && c !== cell && c.char !== ' ');
            assert.ok(near.length > 0, `${rows}x${cols}: cell ${x},${y} is alone`);
          }),
        );
      }
    });
  }
});
