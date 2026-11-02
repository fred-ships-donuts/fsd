import { createElement } from 'react';
import { render } from 'ink';
import { readFileSync } from 'node:fs';
import { App } from './App.js';

const { version } = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')) as { version: string };

export async function runWizard(options: { lastUpdateCheck?: string } = {}): Promise<number> {
  let code = 0;
  const app = render(createElement(App, { version, onExit: (value: number) => (code = value), ...(options.lastUpdateCheck ? { lastUpdateCheck: options.lastUpdateCheck } : {}) }), { exitOnCtrlC: false, alternateScreen: true });
  await app.waitUntilExit();
  if (code === 130) console.error('cancelled');
  return code;
}
