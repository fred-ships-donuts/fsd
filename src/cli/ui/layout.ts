// How the step screens share the window's rows (SPEC 6.7): the header on top, the footer at the bottom, the body in between.

export const MIN_LOGO_WIDTH = 40; // narrower than this, the header drops its "🍩 F S D" line
// Below this many rows the boxed header (2 rows and a margin) costs too much: it becomes a single line.
const COMPACT_HEADER_BELOW_ROWS = 20;
// Below this many rows the footer drops its progress bar and keeps the hint.
const COMPACT_FOOTER_BELOW_ROWS = 12;

export const compactHeader = (rows: number): boolean => rows < COMPACT_HEADER_BELOW_ROWS;
export const compactFooter = (rows: number): boolean => rows < COMPACT_FOOTER_BELOW_ROWS;

/** Rows the step screens' header and footer take, so a list can be given what is left (see `listRows`). */
export function chromeRows(rows: number, columns: number): number {
  const header = 1 + (compactHeader(rows) ? 1 : (columns >= MIN_LOGO_WIDTH ? 2 : 1) + 1); // the padding above, then the header
  const footer = compactFooter(rows) ? 1 : 3;
  return header + footer;
}

/** Rows a list may use on a step screen: what the header, the title (two rows) and the footer leave. At least one. */
export const listRows = (rows: number, columns: number): number => Math.max(1, rows - chromeRows(rows, columns) - 2);
