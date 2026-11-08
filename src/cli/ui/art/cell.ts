// One character cell of a picture: a block character, its foreground and its background (undefined = terminal default).
export interface Cell {
  char: string;
  fg?: string;
  bg?: string;
}

export type Picture = Cell[][];

export type Rgb = readonly [number, number, number];

export const hex = (rgb: Rgb): string => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;

export interface Run {
  text: string;
  fg?: string;
  bg?: string;
}

// Neighbouring cells with the same colours are one piece of text: far fewer nodes to lay out and far fewer colour
// codes to send, which is what keeps a redraw quick while the window is being dragged.
export function runs(line: readonly Cell[]): Run[] {
  const out: Run[] = [];
  for (const cell of line) {
    const last = out[out.length - 1];
    if (last && last.fg === cell.fg && last.bg === cell.bg) last.text += cell.char;
    else out.push({ text: cell.char, ...(cell.fg ? { fg: cell.fg } : {}), ...(cell.bg ? { bg: cell.bg } : {}) });
  }
  return out;
}
