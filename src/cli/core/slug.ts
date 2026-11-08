// The folder name of a task, and the file name of a step, made from a title (SPEC 4.5). Pure.

export const SLUG_MAX = 60;

export type SlugResult = { ok: true; slug: string } | { ok: false; reason: 'empty' } | { ok: false; reason: 'reserved'; slug: string };

// Letters that `normalize('NFD')` does not split into a base letter and a mark.
const LETTERS: Record<string, string> = {
  ß: 'ss', ẞ: 'ss',
  æ: 'ae', Æ: 'ae',
  œ: 'oe', Œ: 'oe',
  ø: 'o', Ø: 'o',
  ł: 'l', Ł: 'l',
  đ: 'd', Đ: 'd',
  þ: 'th', Þ: 'th',
};
const LETTER_PATTERN = new RegExp(`[${Object.keys(LETTERS).join('')}]`, 'gu');

// Names Windows refuses for a file or folder, whatever the extension.
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/;

export function slug(title: string): SlugResult {
  let value = title
    .replace(LETTER_PATTERN, (letter) => LETTERS[letter] ?? letter)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (value.length > SLUG_MAX) {
    const cut = value.slice(0, SLUG_MAX + 1);
    const dash = cut.lastIndexOf('-');
    // Cut at the last `-` that keeps the name within the limit; a single long word is cut at the limit.
    value = (dash > 0 ? cut.slice(0, dash) : value.slice(0, SLUG_MAX)).replace(/-+$/, '');
  }

  if (value === '') return { ok: false, reason: 'empty' };
  if (RESERVED.test(value)) return { ok: false, reason: 'reserved', slug: value };
  return { ok: true, slug: value };
}
