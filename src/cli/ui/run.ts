import { createElement } from 'react';
import { render } from 'ink';
import { readFileSync } from 'node:fs';
import { App } from './App.js';
import { prepareHero, warmHero } from './Chrome.js';
import { installFrameWriter, type FrameStream } from './frameWriter.js';

const { version } = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')) as { version: string };

export async function runWizard(options: { lastUpdateCheck?: string } = {}): Promise<number> {
  let code = 0;
  const onExit = (value: number) => (code = value); // one function for the whole run, so a redraw never resets the input
  const terminal = () => ({ columns: process.stdout.columns || 80, rows: process.stdout.rows || 24 });
  const tree = () => createElement(App, { version, onExit, terminal: terminal(), ...(options.lastUpdateCheck ? { lastUpdateCheck: options.lastUpdateCheck } : {}) });
  const app = render(tree(), { exitOnCtrlC: false, alternateScreen: true });
  // Ink draws the moment a resize arrives, before React learns the new size from its own listener. The frame it draws
  // then still has the old size, taller than the new window, and pushes the top rows (the 🍩) off the screen until the
  // next frame puts them back. Updating the tree synchronously, ahead of Ink, leaves a single frame at the new size.
  // Ink repaints by erasing the old frame line by line and writing the new one in pieces; after a resize that count is
  // wrong and the screen shows blank or torn frames. The frame writer replaces that the way claude-code does: a diff
  // against the previous frame, absolute row positions, one atomic write (BSU/ESU where supported), full repaint on
  // resize. See frameWriter.ts.
  const restoreWrite = installFrameWriter(process.stdout as unknown as FrameStream);
  let last = terminal();
  const onResize = () => {
    const { columns, rows } = terminal();
    // Terminals often send two or more resize events for one drag step; the same size again is nothing to redraw.
    if (columns === last.columns && rows === last.rows) return;
    last = { columns, rows };
    prepareHero(columns, rows);
    app.rerender(tree());
  };
  process.stdout.prependListener('resize', onResize);
  const stopWarming = warmHero(terminal().rows);
  try {
    await app.waitUntilExit();
  } finally {
    stopWarming();
    process.stdout.off('resize', onResize);
    restoreWrite();
  }
  if (code === 130) console.error('cancelled');
  return code;
}
