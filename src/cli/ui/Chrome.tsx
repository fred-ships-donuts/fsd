import { memo, useMemo } from 'react';
import { Box, Text } from 'ink';
import { phraseRows } from './blockFont.js';
import { donutArt, emojiCols, type Cell } from './donutArt.js';
import { renderBar } from './progress.js';
import { tint, useTheme } from './theme.js';

const MIN_LOGO_WIDTH = 40;
// The menu's big header (SPEC 6.7): the 🍩 on the left, the name in block letters on the right, one word per line.
// Fixed for a 112 × 35 terminal: the header spans the full 112 columns and is 14 rows tall. The 🍩 is an ellipse
// that takes the width left after the border, padding, margin and the widest word.
const HERO_WIDTH = 110; // the 112 columns minus the root padding of the wizard
const HERO_DONUT_ROWS = 14;
// Temporary: the lettering is hidden while the 🍩 is being tuned on its own.
const SHOW_WORDS = false;
const WORDS = ['FRED', 'SHIPS', 'DONUTS'];
const WORD_BLOCKS = WORDS.map((word) => phraseRows([word], 0, 10, 5));
const PHRASE_COLUMNS = Math.max(...WORD_BLOCKS.map((block) => block[0]!.length));
const HERO_BORDER_AND_PADDING = 4; // round border (2) and one column of padding each side
const HERO_MARGIN = 3; // between the 🍩 and the words
const HERO_DONUT_COLUMNS = emojiCols(HERO_DONUT_ROWS); // keeps the emoji's own proportions

// The 🍩 as text: each cell is a quadrant block with its own foreground and background colours.
// Memoised: the picture is redrawn only when its size changes, not on every key press.
const Donut = memo(function Donut({ art }: { art: Cell[][] }) {
  return (
    <Box flexDirection="column">
      {art.map((line: Cell[], y) => (
        <Text key={y}>
          {line.map((cell, x) => (
            <Text key={x} {...(cell.fg ? { color: cell.fg } : {})} {...(cell.bg ? { backgroundColor: cell.bg } : {})}>
              {cell.char}
            </Text>
          ))}
        </Text>
      ))}
    </Box>
  );
});

// `where` is the scope and step shown on step screens. `hero` shows the big 🍩 header (the menu only, with colour);
// everything else gets the one-line header (SPEC 6.7). The size does not follow the window.
export function Header({ version, where, hero = false, columns }: { version: string; where?: string; hero?: boolean; columns: number }) {
  const { palette, color } = useTheme();
  const border = color ? { borderColor: palette.header } : {};
  const donutRows = hero && color ? HERO_DONUT_ROWS : 0;
  const art = useMemo(() => (donutRows > 0 ? donutArt(HERO_DONUT_COLUMNS, donutRows) : []), [donutRows]);
  if (donutRows > 0) {
    // Each word is 5 rows of full blocks; the three words stack with a blank row between them, centred beside the 🍩.
    const lines = WORDS.flatMap((word, i) => [...(i > 0 ? [''] : []), ...WORD_BLOCKS[i]!]);
    return (
      <Box flexDirection="row" width={HERO_WIDTH} borderStyle="round" paddingX={1} marginBottom={1} {...border}>
        <Donut art={art} />
        {SHOW_WORDS && (
          <Box flexDirection="column" justifyContent="center" marginLeft={3}>
            {lines.map((row, y) => (
              <Text key={y} bold {...tint(palette.title, color)}>{row}</Text>
            ))}
          </Box>
        )}
      </Box>
    );
  }
  const wide = columns >= MIN_LOGO_WIDTH;
  return (
    <Box flexDirection="column" alignSelf="flex-start" borderStyle="round" paddingX={1} marginBottom={1} {...border}>
      {wide && <Text {...tint(palette.header, color)}>🍩 F S D</Text>}
      <Text {...tint(palette.header, color)}>
        fsd v{version}
        {where ? `  ·  ${where}` : ''}
      </Text>
    </Box>
  );
}

export function Footer({ fraction, label, hint }: { fraction: number; label: string; hint: string }) {
  const { palette, symbols, color } = useTheme();
  const width = 24;
  const filled = renderBar(fraction, width, symbols.barFull, symbols.barEmpty).split('');
  const count = Math.round(Math.max(0, Math.min(1, fraction)) * width);
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text>
        <Text {...tint(palette.barFull, color)}>{filled.slice(0, count).join('')}</Text>
        <Text {...tint(palette.barEmpty, color)}>{filled.slice(count).join('')}</Text>
        {'  '}
        {label}
      </Text>
      <Text {...tint(palette.hint, color)}>{hint}</Text>
    </Box>
  );
}
