import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { render } from 'ink-testing-library';
import { App } from './App.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 60));
const KEY = { enter: '\r', esc: '\u001b', down: '\u001b[B', space: ' ', ctrlC: '\u0003' };

const home = mkdtempSync(join(tmpdir(), 'fsd-ui-home-'));
const cwd = mkdtempSync(join(tmpdir(), 'fsd-ui-cwd-'));
const originalHome = process.env['HOME'];
const originalCwd = process.cwd();

before(() => {
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

describe('wizard', () => {
  it('shows header and menu without writing anything', async () => {
    const codes: number[] = [];
    const { lastFrame, stdin, unmount } = render(<App version="9.9.9" onExit={(c) => codes.push(c)} />);
    await tick();
    assert.match(lastFrame()!, /fsd v9\.9\.9/);
    assert.match(lastFrame()!, /Install/);
    assert.match(lastFrame()!, /Uninstall/);
    assert.ok(!/Update/.test(lastFrame()!.replace('Updates', '')), 'menu has no "Update" item');
    await press(stdin, KEY.esc);
    assert.deepEqual(readdirSync(home), []);
    unmount();
  });

  it('ctrl+c cancels with 130 and writes nothing', async () => {
    const codes: number[] = [];
    const { stdin, unmount } = render(<App version="1" onExit={(c) => codes.push(c)} />);
    await tick();
    await press(stdin, KEY.enter, KEY.ctrlC);
    assert.deepEqual(codes, [130]);
    assert.deepEqual(readdirSync(home), []);
    unmount();
  });

  it('esc goes back keeping choices, and the bar follows the steps', async () => {
    const { lastFrame, stdin, unmount } = render(<App version="1" onExit={() => {}} />);
    await tick();
    await press(stdin, KEY.enter);
    assert.match(lastFrame()!, /step 1 of /);
    await press(stdin, KEY.down, KEY.enter);
    assert.match(lastFrame()!, /step 2 of /);
    await press(stdin, KEY.esc);
    assert.match(lastFrame()!, /Scope/);
    assert.match(lastFrame()!, /Local/);
    unmount();
  });

  it('installs all skills end to end and creates the base structure only then', async () => {
    const codes: number[] = [];
    const { lastFrame, stdin, unmount } = render(<App version="1" onExit={(c) => codes.push(c)} />);
    await tick();
    // menu -> scope(global) -> skills(select all) -> language -> update -> theme -> symbols -> summary
    await press(stdin, KEY.enter, KEY.enter, KEY.space, KEY.enter, KEY.enter, KEY.enter, KEY.enter, KEY.enter);
    assert.match(lastFrame()!, /Summary/);
    assert.ok(!existsSync(join(home, 'nook')), 'nothing written before confirming the summary');
    await press(stdin, KEY.enter);
    assert.match(lastFrame()!, /Result/);
    assert.ok(existsSync(join(home, 'nook', 'kitchen')) && existsSync(join(home, 'nook', 'bakers')));
    assert.ok(existsSync(join(home, '.fsd', 'oven')) && existsSync(join(home, '.fsd', 'config.json')));
    assert.ok(!existsSync(join(home, 'nook', 'bench')));
    assert.ok(readdirSync(join(home, '.claude', 'skills')).length > 0);
    await press(stdin, KEY.enter);
    assert.deepEqual(codes, [0]);
    unmount();
  });

  it('uninstall lists only registered skills and removes them', async () => {
    const codes: number[] = [];
    const { lastFrame, stdin, unmount } = render(<App version="1" onExit={(c) => codes.push(c)} />);
    await tick();
    await press(stdin, KEY.down, KEY.enter, KEY.enter);
    assert.match(lastFrame()!, /step 2 of 3/);
    await press(stdin, KEY.space, KEY.enter);
    assert.match(lastFrame()!, /Remove from/);
    await press(stdin, KEY.enter);
    assert.match(lastFrame()!, /remove /);
    assert.deepEqual(readdirSync(join(home, '.claude', 'skills')), []);
    unmount();
  });
});
