import { createElement } from 'react';
import { render } from 'ink';
import { version } from '../core/package.js';
import { EXIT_CANCELLED } from '../exitCodes.js';
import { App } from './App.js';
import { installFrameWriter, type FrameStream } from './terminal/frameWriter.js';
import { sizeOf } from './terminal/useTerminalSize.js';

export interface WizardOptions {
  // When the npm check ran in this session; the wizard saves it with the preferences (SPEC 7).
  lastUpdateCheck?: string;
}

// Mounts the wizard on the terminal and returns its exit code.
//
// Ink draws the moment a resize arrives, before React learns the new size from its own listener. The frame it draws then still
// has the old size, taller than the new window, and pushes the top rows (the 🍩) off the screen until the next frame puts them
// back. Updating the tree synchronously, ahead of Ink, leaves a single frame at the new size.
// Ink repaints by erasing the old frame line by line and writing the new one in pieces; after a resize that count is wrong and
// the screen shows blank or torn frames. The frame writer replaces that the way claude-code does (see terminal/frameWriter.ts).
export async function runWizard(options: WizardOptions = {}): Promise<number> {
  let code = 0;
  // One function for the whole run, so a redraw never resets the input. It also sets the process exit code itself: once the wizard
  // unmounts nothing keeps the event loop alive, so the process can end before waitUntilExit resolves and the return below is lost.
  const onExit = (value: number) => {
    code = value;
    process.exitCode = value;
  };
  const terminal = () => sizeOf(process.stdout);
  const tree = () => createElement(App, { version, onExit, terminal: terminal(), ...(options.lastUpdateCheck ? { lastUpdateCheck: options.lastUpdateCheck } : {}) });
  const app = render(tree(), { exitOnCtrlC: false, alternateScreen: true });
  const restoreWrite = installFrameWriter(process.stdout as unknown as FrameStream);
  let last = terminal();
  const onResize = () => {
    const now = terminal();
    // Terminals often send two or more resize events for one drag step; the same size again is nothing to redraw.
    if (now.columns === last.columns && now.rows === last.rows) return;
    last = now;
    app.rerender(tree());
  };
  process.stdout.prependListener('resize', onResize);
  try {
    await app.waitUntilExit();
  } finally {
    process.stdout.off('resize', onResize);
    restoreWrite();
  }
  if (code === EXIT_CANCELLED) console.error('cancelled');
  return code;
}
