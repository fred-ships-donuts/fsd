// The sextant block characters (Unicode 13, U+1FB00...): a cell as 2 columns by 3 rows of pixels, numbered in reading
// order from bit 1 (top left, top right, middle left, middle right, bottom left, bottom right). Unicode leaves out the
// empty cell, the full one and the two halves, which are the blocks that already existed.
export function sextant(mask: number): string {
  if (mask === 0) return ' ';
  if (mask === 63) return '█';
  if (mask === 21) return '▌';
  if (mask === 42) return '▐';
  return String.fromCodePoint(0x1fb00 + mask - 1 - (mask > 21 ? 1 : 0) - (mask > 42 ? 1 : 0));
}
