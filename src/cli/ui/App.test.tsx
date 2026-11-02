import assert from 'node:assert/strict';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';
import { render } from 'ink-testing-library';
import { listSkills } from '../skills.js';
import { snapshot } from '../testing.js';
import { App } from './App.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 60));
const KEY = { enter: '\r', left: '\u001b[D', down: '\u001b[B', space: ' ', ctrlC: '\u0003' };

const originalHome = process.env['HOME'];
const originalCwd = process.cwd();
let home = '';
let cwd = '';

before(() => {});
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'fsd-ui-home-'));
  cwd = mkdtempSync(join(tmpdir(), 'fsd-ui-cwd-'));
  process.env['HOME'] = home;
  process.chdir(cwd);
});
after(() => {
  if (originalHome === undefined) delete process.env['HOME'];
  else process.env['HOME'] = originalHome;
  process.chdir(originalCwd);
});

async function press(stdin: { write: (data: string) => void }, ...keys: string[]) {
  for (const key of keys) {
    stdin.write(key);
    await tick();
  }
}

async function waitFor(frame: () => string | undefined, pattern: RegExp) {
  for (let i = 0; i < 100; i++) {
    if (pattern.test(frame() ?? '')) return;
    await tick();
  }
  assert.match(frame() ?? '', pattern);
}

const catalog = listSkills().map((skill) => skill.name);
const mount = (onExit: (code: number) => void = () => {}) => render(<App version="1" onExit={onExit} />);
// menu -> scope -> skills -> language -> update -> theme -> summary
const toSummary = [KEY.enter, KEY.enter, KEY.enter, KEY.enter, KEY.enter, KEY.enter];

describe('wizard', () => {
  it('shows header and menu without writing anything', async () => {
    const { lastFrame, stdin, unmount } = mount();
    await tick();
    assert.match(lastFrame()!, /fsd v1/);
    assert.match(lastFrame()!, /Install/);
    assert.ok(!/Update/.test(lastFrame()!.replace('Updates', '')), 'menu has no "Update" item');
    await press(stdin, KEY.left);
    assert.deepEqual(readdirSync(home), []);
    unmount();
  });

  it('left arrow goes back keeping choices, and the bar follows the steps', async () => {
    const { lastFrame, stdin, unmount } = mount();
    await tick();
    await press(stdin, KEY.enter);
    assert.match(lastFrame()!, /step 1 of /);
    await press(stdin, KEY.down, KEY.enter);
    assert.match(lastFrame()!, /step 2 of /);
    await press(stdin, KEY.left);
    assert.match(lastFrame()!, /Scope/);
    assert.match(lastFrame()!, /Local/);
    unmount();
  });

  it('starts with every skill selected, and changing the selection changes the number of steps', async () => {
    const { lastFrame, stdin, unmount } = mount();
    await tick();
    await press(stdin, KEY.enter, KEY.enter);
    assert.match(lastFrame()!, /step 2 of 6/);
    assert.ok(!/○/.test(lastFrame()!), 'all rows start marked');
    await press(stdin, KEY.space);
    assert.match(lastFrame()!, /step 2 of 5/);
    await press(stdin, KEY.space);
    assert.match(lastFrame()!, /step 2 of 6/);
    unmount();
  });

  it('the Conflicts step appears only when a same-name skill is in the way, and adds a step', async () => {
    mkdirSync(join(home, '.claude', 'skills', catalog[0]!), { recursive: true });
    const { lastFrame, stdin, unmount } = mount();
    await tick();
    await press(stdin, KEY.enter, KEY.enter, KEY.enter, KEY.enter);
    assert.match(lastFrame()!, /Conflicts/);
    assert.match(lastFrame()!, /step 4 of 7/);
    assert.match(lastFrame()!, /keep the original, skip ours/);
    await press(stdin, KEY.space);
    assert.match(lastFrame()!, /install ours, keep the original \(not linked\)/);
    await press(stdin, KEY.space);
    assert.match(lastFrame()!, /replace the original with ours/);
    unmount();
  });

  it('a conflict decided as "install ours, keep the original" ends unlinked, original untouched', async () => {
    const original = join(home, '.claude', 'skills', catalog[0]!);
    mkdirSync(original, { recursive: true });
    writeFileSync(join(original, 'mine.txt'), 'x');
    const codes: number[] = [];
    const { lastFrame, stdin, unmount } = mount((c) => codes.push(c));
    await tick();
    await press(stdin, KEY.enter, KEY.enter, KEY.enter, KEY.enter, KEY.space, KEY.enter, KEY.enter, KEY.enter);
    assert.match(lastFrame()!, /Summary/);
    assert.match(lastFrame()!, /Conflict .*not linked/);
    await press(stdin, KEY.enter);
    await waitFor(lastFrame, /Result/);
    assert.equal(readFileSync(join(original, 'mine.txt'), 'utf8'), 'x');
    assert.ok(existsSync(join(home, '.fsd', 'skills', catalog[0]!, 'SKILL.md')));
    const registry = JSON.parse(readFileSync(join(home, '.fsd', 'installed.json'), 'utf8')) as { skills: Record<string, { linked?: boolean }> };
    assert.equal(registry.skills[catalog[0]!]?.linked, false);
    await press(stdin, KEY.enter);
    assert.deepEqual(codes, [0]);
    unmount();
  });

  it('installs all skills end to end and creates the base structure only then', async () => {
    const codes: number[] = [];
    const { lastFrame, stdin, unmount } = mount((c) => codes.push(c));
    await tick();
    await press(stdin, ...toSummary);
    assert.match(lastFrame()!, /Summary/);
    assert.ok(!existsSync(join(home, 'nook')), 'nothing written before confirming the summary');
    await press(stdin, KEY.enter);
    await waitFor(lastFrame, /Result/);
    assert.ok(existsSync(join(home, 'nook', 'kitchen')) && existsSync(join(home, 'nook', 'bakers')));
    assert.ok(existsSync(join(home, '.fsd', 'oven')) && existsSync(join(home, '.fsd', 'config.json')));
    assert.ok(!existsSync(join(home, 'nook', 'bench')));
    assert.deepEqual(readdirSync(join(home, '.fsd', 'skills')).sort(), [...catalog].sort());
    await press(stdin, KEY.enter);
    assert.deepEqual(codes, [0]);
    unmount();
  });

  it('uninstall lists only registered skills and removes them with their links', async () => {
    const first = mount();
    await tick();
    await press(first.stdin, ...toSummary, KEY.enter);
    await waitFor(first.lastFrame, /Result/);
    first.unmount();

    const { lastFrame, stdin, unmount } = mount();
    await tick();
    await press(stdin, KEY.down, KEY.enter, KEY.enter);
    assert.match(lastFrame()!, /step 2 of 3/);
    await press(stdin, KEY.space, KEY.enter);
    assert.match(lastFrame()!, /Remove from/);
    await press(stdin, KEY.enter);
    await waitFor(lastFrame, /Result/);
    assert.match(lastFrame()!, /remove /);
    assert.deepEqual(readdirSync(join(home, '.fsd', 'skills')), []);
    assert.deepEqual(readdirSync(join(home, '.claude', 'skills')), []);
    unmount();
  });
});

describe('interrupting before confirming (SPEC 6.2 rule 10)', () => {
  // Reaches step number `n` (0 = menu) and presses ctrl+c there.
  async function cancelAt(n: number) {
    const codes: number[] = [];
    const { stdin, unmount } = mount((c) => codes.push(c));
    await tick();
    await press(stdin, ...Array<string>(n).fill(KEY.enter));
    await press(stdin, KEY.ctrlC);
    unmount();
    return codes;
  }

  it('ctrl+c at the menu and at every step, summary included, exits 130 and writes nothing', async () => {
    for (let n = 0; n <= 6; n++) {
      assert.deepEqual(await cancelAt(n), [130], `step ${n}`);
      assert.deepEqual(snapshot(home), {}, `home after step ${n}`);
      assert.deepEqual(snapshot(cwd), {}, `cwd after step ${n}`);
    }
  });

  it('an install right after the interruptions finishes cleanly: no leftovers, no duplicates, no missing links', async () => {
    for (let n = 0; n <= 6; n++) await cancelAt(n);

    const codes: number[] = [];
    const { lastFrame, stdin, unmount } = mount((c) => codes.push(c));
    await tick();
    await press(stdin, ...toSummary, KEY.enter);
    await waitFor(lastFrame, /Result/);
    assert.ok(!/error|undone|failed/i.test(lastFrame()!));
    await press(stdin, KEY.enter);
    assert.deepEqual(codes, [0]);
    unmount();

    assert.deepEqual(readdirSync(home).sort(), ['.claude', '.fsd', 'nook']);
    assert.deepEqual(readdirSync(join(home, '.fsd', 'skills')).sort(), [...catalog].sort());
    assert.deepEqual(readdirSync(join(home, '.claude', 'skills')).sort(), [...catalog].sort());
    assert.deepEqual(readdirSync(join(home, '.fsd', 'cache')), [], 'no run directory or backup left');
    assert.deepEqual(readdirSync(join(home, '.fsd')).sort(), ['cache', 'config.json', 'installed.json', 'logs', 'oven', 'skills']);
    for (const name of catalog) {
      const link = join(home, '.claude', 'skills', name);
      assert.ok(lstatSync(link).isSymbolicLink(), name);
      assert.equal(readlinkSync(link), join(home, '.fsd', 'skills', name));
    }
    const registry = JSON.parse(readFileSync(join(home, '.fsd', 'installed.json'), 'utf8')) as { skills: Record<string, unknown> };
    assert.deepEqual(Object.keys(registry.skills).sort(), [...catalog].sort());

    // installing again changes nothing
    const before = snapshot(home);
    const again = mount();
    await tick();
    await press(again.stdin, ...toSummary, KEY.enter);
    await waitFor(again.lastFrame, /Result/);
    again.unmount();
    assert.deepEqual(snapshot(home), { ...before, ...snapshot(home) });
    assert.deepEqual(Object.keys(snapshot(home)).sort(), Object.keys(before).sort());
  });
});
