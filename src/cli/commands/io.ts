// Where a command prints: standard output and standard error, one line at a time.
export interface Io {
  out: (line: string) => void;
  err: (line: string) => void;
}

export const consoleIo: Io = { out: (line) => console.log(line), err: (line) => console.error(line) };
