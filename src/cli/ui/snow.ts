import { sextant } from './sextant.js';
import type { Cell } from './donutArt.js';

// Sprinkles falling through the header like snow. A flake is a sprinkle, a rod of 3 pixels in one of the 🍩's sprinkle colours; it falls a
// fraction of a cell on every tick (a cell is 3 pixels tall), moves in a way of its own (see Flake), and starts again at the top. Its place is a pure
// function of the tick, so nothing is kept between frames. A flake falls over the whole header, the empty space, the letters and the 🍩; over a
// picture it shows only where the cell can hold it (a cell has two colours at most), so it crosses the solid parts and drops out at the edges.
export const SNOW_TICK_MS = 110;
const COLOURS = ['#f57ba8', '#92c7ed', '#fc5e5b', '#fca8a6', '#fcb702'];

// A sprinkle is a rod 3 pixels long and 2 tall: a slash, a backslash or lying flat, as the 🍩's own. The shapes are the pixels (across, down)
// it takes from its top left corner; a pixel is half a cell wide and a third of a cell tall. Each is the same turned half way round, so
// its two ends are alike (one pixel each, the middle is the thick part).
const SHAPES: readonly (readonly (readonly [number, number])[])[] = [
  [[0, 1], [1, 0], [1, 1], [2, 0]], // slash
  [[0, 0], [1, 0], [1, 1], [2, 1]], // backslash
  [[0, 1], [1, 1], [2, 1]], // lying flat
];

// Every flake has a motion of its own: how fast it falls (and a speed that swells and eases), whether it drifts steadily to one side
// or the other, whether it sways, zigzags or goes straight, and whether it tumbles (turns over as it falls, a slash, flat, a backslash,
// flat...) and which way.
export interface Flake {
  x: number; // the rod's left, in pixels across (2 to a cell), where it starts
  y0: number; // where it starts, in pixels down (3 to a cell)
  speed: number; // pixels per tick
  breath: number; // how much its speed swells and eases (0 to 0.6 of it)
  breathRate: number;
  colour: string;
  shape: number; // where it is in the turn, when it does not tumble: always this one
  drift: number; // pixels per tick to the side (steady), negative to the left
  sway: number; // how far it swings from side to side, in pixels
  swayRate: number;
  zigzag: boolean; // swings in straight legs (a triangle) instead of a curve
  phase: number;
  tumble: number; // ticks it holds a pose before it turns, 0 when it never turns
  turn: 1 | -1; // which way it turns
}

// A small deterministic generator, so the same window always snows the same way.
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const period = (height: number) => height * 3 + 6; // pixels a flake travels before it starts over, with a pause above the top
const POSES = [2, 0, 2, 1] as const; // the turn, as indexes of SHAPES: flat, slash, flat, backslash

export function makeFlakes(width: number, height: number): Flake[] {
  const next = random(width * 31 + height);
  const count = Math.max(6, Math.round((width * height) / 60));
  // One flake to every stretch of the width, at a random place in it, so the snow covers the header from the left edge to the right one.
  return Array.from({ length: count }, (_, i): Flake => {
    const x = Math.floor(((i + next()) * width * 2) / count);
    const kind = next(); // what sort of mover this one is
    return {
      x,
      y0: next() * period(height),
      speed: 0.25 + next() * 0.5,
      breath: next() < 0.5 ? 0 : 0.2 + next() * 0.4,
      breathRate: 0.04 + next() * 0.08,
      colour: COLOURS[i % COLOURS.length]!,
      shape: Math.floor(next() * SHAPES.length),
      drift: kind < 0.35 ? (next() < 0.5 ? -1 : 1) * (0.06 + next() * 0.16) : 0,
      sway: kind >= 0.35 && kind < 0.8 ? 1 + next() * 3 : 0,
      swayRate: 0.04 + next() * 0.1,
      zigzag: next() < 0.4,
      phase: next() * Math.PI * 2,
      tumble: next() < 0.55 ? 5 + Math.floor(next() * 12) : 0,
      turn: next() < 0.5 ? 1 : -1,
    };
  });
}

// A triangle wave, as the sine is: from -1 to 1 and back, `t` a whole turn at 2 pi.
const triangle = (t: number) => (2 / Math.PI) * Math.asin(Math.sin(t));

/** The flakes at `tick`, as a map keyed by row * width + column to the colour and the pixel mask (2 across, 3 down) of the flake in that cell. */
export function snowCells(flakes: readonly Flake[], tick: number, width: number, height: number): Map<number, { mask: number; colour: string }> {
  const cells = new Map<number, { mask: number; colour: string }>();
  const across = width * 2;
  for (const flake of flakes) {
    const fall = flake.speed * tick + flake.speed * flake.breath * 6 * Math.sin(flake.phase + flake.breathRate * tick);
    const top = Math.floor((flake.y0 + fall) % period(height)) - 3;
    const wave = flake.zigzag ? triangle(flake.phase + flake.swayRate * tick) : Math.sin(flake.phase + flake.swayRate * tick);
    const left = (((Math.round(flake.x + flake.drift * tick + flake.sway * wave)) % across) + across) % across; // wraps round the sides
    const pose = flake.tumble > 0 ? POSES[((Math.floor(tick / flake.tumble) * flake.turn + flake.shape) % POSES.length + POSES.length) % POSES.length]! : flake.shape;
    const own = new Map<number, number>();
    for (const [dx, dy] of SHAPES[pose]!) {
      const x = left + dx;
      const y = top + dy;
      if (x < 0 || x >= across || y < 0 || y >= height * 3) continue;
      const key = Math.floor(y / 3) * width + Math.floor(x / 2);
      own.set(key, (own.get(key) ?? 0) | (1 << ((y % 3) * 2 + (x % 2))));
    }
    for (const [key, mask] of own) if (!cells.has(key)) cells.set(key, { mask, colour: flake.colour });
  }
  return cells;
}

// A cell's six pixels (2 across, 3 down, in reading order) as colours, null for the background: only the sextant blocks (and the space) are known.
const MASKS = new Map<string, number>(Array.from({ length: 64 }, (_, mask): [string, number] => [sextant(mask), mask]));

/** The cell with a flake over it, or null when that would take a third colour (a cell is a block and its background, nothing more). */
export function withFlake(cell: Cell, mask: number, colour: string): Cell | null {
  const known = MASKS.get(cell.char);
  if (known === undefined) return null;
  const pixels = Array.from({ length: 6 }, (_, i): string | null => {
    if (mask & (1 << i)) return colour;
    return known & (1 << i) ? cell.fg ?? null : cell.bg ?? null;
  });
  const kinds = [...new Set(pixels)];
  if (kinds.length > 2) return null;
  const only = kinds[0];
  if (kinds.length === 1) return only == null ? { char: ' ' } : { char: '█', fg: only };
  const fg = (kinds[0] ?? kinds[1])!;
  const bg = kinds.find((k) => k !== fg);
  return { char: sextant(pixels.reduce((m, p, i) => (p === fg ? m | (1 << i) : m), 0)), fg, ...(bg == null ? {} : { bg }) };
}
