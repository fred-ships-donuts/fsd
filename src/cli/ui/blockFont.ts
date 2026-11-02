// Block letters for the header (SPEC 6.7). The glyphs are 5 rows tall and 3 or 4 columns wide. A phrase is drawn on a
// half-row grid (two sub-rows per terminal row, like the 🍩), so its top and bottom edges can match the 🍩 exactly.

const GLYPH_HEIGHT = 5;

const PLAIN: Record<string, readonly string[]> = {
  F: ['████', '█   ', '███ ', '█   ', '█   '],
  R: ['███ ', '█  █', '███ ', '█ █ ', '█  █'],
  E: ['████', '█   ', '███ ', '█   ', '████'],
  D: ['███ ', '█  █', '█  █', '█  █', '███ '],
  S: ['████', '█   ', '████', '   █', '████'],
  H: ['█  █', '█  █', '████', '█  █', '█  █'],
  I: ['███', ' █ ', ' █ ', ' █ ', '███'],
  P: ['███ ', '█  █', '███ ', '█   ', '█   '],
  O: [' ██ ', '█  █', '█  █', '█  █', ' ██ '],
  N: ['█  █', '██ █', '█ ██', '█  █', '█  █'],
  U: ['█  █', '█  █', '█  █', '█  █', ' ██ '],
  T: ['████', ' █  ', ' █  ', ' █  ', ' █  '],
};

// Fat letters: every stroke grows one column to the right, so the strokes are twice as thick at the same height.
const embolden = (glyph: readonly string[]): string[] => {
  const width = glyph[0]!.length;
  return glyph.map((row) => {
    const on = (c: number) => c >= 0 && c < width && row[c] !== ' ';
    return Array.from({ length: width + 1 }, (_, c) => (on(c) || on(c - 1) ? '█' : ' ')).join('');
  });
};

const LETTERS: Record<string, readonly string[]> = Object.fromEntries(Object.entries(PLAIN).map(([letter, glyph]) => [letter, embolden(glyph)]));

const LETTER_GAP = 1; // columns between letters of a word
const WORD_GAP = 3; // columns between words

const glyphsOf = (word: string): (readonly string[])[] => [...word.toUpperCase()].map((ch) => LETTERS[ch]).filter((glyph): glyph is readonly string[] => glyph !== undefined);

// Columns of one letter when the phrase is `subRows` sub-rows tall. A sub-row is half a terminal row, so the
// proportions of the glyph are kept by making the width proportional to the height in sub-rows.
// LETTER_STRETCH makes the letters wider than their proportions alone would give.
const LETTER_STRETCH = 1.3;
const letterCols = (glyph: readonly string[], subRows: number): number => Math.max(1, Math.round((glyph[0]!.length * subRows * LETTER_STRETCH) / (2 * GLYPH_HEIGHT)));

// The phrase as a grid of booleans, `subRows` rows tall: true where a letter stroke is.
function phraseMask(words: readonly string[], subRows: number): boolean[][] {
  const wordMasks = words.map((word) =>
    glyphsOf(word).map((glyph) => {
      const cols = letterCols(glyph, subRows);
      const glyphCols = glyph[0]!.length;
      return Array.from({ length: subRows }, (_, row) => {
        const fontRow = glyph[Math.floor((row * GLYPH_HEIGHT) / subRows)]!;
        return Array.from({ length: cols }, (_, col) => fontRow[Math.floor((col * glyphCols) / cols)] === '█');
      });
    }),
  );
  return Array.from({ length: subRows }, (_, row) => {
    const line: boolean[] = [];
    wordMasks.forEach((letters, w) => {
      if (w > 0) line.push(...Array<boolean>(WORD_GAP).fill(false));
      letters.forEach((letter, l) => {
        if (l > 0) line.push(...Array<boolean>(LETTER_GAP).fill(false));
        line.push(...letter[row]!);
      });
    });
    return line;
  });
}

// Width in columns of the phrase when it is `cellRows` terminal rows tall.
export function phraseWidth(words: readonly string[], cellRows: number): number {
  return phraseMask(words, 2 * cellRows)[0]?.length ?? 0;
}

// The phrase on `cellRows` terminal rows. Its strokes start at sub-row `top` and are `subHeight` sub-rows tall, so
// they can line up with the 🍩 at half-row precision. Each terminal row is one of ' ', '▀', '▄' or '█'.
export function phraseRows(words: readonly string[], top: number, subHeight: number, cellRows: number): string[] {
  const mask = phraseMask(words, subHeight);
  const width = mask[0]?.length ?? 0;
  const grid = Array.from({ length: 2 * cellRows }, (_, sub) => {
    const inside = sub - top;
    return inside >= 0 && inside < subHeight ? mask[inside]! : Array<boolean>(width).fill(false);
  });
  return Array.from({ length: cellRows }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const upper = grid[2 * y]![x]!;
      const lower = grid[2 * y + 1]![x]!;
      if (upper && lower) return '█';
      if (upper) return '▀';
      if (lower) return '▄';
      return ' ';
    }).join(''),
  );
}
