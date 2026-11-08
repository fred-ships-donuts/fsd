import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { packageName } from './package.js';

// Checking npm for a newer fsd and installing it (SPEC 7).

const DAY_MS = 24 * 60 * 60 * 1000;

// Installed globally (`npm i -g`) and not run through npx.
export function isGlobalInstall(modulePath: string = fileURLToPath(import.meta.url)): boolean {
  const path = modulePath.replace(/\\/g, '/');
  return !path.includes('/_npx/') && path.includes(`/node_modules/${packageName}/`);
}

// Pure decision for the `fsd init` auto-update.
export function shouldCheck(input: { autoUpdate: boolean; lastUpdateCheck?: string | undefined; now: Date; globalInstall: boolean }): boolean {
  if (!input.autoUpdate || !input.globalInstall) return false;
  if (!input.lastUpdateCheck) return true;
  const last = Date.parse(input.lastUpdateCheck);
  return Number.isNaN(last) || input.now.getTime() - last >= DAY_MS;
}

export async function fetchLatestVersion(timeoutMs: number): Promise<string> {
  const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`npm registry answered ${response.status}`);
  const { version } = (await response.json()) as { version?: unknown };
  if (typeof version !== 'string') throw new Error('npm registry returned no version');
  return version;
}

export function installLatest(): boolean {
  const run = spawnSync('npm', ['install', '-g', `${packageName}@latest`], { stdio: 'inherit', shell: process.platform === 'win32' });
  return run.status === 0;
}
