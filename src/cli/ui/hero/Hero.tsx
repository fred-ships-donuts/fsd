import { useEffect, useMemo, useState } from 'react';
import { Box, Text } from 'ink';
import { runs, type Cell, type Picture } from '../art/cell.js';
import { DONUT_COLS, donutArt } from '../art/donut.js';
import { makeFlakes, SNOW_TICK_MS, snowCells, withFlake } from '../art/snow.js';
import { WORD_ROWS, wordArt } from '../art/words.js';
import { HERO_GAP, HERO_SIDE_PADDING, HERO_WORDS, type HeroLayout } from './layout.js';

// The pictures of the header laid out on one grid of cells: the 🍩 on the left, the three words beside it.
function composeHero(layout: HeroLayout): Picture {
  const { width, rows } = layout;
  const grid: Picture = Array.from({ length: rows }, () => Array.from({ length: width }, (): Cell => ({ char: ' ' })));
  let x = HERO_SIDE_PADDING;
  if (layout.donut) {
    donutArt().forEach((line, y) => line.forEach((cell, i) => (grid[y]![x + i] = cell)));
    x += DONUT_COLS + (layout.words ? HERO_GAP : 0);
  }
  if (layout.words) {
    HERO_WORDS.forEach((word, n) =>
      wordArt(word).forEach((line, y) =>
        line.forEach((cell, i) => {
          const row = grid[n * WORD_ROWS + y];
          if (row && x + i < width) row[x + i] = cell;
        }),
      ),
    );
  }
  return grid;
}

// Sprinkles fall through the whole header (art/snow.ts) on a short timer; the pictures under them are composed once.
export function Hero({ layout }: { layout: HeroLayout }) {
  const { width, rows } = layout;
  const base = useMemo(() => composeHero(layout), [layout.donut, layout.words, width, rows]);
  const flakes = useMemo(() => makeFlakes(width, rows), [width, rows]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), SNOW_TICK_MS);
    return () => clearInterval(timer);
  }, []);
  const snow = snowCells(flakes, tick, width, rows);
  return (
    <Box flexDirection="column" width={width} height={rows} flexShrink={0} marginBottom={1}>
      {base.map((line, y) => (
        <Text key={y}>
          {runs(
            line.map((cell, x) => {
              const flake = snow.get(y * width + x);
              return flake ? (withFlake(cell, flake.mask, flake.colour) ?? cell) : cell;
            }),
          ).map((run, i) => (
            <Text key={i} {...(run.fg ? { color: run.fg } : {})} {...(run.bg ? { backgroundColor: run.bg } : {})}>
              {run.text}
            </Text>
          ))}
        </Text>
      ))}
    </Box>
  );
}
