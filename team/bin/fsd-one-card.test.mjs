import { test } from 'node:test';
import assert from 'node:assert/strict';
import { oneCardRule, STAGE } from './fsd-lib.mjs';

const cr = { n: 5, col: STAGE.changes }, dv = { n: 6, col: STAGE.dev };
test('only Changes Requested: a new card may start', () => assert.deepEqual(oneCardRule([cr], 9, false), { refuse: null, back: [] }));
test('a card in Developing: a new card is refused and the card is named', () => assert.equal(oneCardRule([dv], 9, false).refuse.n, 6));
test('pulling a Changes Requested card with one in Developing sends that one back to Ready for Development', () => assert.deepEqual(oneCardRule([cr, dv], 5, true), { refuse: null, back: [6] }));
