import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { phraseRows, phraseWidth } from './blockFont.js';

const WORDS = ['FRED', 'SHIPS', 'DONUTS'];

describe('phraseRows', () => {
  it('gives one line per terminal row, all the same width, using only the half-block characters', () => {
    for (const cellRows of [5, 8, 14]) {
      const rows = phraseRows(WORDS, 0, 2 * cellRows, cellRows);
      assert.equal(rows.length, cellRows);
      assert.equal(new Set(rows.map((row) => row.length)).size, 1, `${cellRows} rows`);
      assert.equal(rows[0]!.length, phraseWidth(WORDS, cellRows));
      for (const row of rows) assert.match(row, /^[ ▀▄█]*$/);
    }
  });

  it('starts the strokes on the half-row given, so the top can begin in the lower half of a row', () => {
    // A single full-height T, starting at sub-row 1: the first terminal row has only its lower half.
    const rows = phraseRows(['T'], 1, 9, 5);
    // The bar of the T is the lower half of row 0; its stem is full in the rows below.
    assert.match(rows[0]!, /^▄+$/);
    assert.match(rows[4]!, /██/);
  });

  it('widens the fat letters beyond their plain proportions (5 columns each, 92 with the gaps)', () => {
    assert.ok(phraseWidth(WORDS, 5) > 92);
  });

  it('is case-insensitive', () => {
    assert.deepEqual(phraseRows(['fred'], 0, 18, 9), phraseRows(['FRED'], 0, 18, 9));
  });
});
