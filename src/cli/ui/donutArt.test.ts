import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { donutArt, emojiCols } from './donutArt.js';

const QUADRANTS = /^[ ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█▁▂▃▅▆▇▏▎▍▋▊▉▔▕]$/;

describe('donutArt', () => {
  it('returns the requested number of cells, each a quadrant character', () => {
    const art = donutArt(30, 15);
    assert.equal(art.length, 15);
    for (const row of art) {
      assert.equal(row.length, 30);
      for (const cell of row) assert.match(cell.char, QUADRANTS);
    }
  });

  it('is deterministic for the same size', () => {
    assert.deepEqual(donutArt(24, 12), donutArt(24, 12));
  });

  it('leaves the corners to the terminal and colours the donut itself', () => {
    const art = donutArt(40, 20);
    assert.equal(art[0]![0]!.char, ' ');
    assert.equal(art[19]![39]!.char, ' ');
    const coloured = art.flat().filter((cell) => cell.fg);
    assert.ok(coloured.length > 100, 'the donut has many coloured cells');
    for (const cell of coloured) assert.match(cell.fg!, /^#[0-9a-f]{6}$/);
  });

  it('scales with the requested size', () => {
    const small = donutArt(20, 10).flat().filter((cell) => cell.char !== ' ').length;
    const large = donutArt(60, 30).flat().filter((cell) => cell.char !== ' ').length;
    assert.ok(large > small * 4, 'a donut three times wider covers about nine times the cells');
  });

  it('fits the whole emoji: ink touches all four sides', () => {
    const cols = emojiCols(14);
    const art = donutArt(cols, 14);
    const filled = (cell: { char: string }) => cell.char !== ' ';
    assert.ok(art[0]!.some(filled), 'top row has ink');
    assert.ok(art[13]!.some(filled), 'bottom row has ink');
    assert.ok(art.some((row) => filled(row[0]!)), 'left column has ink');
    assert.ok(art.some((row) => filled(row[cols - 1]!)), 'right column has ink');
  });

  it('keeps the emoji proportions', () => {
    assert.ok(emojiCols(14) >= 33 && emojiCols(14) <= 37);
  });

  it('draws edges with eighth blocks, not only quadrants, and every drawn cell has a foreground', () => {
    const art = donutArt(emojiCols(14), 14).flat();
    assert.ok(art.some((cell) => /[▁▂▃▅▆▇▏▎▍▋▊▉▔]/.test(cell.char)), 'uses eighth blocks');
    for (const cell of art) if (cell.char !== ' ') assert.ok(cell.fg, `cell "${cell.char}" has no foreground`);
  });
});
