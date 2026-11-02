import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compareVersions } from './skills.js';

export const packageName = 'fred-ships-donuts';
const DAY_MS = 24 * 60 * 60 * 1000;

// Installed globally (`npm i -g`) and not run through npx.
export function isGlobalInstall(modulePath: string = fileURLToPath(import.meta.url)): boolean {
  const path = modulePath.replace(/\\/g, '/');
  return !path.includes('/_npx/') && /\/(lib\/)?node_modules\/fred-ships-donuts\//.test(path);
}

// Pure decision for the `fsd init` auto-update (SPEC 7).
export function shouldCheck(input: { autoUpdate: boolean; lastUpdateCheck?: string | undefined; now: Date; globalInstall: boolean }): boolean {
  if (!input.autoUpdate || !input.globalInstall) return false;
  if (!input.lastUpdateCheck) return true;
  const last = Date.parse(input.lastUpdateCheck);
  return Number.isNaN(last) || input.now.getTime() - last >= DAY_MS;
}

export async function fetchLatestVersion(timeoutMs = 2000): Promise<string> {
  const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`npm registry answered ${response.status}`);
  const { version } = (await response.json()) as { version?: unknown };
  if (typeof version !== 'string') throw new Error('npm registry returned no version');
  return version;
}

export const isNewer = (latest: string, current: string): boolean => compareVersions(latest, current) > 0;

export function installLatest(): boolean {
  const run = spawnSync('npm', ['install', '-g', `${packageName}@latest`], { stdio: 'inherit', shell: process.platform === 'win32' });
  return run.status === 0;
}
