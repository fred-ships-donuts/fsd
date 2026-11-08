// Translates the `-u` / `-s` / `-f` shortcuts into the long commands (SPEC 5) before commander parses.
// `-u` = `update`, `-s` = `skill`, `-f` = `--force`. Each is its own argument, in this order; grouped or
// out-of-order shortcuts are usage errors.

export type Normalized = { args: string[] } | { error: string };

const PASSTHROUGH = new Set(['-h', '--help', '-v', '--version']);
const ORDER = ['-u', '-s', '-f'];

export function normalizeArgs(raw: string[]): Normalized {
  if (raw.some((arg) => PASSTHROUGH.has(arg))) return { args: raw };
  if (raw.some((arg) => /^-[usf]{2,}$/.test(arg))) return { error: 'shortcuts must be separate arguments: -u -s -f' };

  const present = ORDER.filter((flag) => raw.includes(flag));
  if (present.length === 0) return { args: raw };
  const positions = present.map((flag) => raw.indexOf(flag));
  if (positions.some((position, index) => index > 0 && position < positions[index - 1]!)) return { error: 'shortcuts must be given in the order -u -s -f' };

  const update = present.includes('-u');
  let skill = present.includes('-s');
  const force = present.includes('-f');
  const words = raw.filter((arg) => !ORDER.includes(arg));

  let command: 'update' | 'link';
  if (update) {
    if (words[0] === 'link') return { error: "'-u' cannot be used with 'link'" };
    command = 'update';
    if (words[0] === 'update') words.shift();
  } else if (words[0] === 'update' || words[0] === 'link') {
    command = words.shift() as 'update' | 'link';
  } else {
    return { error: `option '${present[0]}' is only valid with 'update' or 'link'` };
  }

  if (words[0] === 'skill') {
    skill = true;
    words.shift();
  }
  if (!skill) {
    if (force) return { error: "option '-f' is only valid with 'skill'" };
    if (words.length > 0) return { error: `unknown command '${words[0]}' after ${command}` };
    if (command === 'link') return { error: "'link' needs 'skill'" };
    return { args: ['update'] };
  }
  return { args: [command, 'skill', ...words, ...(force ? ['--force'] : [])] };
}
