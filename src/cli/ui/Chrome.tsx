import { memo, useEffect, useMemo, useState } from 'react';
import { Box, Text } from 'ink';
import { wordArt, wordsWidth } from './wordArt.js';
import { donutArt, type Cell } from './donutArt.js';
import { renderBar } from './progress.js';
import { tint, useTheme } from './theme.js';
import { makeFlakes, snowCells, SNOW_TICK_MS, withFlake } from './snow.js';

const MIN_LOGO_WIDTH = 40;
// The menu's big header: the 🍩 and the name in shadowed letters, FRED / SHIPS / DONUTS one under the other, with no frame
// round it. It is always the 80 x 24 header, whatever the window: the 🍩 of 22 x 9 (the hand-tuned map) and the words of 3 rows
// (the pixel font), nothing is scaled with the window. When the window is too narrow for both, the words are drawn alone; when
// even they do not fit, the 🍩 alone; and when even that does not fit, the one-line header is shown.
const FIXED_DONUT = { cols: 22, rows: 9 } as const;
const FIXED_WORD_ROWS = 3;
const WORDS_GAP = 4; // columns between the words when they are side by side
const HERO_ROOT_PADDING = 2; // the wizard's padding, one column each side
// Rows the header's content leaves out: the padding above it (1), the margin below it (1) and the menu (title 2, three options, footer 3).
const HERO_RESERVED_ROWS = 10;
// Kept for the old layout tests: the header no longer follows a share of the window's height.
export const HERO_MAX_SHARE = 0.35;
/** The most content rows a window of `rows` rows allows within HERO_MAX_SHARE (not used by the header any more). */
export const heroShareRows = (rows: number) => Math.floor(rows * HERO_MAX_SHARE) - 2;
const WORDS = ['FRED', 'SHIPS', 'DONUTS'] as const;
const HERO_MARGIN = 3; // between the 🍩 and the words, at least

export interface HeroLayout {
  frameWidth: number;
  donutRows: number; // 0 when the 🍩 is not drawn
  donutCols: number;
  wordRows: number; // rows of each word, 0 when the words are hidden
  wordsRow: boolean; // the words side by side in one strip instead of stacked (never, in the fixed header)
  contentRows: number; // rows of the header: the taller of the 🍩 and the three words
}

/** Width and height, in cells, of the three words, each `rows` rows tall: stacked, or side by side when `row`. */
export function wordsBlock(rows: number, row = false): { width: number; height: number } {
  if (row) return { width: WORDS.reduce((sum, w) => sum + wordsWidth([w], rows), 0) + WORDS_GAP * (WORDS.length - 1), height: rows };
  return { width: wordsWidth(WORDS, rows), height: WORDS.length * rows };
}

// The header's layout for a window of `columns` x `rows`, or null when it does not fit (see the comment above).
export function heroLayout(columns: number, rows: number): HeroLayout | null {
  const frameWidth = columns - HERO_ROOT_PADDING;
  const hard = rows - HERO_RESERVED_ROWS; // what the menu below leaves
  const block = wordsBlock(FIXED_WORD_ROWS);
  const base = { frameWidth, wordsRow: false };
  if (block.height <= hard && FIXED_DONUT.cols + HERO_MARGIN + block.width <= frameWidth) {
    return { ...base, donutRows: FIXED_DONUT.rows, donutCols: FIXED_DONUT.cols, wordRows: FIXED_WORD_ROWS, contentRows: Math.max(FIXED_DONUT.rows, block.height) };
  }
  if (block.height <= hard && block.width <= frameWidth) return { ...base, donutRows: 0, donutCols: 0, wordRows: FIXED_WORD_ROWS, contentRows: block.height };
  if (FIXED_DONUT.rows <= hard && FIXED_DONUT.cols <= frameWidth) return { ...base, donutRows: FIXED_DONUT.rows, donutCols: FIXED_DONUT.cols, wordRows: 0, contentRows: FIXED_DONUT.rows };
  return null;
}

// Draws the header's pictures ahead of time (they are cached), so the first screen is quick.
export function prepareHero(_columns: number, _rows: number): void {
  donutArt(FIXED_DONUT.cols, FIXED_DONUT.rows);
  for (const word of WORDS) wordArt(word, FIXED_WORD_ROWS);
}

// The header is one size now, so there is nothing to draw ahead for a resize; kept for the caller.
export function warmHero(_rows: number): () => void {
  return () => {};
}

// A picture (the 🍩 or a word) as text: each cell is a quadrant block with its own foreground and background colours.
// Memoised: the picture is redrawn only when its size changes, not on every key press.
const CellArt = memo(function CellArt({ art }: { art: Cell[][] }) {
  return (
    <Box flexDirection="column">
      {art.map((line: Cell[], y) => (
        <Text key={y}>
          {runs(line).map((run, x) => (
            <Text key={x} {...(run.fg ? { color: run.fg } : {})} {...(run.bg ? { backgroundColor: run.bg } : {})}>
              {run.text}
            </Text>
          ))}
        </Text>
      ))}
    </Box>
  );
});

// Neighbouring cells with the same colours are one piece of text: far fewer nodes to lay out and far fewer colour
// codes to send, which is what keeps a redraw quick while the window is being dragged.
function runs(line: Cell[]): { text: string; fg?: string; bg?: string }[] {
  const out: { text: string; fg?: string; bg?: string }[] = [];
  for (const cell of line) {
    const last = out[out.length - 1];
    if (last && last.fg === cell.fg && last.bg === cell.bg) last.text += cell.char;
    else out.push({ text: cell.char, ...(cell.fg ? { fg: cell.fg } : {}), ...(cell.bg ? { bg: cell.bg } : {}) });
  }
  return out;
}

// The big header as one grid of cells: the 🍩 on the left, the three words beside it, and sprinkles falling through what is empty
// (see snow.ts), over the whole header: the empty space, the words and the 🍩. It redraws on a short timer; the pictures are made once and cached.
function HeroCanvas({ layout }: { layout: HeroLayout }) {
  const width = layout.frameWidth + HERO_ROOT_PADDING; // the whole width of the window: no padding, no margin
  const left = HERO_ROOT_PADDING / 2; // the content starts where the window's padding used to end
  const height = layout.contentRows;
  const base = useMemo(() => {
    const grid: Cell[][] = Array.from({ length: height }, () => Array.from({ length: width }, (): Cell => ({ char: ' ' })));
    let x = left;
    if (layout.donutRows > 0) {
      donutArt(layout.donutCols, layout.donutRows).forEach((line, y) => line.forEach((cell, i) => (grid[y]![x + i] = cell)));
      x += layout.donutCols + (layout.wordRows > 0 ? HERO_MARGIN : 0);
    }
    if (layout.wordRows > 0) {
      WORDS.forEach((name, n) => wordArt(name, layout.wordRows).forEach((line, y) => line.forEach((cell, i) => {
        if (grid[n * layout.wordRows + y] && x + i < width) grid[n * layout.wordRows + y]![x + i] = cell;
      })));
    }
    return grid;
  }, [layout.donutRows, layout.donutCols, layout.wordRows, width, height, left]);
  const flakes = useMemo(() => makeFlakes(width, height), [width, height]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), SNOW_TICK_MS);
    return () => clearInterval(timer);
  }, []);
  const snow = snowCells(flakes, tick, width, height);
  return (
    <Box flexDirection="column" width={width} height={height} flexShrink={0} marginBottom={1}>
      {base.map((line, y) => (
        <Text key={y}>
          {runs(line.map((cell, x) => {
            const flake = snow.get(y * width + x);
            if (!flake) return cell;
            return withFlake(cell, flake.mask, flake.colour) ?? cell;
          })).map((run, i) => (
            <Text key={i} {...(run.fg ? { color: run.fg } : {})} {...(run.bg ? { backgroundColor: run.bg } : {})}>
              {run.text}
            </Text>
          ))}
        </Text>
      ))}
    </Box>
  );
}

// `where` is the scope and step shown on step screens. `hero` shows the big 🍩 header (the menu only, with colour);
// everything else gets the one-line header (SPEC 6.7). 
export function Header({ version, where, hero = false, columns, rows = 24 }: { version: string; where?: string; hero?: boolean; columns: number; rows?: number }) {
  const { palette, color } = useTheme();
  const layout = hero && color ? heroLayout(columns, rows) : null;
  if (layout) return <HeroCanvas layout={layout} />;
  const title = `fsd v${version}${where ? `  ·  ${where}` : ''}`;
  if (compactHeader(rows)) {
    return (
      <Box flexShrink={0} paddingX={1}>
        <Text wrap="truncate-end" {...tint(palette.header, color)}>{`🍩 ${title}`}</Text>
      </Box>
    );
  }
  const wide = columns >= MIN_LOGO_WIDTH;
  return (
    <Box flexDirection="column" flexShrink={0} alignSelf="flex-start" marginBottom={1} paddingX={1} maxWidth={columns}>
      {wide && <Text {...tint(palette.header, color)}>🍩 F S D</Text>}
      <Text wrap="truncate-end" {...tint(palette.header, color)}>{title}</Text>
    </Box>
  );
}

// Below this many rows the boxed header (4 rows and a margin) costs too much: it becomes a single line.
const COMPACT_HEADER_BELOW_ROWS = 20;
// Below this many rows the footer drops its progress bar and keeps the hint.
const COMPACT_FOOTER_BELOW_ROWS = 12;
export const compactHeader = (rows: number) => rows < COMPACT_HEADER_BELOW_ROWS;

/** Rows the step screens' header and footer take, so a list can be given what is left (see `listRows`). */
export function chromeRows(rows: number, columns: number): number {
  const header = 1 + (compactHeader(rows) ? 1 : (columns >= MIN_LOGO_WIDTH ? 2 : 1) + 1); // the padding above, then the header
  const footer = rows < COMPACT_FOOTER_BELOW_ROWS ? 1 : 3;
  return header + footer;
}

/** Rows a list may use on a step screen: what the header, the title (two rows) and the footer leave. At least one. */
export const listRows = (rows: number, columns: number) => Math.max(1, rows - chromeRows(rows, columns) - 2);

export function Footer({ fraction, label, hint, rows = 24, columns = 80 }: { fraction: number; label: string; hint: string; rows?: number; columns?: number }) {
  const { palette, symbols, color } = useTheme();
  if (rows < COMPACT_FOOTER_BELOW_ROWS) {
    return (
      <Box flexShrink={0}>
        <Text wrap="truncate-end" {...tint(palette.hint, color)}>{hint}</Text>
      </Box>
    );
  }
  const width = Math.max(4, Math.min(24, columns - label.length - 6)); // the bar gives way to the label on a narrow window
  const filled = renderBar(fraction, width, symbols.barFull, symbols.barEmpty).split('');
  const count = Math.round(Math.max(0, Math.min(1, fraction)) * width);
  return (
    <Box flexDirection="column" flexShrink={0} marginTop={1}>
      <Text wrap="truncate-end">
        <Text {...tint(palette.barFull, color)}>{filled.slice(0, count).join('')}</Text>
        <Text {...tint(palette.barEmpty, color)}>{filled.slice(count).join('')}</Text>
        {'  '}
        {label}
      </Text>
      <Text wrap="truncate-end" {...tint(palette.hint, color)}>{hint}</Text>
    </Box>
  );
}
