// Turns every frame Ink draws into a minimal, atomic update, the way claude-code's renderer does (src/ink/ink.tsx,
// log-update.ts, terminal.ts):
//
//  - Ink erases its previous frame line by line and writes the new one in pieces (BSU, frame, ESU as separate writes).
//    Here the frame is diffed against the previous one, and only the rows that changed are written, each at an absolute
//    position (CUP), so nothing depends on how many lines the previous frame had or on where the cursor ended up.
//  - The whole update is a single write, wrapped in BSU/ESU (DEC 2026) when the terminal is known to honour it, so the
//    terminal swaps the old frame for the new one at once.
//  - After a resize (or the first frame) every row is rewritten, each followed by "erase to end of line", and the rest of
//    the screen is erased at the end. The screen is never erased up front: the old content stays until the new frame
//    overwrites it, so even a terminal that ignores BSU never shows a blank screen.
//  - The cursor is parked on the last row after every update, so it never trails the last diff write.

const ESC = '\u001b';
export const BSU = `${ESC}[?2026h`;
export const ESU = `${ESC}[?2026l`;
const ERASE_LINE_END = `${ESC}[K`;
const ERASE_DOWN = `${ESC}[J`;

// What Ink writes in front of a frame: home + erase down (full clear), or "erase the N lines above" (normal frame).
const ERASE_PREFIX = new RegExp(`^(?:${ESC}\\[H${ESC}\\[J|(?:${ESC}\\[2K${ESC}\\[1A)*${ESC}\\[2K${ESC}\\[G)`);
const CONTROL_SEQUENCE = new RegExp(`${ESC}\\[[0-9;?<>=]*[ -/]*[@-~]`, 'g');

const cup = (row: number) => `${ESC}[${row};1H`;

/** True when the terminal is known to hold output between BSU and ESU. tmux parses and re-chunks every byte, so it is out. */
export function synchronizedOutputSupported(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.FSD_SYNC === '1') return true; // escape hatches for a terminal that is detected wrongly
  if (env.FSD_SYNC === '0') return false;
  if (env.TMUX) return false;
  const program = env.TERM_PROGRAM;
  const term = env.TERM ?? '';
  if (program && ['iTerm.app', 'WezTerm', 'WarpTerminal', 'ghostty', 'contour', 'vscode', 'alacritty'].includes(program)) return true;
  if (term.includes('kitty') || env.KITTY_WINDOW_ID || term === 'xterm-ghostty' || term.startsWith('foot') || term.includes('alacritty')) return true;
  if (env.ZED_TERM || env.WT_SESSION) return true;
  const vte = Number.parseInt(env.VTE_VERSION ?? '', 10);
  return Number.isFinite(vte) && vte >= 6800; // GNOME Terminal, Tilix and other VTE terminals since 0.68
}

/** A string that is only control sequences and blanks (enter alt screen, hide cursor, ...) is not a frame. */
function isFrame(text: string): boolean {
  return text.replace(CONTROL_SEQUENCE, '').trim() !== '';
}

export interface FrameStream {
  write: (chunk: unknown, ...rest: unknown[]) => boolean;
  columns?: number;
  rows?: number;
}

/** Pure part: given the previous and the next frame, the bytes to write (empty when nothing changed). */
export function frameUpdate(previous: string[] | undefined, next: string[], rows: number, full: boolean, sync: boolean): string {
  const lines = next.slice(0, Math.max(1, rows));
  let out = '';
  if (full || previous === undefined) {
    for (let i = 0; i < lines.length; i++) out += cup(i + 1) + lines[i] + ERASE_LINE_END;
    out += ERASE_DOWN;
  } else {
    const count = Math.max(previous.length, lines.length);
    for (let i = 0; i < count; i++) {
      if (lines[i] === previous[i]) continue;
      out += cup(i + 1) + (lines[i] ?? '') + ERASE_LINE_END;
    }
  }
  if (out === '') return '';
  out += cup(Math.max(1, rows));
  return sync ? BSU + out + ESU : out;
}

/**
 * Takes over `stream.write` and rewrites Ink's frames as above. Every other write (alt screen, cursor, keyboard protocol
 * queries) passes through untouched and in order. Returns a function that puts the original `write` back.
 */
export function installFrameWriter(stream: FrameStream, sync = synchronizedOutputSupported()): () => void {
  const original = stream.write.bind(stream);
  let previous: string[] | undefined;
  let size = { columns: stream.columns, rows: stream.rows };

  stream.write = ((chunk: unknown, ...rest: unknown[]) => {
    if (typeof chunk !== 'string') return original(chunk, ...rest);
    // Ink's own synchronized-update markers are dropped: the frame gets exactly one pair, around the whole write.
    const text = chunk.split(BSU).join('').split(ESU).join('');
    if (text === '') return true;
    const body = text.replace(ERASE_PREFIX, '');
    // Ink clears its frame on its own in places (when the width shrinks). Passing that through would wipe rows the diff
    // believes are on screen, so it is dropped and the next frame is written in full.
    if (body === '' && body !== text) {
      previous = undefined;
      return true;
    }
    if (!isFrame(body)) return original(chunk, ...rest);
    const lines = body.split('\n');
    if (lines[lines.length - 1] === '') lines.pop(); // Ink ends a frame with a newline
    const rows = stream.rows || 24;
    const resized = stream.columns !== size.columns || stream.rows !== size.rows;
    size = { columns: stream.columns, rows: stream.rows };
    const update = frameUpdate(previous, lines, rows, resized, sync);
    previous = lines.slice(0, rows);
    if (update === '') return true;
    return original(update, ...rest);
  }) as FrameStream['write'];

  return () => {
    stream.write = original as FrameStream['write'];
  };
}
