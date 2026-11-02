// Translates the `-u` / `-s` shortcuts into the long commands (SPEC 5) before commander parses.
// `-u` = `update`, `-s` = `skill`; they mix freely and may be combined (`-us`).

export type Normalized = { args: string[] } | { error: string };

const PASSTHROUGH = new Set(['-h', '--help', '-v', '--version']);

export function normalizeArgs(raw: string[]): Normalized {
  if (raw.some((arg) => PASSTHROUGH.has(arg))) return { args: raw };

  let update = false;
  let skill = false;
  const words: string[] = [];
  for (const arg of raw) {
    if (/^-[us]+$/.test(arg)) {
      if (arg.includes('u')) update = true;
      if (arg.includes('s')) skill = true;
    } else {
      words.push(arg);
    }
  }
  if (!update && !skill) return { args: raw };

  if (update || words[0] === 'update') {
    const rest = words[0] === 'update' ? words.slice(1) : words;
    if (rest[0] === 'skill') skill = true;
    const names = rest[0] === 'skill' ? rest.slice(1) : rest;
    if (names.length > 0 && !skill) return { error: `unknown command '${names[0]}' after update` };
    return { args: skill ? ['update', 'skill', ...names] : ['update'] };
  }

  return { error: "option '-s' is only valid with 'update'" };
}
