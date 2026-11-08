import { useEffect, useState } from 'react';
import { useStdout } from 'ink';

export interface TerminalSize {
  columns: number;
  rows: number;
}

export const sizeOf = (stream: { columns?: number; rows?: number }): TerminalSize => ({ columns: stream.columns || 80, rows: stream.rows || 24 });

// Current terminal size, updated on resize, so the wizard always fills the whole terminal. When `given`, the caller keeps
// the size up to date (see ui/run.ts) and the hook only returns it.
export function useTerminalSize(given?: TerminalSize): TerminalSize {
  // Ink types its stdout as a WritableStream; at runtime it is the terminal (or a test double) with columns and rows.
  const { stdout } = useStdout() as unknown as { stdout: NodeJS.WriteStream };
  const [size, setSize] = useState(() => sizeOf(stdout));
  useEffect(() => {
    if (given) return;
    const onResize = () => setSize(sizeOf(stdout));
    stdout.on('resize', onResize);
    return () => {
      stdout.off('resize', onResize);
    };
  }, [stdout, given]);
  return given ?? size;
}
